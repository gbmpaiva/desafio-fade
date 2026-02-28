export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  message: string
  status: number
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'