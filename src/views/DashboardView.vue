<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getDashboard } from '../api/statistics'
import { useAuthStore } from '../stores/auth'
import type { DashboardStatisticsResponse } from '../types/statistics'

interface KpiItem {
  label: string
  value: number | string
}

const authStore = useAuthStore()

const dashboard = ref<DashboardStatisticsResponse | null>(null)
const loading = ref(false)
const error = ref(false)

const username = computed(() => authStore.currentUser?.username ?? '')
const roles = computed(() =>
  authStore.currentUser?.roles
    ?.map((role) => role.code ?? role.name ?? '')
    .filter(Boolean)
    .map((role) => role.replace(/^ROLE_/, '')) ?? [],
)

const hasDashboardData = computed(() => {
  if (!dashboard.value) {
    return false
  }

  return Object.values(dashboard.value).some(
    (value) => value !== undefined && value !== null && value !== '',
  )
})

const kpiItems = computed<KpiItem[]>(() => {
  const data = dashboard.value

  if (!data) {
    return []
  }

  return [
    {
      label: 'Total Matches',
      value: data.totalMatches ?? 0,
    },
    {
      label: 'Wins',
      value: data.wins ?? 0,
    },
    {
      label: 'Draws',
      value: data.draws ?? 0,
    },
    {
      label: 'Losses',
      value: data.losses ?? 0,
    },
    {
      label: 'Goals',
      value: data.goals ?? 0,
    },
    {
      label: 'Goals Against',
      value: data.goalsAgainst ?? 0,
    },
    {
      label: 'Top Scorer',
      value: data.topScorer ?? '-',
    },
    {
      label: 'Top Scorer Goals',
      value: data.topScorerGoals ?? 0,
    },
    {
      label: 'Top Assist',
      value: data.topAssist ?? '-',
    },
    {
      label: 'Top Assist Count',
      value: data.topAssistCount ?? 0,
    },
  ]
})

async function loadDashboard(): Promise<void> {
  loading.value = true
  error.value = false

  try {
    const response = await getDashboard()
    dashboard.value = response.data ?? null
  } catch {
    dashboard.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <section class="dashboard-page">
    <el-card class="dashboard-page__hero" shadow="never">
      <div class="dashboard-page__hero-content">
        <div>
          <h1>Dashboard</h1>
          <p>Team Management System Overview</p>
        </div>

        <div class="dashboard-page__welcome">
          <strong>Welcome, {{ username }}</strong>
          <span>Role(s):</span>
          <el-space wrap>
            <el-tag v-for="role in roles" :key="role" type="success">
              {{ role }}
            </el-tag>
          </el-space>
        </div>
      </div>
    </el-card>

    <el-skeleton v-if="loading" :rows="6" animated />

    <el-alert
      v-else-if="error"
      type="error"
      title="Failed to load dashboard data"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadDashboard">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-empty
      v-else-if="!hasDashboardData"
      description="No statistics available"
    />

    <el-row v-else :gutter="16">
      <el-col
        v-for="item in kpiItems"
        :key="item.label"
        :xs="24"
        :sm="12"
        :lg="6"
      >
        <el-card class="dashboard-page__kpi" shadow="never">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </el-card>
      </el-col>
    </el-row>
  </section>
</template>

<style scoped lang="scss">
.dashboard-page {
  display: grid;
  gap: 16px;

  &__hero,
  &__kpi {
    border-radius: 8px;
  }

  &__hero-content {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 650;
    letter-spacing: 0;
  }

  p {
    margin: 8px 0 0;
    color: var(--el-text-color-secondary);
  }

  &__welcome {
    display: grid;
    min-width: 180px;
    justify-items: end;
    gap: 8px;
    text-align: right;

    strong {
      font-size: 16px;
      font-weight: 650;
    }

    span {
      color: var(--el-text-color-secondary);
      font-size: 13px;
    }
  }

  &__kpi {
    margin-bottom: 16px;

    :deep(.el-card__body) {
      display: grid;
      min-height: 96px;
      align-content: space-between;
      gap: 12px;
    }

    span {
      color: var(--el-text-color-secondary);
      font-size: 13px;
    }

    strong {
      overflow-wrap: anywhere;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0;
    }
  }
}

@media (max-width: 760px) {
  .dashboard-page {
    &__hero-content {
      display: grid;
    }

    &__welcome {
      justify-items: start;
      text-align: left;
    }
  }
}
</style>
