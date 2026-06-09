export type TournamentType = 'LEAGUE' | 'CUP' | 'FRIENDLY'
export type TournamentStatus = 'ACTIVE' | 'FINISHED' | 'CANCELLED'

export interface ErrorResponse {
  timestamp?: string
  status?: number
  error?: string
  message?: string
  path?: string
  fieldErrors?: Record<string, string>
}

export interface Pageable {
  page?: number
  size?: number
  sort?: string[]
}

export interface CreateTournamentRequest {
  name: string
  tournamentType: TournamentType
  season: string
  startDate?: string
  endDate?: string
  organizer?: string
  description?: string
}

export interface UpdateTournamentRequest {
  name: string
  tournamentType: TournamentType
  season: string
  startDate?: string
  endDate?: string
  organizer?: string
  description?: string
}

export interface TournamentResponse {
  id?: number
  name?: string
  tournamentType?: TournamentType
  season?: string
  startDate?: string
  endDate?: string
  organizer?: string
  description?: string
  status?: TournamentStatus
  createdAt?: string
  updatedAt?: string
  version?: number
}

export type Tournament = TournamentResponse

export interface PageResponseTournamentResponse {
  content?: TournamentResponse[]
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
  last?: boolean
}

export type TournamentListResponse = PageResponseTournamentResponse

export interface TournamentListParams extends Pageable {
  season?: string
  status?: TournamentStatus
  tournamentType?: TournamentType
}
