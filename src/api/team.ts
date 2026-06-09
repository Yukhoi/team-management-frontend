import { http } from './http'
import type {
  ApiResponsePageResponsePlayerResponse,
  ApiResponsePageResponseTeamResponse,
  ApiResponseTeamResponse,
  CreateTeamRequest,
  TeamListParams,
  UpdateTeamRequest,
} from '../types/team'

export async function getTeamById(
  id: number,
): Promise<ApiResponseTeamResponse> {
  const response = await http.get<ApiResponseTeamResponse>(`/api/teams/${id}`)

  return response.data
}

export async function updateTeam(
  id: number,
  payload: UpdateTeamRequest,
): Promise<ApiResponseTeamResponse> {
  const response = await http.put<ApiResponseTeamResponse>(
    `/api/teams/${id}`,
    payload,
  )

  return response.data
}

export async function deleteTeam(id: number): Promise<void> {
  await http.delete(`/api/teams/${id}`)
}

export async function listTeams(
  params?: TeamListParams,
): Promise<ApiResponsePageResponseTeamResponse> {
  const response = await http.get<ApiResponsePageResponseTeamResponse>(
    '/api/teams',
    { params },
  )

  return response.data
}

export const getTeams = listTeams

export async function createTeam(
  payload: CreateTeamRequest,
): Promise<ApiResponseTeamResponse> {
  const response = await http.post<ApiResponseTeamResponse>(
    '/api/teams',
    payload,
  )

  return response.data
}

export async function listPlayersByTeamId(
  teamId: number,
  params?: TeamListParams,
): Promise<ApiResponsePageResponsePlayerResponse> {
  const response = await http.get<ApiResponsePageResponsePlayerResponse>(
    `/api/teams/${teamId}/players`,
    { params },
  )

  return response.data
}

export async function getOurTeam(): Promise<ApiResponseTeamResponse> {
  const response = await http.get<ApiResponseTeamResponse>('/api/teams/our')

  return response.data
}
