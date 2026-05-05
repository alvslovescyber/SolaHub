import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { getStorageItem, removeStorageItem, setStorageItem } from '@/lib/safeStorage'
import { isNetworkError } from '@/lib/networkStatus'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

// Token storage keys
const ACCESS_TOKEN_KEY = 'solahub:access_token'
const REFRESH_TOKEN_KEY = 'solahub:refresh_token'

// ─── Token helpers ─────────────────────────────────────────────────────────────
export const tokenStorage = {
  getAccess: () => getStorageItem(ACCESS_TOKEN_KEY),
  getRefresh: () => getStorageItem(REFRESH_TOKEN_KEY),
  set: (access: string, refresh: string) => {
    setStorageItem(ACCESS_TOKEN_KEY, access)
    setStorageItem(REFRESH_TOKEN_KEY, refresh)
  },
  clear: () => {
    removeStorageItem(ACCESS_TOKEN_KEY)
    removeStorageItem(REFRESH_TOKEN_KEY)
  },
}

// ─── Axios instance ────────────────────────────────────────────────────────────
export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// Request: attach Bearer token
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Refresh mutex ─────────────────────────────────────────────────────────────
// Ensures that at most one token refresh is in-flight at any time.
// All concurrent 401s queue behind the single refresh promise and retry with
// the rotated token once it resolves — preventing double-rotation failures.
let refreshPromise: Promise<string> | null = null

type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void }
const waitQueue: QueueEntry[] = []

function flushQueue(err: unknown, token?: string): void {
  while (waitQueue.length) {
    const entry = waitQueue.shift()!
    if (err) entry.reject(err)
    else entry.resolve(token!)
  }
}

// Response: handle 401 with token rotation
http.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error as Error)
    }

    const refreshToken = tokenStorage.getRefresh()
    if (!refreshToken) {
      tokenStorage.clear()
      return Promise.reject(error as Error)
    }

    original._retry = true

    // If a refresh is already in-flight, queue this request behind it rather
    // than firing a second refresh with the already-rotated (now invalid) token.
    if (refreshPromise) {
      return new Promise<string>((resolve, reject) => {
        waitQueue.push({ resolve, reject })
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`
        return http(original)
      })
    }

    try {
      refreshPromise = axios
        .post<{ accessToken: string; refreshToken: string }>(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        })
        .then((res) => {
          tokenStorage.set(res.data.accessToken, res.data.refreshToken)
          return res.data.accessToken
        })

      const newToken = await refreshPromise
      flushQueue(null, newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return http(original)
    } catch (err) {
      flushQueue(err)
      if (isNetworkError(err)) {
        return Promise.reject(error as Error)
      }
      tokenStorage.clear()
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
      return Promise.reject(error as Error)
    } finally {
      refreshPromise = null
    }
  }
)
