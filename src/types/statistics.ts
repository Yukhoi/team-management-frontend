export type LeaderboardBoardType =
  | 'GOAL'
  | 'SCORER'
  | 'ASSIST'
  | 'APPEARANCE'
  | 'GOAL_INVOLVEMENT'

export interface ErrorResponse {
  success?: boolean
  data?: Record<string, string>
}

export interface TeamStatsResponse {
  rankNo?: number
  teamId?: number
  teamName?: string
  played?: number
  win?: number
  draw?: number
  lose?: number
  goalsFor?: number
  goalsAgainst?: number
  goalDiff?: number
  points?: number
  season?: string
  tournamentId?: number
  tournamentName?: string
}

export type TeamStatistics = TeamStatsResponse

export interface PlayerStatsResponse {
  playerId?: number
  playerName?: string
  season?: string
  tournamentId?: number
  tournamentName?: string
  appearances?: number
  starts?: number
  goals?: number
  assists?: number
  goalInvolvements?: number
}

export type PlayerStatistics = PlayerStatsResponse

export interface MatchSummaryResponse {
  matchId?: number
  tournamentId?: number
  tournamentName?: string
  season?: string
  matchTime?: string
  opponentTeamName?: string
  homeAway?: string
  ourScore?: number
  opponentScore?: number
  matchStatus?: string
  finished?: boolean
}

export type MatchStatistics = MatchSummaryResponse

export interface LeaderboardResponse {
  rankNo?: number
  entityId?: number
  entityName?: string
  metricValue?: number
  boardType?: LeaderboardBoardType
  season?: string
  tournamentId?: number
}

export type Leaderboard = LeaderboardResponse
export type LeaderboardEntry = LeaderboardResponse

export interface DashboardStatisticsResponse {
  totalMatches?: number
  wins?: number
  draws?: number
  losses?: number
  goals?: number
  goalsAgainst?: number
  topScorer?: string
  topScorerGoals?: number
  topAssist?: string
  topAssistCount?: number
}

export interface PagedResponsePlayerStatsResponse {
  content?: PlayerStatsResponse[]
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
}

export interface PagedResponseMatchSummaryResponse {
  content?: MatchSummaryResponse[]
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
}

export interface ApiResponseDashboardStatisticsResponse {
  success?: boolean
  data?: DashboardStatisticsResponse
}

export interface ApiResponseListTeamStatsResponse {
  success?: boolean
  data?: TeamStatsResponse[]
}

export interface ApiResponsePagedResponsePlayerStatsResponse {
  success?: boolean
  data?: PagedResponsePlayerStatsResponse
}

export interface ApiResponsePagedResponseMatchSummaryResponse {
  success?: boolean
  data?: PagedResponseMatchSummaryResponse
}

export interface ApiResponseListLeaderboardResponse {
  success?: boolean
  data?: LeaderboardResponse[]
}

export interface TeamStatisticsParams {
  season?: string
  tournamentId?: number
}

export interface PlayerStatisticsParams {
  season?: string
  tournamentId?: number
  page?: number
  size?: number
  sortBy?: string
  direction?: string
}

export interface MatchStatisticsParams {
  page?: number
  size?: number
  tournamentId?: number
}

export interface LeaderboardStatisticsParams {
  boardType?: LeaderboardBoardType
  season?: string
  tournamentId?: number
  topN?: number
}

export type StatisticsHealthResponse = Record<string, string>
