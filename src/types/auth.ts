export type UserStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED'

export interface RoleResponse {
  code?: string
  name?: string
}

export interface CurrentUserResponse {
  id?: number
  username?: string
  displayName?: string
  status?: UserStatus
  roles?: RoleResponse[]
}

export type CurrentUser = CurrentUserResponse

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface TokenRefreshResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export interface LogoutRequest {
  refreshToken: string
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

export interface CreateUserRequest {
  username: string
  password: string
  displayName: string
  roles?: string[]
  roleCodes?: string[]
}

export interface ResetPasswordRequest {
  password: string
}

export interface UpdateUserRolesRequest {
  roles?: string[]
  roleCodes?: string[]
}

export interface UpdateUserStatusRequest {
  status: UserStatus
}

export interface UserManagementResponse {
  id?: number
  username?: string
  displayName?: string
  status?: UserStatus
  roles?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface Pageable {
  page?: number
  size?: number
  sort?: string[]
}

export interface PageResponseUserManagementResponse {
  content?: UserManagementResponse[]
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
}

export interface ApiResponseLoginResponse {
  success?: boolean
  message?: string
  data?: LoginResponse
  timestamp?: string
}

export interface ApiResponseTokenRefreshResponse {
  success?: boolean
  message?: string
  data?: TokenRefreshResponse
  timestamp?: string
}

export interface ApiResponseCurrentUserResponse {
  success?: boolean
  message?: string
  data?: CurrentUserResponse
  timestamp?: string
}

export interface ApiResponseVoid {
  success?: boolean
  message?: string
  data?: unknown
  timestamp?: string
}

export interface ErrorResponse {
  success?: boolean
  errorCode?: string
  message?: string
  timestamp?: string
  details?: string[]
}
