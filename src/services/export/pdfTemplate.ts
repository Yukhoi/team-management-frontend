import { rgb } from "pdf-lib";

export const leaderboardTemplatePath = `${import.meta.env.BASE_URL}templates/leaderboard-template.pdf`;

export const chineseFontPath = `${import.meta.env.BASE_URL}fonts/NotoSansSC-Regular.ttf`;

export const pdfTemplate = {
  page: {
    width: 595.28,
    height: 841.89,
  },
  title: {
    x: 297.64,
    y: 744,
  },
  subtitle: {
    x: 297.64,
    y: 710,
  },
  tableHeader: {
    y: 678,
  },
  row: {
    startY: 610,
    height: 28,
    maxRows: 18,
  },
  columns: {
    rank: 84,
    playerName: 156,
    mainValue: 372,
    appearances: 486,
  },
  fontSize: {
    title: 18,
    subtitle: 16,
    tableHeader: 11,
    row: 10,
  },
  color: {
    title: rgb(0.08, 0.1, 0.14),
    subtitle: rgb(0.16, 0.18, 0.24),
    tableHeader: rgb(1, 1, 1),
    row: rgb(0.12, 0.14, 0.18),
  },
} as const;
