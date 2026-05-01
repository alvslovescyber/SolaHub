import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

// Token storage keys
const ACCESS_TOKEN_KEY = 'solahub:access_token'
const REFRESH_TOKEN_KEY = 'solahub:refresh_token'

// ─── Token helpers ─────────────────────────────────────────────────────────────
export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
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

// Track whether a token refresh is in flight to avoid duplicate refreshes
let refreshPromise: Promise<string> | null = null

// Response: handle 401 with token rotation
http.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const refreshToken = tokenStorage.getRefresh()
    if (!refreshToken) {
      tokenStorage.clear()
      return Promise.reject(error)
    }

    original._retry = true

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post<{ accessToken: string; refreshToken: string }>(
            `${API_BASE_URL}/api/auth/refresh`,
            { refreshToken },
          )
          .then((res) => {
            tokenStorage.set(res.data.accessToken, res.data.refreshToken)
            return res.data.accessToken
          })
          .finally(() => {
            refreshPromise = null
          })
      }

      const newToken = await refreshPromise
      original.headers.Authorization = `Bearer ${newToken}`
      return http(original)
    } catch {
      tokenStorage.clear()
      // Redirect to login — the auth store will handle this via its watcher
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
      return Promise.reject(error)
    }
  },
)
