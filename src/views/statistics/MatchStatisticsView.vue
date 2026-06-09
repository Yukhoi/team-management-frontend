<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { getMatchStatistics } from '../../api/statistics'
import type { MatchStatistics, MatchStatisticsParams } from '../../types/statistics'

const rows = ref<MatchStatistics[]>([])
const loading = ref(false)
const error = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tournamentId = ref<number>()

async function loadData(): Promise<void> {
  loading.value = true
  error.value = false

  const params: MatchStatisticsParams = {
    page: page.value - 1,
    size: pageSize.value,
    tournamentId: tournamentId.value,
  }

  try {
    const response = await getMatchStatistics(params)
    rows.value = response.data?.content ?? []
    total.value = response.data?.totalElements ?? 0
  } catch {
    rows.value = []
    total.value = 0
    error.value = true
  } finally {
    loading.value = false
  }
}

async function handlePageChange(nextPage: number): Promise<void> {
  page.value = nextPage
  await loadData()
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <section class="statistics-page">
    <el-card class="statistics-page__header" shadow="never">
      <div class="statistics-page__header-content">
        <h1>Match Statistics</h1>
        <el-form inline>
          <el-form-item label="Tournament ID">
            <el-input-number v-model="tournamentId" :min="1" />
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
      title="Failed to load match statistics"
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
        <el-table-column prop="matchId" label="Match ID" min-width="110" />
        <el-table-column prop="tournamentId" label="Tournament ID" min-width="130" />
        <el-table-column prop="tournamentName" label="Tournament" min-width="180" />
        <el-table-column prop="season" label="Season" min-width="100" />
        <el-table-column prop="matchTime" label="Match Time" min-width="190" />
        <el-table-column prop="opponentTeamName" label="Opponent" min-width="180" />
        <el-table-column prop="homeAway" label="Home/Away" min-width="120" />
        <el-table-column prop="ourScore" label="Our Score" min-width="110" />
        <el-table-column prop="opponentScore" label="Opponent Score" min-width="150" />
        <el-table-column prop="matchStatus" label="Status" min-width="120" />
        <el-table-column prop="finished" label="Finished" min-width="110" />
        <template #empty>
          <el-empty description="No match statistics found" />
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

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 650;
    letter-spacing: 0;
  }
}
</style>
