<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getTournamentById } from '../../api/tournament'
import type { TournamentResponse, TournamentStatus } from '../../types/tournament'

const route = useRoute()
const router = useRouter()

const tournament = ref<TournamentResponse | null>(null)
const loading = ref(false)
const error = ref(false)

const tournamentId = computed(() => Number(route.params.id))
const hasTournamentData = computed(() => {
  if (!tournament.value) {
    return false
  }

  return Object.values(tournament.value).some(
    (value) => value !== undefined && value !== null && value !== '',
  )
})

function getStatusTagType(status?: TournamentStatus): 'success' | 'warning' | 'info' {
  if (status === 'ACTIVE') {
    return 'success'
  }

  if (status === 'FINISHED') {
    return 'info'
  }

  return 'warning'
}

async function loadTournament(): Promise<void> {
  if (!Number.isFinite(tournamentId.value)) {
    error.value = true
    return
  }

  loading.value = true
  error.value = false

  try {
    tournament.value = await getTournamentById(tournamentId.value)
  } catch {
    tournament.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

async function goBack(): Promise<void> {
  await router.push('/tournaments')
}

onMounted(() => {
  void loadTournament()
})
</script>

<template>
  <section class="tournament-detail">
    <el-card class="tournament-detail__header" shadow="never">
      <div class="tournament-detail__header-content">
        <h1>Tournament Detail</h1>

        <el-button @click="goBack">
          Back
        </el-button>
      </div>
    </el-card>

    <el-skeleton v-if="loading" :rows="6" animated />

    <el-alert
      v-else-if="error"
      type="error"
      title="Failed to load tournament detail"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadTournament">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-empty
      v-else-if="!hasTournamentData"
      description="No tournament detail found"
    />

    <el-card v-else class="tournament-detail__content" shadow="never">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="ID">
          {{ tournament?.id }}
        </el-descriptions-item>
        <el-descriptions-item label="Name">
          {{ tournament?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="Tournament Type">
          {{ tournament?.tournamentType }}
        </el-descriptions-item>
        <el-descriptions-item label="Season">
          {{ tournament?.season }}
        </el-descriptions-item>
        <el-descriptions-item label="Start Date">
          {{ tournament?.startDate }}
        </el-descriptions-item>
        <el-descriptions-item label="End Date">
          {{ tournament?.endDate }}
        </el-descriptions-item>
        <el-descriptions-item label="Organizer">
          {{ tournament?.organizer }}
        </el-descriptions-item>
        <el-descriptions-item label="Status">
          <el-tag :type="getStatusTagType(tournament?.status)">
            {{ tournament?.status }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Description">
          {{ tournament?.description }}
        </el-descriptions-item>
        <el-descriptions-item label="Created At">
          {{ tournament?.createdAt }}
        </el-descriptions-item>
        <el-descriptions-item label="Updated At">
          {{ tournament?.updatedAt }}
        </el-descriptions-item>
        <el-descriptions-item label="Version">
          {{ tournament?.version }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </section>
</template>

<style scoped lang="scss">
.tournament-detail {
  display: grid;
  gap: 16px;

  &__header,
  &__content {
    border-radius: 8px;
  }

  &__header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 650;
    letter-spacing: 0;
  }
}

@media (max-width: 760px) {
  .tournament-detail {
    :deep(.el-descriptions__body .el-descriptions__table) {
      display: block;
    }
  }
}
</style>
