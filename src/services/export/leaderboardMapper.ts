import type {
  LeaderboardPdfRow,
  LeaderboardPdfType,
} from './leaderboardExporter'
import type { Leaderboard } from '../../types/statistics'

const exportTypeLabels: Record<LeaderboardPdfType, string> = {
  SCORER: '射手榜',
  ASSIST: '助攻榜',
  APPEARANCE: '出场榜',
}

export function mapLeaderboardToPdfRows(
  type: LeaderboardPdfType,
  leaderboards: Leaderboard[],
): LeaderboardPdfRow[] {
  return leaderboards.map((leaderboard, index) => ({
    rank: leaderboard.rankNo ?? index + 1,
    playerName: leaderboard.entityName ?? buildFallbackPlayerName(leaderboard, index),
    mainValue: leaderboard.metricValue ?? 0,
    appearances: type === 'APPEARANCE' ? undefined : undefined,
  }))
}

export function buildLeaderboardPdfFilename(
  clubName: string,
  season: string,
  tournamentName: string,
  type: LeaderboardPdfType,
): string {
  const rawFilename = [
    clubName,
    season,
    tournamentName,
    exportTypeLabels[type],
  ].join('-')

  return `${sanitizeFilename(rawFilename)}.pdf`
}

export function buildSeasonLabel(season?: string): string {
  const normalizedSeason = season?.trim()

  if (!normalizedSeason) {
    return ''
  }

  if (normalizedSeason.endsWith('赛季')) {
    return normalizedSeason
  }

  return `${normalizedSeason}赛季`
}

export function getLeaderboardExportTypeLabel(type: LeaderboardPdfType): string {
  return exportTypeLabels[type]
}

function buildFallbackPlayerName(leaderboard: Leaderboard, index: number): string {
  if (leaderboard.entityId) {
    return `Player ${leaderboard.entityId}`
  }

  return `Player ${index + 1}`
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .trim()
}
