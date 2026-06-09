export type HomeAway = 'HOME' | 'AWAY'
export type MatchStatus = 'SCHEDULED' | 'ONGOING' | 'FINISHED' | 'CANCELLED'
export type GoalType = 'NORMAL' | 'PENALTY' | 'OWN_GOAL'

export interface ErrorResponse {
  code?: string
  message?: string
  timestamp?: string
}

export interface PlayerAppearanceRequest {
  playerId: number
  playerNameSnapshot: string
  jerseyNumberSnapshot?: number
  positionSnapshot?: string
  starter: boolean
  onMinute?: number
  offMinute?: number
  remark?: string
}

export type Appearance = MatchAppearanceResponse
export type UpdateAppearancesRequest = ReplaceAppearanceRequest

export interface ReplaceAppearanceRequest {
  players: PlayerAppearanceRequest[]
}

export interface MatchAppearanceResponse {
  id?: number
  playerId?: number
  playerNameSnapshot?: string
  jerseyNumberSnapshot?: number
  positionSnapshot?: string
  appeared?: boolean
  starter?: boolean
  onMinute?: number
  offMinute?: number
  remark?: string
}

export interface CreateMatchRequest {
  tournamentId: number
  ourTeamId: number
  ourTeamNameSnapshot?: string
  opponentTeamId?: number
  opponentTeamName?: string
  matchTime: string
  homeAway: HomeAway
  venue?: string
  roundStage?: string
}

export interface UpdateMatchResultRequest {
  ourScore: number
  opponentScore: number
  finished: boolean
  remark?: string
}

export interface MatchResponse {
  id: number
  tournamentId: number
  tournamentNameSnapshot: string
  seasonSnapshot: string
  ourTeamId?: number
  ourTeamNameSnapshot?: string
  opponentTeamId?: number
  opponentTeamNameSnapshot?: string
  matchTime?: string
  homeAway?: HomeAway
  venue?: string
  roundStage?: string
  matchStatus?: MatchStatus
  ourScore?: number
  opponentScore?: number
  finished?: boolean
  createdAt?: string
  updatedAt?: string
  version?: number
  appearances?: MatchAppearanceResponse[]
  result?: string
  status?: MatchStatus
  matchId?: number
  opponentName?: string
  matchDate?: string
  homeScore?: number
  awayScore?: number
}

export type Match = MatchResponse
export type MatchDetail = MatchResponse

export interface UpsertAssistRequest {
  playerId: number
  assistMinute?: number
  remark?: string
}

export interface AssistResponse {
  id: number
  goalRecordId: number
  playerId: number
  playerNameSnapshot: string
  jerseyNumberSnapshot?: number
  assistMinute?: number
  remark?: string
}

export type Assist = AssistResponse

export interface CreateGoalRequest {
  playerId?: number
  goalMinute?: number
  goalType: GoalType
  remark?: string
}

export interface UpdateGoalRequest {
  playerId?: number
  goalMinute?: number
  goalType: GoalType
  remark?: string
}

export interface GoalResponse {
  id: number
  matchId: number
  playerId?: number
  playerNameSnapshot?: string
  jerseyNumberSnapshot?: number
  goalMinute?: number
  goalType: GoalType
  remark?: string
  assist?: AssistResponse
  createdAt: string
  updatedAt: string
  goalId?: number
  assistPlayerId?: number
  assistPlayerNameSnapshot?: string
  assistJerseyNumberSnapshot?: number
}

export type Goal = GoalResponse

export interface PageResponseMatchResponse {
  content?: MatchResponse[]
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
}

export type MatchListResponse = PageResponseMatchResponse

export interface MatchListParams {
  page?: number
  size?: number
  tournamentId?: number
  status?: MatchStatus
  keyword?: string
}
