import { http } from './http'
import type {
  ApiResponseDashboardStatisticsResponse,
  ApiResponseListLeaderboardResponse,
  ApiResponseListTeamStatsResponse,
  ApiResponsePagedResponseMatchSummaryResponse,
  ApiResponsePagedResponsePlayerStatsResponse,
  LeaderboardStatisticsParams,
  MatchStatisticsParams,
  PlayerStatisticsParams,
  StatisticsHealthResponse,
  TeamStatisticsParams,
} from '../types/statistics'

export async function getTeamStatistics(
  params?: TeamStatisticsParams,
): Promise<ApiResponseListTeamStatsResponse> {
  const response = await http.get<ApiResponseListTeamStatsResponse>(
    '/api/statistics/teams',
    { params },
  )

  return response.data
}

export async function getPlayerStatistics(
  params?: PlayerStatisticsParams,
): Promise<ApiResponsePagedResponsePlayerStatsResponse> {
  const response = await http.get<ApiResponsePagedResponsePlayerStatsResponse>(
    '/api/statistics/players',
    { params },
  )

  return response.data
}

export async function getMatchStatistics(
  params?: MatchStatisticsParams,
): Promise<ApiResponsePagedResponseMatchSummaryResponse> {
  const response = await http.get<ApiResponsePagedResponseMatchSummaryResponse>(
    '/api/statistics/matches',
    { params },
  )

  return response.data
}

export async function getLeaderboardStatistics(
  params?: LeaderboardStatisticsParams,
): Promise<ApiResponseListLeaderboardResponse> {
  const response = await http.get<ApiResponseListLeaderboardResponse>(
    '/api/statistics/leaderboards',
    { params },
  )

  return response.data
}

export const getLeaderboards = getLeaderboardStatistics

export async function getStatisticsHealth(): Promise<StatisticsHealthResponse> {
  const response = await http.get<StatisticsHealthResponse>(
    '/api/statistics/health',
  )

  return response.data
}

export async function getDashboard(): Promise<ApiResponseDashboardStatisticsResponse> {
  const response = await http.get<ApiResponseDashboardStatisticsResponse>(
    '/api/statistics/dashboard',
  )

  return response.data
}

export const getDashboardStatistics = getDashboard
