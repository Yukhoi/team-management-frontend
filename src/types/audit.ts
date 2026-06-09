export interface ErrorResponse {
  message?: string
}

export interface AuditLogResponse {
  id: number
  eventId?: string
  eventType: string
  bizType: string
  bizId?: number
  operatorUserId?: number
  operatorUsername?: string
  operatorNameSnapshot?: string
  traceId?: string
  beforeData?: string
  afterData?: string
  operatedAt?: string
  data?: string
  aggregateType?: string
  aggregateId?: number
  userId?: number
  occurredAt?: string
  username?: string
  createdAt?: string
}

export type AuditLog = AuditLogResponse
export type AuditLogDetail = AuditLogResponse

export interface PageResponseAuditLogResponse {
  content?: AuditLogResponse[]
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
}

export interface AuditLogParams {
  page?: number
  size?: number
  eventType?: string
  aggregateType?: string
  aggregateId?: number
  username?: string
  from?: string
  to?: string
}

export type AuditLogQuery = AuditLogParams
export type AuditLogListResponse = PageResponseAuditLogResponse
