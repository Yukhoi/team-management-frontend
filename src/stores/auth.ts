import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isAxiosError } from 'axios'

import * as authApi from '../api/auth'
import type {
  CurrentUser,
  ErrorResponse,
  LoginRequest,
  LoginResponse,
} from '../types/auth'
import {
  getAccessToken,
  getRefreshToken,
  removeAccessToken,
  removeRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '../utils/token'

interface LogoutOptions {
  callApi?: boolean
}

function persistTokens(accessToken: string, refreshToken: string): void {
  setAccessToken(accessToken)
  setRefreshToken(refreshToken)
}

function removeStoredTokens(): void {
  removeAccessToken()
  removeRefreshToken()
}

function getAuthErrorMessage(error: unknown): string {
  if (isAxiosError<ErrorResponse>(error)) {
    const responseData = error.response?.data
    const message = responseData?.message ?? responseData?.details?.[0]

    if (message) {
      return message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Login failed'
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string>(getAccessToken())
  const refreshToken = ref<string>(getRefreshToken())
  const currentUser = ref<CurrentUser | null>(null)

  const isAuthenticated = computed(() => Boolean(accessToken.value && currentUser.value))

  function setTokens(nextAccessToken: string, nextRefreshToken: string): void {
    accessToken.value = nextAccessToken
    refreshToken.value = nextRefreshToken
    persistTokens(nextAccessToken, nextRefreshToken)
  }

  function clearAuth(): void {
    accessToken.value = ''
    refreshToken.value = ''
    currentUser.value = null
    removeStoredTokens()
  }

  async function loadUser(): Promise<void> {
    const response = await authApi.getCurrentUser()

    currentUser.value = response.data ?? null
  }

  async function restoreAuth(): Promise<void> {
    accessToken.value = getAccessToken()
    refreshToken.value = getRefreshToken()

    if (!accessToken.value) {
      clearAuth()
      return
    }

    try {
      await loadUser()
    } catch {
      clearAuth()
    }
  }

  async function login(payload: LoginRequest): Promise<LoginResponse> {
    clearAuth()

    try {
      const response = await authApi.login(payload)
      const tokenData = response.data

      if (!tokenData) {
        throw new Error(response.message ?? 'Login failed')
      }

      setTokens(tokenData.accessToken, tokenData.refreshToken)
      await loadUser()

      return tokenData
    } catch (error) {
      clearAuth()
      throw new Error(getAuthErrorMessage(error))
    }
  }

  async function logout(options: LogoutOptions = {}): Promise<void> {
    const shouldCallApi = options.callApi ?? true

    try {
      if (shouldCallApi && refreshToken.value) {
        await authApi.logout({ refreshToken: refreshToken.value })
      }
    } finally {
      clearAuth()
    }
  }

  return {
    accessToken,
    refreshToken,
    currentUser,
    isAuthenticated,
    login,
    logout,
    setTokens,
    clearAuth,
    loadUser,
    restoreAuth,
  }
})
