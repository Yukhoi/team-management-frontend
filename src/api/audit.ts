import { http } from './http'
import type {
  AuditLogParams,
  AuditLogResponse,
  PageResponseAuditLogResponse,
} from '../types/audit'

export async function getLogs(
  params?: AuditLogParams,
): Promise<PageResponseAuditLogResponse> {
  const response = await http.get<PageResponseAuditLogResponse>(
    '/api/audit/logs',
    { params },
  )

  return response.data
}

export const getAuditLogs = getLogs

export async function getLog(id: number): Promise<AuditLogResponse> {
  const response = await http.get<AuditLogResponse>(`/api/audit/logs/${id}`)

  return response.data
}

export const getAuditLogById = getLog
