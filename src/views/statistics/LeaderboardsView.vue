<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { getLeaderboards } from '../../api/statistics'
import type {
  Leaderboard,
  LeaderboardBoardType,
  LeaderboardStatisticsParams,
} from '../../types/statistics'

const boardTypeOptions: LeaderboardBoardType[] = [
  'SCORER',
  'ASSIST',
  'APPEARANCE',
  'GOAL_INVOLVEMENT',
]

const rows = ref<Leaderboard[]>([])
const loading = ref(false)
const error = ref(false)

const filters = reactive<LeaderboardStatisticsParams>({
  boardType: 'SCORER',
  season: '2026',
  tournamentId: 1,
  topN: 20,
})

async function loadData(): Promise<void> {
  if (!filters.boardType || !filters.season || !filters.tournamentId) {
    return
  }

  loading.value = true
  error.value = false

  try {
    const response = await getLeaderboards(filters)
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
            <el-input v-model="filters.season" />
          </el-form-item>
          <el-form-item label="Tournament ID">
            <el-input-number v-model="filters.tournamentId" :min="1" />
          </el-form-item>
          <el-form-item label="Top N">
            <el-input-number v-model="filters.topN" :min="1" />
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
      title="Failed to load leaderboards"
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
