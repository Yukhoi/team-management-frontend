import { http } from './http'
import type {
  ApiResponseCurrentUserResponse,
  ApiResponseLoginResponse,
  ApiResponseTokenRefreshResponse,
  ApiResponseVoid,
  ChangePasswordRequest,
  CreateUserRequest,
  LoginRequest,
  LogoutRequest,
  PageResponseUserManagementResponse,
  Pageable,
  RefreshTokenRequest,
  ResetPasswordRequest,
  RoleResponse,
  UpdateUserRolesRequest,
  UpdateUserStatusRequest,
  UserManagementResponse,
} from '../types/auth'

export async function login(
  payload: LoginRequest,
): Promise<ApiResponseLoginResponse> {
  const response = await http.post<ApiResponseLoginResponse>(
    '/api/auth/login',
    payload,
  )

  return response.data
}

export async function refresh(
  payload: RefreshTokenRequest,
): Promise<ApiResponseTokenRefreshResponse> {
  const response = await http.post<ApiResponseTokenRefreshResponse>(
    '/api/auth/refresh',
    payload,
  )

  return response.data
}

export async function logout(
  payload: LogoutRequest,
): Promise<ApiResponseVoid> {
  const response = await http.post<ApiResponseVoid>('/api/auth/logout', payload)

  return response.data
}

export async function getCurrentUser(): Promise<ApiResponseCurrentUserResponse> {
  const response = await http.get<ApiResponseCurrentUserResponse>('/api/auth/me')

  return response.data
}

export async function changePassword(
  payload: ChangePasswordRequest,
): Promise<ApiResponseVoid> {
  const response = await http.post<ApiResponseVoid>(
    '/api/auth/change-password',
    payload,
  )

  return response.data
}

export async function getRoles(): Promise<string[]> {
  const response = await http.get<string[]>('/api/roles')

  return response.data
}

export async function getUsers(
  params?: Pageable,
): Promise<PageResponseUserManagementResponse> {
  const response = await http.get<PageResponseUserManagementResponse>(
    '/api/users',
    { params },
  )

  return response.data
}

export async function createUser(
  payload: CreateUserRequest,
): Promise<UserManagementResponse> {
  const response = await http.post<UserManagementResponse>('/api/users', payload)

  return response.data
}

export async function getUser(id: number): Promise<UserManagementResponse> {
  const response = await http.get<UserManagementResponse>(`/api/users/${id}`)

  return response.data
}

export async function resetPassword(
  id: number,
  payload: ResetPasswordRequest,
): Promise<UserManagementResponse> {
  const response = await http.post<UserManagementResponse>(
    `/api/users/${id}/reset-password`,
    payload,
  )

  return response.data
}

export async function updateUserRoles(
  id: number,
  payload: UpdateUserRolesRequest,
): Promise<UserManagementResponse> {
  const response = await http.put<UserManagementResponse>(
    `/api/users/${id}/roles`,
    payload,
  )

  return response.data
}

export async function updateUserStatus(
  id: number,
  payload: UpdateUserStatusRequest,
): Promise<UserManagementResponse> {
  const response = await http.patch<UserManagementResponse>(
    `/api/users/${id}/status`,
    payload,
  )

  return response.data
}

export type { RoleResponse }
