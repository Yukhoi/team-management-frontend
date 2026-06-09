<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

import {
  createTeam,
  getTeams,
  updateTeam,
} from '../../api/team'
import { useAuthStore } from '../../stores/auth'
import { canWriteBusinessData } from '../../utils/permission'
import type {
  CreateTeamRequest,
  ErrorResponse,
  TeamResponse,
  UpdateTeamRequest,
} from '../../types/team'

type DialogMode = 'create' | 'edit'

interface ErrorWithResponse {
  response?: {
    data?: ErrorResponse
  }
}

const router = useRouter()
const authStore = useAuthStore()

const teams = ref<TeamResponse[]>([])
const loading = ref(false)
const error = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref<DialogMode>('create')
const editingTeamId = ref<number | null>(null)
const teamFormRef = ref<FormInstance>()
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const teamForm = reactive<CreateTeamRequest>({
  name: '',
  shortName: '',
  description: '',
  isOurTeam: false,
  remark: '',
})

const rules: FormRules<CreateTeamRequest> = {
  name: [{ required: true, message: 'Team name is required', trigger: 'blur' }],
}

const canManageTeams = computed(() => canWriteBusinessData(authStore.currentUser?.roles))

const dialogTitle = computed(() =>
  dialogMode.value === 'create' ? 'Create Team' : 'Edit Team',
)

function hasErrorResponse(errorValue: unknown): errorValue is ErrorWithResponse {
  return typeof errorValue === 'object' && errorValue !== null && 'response' in errorValue
}

function getErrorMessage(errorValue: unknown, fallback: string): string {
  if (hasErrorResponse(errorValue)) {
    const responseData = errorValue.response?.data
    const fieldMessage = responseData?.errors?.[0]?.message
    const message = responseData?.message ?? fieldMessage

    if (message) {
      return message
    }
  }

  if (errorValue instanceof Error && errorValue.message) {
    return errorValue.message
  }

  return fallback
}

function resetForm(): void {
  teamForm.name = ''
  teamForm.shortName = ''
  teamForm.description = ''
  teamForm.isOurTeam = false
  teamForm.remark = ''
  editingTeamId.value = null
  teamFormRef.value?.clearValidate()
}

function buildPayload(): CreateTeamRequest {
  return {
    name: teamForm.name,
    shortName: teamForm.shortName,
    description: teamForm.description,
    isOurTeam: teamForm.isOurTeam,
    remark: teamForm.remark,
  }
}

async function loadTeams(): Promise<void> {
  loading.value = true
  error.value = false

  try {
    const response = await getTeams({
      page: page.value - 1,
      size: pageSize.value,
    })
    const data = response.data

    teams.value = data?.content ?? []
    total.value = data?.totalElements ?? 0
  } catch {
    teams.value = []
    total.value = 0
    error.value = true
  } finally {
    loading.value = false
  }
}

function openCreateDialog(): void {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(team: TeamResponse): void {
  if (!team.id) {
    return
  }

  dialogMode.value = 'edit'
  resetForm()
  editingTeamId.value = team.id
  teamForm.name = team.name ?? ''
  teamForm.shortName = team.shortName ?? ''
  teamForm.description = team.description ?? ''
  teamForm.isOurTeam = team.isOurTeam ?? false
  teamForm.remark = team.remark ?? ''
  dialogVisible.value = true
}

async function submitTeam(): Promise<void> {
  if (!teamFormRef.value) {
    return
  }

  try {
    await teamFormRef.value.validate()
  } catch {
    return
  }

  submitting.value = true

  try {
    const payload = buildPayload()

    if (dialogMode.value === 'create') {
      await createTeam(payload)
      ElMessage.success('Team created successfully')
    } else if (editingTeamId.value) {
      await updateTeam(editingTeamId.value, payload as UpdateTeamRequest)
      ElMessage.success('Team updated successfully')
    }

    dialogVisible.value = false
    await loadTeams()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to save team'))
  } finally {
    submitting.value = false
  }
}

async function viewTeam(team: TeamResponse): Promise<void> {
  if (!team.id) {
    return
  }

  await router.push(`/teams/${team.id}`)
}

async function handlePageChange(nextPage: number): Promise<void> {
  page.value = nextPage
  await loadTeams()
}

onMounted(() => {
  void loadTeams()
})
</script>

<template>
  <section class="team-page">
    <el-card class="team-page__header" shadow="never">
      <div class="team-page__header-content">
        <div>
          <h1>Team Management</h1>
        </div>

        <el-button
          v-if="canManageTeams"
          type="primary"
          :disabled="loading"
          @click="openCreateDialog"
        >
          Create Team
        </el-button>
      </div>
    </el-card>

    <el-skeleton v-if="loading" :rows="6" animated />

    <el-alert
      v-else-if="error"
      type="error"
      title="Failed to load teams"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadTeams">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-card v-else class="team-page__table-card" shadow="never">
      <el-table :data="teams" stripe>
        <el-table-column prop="name" label="Name" min-width="180" />
        <el-table-column prop="shortName" label="Short Name" min-width="130" />
        <el-table-column label="Our Team" min-width="120">
          <template #default="{ row }: { row: TeamResponse }">
            <el-tag :type="row.isOurTeam ? 'success' : 'info'">
              {{ row.isOurTeam ? 'Yes' : 'No' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="Description" min-width="220" />
        <el-table-column prop="remark" label="Remark" min-width="180" />
        <el-table-column prop="createdAt" label="Created At" min-width="190" />
        <el-table-column prop="updatedAt" label="Updated At" min-width="190" />
        <el-table-column prop="version" label="Version" width="100" />
        <el-table-column label="Actions" fixed="right" width="160">
          <template #default="{ row }: { row: TeamResponse }">
            <el-button link type="primary" :disabled="!row.id" @click="viewTeam(row)">
              View
            </el-button>
            <el-button
              v-if="canManageTeams"
              link
              type="primary"
              :disabled="!row.id"
              @click="openEditDialog(row)"
            >
              Edit
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="No teams found" />
        </template>
      </el-table>

      <el-pagination
        class="team-page__pagination"
        background
        layout="prev, pager, next"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        @current-change="handlePageChange"
      />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="520px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form
        ref="teamFormRef"
        :model="teamForm"
        :rules="rules"
        label-position="top"
      >
        <el-form-item label="Name" prop="name">
          <el-input v-model="teamForm.name" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="Short Name" prop="shortName">
          <el-input v-model="teamForm.shortName" maxlength="50" show-word-limit />
        </el-form-item>

        <el-form-item label="Description" prop="description">
          <el-input v-model="teamForm.description" type="textarea" :rows="3" />
        </el-form-item>

        <el-form-item label="Our Team" prop="isOurTeam">
          <el-switch v-model="teamForm.isOurTeam" />
        </el-form-item>

        <el-form-item label="Remark" prop="remark">
          <el-input v-model="teamForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="submitting" @click="dialogVisible = false">
          Cancel
        </el-button>
        <el-button type="primary" :loading="submitting" @click="submitTeam">
          Submit
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped lang="scss">
.team-page {
  display: grid;
  gap: 16px;

  &__header,
  &__table-card {
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

  &__pagination {
    margin-top: 16px;
    justify-content: flex-end;
  }
}

@media (max-width: 760px) {
  .team-page {
    &__header-content {
      display: grid;
      align-items: stretch;
    }
  }
}
</style>
