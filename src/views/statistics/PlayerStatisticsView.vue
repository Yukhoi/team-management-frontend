<script setup lang="ts">
import { isAxiosError } from 'axios'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import { getPlayerStatistics } from '../../api/statistics'
import { getTournaments } from '../../api/tournament'
import type {
  ErrorResponse,
  PlayerStatistics,
  PlayerStatisticsParams,
} from '../../types/statistics'
import type { TournamentResponse } from '../../types/tournament'

type SortByOption = {
  label: string
  value: NonNullable<PlayerStatisticsParams['sortBy']>
}

type DirectionOption = {
  label: string
  value: NonNullable<PlayerStatisticsParams['direction']>
}

const rows = ref<PlayerStatistics[]>([])
const tournaments = ref<TournamentResponse[]>([])
const loading = ref(false)
const tournamentLoading = ref(false)
const error = ref(false)
const errorMessage = ref('Failed to load player statistics')
const filtersReady = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const debounceTimer = ref<ReturnType<typeof setTimeout>>()
const currentYear = String(new Date().getFullYear())

const filters = reactive<PlayerStatisticsParams>({
  season: currentYear,
  tournamentId: undefined,
  sortBy: 'goals',
  direction: 'desc',
})

const sortByOptions: SortByOption[] = [
  {
    label: 'Goals',
    value: 'goals',
  },
  {
    label: 'Assists',
    value: 'assists',
  },
  {
    label: 'Appearances',
    value: 'appearances',
  },
  {
    label: 'Goal Involvements',
    value: 'goalInvolvements',
  },
  {
    label: 'Starts',
    value: 'starts',
  },
]

const directionOptions: DirectionOption[] = [
  {
    label: 'Descending',
    value: 'desc',
  },
  {
    label: 'Ascending',
    value: 'asc',
  },
]

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

function buildParams(): PlayerStatisticsParams | null {
  if (!filters.season || !filters.tournamentId || !filters.sortBy || !filters.direction) {
    return null
  }

  return {
    season: filters.season,
    tournamentId: filters.tournamentId,
    sortBy: filters.sortBy,
    direction: filters.direction,
    page: page.value - 1,
    size: pageSize.value,
  }
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

async function loadData(): Promise<void> {
  const params = buildParams()

  if (!params) {
    rows.value = []
    total.value = 0
    error.value = false
    return
  }

  loading.value = true
  error.value = false
  errorMessage.value = 'Failed to load player statistics'

  try {
    const response = await getPlayerStatistics(params)
    rows.value = response.data?.content ?? []
    total.value = response.data?.totalElements ?? 0
  } catch (errorValue) {
    rows.value = []
    total.value = 0
    errorMessage.value = getErrorMessage(errorValue, 'Failed to load player statistics')
    error.value = true
  } finally {
    loading.value = false
  }
}

function scheduleLoad(): void {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }

  debounceTimer.value = setTimeout(() => {
    page.value = 1
    void loadData()
  }, 300)
}

async function handlePageChange(nextPage: number): Promise<void> {
  page.value = nextPage
  await loadData()
}

watch(
  () => [filters.season, filters.tournamentId, filters.sortBy, filters.direction],
  () => {
    if (!filtersReady.value) {
      return
    }

    scheduleLoad()
  },
)

onMounted(async () => {
  await loadTournamentOptions()
  filtersReady.value = true
  await loadData()
})

onBeforeUnmount(() => {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
})
</script>

<template>
  <section class="statistics-page">
    <el-card class="statistics-page__header" shadow="never">
      <div class="statistics-page__header-content">
        <h1>Player Statistics</h1>
        <el-form inline>
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
              clearable
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
          <el-form-item label="Sort By">
            <el-select v-model="filters.sortBy" class="statistics-page__select">
              <el-option
                v-for="item in sortByOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Direction">
            <el-select v-model="filters.direction" class="statistics-page__select">
              <el-option
                v-for="item in directionOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-button type="primary" :disabled="loading" @click="loadData">
            Refresh
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
        <el-table-column prop="playerId" label="Player ID" min-width="110" />
        <el-table-column prop="playerName" label="Player" min-width="160" />
        <el-table-column prop="season" label="Season" min-width="100" />
        <el-table-column prop="tournamentId" label="Tournament ID" min-width="130" />
        <el-table-column prop="tournamentName" label="Tournament" min-width="180" />
        <el-table-column prop="appearances" label="Appearances" min-width="130" sortable />
        <el-table-column prop="starts" label="Starts" min-width="100" sortable />
        <el-table-column prop="goals" label="Goals" min-width="100" sortable />
        <el-table-column prop="assists" label="Assists" min-width="100" sortable />
        <el-table-column prop="goalInvolvements" label="Goal Involvements" min-width="170" sortable />
        <template #empty>
          <el-empty description="No player statistics found" />
        </template>
      </el-table>

      <el-pagination
        class="statistics-page__pagination"
        background
        layout="prev, pager, next"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        @current-change="handlePageChange"
      />
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

  &__pagination {
    margin-top: 16px;
    justify-content: flex-end;
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
