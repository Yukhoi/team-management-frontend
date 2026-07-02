import axios, { AxiosError, AxiosHeaders } from 'axios'
import { ElMessage } from 'element-plus'

import { getAccessToken } from '../utils/token'

interface BackendErrorResponse {
  message?: string
  error?: string
  errorCode?: string
  details?: string[]
  data?: Record<string, string>
}

function getErrorMessage(error: AxiosError<BackendErrorResponse>): string {
  const responseData = error.response?.data
  const dataMessage = responseData?.data
    ? Object.values(responseData.data)[0]
    : undefined

  if (responseData?.message) {
    return responseData.message
  }

  if (responseData?.details?.[0]) {
    return responseData.details[0]
  }

  if (dataMessage) {
    return dataMessage
  }

  if (responseData?.error) {
    return responseData.error
  }

  if (error.message === 'Network Error') {
    return 'Network Error'
  }

  return error.message
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use(async (config) => {
  const { useAuthStore } = await import('../stores/auth')
  const authStore = useAuthStore()
  const accessToken = authStore.accessToken || getAccessToken()

  if (accessToken) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('Authorization', `Bearer ${accessToken}`)
    } else {
      config.headers = new AxiosHeaders(config.headers)
      config.headers.set('Authorization', `Bearer ${accessToken}`)
    }
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<BackendErrorResponse>) => {
    const status = error.response?.status
    const message = getErrorMessage(error)

    if (status === 401) {
      const { useAuthStore } = await import('../stores/auth')
      const { default: router } = await import('../router')
      const authStore = useAuthStore()

      await authStore.logout({ callApi: false })

      if (router.currentRoute.value.path !== '/login') {
        ElMessage.error(message || 'Authentication required')
        await router.push('/login')
      }
    } else if (status === 403) {
      const { default: router } = await import('../router')

      ElMessage.error(message || 'Access Denied')

      if (router.currentRoute.value.path !== '/403') {
        await router.push('/403')
      }
    } else if (status === 500) {
      ElMessage.error(message || 'Server Error')
    } else if (status === 400 || status === 404) {
      ElMessage.error(message)
    } else if (!status) {
      ElMessage.error(message || 'Network Error')
    }

    return Promise.reject(error)
  },
)
