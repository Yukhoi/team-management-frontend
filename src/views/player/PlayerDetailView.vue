<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getPlayerById } from '../../api/player'
import type { PlayerCurrentStatus, PlayerResponse } from '../../types/player'

const route = useRoute()
const router = useRouter()

const player = ref<PlayerResponse | null>(null)
const loading = ref(false)
const error = ref(false)

const playerId = computed(() => Number(route.params.id))
const hasPlayerData = computed(() => {
  if (!player.value) {
    return false
  }

  return Object.values(player.value).some(
    (value) => value !== undefined && value !== null && value !== '',
  )
})

function getStatusTagType(status?: PlayerCurrentStatus): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'ACTIVE') {
    return 'success'
  }

  if (status === 'INJURED') {
    return 'warning'
  }

  if (status === 'SUSPENDED') {
    return 'danger'
  }

  return 'info'
}

async function loadPlayer(): Promise<void> {
  if (!Number.isFinite(playerId.value)) {
    error.value = true
    return
  }

  loading.value = true
  error.value = false

  try {
    const response = await getPlayerById(playerId.value)
    player.value = response.data ?? null
  } catch {
    player.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

async function goBack(): Promise<void> {
  await router.push('/players')
}

onMounted(() => {
  void loadPlayer()
})
</script>

<template>
  <section class="player-detail">
    <el-card class="player-detail__header" shadow="never">
      <div class="player-detail__header-content">
        <h1>Player Detail</h1>

        <el-button @click="goBack">
          Back
        </el-button>
      </div>
    </el-card>

    <el-skeleton v-if="loading" :rows="6" animated />

    <el-alert
      v-else-if="error"
      type="error"
      title="Failed to load player detail"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadPlayer">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-empty v-else-if="!hasPlayerData" description="No player detail found" />

    <el-card v-else class="player-detail__content" shadow="never">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="ID">
          {{ player?.id }}
        </el-descriptions-item>
        <el-descriptions-item label="Team ID">
          {{ player?.teamId }}
        </el-descriptions-item>
        <el-descriptions-item label="Team Name">
          {{ player?.teamName }}
        </el-descriptions-item>
        <el-descriptions-item label="Name">
          {{ player?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="Jersey Number">
          {{ player?.jerseyNumber }}
        </el-descriptions-item>
        <el-descriptions-item label="Birth Date">
          {{ player?.birthDate }}
        </el-descriptions-item>
        <el-descriptions-item label="Phone">
          {{ player?.phone }}
        </el-descriptions-item>
        <el-descriptions-item label="Position">
          {{ player?.position }}
        </el-descriptions-item>
        <el-descriptions-item label="Registration Status">
          {{ player?.registrationStatus }}
        </el-descriptions-item>
        <el-descriptions-item label="Current Status">
          <el-tag :type="getStatusTagType(player?.currentStatus)">
            {{ player?.currentStatus }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Joined Date">
          {{ player?.joinedDate }}
        </el-descriptions-item>
        <el-descriptions-item label="Left Date">
          {{ player?.leftDate }}
        </el-descriptions-item>
        <el-descriptions-item label="Remark">
          {{ player?.remark }}
        </el-descriptions-item>
        <el-descriptions-item label="Created At">
          {{ player?.createdAt }}
        </el-descriptions-item>
        <el-descriptions-item label="Updated At">
          {{ player?.updatedAt }}
        </el-descriptions-item>
        <el-descriptions-item label="Version">
          {{ player?.version }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </section>
</template>

<style scoped lang="scss">
.player-detail {
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
  .player-detail {
    :deep(.el-descriptions__body .el-descriptions__table) {
      display: block;
    }
  }
}
</style>
