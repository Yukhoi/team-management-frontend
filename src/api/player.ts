import { http } from './http'
import type {
  ApiResponsePageResponsePlayerResponse,
  ApiResponsePlayerResponse,
  ChangePlayerStatusRequest,
  CreatePlayerRequest,
  PlayerListParams,
  UpdatePlayerRequest,
} from '../types/player'

export async function getPlayerById(
  id: number,
): Promise<ApiResponsePlayerResponse> {
  const response = await http.get<ApiResponsePlayerResponse>(
    `/api/players/${id}`,
  )

  return response.data
}

export async function updatePlayer(
  id: number,
  payload: UpdatePlayerRequest,
): Promise<ApiResponsePlayerResponse> {
  const response = await http.put<ApiResponsePlayerResponse>(
    `/api/players/${id}`,
    payload,
  )

  return response.data
}

export async function deletePlayer(id: number): Promise<void> {
  await http.delete(`/api/players/${id}`)
}

export async function listPlayers(
  params?: PlayerListParams,
): Promise<ApiResponsePageResponsePlayerResponse> {
  const response = await http.get<ApiResponsePageResponsePlayerResponse>(
    '/api/players',
    { params },
  )

  return response.data
}

export const getPlayers = listPlayers

export async function createPlayer(
  payload: CreatePlayerRequest,
): Promise<ApiResponsePlayerResponse> {
  const response = await http.post<ApiResponsePlayerResponse>(
    '/api/players',
    payload,
  )

  return response.data
}

export async function changePlayerStatus(
  id: number,
  payload: ChangePlayerStatusRequest,
): Promise<ApiResponsePlayerResponse> {
  const response = await http.patch<ApiResponsePlayerResponse>(
    `/api/players/${id}/status`,
    payload,
  )

  return response.data
}
