import { chineseFontPath, leaderboardTemplatePath, pdfTemplate } from './pdfTemplate'
import {
  drawCenteredText,
  drawText,
  embedFontFromPath,
  loadPdfTemplate,
  savePdfAsBlob,
} from './pdfEngine'

export type LeaderboardPdfType = 'SCORER' | 'ASSIST' | 'APPEARANCE'

export interface LeaderboardPdfRow {
  rank: number
  playerName: string
  mainValue: string | number
  appearances?: number
}

export interface LeaderboardPdfOptions {
  type: LeaderboardPdfType
  clubName: string
  seasonLabel: string
  tournamentName: string
  rows: LeaderboardPdfRow[]
  filename?: string
}

interface LeaderboardCopy {
  subtitle: string
  headers: string[]
}

const copyByType: Record<LeaderboardPdfType, LeaderboardCopy> = {
  SCORER: {
    subtitle: '队内射手榜',
    headers: ['排名', '球员', '进球数(点球)', '出场'],
  },
  ASSIST: {
    subtitle: '队内助攻榜',
    headers: ['排名', '球员', '助攻数', '出场'],
  },
  APPEARANCE: {
    subtitle: '队内出场榜',
    headers: ['排名', '球员', '出场次数'],
  },
}

export async function generateLeaderboardPdf(options: LeaderboardPdfOptions): Promise<Blob> {
  const { pdfDoc, page, defaultFont } = await loadPdfTemplate(leaderboardTemplatePath)
  const embeddedChineseFont = await embedFontFromPath(pdfDoc, chineseFontPath)
  const font = embeddedChineseFont ?? defaultFont
  const copy = copyByType[options.type]
  const title = `${options.clubName}${options.seasonLabel}`
  const subtitle = `${options.tournamentName}${copy.subtitle}`

  await drawCenteredText({
    pdfDoc,
    page,
    text: title,
    centerX: pdfTemplate.title.x,
    y: pdfTemplate.title.y,
    size: pdfTemplate.fontSize.title,
    color: pdfTemplate.color.title,
    font,
  })

  await drawCenteredText({
    pdfDoc,
    page,
    text: subtitle,
    centerX: pdfTemplate.subtitle.x,
    y: pdfTemplate.subtitle.y,
    size: pdfTemplate.fontSize.subtitle,
    color: pdfTemplate.color.subtitle,
    font,
  })

  await drawTableHeader(pdfDoc, page, font, copy.headers)
  await drawRows(pdfDoc, page, font, options.type, options.rows)

  return savePdfAsBlob(pdfDoc)
}

async function drawTableHeader(
  pdfDoc: Parameters<typeof drawText>[0]['pdfDoc'],
  page: Parameters<typeof drawText>[0]['page'],
  font: Parameters<typeof drawText>[0]['font'],
  headers: string[],
): Promise<void> {
  const headerPositions = [
    pdfTemplate.columns.rank,
    pdfTemplate.columns.playerName,
    pdfTemplate.columns.mainValue,
    pdfTemplate.columns.appearances,
  ]

  await Promise.all(
    headers.map((header, index) =>
      drawText({
        pdfDoc,
        page,
        text: header,
        x: headerPositions[index] ?? pdfTemplate.columns.appearances,
        y: pdfTemplate.tableHeader.y,
        size: pdfTemplate.fontSize.tableHeader,
        color: pdfTemplate.color.tableHeader,
        font,
      }),
    ),
  )
}

async function drawRows(
  pdfDoc: Parameters<typeof drawText>[0]['pdfDoc'],
  page: Parameters<typeof drawText>[0]['page'],
  font: Parameters<typeof drawText>[0]['font'],
  type: LeaderboardPdfType,
  rows: LeaderboardPdfRow[],
): Promise<void> {
  const visibleRows = rows.slice(0, pdfTemplate.row.maxRows)

  for (const [index, row] of visibleRows.entries()) {
    const y = pdfTemplate.row.startY - index * pdfTemplate.row.height

    await drawText({
      pdfDoc,
      page,
      text: String(row.rank),
      x: pdfTemplate.columns.rank,
      y,
      size: pdfTemplate.fontSize.row,
      color: pdfTemplate.color.row,
      font,
    })

    await drawText({
      pdfDoc,
      page,
      text: row.playerName,
      x: pdfTemplate.columns.playerName,
      y,
      size: pdfTemplate.fontSize.row,
      color: pdfTemplate.color.row,
      font,
    })

    await drawText({
      pdfDoc,
      page,
      text: String(row.mainValue),
      x: pdfTemplate.columns.mainValue,
      y,
      size: pdfTemplate.fontSize.row,
      color: pdfTemplate.color.row,
      font,
    })

    if (type !== 'APPEARANCE') {
      await drawText({
        pdfDoc,
        page,
        text: row.appearances === undefined ? '-' : String(row.appearances),
        x: pdfTemplate.columns.appearances,
        y,
        size: pdfTemplate.fontSize.row,
        color: pdfTemplate.color.row,
        font,
      })
    }
  }
}
