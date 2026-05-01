export interface ApiError {
  code: string
  description: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  state: LoadingState
  error: ApiError | null
}

export function createAsyncState<T>(initial: T | null = null): AsyncState<T> {
  return { data: initial, state: 'idle', error: null }
}
