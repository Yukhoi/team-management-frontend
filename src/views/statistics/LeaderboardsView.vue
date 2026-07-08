<script setup lang="ts">
import { isAxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'

import { getLeaderboards } from '../../api/statistics'
import { getTournaments } from '../../api/tournament'
import { downloadBlob } from '../../services/export/download'
import { generateLeaderboardPdf } from '../../services/export/leaderboardExporter'
import {
  buildLeaderboardPdfFilename,
  buildSeasonLabel,
  getLeaderboardExportTypeLabel,
  mapLeaderboardToPdfRows,
} from '../../services/export/leaderboardMapper'
import type {
  ErrorResponse,
  Leaderboard,
  LeaderboardBoardType,
  LeaderboardStatisticsParams,
} from '../../types/statistics'
import type { TournamentResponse } from '../../types/tournament'
import type { LeaderboardPdfType } from '../../services/export/leaderboardExporter'

interface AppliedLeaderboardContext {
  boardType: LeaderboardBoardType
  pdfType: LeaderboardPdfType
  season: string
  tournamentId: number
  tournamentName: string
  topN: number
}

const clubName = '巴黎夜枭足球俱乐部'
const currentYear = String(new Date().getFullYear())

const boardTypeOptions: LeaderboardBoardType[] = [
  'GOAL',
  'ASSIST',
  'APPEARANCE',
]

const rows = ref<Leaderboard[]>([])
const tournaments = ref<TournamentResponse[]>([])
const loading = ref(false)
const tournamentLoading = ref(false)
const error = ref(false)
const errorMessage = ref('Failed to load leaderboards')
const exporting = ref(false)
const appliedLeaderboardContext = ref<AppliedLeaderboardContext | null>(null)

const filters = reactive<LeaderboardStatisticsParams>({
  boardType: 'GOAL',
  season: currentYear,
  tournamentId: undefined,
  topN: 20,
})

const seasonOptions = computed(() => {
  const seasonSet = new Set<string>([currentYear])

  tournaments.value.forEach((tournament) => {
    if (tournament.season) {
      seasonSet.add(tournament.season)
    }
  })

  return [...seasonSet].sort((first, second) => second.localeCompare(first))
})

const visibleTournaments = computed(() => {
  return tournaments.value.filter((tournament) => {
    if (!tournament.id || !tournament.name) {
      return false
    }

    return !filters.season || tournament.season === filters.season
  })
})

function getTournamentNameById(tournamentId: number): string {
  const selectedTournament = tournaments.value.find(
    (tournament) => tournament.id === tournamentId,
  )

  return selectedTournament?.name ?? `Tournament ${tournamentId}`
}

function getPdfTypeForBoardType(
  boardType?: LeaderboardBoardType,
): LeaderboardPdfType | null {
  switch (boardType) {
    case 'GOAL':
    case 'SCORER':
      return 'SCORER'
    case 'ASSIST':
      return 'ASSIST'
    case 'APPEARANCE':
      return 'APPEARANCE'
    default:
      return null
  }
}

function getApiBoardType(boardType: LeaderboardBoardType): LeaderboardBoardType {
  return boardType === 'GOAL' ? 'SCORER' : boardType
}

function getErrorMessage(errorValue: unknown, fallback: string): string {
  if (isAxiosError<ErrorResponse>(errorValue)) {
    const responseData = errorValue.response?.data
    const backendMessage = responseData?.data
      ? Object.values(responseData.data)[0]
      : undefined

    if (backendMessage) {
      return backendMessage
    }
  }

  if (errorValue instanceof Error && errorValue.message) {
    return errorValue.message
  }

  return fallback
}

async function loadTournamentOptions(): Promise<void> {
  tournamentLoading.value = true

  try {
    const response = await getTournaments({
      page: 0,
      size: 100,
    })

    tournaments.value = response.content ?? []

    if (!filters.tournamentId) {
      const firstTournament = visibleTournaments.value[0] ?? tournaments.value.find(
        (tournament) => tournament.id,
      )

      filters.tournamentId = firstTournament?.id
    }
  } catch (errorValue) {
    errorMessage.value = getErrorMessage(errorValue, 'Failed to load tournaments')
    error.value = true
  } finally {
    tournamentLoading.value = false
  }
}

function buildLeaderboardParams(
  boardType: LeaderboardBoardType,
): LeaderboardStatisticsParams | null {
  if (!filters.season || !filters.tournamentId) {
    return null
  }

  return {
    boardType: getApiBoardType(boardType),
    season: filters.season,
    tournamentId: filters.tournamentId,
    topN: filters.topN,
  }
}

async function loadData(): Promise<void> {
  const selectedBoardType = filters.boardType
  const params = selectedBoardType ? buildLeaderboardParams(selectedBoardType) : null

  if (!params) {
    rows.value = []
    appliedLeaderboardContext.value = null
    error.value = false
    return
  }

  loading.value = true
  error.value = false
  errorMessage.value = 'Failed to load leaderboards'

  try {
    const response = await getLeaderboards(params)
    const pdfType = getPdfTypeForBoardType(selectedBoardType)

    rows.value = response.data ?? []
    appliedLeaderboardContext.value =
      selectedBoardType && pdfType && params.season && params.tournamentId
        ? {
            boardType: selectedBoardType,
            pdfType,
            season: params.season,
            tournamentId: params.tournamentId,
            tournamentName: getTournamentNameById(params.tournamentId),
            topN: params.topN ?? rows.value.length,
          }
        : null
  } catch (errorValue) {
    rows.value = []
    appliedLeaderboardContext.value = null
    errorMessage.value = getErrorMessage(errorValue, 'Failed to load leaderboards')
    error.value = true
  } finally {
    loading.value = false
  }
}

async function exportLeaderboardPdf(): Promise<void> {
  const context = appliedLeaderboardContext.value

  if (!context) {
    ElMessage.warning('Please search leaderboards before exporting')
    return
  }

  exporting.value = true

  try {
    const tableRows = rows.value.slice(0, context.topN)
    const exportRows = mapLeaderboardToPdfRows(context.pdfType, tableRows)

    if (exportRows.length === 0) {
      ElMessage.warning('No leaderboard data to export')
      return
    }

    const filename = buildLeaderboardPdfFilename(
      clubName,
      context.season,
      context.tournamentName,
      context.pdfType,
    )
    const blob = await generateLeaderboardPdf({
      type: context.pdfType,
      clubName,
      seasonLabel: buildSeasonLabel(context.season),
      tournamentName: context.tournamentName,
      rows: exportRows,
      filename,
    })

    downloadBlob(blob, filename)
    ElMessage.success(
      `${getLeaderboardExportTypeLabel(context.pdfType)} PDF exported successfully`,
    )
  } catch (errorValue) {
    console.error('Failed to export leaderboard PDF', errorValue)
    ElMessage.error(getErrorMessage(errorValue, 'Failed to export leaderboard PDF'))
  } finally {
    exporting.value = false
  }
}

watch(
  () => filters.season,
  () => {
    if (!filters.tournamentId) {
      return
    }

    const selectedTournamentIsVisible = visibleTournaments.value.some(
      (tournament) => tournament.id === filters.tournamentId,
    )

    if (!selectedTournamentIsVisible) {
      filters.tournamentId = visibleTournaments.value[0]?.id
    }
  },
)

onMounted(async () => {
  await loadTournamentOptions()
  await loadData()
})
</script>

<template>
  <section class="statistics-page">
    <el-card class="statistics-page__header" shadow="never">
      <div class="statistics-page__header-content">
        <h1>Leaderboards</h1>
        <el-form inline>
          <el-form-item label="Board Type">
            <el-select v-model="filters.boardType" class="statistics-page__select">
              <el-option
                v-for="item in boardTypeOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Season">
            <el-select v-model="filters.season" class="statistics-page__select">
              <el-option
                v-for="season in seasonOptions"
                :key="season"
                :label="season"
                :value="season"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Tournament">
            <el-select
              v-model="filters.tournamentId"
              class="statistics-page__select"
              filterable
              :loading="tournamentLoading"
              placeholder="Select tournament"
            >
              <el-option
                v-for="tournament in visibleTournaments"
                :key="tournament.id"
                :label="tournament.name"
                :value="tournament.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Top N">
            <el-input-number v-model="filters.topN" :min="1" />
          </el-form-item>
          <el-button type="primary" :disabled="loading" @click="loadData">
            Search
          </el-button>
          <el-button type="success" :loading="exporting" @click="exportLeaderboardPdf">
            Export PDF
          </el-button>
        </el-form>
      </div>
    </el-card>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-alert
      v-else-if="error"
      :title="errorMessage"
      type="error"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadData">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-card v-else class="statistics-page__table-card" shadow="never">
      <el-table :data="rows" stripe>
        <el-table-column prop="rankNo" label="Rank" min-width="90" sortable />
        <el-table-column prop="entityId" label="Entity ID" min-width="120" />
        <el-table-column prop="entityName" label="Entity" min-width="180" />
        <el-table-column prop="metricValue" label="Metric Value" min-width="140" sortable />
        <el-table-column prop="boardType" label="Board Type" min-width="170" />
        <el-table-column prop="season" label="Season" min-width="100" />
        <el-table-column prop="tournamentId" label="Tournament ID" min-width="130" />
        <template #empty>
          <el-empty description="No leaderboards found" />
        </template>
      </el-table>
    </el-card>
  </section>
</template>

<style scoped lang="scss">
.statistics-page {
  display: grid;
  gap: 16px;

  &__header,
  &__table-card {
    border-radius: 8px;
  }

  &__header-content {
    display: grid;
    gap: 16px;
  }

  &__select {
    width: 190px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 650;
    letter-spacing: 0;
  }
}
</style>
