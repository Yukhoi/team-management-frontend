<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { getTeamStatistics } from '../../api/statistics'
import { getTournaments } from '../../api/tournament'
import type { TeamStatistics, TeamStatisticsParams } from '../../types/statistics'
import type { TournamentResponse } from '../../types/tournament'

const rows = ref<TeamStatistics[]>([])
const tournaments = ref<TournamentResponse[]>([])
const loading = ref(false)
const tournamentLoading = ref(false)
const tournamentError = ref(false)
const error = ref(false)
let latestRequest = 0

const filters = reactive<TeamStatisticsParams>({
  season: '2026',
  tournamentId: undefined,
})

async function loadTournamentOptions(): Promise<void> {
  tournamentLoading.value = true
  tournamentError.value = false

  try {
    const response = await getTournaments({ page: 0, size: 100 })
    tournaments.value = (response.content ?? []).filter(
      (tournament) => tournament.id && tournament.name,
    )

    if (!filters.tournamentId) {
      const firstTournament = tournaments.value.find(
        (tournament) => tournament.season === filters.season,
      ) ?? tournaments.value[0]
      filters.tournamentId = firstTournament?.id
    }
  } catch {
    tournaments.value = []
    rows.value = []
    tournamentError.value = true
  } finally {
    tournamentLoading.value = false
  }

  if (!tournamentError.value) {
    await loadData()
  }
}

async function loadData(): Promise<void> {
  const request = ++latestRequest

  if (!filters.season || !filters.tournamentId) {
    rows.value = []
    loading.value = false
    error.value = false
    return
  }

  loading.value = true
  error.value = false

  try {
    const response = await getTeamStatistics({ ...filters })
    if (request === latestRequest) {
      rows.value = response.data ?? []
    }
  } catch {
    if (request === latestRequest) {
      rows.value = []
      error.value = true
    }
  } finally {
    if (request === latestRequest) {
      loading.value = false
    }
  }
}

onMounted(() => {
  void loadTournamentOptions()
})
</script>

<template>
  <section class="statistics-page">
    <el-card class="statistics-page__header" shadow="never">
      <div class="statistics-page__header-content">
        <h1>Team Statistics</h1>
        <el-form inline>
          <el-form-item label="Season">
            <el-input v-model="filters.season" />
          </el-form-item>
          <el-form-item label="Tournament">
            <el-select
              v-model="filters.tournamentId"
              class="statistics-page__select"
              clearable
              filterable
              :loading="tournamentLoading"
              :disabled="tournamentLoading || tournamentError"
              placeholder="Select tournament"
              no-data-text="No tournaments found"
              @change="loadData"
            >
              <el-option
                v-for="tournament in tournaments"
                :key="tournament.id"
                :label="tournament.name"
                :value="tournament.id"
              />
            </el-select>
          </el-form-item>
          <el-button
            type="primary"
            :disabled="loading || tournamentLoading || tournamentError"
            @click="loadData"
          >
            Search
          </el-button>
        </el-form>
      </div>
      <el-alert
        v-if="tournamentError"
        title="Failed to load tournaments"
        type="error"
        show-icon
        :closable="false"
      >
        <template #default>
          <el-button type="danger" plain size="small" @click="loadTournamentOptions">
            Retry
          </el-button>
        </template>
      </el-alert>
    </el-card>

    <el-skeleton v-if="loading || tournamentLoading" :rows="6" animated />
    <el-alert
      v-else-if="error"
      title="Failed to load team statistics"
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
        <el-table-column prop="teamName" label="Team" min-width="160" />
        <el-table-column prop="played" label="Played" min-width="100" sortable />
        <el-table-column prop="win" label="Wins" min-width="90" sortable />
        <el-table-column prop="draw" label="Draws" min-width="90" sortable />
        <el-table-column prop="lose" label="Losses" min-width="100" sortable />
        <el-table-column prop="goalsFor" label="Goals For" min-width="120" sortable />
        <el-table-column prop="goalsAgainst" label="Goals Against" min-width="150" sortable />
        <el-table-column prop="goalDiff" label="Goal Diff" min-width="120" sortable />
        <el-table-column prop="points" label="Points" min-width="100" sortable />
        <el-table-column prop="season" label="Season" min-width="100" />
        <el-table-column prop="tournamentName" label="Tournament" min-width="180" />
        <template #empty>
          <el-empty
            :description="filters.tournamentId
              ? 'No team statistics found'
              : 'Select a tournament to view team statistics'"
          />
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
