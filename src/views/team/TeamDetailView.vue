<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getTeamById } from '../../api/team'
import type { TeamResponse } from '../../types/team'

const route = useRoute()
const router = useRouter()

const team = ref<TeamResponse | null>(null)
const loading = ref(false)
const error = ref(false)

const teamId = computed(() => Number(route.params.id))
const hasTeamData = computed(() => {
  if (!team.value) {
    return false
  }

  return Object.values(team.value).some(
    (value) => value !== undefined && value !== null && value !== '',
  )
})

async function loadTeam(): Promise<void> {
  if (!Number.isFinite(teamId.value)) {
    error.value = true
    return
  }

  loading.value = true
  error.value = false

  try {
    const response = await getTeamById(teamId.value)
    team.value = response.data ?? null
  } catch {
    team.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

async function goBack(): Promise<void> {
  await router.push('/teams')
}

onMounted(() => {
  void loadTeam()
})
</script>

<template>
  <section class="team-detail">
    <el-card class="team-detail__header" shadow="never">
      <div class="team-detail__header-content">
        <h1>Team Detail</h1>

        <el-button @click="goBack">
          Back
        </el-button>
      </div>
    </el-card>

    <el-skeleton v-if="loading" :rows="6" animated />

    <el-alert
      v-else-if="error"
      type="error"
      title="Failed to load team detail"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadTeam">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-empty v-else-if="!hasTeamData" description="No team detail found" />

    <el-card v-else class="team-detail__content" shadow="never">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="ID">
          {{ team?.id }}
        </el-descriptions-item>
        <el-descriptions-item label="Name">
          {{ team?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="Short Name">
          {{ team?.shortName }}
        </el-descriptions-item>
        <el-descriptions-item label="Our Team">
          <el-tag :type="team?.isOurTeam ? 'success' : 'info'">
            {{ team?.isOurTeam ? 'Yes' : 'No' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Description">
          {{ team?.description }}
        </el-descriptions-item>
        <el-descriptions-item label="Remark">
          {{ team?.remark }}
        </el-descriptions-item>
        <el-descriptions-item label="Created At">
          {{ team?.createdAt }}
        </el-descriptions-item>
        <el-descriptions-item label="Updated At">
          {{ team?.updatedAt }}
        </el-descriptions-item>
        <el-descriptions-item label="Version">
          {{ team?.version }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </section>
</template>

<style scoped lang="scss">
.team-detail {
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
  .team-detail {
    :deep(.el-descriptions__body .el-descriptions__table) {
      display: block;
    }
  }
}
</style>
