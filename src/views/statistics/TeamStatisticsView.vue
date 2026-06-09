<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { getTeamStatistics } from '../../api/statistics'
import type { TeamStatistics, TeamStatisticsParams } from '../../types/statistics'

const rows = ref<TeamStatistics[]>([])
const loading = ref(false)
const error = ref(false)

const filters = reactive<TeamStatisticsParams>({
  season: '2026',
  tournamentId: 1,
})

async function loadData(): Promise<void> {
  if (!filters.season || !filters.tournamentId) {
    return
  }

  loading.value = true
  error.value = false

  try {
    const response = await getTeamStatistics(filters)
    rows.value = response.data ?? []
  } catch {
    rows.value = []
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadData()
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
          <el-form-item label="Tournament ID">
            <el-input-number v-model="filters.tournamentId" :min="1" />
          </el-form-item>
          <el-button type="primary" :disabled="loading" @click="loadData">
            Search
          </el-button>
        </el-form>
      </div>
    </el-card>

    <el-skeleton v-if="loading" :rows="6" animated />
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
        <el-table-column prop="teamId" label="Team ID" min-width="110" />
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
        <el-table-column prop="tournamentId" label="Tournament ID" min-width="130" />
        <el-table-column prop="tournamentName" label="Tournament" min-width="180" />
        <template #empty>
          <el-empty description="No team statistics found" />
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

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 650;
    letter-spacing: 0;
  }
}
</style>
