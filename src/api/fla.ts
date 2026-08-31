import { http } from './http'
import type {
  FlaChampionnatResponse,
  FlaSyncRequest,
  FlaSyncResponse,
  FlaTeamMappingResponse,
  FlaTeamResponse,
  UpsertFlaTeamMappingRequest,
} from '../types/fla'

export async function getFlaChampionnats(): Promise<
  FlaChampionnatResponse[]
> {
  const response = await http.get<FlaChampionnatResponse[]>(
    '/api/v1/fla/championnats',
  )

  return response.data
}

export async function getFlaTeams(
  championnatId: number,
  saisonId: number,
): Promise<FlaTeamResponse[]> {
  const response = await http.get<FlaTeamResponse[]>(
    `/api/v1/fla/championnats/${championnatId}/seasons/${saisonId}/teams`,
  )

  return response.data
}

export async function getFlaTeamsByChampionnat(
  championnatId: number,
): Promise<FlaTeamResponse[]> {
  const response = await http.get<FlaTeamResponse[]>(
    `/api/v1/fla/championnats/${championnatId}/teams`,
  )

  return response.data
}

export async function syncFlaStandings(
  championnatId: number,
  saisonId: number,
  payload?: FlaSyncRequest,
): Promise<FlaSyncResponse> {
  const response = await http.post<FlaSyncResponse>(
    `/api/v1/fla/championnats/${championnatId}/seasons/${saisonId}/sync`,
    payload,
  )

  return response.data
}

export async function getTournamentFlaMappings(
  tournamentId: number,
): Promise<FlaTeamMappingResponse[]> {
  const response = await http.get<FlaTeamMappingResponse[]>(
    `/api/v1/fla-mappings/tournaments/${tournamentId}`,
  )

  return response.data
}

export async function getTeamFlaMapping(
  tournamentId: number,
  teamId: number,
): Promise<FlaTeamMappingResponse> {
  const response = await http.get<FlaTeamMappingResponse>(
    `/api/v1/fla-mappings/tournaments/${tournamentId}/teams/${teamId}`,
  )

  return response.data
}

export async function upsertTeamFlaMapping(
  tournamentId: number,
  teamId: number,
  payload: UpsertFlaTeamMappingRequest,
): Promise<FlaTeamMappingResponse> {
  const response = await http.put<FlaTeamMappingResponse>(
    `/api/v1/fla-mappings/tournaments/${tournamentId}/teams/${teamId}`,
    payload,
  )

  return response.data
}

export async function deleteTeamFlaMapping(
  tournamentId: number,
  teamId: number,
): Promise<void> {
  await http.delete(
    `/api/v1/fla-mappings/tournaments/${tournamentId}/teams/${teamId}`,
  )
}
