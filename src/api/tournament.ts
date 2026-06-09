import { http } from './http'
import type {
  CreateTournamentRequest,
  PageResponseTournamentResponse,
  TournamentListParams,
  TournamentResponse,
  UpdateTournamentRequest,
} from '../types/tournament'

export async function getTournament(id: number): Promise<TournamentResponse> {
  const response = await http.get<TournamentResponse>(`/api/tournaments/${id}`)

  return response.data
}

export const getTournamentById = getTournament

export async function updateTournament(
  id: number,
  payload: UpdateTournamentRequest,
): Promise<TournamentResponse> {
  const response = await http.put<TournamentResponse>(
    `/api/tournaments/${id}`,
    payload,
  )

  return response.data
}

export async function getTournaments(
  params?: TournamentListParams,
): Promise<PageResponseTournamentResponse> {
  const response = await http.get<PageResponseTournamentResponse>(
    '/api/tournaments',
    { params },
  )

  return response.data
}

export async function createTournament(
  payload: CreateTournamentRequest,
): Promise<TournamentResponse> {
  const response = await http.post<TournamentResponse>(
    '/api/tournaments',
    payload,
  )

  return response.data
}

export async function finishTournament(id: number): Promise<TournamentResponse> {
  const response = await http.patch<TournamentResponse>(
    `/api/tournaments/${id}/finish`,
  )

  return response.data
}

export async function cancelTournament(id: number): Promise<TournamentResponse> {
  const response = await http.patch<TournamentResponse>(
    `/api/tournaments/${id}/cancel`,
  )

  return response.data
}
