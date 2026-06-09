import { http } from './http'
import type {
  AssistResponse,
  CreateGoalRequest,
  CreateMatchRequest,
  GoalResponse,
  MatchListParams,
  MatchResponse,
  PageResponseMatchResponse,
  ReplaceAppearanceRequest,
  UpdateGoalRequest,
  UpdateMatchResultRequest,
  UpsertAssistRequest,
} from '../types/match'

export async function replaceAppearances(
  id: number,
  payload: ReplaceAppearanceRequest,
): Promise<MatchResponse> {
  const response = await http.put<MatchResponse>(
    `/api/v1/matches/${id}/appearances`,
    payload,
  )

  return response.data
}

export const updateMatchAppearances = replaceAppearances

export async function upsertAssist(
  goalId: number,
  payload: UpsertAssistRequest,
): Promise<AssistResponse> {
  const response = await http.put<AssistResponse>(
    `/api/v1/goals/${goalId}/assist`,
    payload,
  )

  return response.data
}

export async function deleteAssist(goalId: number): Promise<void> {
  await http.delete(`/api/v1/goals/${goalId}/assist`)
}

export async function getMatches(
  params?: MatchListParams,
): Promise<PageResponseMatchResponse> {
  const response = await http.get<PageResponseMatchResponse>(
    '/api/v1/matches',
    { params },
  )

  return response.data
}

export async function createMatch(
  payload: CreateMatchRequest,
): Promise<MatchResponse> {
  const response = await http.post<MatchResponse>('/api/v1/matches', payload)

  return response.data
}

export async function getGoals(matchId: number): Promise<GoalResponse[]> {
  const response = await http.get<GoalResponse[]>(
    `/api/v1/matches/${matchId}/goals`,
  )

  return response.data
}

export const getMatchGoals = getGoals

export async function createGoal(
  matchId: number,
  payload: CreateGoalRequest,
): Promise<GoalResponse> {
  const response = await http.post<GoalResponse>(
    `/api/v1/matches/${matchId}/goals`,
    payload,
  )

  return response.data
}

export async function updateResult(
  id: number,
  payload: UpdateMatchResultRequest,
): Promise<MatchResponse> {
  const response = await http.patch<MatchResponse>(
    `/api/v1/matches/${id}/result`,
    payload,
  )

  return response.data
}

export const updateMatchResult = updateResult

export async function deleteGoal(goalId: number): Promise<void> {
  await http.delete(`/api/v1/goals/${goalId}`)
}

export async function updateGoal(
  goalId: number,
  payload: UpdateGoalRequest,
): Promise<GoalResponse> {
  const response = await http.patch<GoalResponse>(
    `/api/v1/goals/${goalId}`,
    payload,
  )

  return response.data
}

export async function getMatch(id: number): Promise<MatchResponse> {
  const response = await http.get<MatchResponse>(`/api/v1/matches/${id}`)

  return response.data
}

export const getMatchById = getMatch
