import { http } from './http'
import {
  generate as generateReport,
  get as getReport,
  getMetrics,
  history_,
  latest,
} from '../generated/match'
import { createClient } from '../generated/match/client'
import type { Client } from '../generated/match/client'
import type {
  OpponentAnalysisMetricsResponse,
  OpponentAnalysisReportResponse,
} from '../types/opponentAnalysis'

const OPPONENT_ANALYSIS_GENERATE_TIMEOUT_MS = 120000

const matchClient = createClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  fetch: axiosBackedFetch,
})

const generateFetch = createAxiosBackedFetch(
  OPPONENT_ANALYSIS_GENERATE_TIMEOUT_MS,
)

function buildAxiosHeaders(headers: Headers): Record<string, string> {
  const axiosHeaders: Record<string, string> = {}

  headers.forEach((value, key) => {
    axiosHeaders[key] = value
  })

  return axiosHeaders
}

function buildResponseBody(data: unknown): BodyInit | null {
  if (data === undefined || data === null) {
    return null
  }

  if (typeof data === 'string') {
    return data
  }

  return JSON.stringify(data)
}

function buildResponseHeaders(headers: Record<string, unknown>): Headers {
  const responseHeaders = new Headers()

  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => responseHeaders.append(key, String(item)))
      return
    }

    if (value !== undefined && value !== null) {
      responseHeaders.set(key, String(value))
    }
  })

  return responseHeaders
}

function getAxiosUrl(requestUrl: string): string {
  if (typeof window === 'undefined') {
    return requestUrl
  }

  const url = new URL(requestUrl)

  if (url.origin !== window.location.origin) {
    return requestUrl
  }

  return `${url.pathname}${url.search}${url.hash}`
}

function createAxiosBackedFetch(timeout?: number): typeof fetch {
  return async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const body =
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.clone().text()
    const response = await http.request({
      data: body || undefined,
      headers: buildAxiosHeaders(request.headers),
      method: request.method,
      signal: request.signal,
      timeout,
      validateStatus: () => true,
      url: getAxiosUrl(request.url),
    })

    return new Response(buildResponseBody(response.data), {
      headers: buildResponseHeaders(response.headers),
      status: response.status,
      statusText: response.statusText,
    })
  }
}

async function axiosBackedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = input instanceof Request ? input : new Request(input, init)
  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.clone().text()
  const response = await http.request({
    data: body || undefined,
    headers: buildAxiosHeaders(request.headers),
    method: request.method,
    signal: request.signal,
    validateStatus: () => true,
    url: getAxiosUrl(request.url),
  })

  return new Response(buildResponseBody(response.data), {
    headers: buildResponseHeaders(response.headers),
    status: response.status,
    statusText: response.statusText,
  })
}

function unwrapGeneratedResponse<T>(
  result: Awaited<ReturnType<Client['request']>>,
): T {
  if (typeof result === 'object' && result !== null) {
    if ('error' in result && result.error !== undefined) {
      throw result
    }

    if ('data' in result) {
      return result.data as T
    }
  }

  return result as T
}

export async function getOpponentAnalysisMetrics(
  matchId: number,
  forceRefresh = false,
): Promise<OpponentAnalysisMetricsResponse> {
  const response = await getMetrics({
    client: matchClient,
    path: { matchId },
    query: { forceRefresh },
  })

  return unwrapGeneratedResponse<OpponentAnalysisMetricsResponse>(response)
}

export async function generateOpponentAnalysis(
  matchId: number,
  forceRefresh = false,
): Promise<OpponentAnalysisReportResponse> {
  const response = await generateReport({
    client: matchClient,
    fetch: generateFetch,
    path: { matchId },
    query: { forceRefresh },
  })

  return unwrapGeneratedResponse<OpponentAnalysisReportResponse>(response)
}

export async function getLatestOpponentAnalysis(
  matchId: number,
): Promise<OpponentAnalysisReportResponse> {
  const response = await latest({
    client: matchClient,
    path: { matchId },
  })

  return unwrapGeneratedResponse<OpponentAnalysisReportResponse>(response)
}

export async function getOpponentAnalysisHistory(
  matchId: number,
): Promise<OpponentAnalysisReportResponse[]> {
  const response = await history_({
    client: matchClient,
    path: { matchId },
  })

  return unwrapGeneratedResponse<OpponentAnalysisReportResponse[]>(response)
}

export async function getOpponentAnalysisReport(
  reportId: number,
): Promise<OpponentAnalysisReportResponse> {
  const response = await getReport({
    client: matchClient,
    path: { reportId },
  })

  return unwrapGeneratedResponse<OpponentAnalysisReportResponse>(response)
}
