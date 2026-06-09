export type PlayerPosition = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
export type PlayerRegistrationStatus = 'REGISTERED' | 'UNREGISTERED'
export type PlayerCurrentStatus = 'ACTIVE' | 'INJURED' | 'SUSPENDED' | 'LEFT'

export interface FieldErrorResponse {
  field?: string
  message?: string
}

export interface ErrorResponse {
  code?: string
  message?: string
  timestamp?: string
  path?: string
  errors?: FieldErrorResponse[]
}

export interface CreateTeamRequest {
  name: string
  shortName?: string
  description?: string
  isOurTeam?: boolean
  remark?: string
}

export interface UpdateTeamRequest {
  name: string
  shortName?: string
  description?: string
  isOurTeam?: boolean
  remark?: string
}

export interface TeamResponse {
  id?: number
  name?: string
  shortName?: string
  description?: string
  isOurTeam?: boolean
  remark?: string
  createdAt?: string
  updatedAt?: string
  version?: number
}

export type Team = TeamResponse

export interface CreatePlayerRequest {
  teamId: number
  name: string
  jerseyNumber?: number
  birthDate?: string
  phone?: string
  position: PlayerPosition
  registrationStatus?: PlayerRegistrationStatus
  currentStatus?: PlayerCurrentStatus
  joinedDate?: string
  remark?: string
}

export interface UpdatePlayerRequest {
  name: string
  jerseyNumber?: number
  birthDate?: string
  phone?: string
  position: PlayerPosition
  registrationStatus?: PlayerRegistrationStatus
  joinedDate?: string
  leftDate?: string
  remark?: string
}

export interface ChangePlayerStatusRequest {
  newStatus: PlayerCurrentStatus
  changedBy?: number
  remark?: string
}

export interface PlayerResponse {
  id?: number
  teamId?: number
  teamName?: string
  name?: string
  jerseyNumber?: number
  birthDate?: string
  phone?: string
  position?: PlayerPosition
  registrationStatus?: PlayerRegistrationStatus
  currentStatus?: PlayerCurrentStatus
  joinedDate?: string
  leftDate?: string
  remark?: string
  createdAt?: string
  updatedAt?: string
  version?: number
}

export type Player = PlayerResponse

export interface PageResponseTeamResponse {
  content?: TeamResponse[]
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
}

export type TeamListResponse = PageResponseTeamResponse

export interface PageResponsePlayerResponse {
  content?: PlayerResponse[]
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
}

export type PlayerListResponse = PageResponsePlayerResponse

export interface ApiResponseTeamResponse {
  code?: string
  message?: string
  data?: TeamResponse
}

export interface ApiResponsePlayerResponse {
  code?: string
  message?: string
  data?: PlayerResponse
}

export interface ApiResponsePageResponseTeamResponse {
  code?: string
  message?: string
  data?: PageResponseTeamResponse
}

export interface ApiResponsePageResponsePlayerResponse {
  code?: string
  message?: string
  data?: PageResponsePlayerResponse
}

export interface TeamListParams {
  page?: number
  size?: number
}

export interface PlayerListParams {
  page?: number
  size?: number
}
