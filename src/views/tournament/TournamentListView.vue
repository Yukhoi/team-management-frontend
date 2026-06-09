<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from 'element-plus'

import {
  cancelTournament,
  createTournament,
  finishTournament,
  getTournaments,
  updateTournament,
} from '../../api/tournament'
import { useAuthStore } from '../../stores/auth'
import { canWriteBusinessData } from '../../utils/permission'
import type {
  CreateTournamentRequest,
  ErrorResponse,
  TournamentResponse,
  TournamentStatus,
  TournamentType,
  UpdateTournamentRequest,
} from '../../types/tournament'

type DialogMode = 'create' | 'edit'

interface ErrorWithResponse {
  response?: {
    data?: ErrorResponse
  }
}

interface TournamentFormState {
  name: string
  tournamentType?: TournamentType
  season: string
  startDate?: string
  endDate?: string
  organizer: string
  description: string
}

const TOURNAMENT_TYPES: TournamentType[] = ['LEAGUE', 'CUP', 'FRIENDLY']

const router = useRouter()
const authStore = useAuthStore()

const tournaments = ref<TournamentResponse[]>([])
const loading = ref(false)
const error = ref(false)
const submitting = ref(false)
const actionLoadingId = ref<number | null>(null)
const dialogVisible = ref(false)
const dialogMode = ref<DialogMode>('create')
const editingTournamentId = ref<number | null>(null)
const tournamentFormRef = ref<FormInstance>()
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const tournamentForm = reactive<TournamentFormState>({
  name: '',
  season: '',
  organizer: '',
  description: '',
})

const rules: FormRules<TournamentFormState> = {
  name: [{ required: true, message: 'Tournament name is required', trigger: 'blur' }],
  tournamentType: [
    { required: true, message: 'Tournament type is required', trigger: 'change' },
  ],
  season: [{ required: true, message: 'Season is required', trigger: 'blur' }],
}

const canManageTournaments = computed(() => canWriteBusinessData(authStore.currentUser?.roles))

const dialogTitle = computed(() =>
  dialogMode.value === 'create' ? 'Create Tournament' : 'Edit Tournament',
)

function hasErrorResponse(errorValue: unknown): errorValue is ErrorWithResponse {
  return typeof errorValue === 'object' && errorValue !== null && 'response' in errorValue
}

function getErrorMessage(errorValue: unknown, fallback: string): string {
  if (hasErrorResponse(errorValue)) {
    const responseData = errorValue.response?.data
    const fieldMessage = responseData?.fieldErrors
      ? Object.values(responseData.fieldErrors)[0]
      : undefined
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

function getStatusTagType(status?: TournamentStatus): 'success' | 'warning' | 'info' {
  if (status === 'ACTIVE') {
    return 'success'
  }

  if (status === 'FINISHED') {
    return 'info'
  }

  return 'warning'
}

function resetForm(): void {
  tournamentForm.name = ''
  tournamentForm.tournamentType = undefined
  tournamentForm.season = ''
  tournamentForm.startDate = undefined
  tournamentForm.endDate = undefined
  tournamentForm.organizer = ''
  tournamentForm.description = ''
  editingTournamentId.value = null
  tournamentFormRef.value?.clearValidate()
}

function buildPayload(): CreateTournamentRequest | null {
  if (!tournamentForm.tournamentType) {
    return null
  }

  return {
    name: tournamentForm.name,
    tournamentType: tournamentForm.tournamentType,
    season: tournamentForm.season,
    startDate: tournamentForm.startDate,
    endDate: tournamentForm.endDate,
    organizer: tournamentForm.organizer,
    description: tournamentForm.description,
  }
}

async function loadTournaments(): Promise<void> {
  loading.value = true
  error.value = false

  try {
    const response = await getTournaments({
      page: page.value - 1,
      size: pageSize.value,
    })

    tournaments.value = response.content ?? []
    total.value = response.totalElements ?? 0
  } catch {
    tournaments.value = []
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

function openEditDialog(tournament: TournamentResponse): void {
  if (!tournament.id) {
    return
  }

  dialogMode.value = 'edit'
  resetForm()
  editingTournamentId.value = tournament.id
  tournamentForm.name = tournament.name ?? ''
  tournamentForm.tournamentType = tournament.tournamentType
  tournamentForm.season = tournament.season ?? ''
  tournamentForm.startDate = tournament.startDate
  tournamentForm.endDate = tournament.endDate
  tournamentForm.organizer = tournament.organizer ?? ''
  tournamentForm.description = tournament.description ?? ''
  dialogVisible.value = true
}

async function submitTournament(): Promise<void> {
  if (!tournamentFormRef.value) {
    return
  }

  try {
    await tournamentFormRef.value.validate()
  } catch {
    return
  }

  const payload = buildPayload()

  if (!payload) {
    return
  }

  submitting.value = true

  try {
    if (dialogMode.value === 'create') {
      await createTournament(payload)
      ElMessage.success('Tournament created successfully')
    } else if (editingTournamentId.value) {
      await updateTournament(editingTournamentId.value, payload as UpdateTournamentRequest)
      ElMessage.success('Tournament updated successfully')
    }

    dialogVisible.value = false
    await loadTournaments()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to save tournament'))
  } finally {
    submitting.value = false
  }
}

async function viewTournament(tournament: TournamentResponse): Promise<void> {
  if (!tournament.id) {
    return
  }

  await router.push(`/tournaments/${tournament.id}`)
}

async function finishTournamentWithConfirm(tournament: TournamentResponse): Promise<void> {
  if (!tournament.id) {
    return
  }

  try {
    await ElMessageBox.confirm(
      'Are you sure you want to finish this tournament?',
      'Finish Tournament',
      { type: 'warning' },
    )
  } catch {
    return
  }

  actionLoadingId.value = tournament.id

  try {
    await finishTournament(tournament.id)
    ElMessage.success('Tournament finished successfully')
    await loadTournaments()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to finish tournament'))
  } finally {
    actionLoadingId.value = null
  }
}

async function cancelTournamentWithConfirm(tournament: TournamentResponse): Promise<void> {
  if (!tournament.id) {
    return
  }

  try {
    await ElMessageBox.confirm(
      'Are you sure you want to cancel this tournament?',
      'Cancel Tournament',
      { type: 'warning' },
    )
  } catch {
    return
  }

  actionLoadingId.value = tournament.id

  try {
    await cancelTournament(tournament.id)
    ElMessage.success('Tournament cancelled successfully')
    await loadTournaments()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to cancel tournament'))
  } finally {
    actionLoadingId.value = null
  }
}

async function handlePageChange(nextPage: number): Promise<void> {
  page.value = nextPage
  await loadTournaments()
}

onMounted(() => {
  void loadTournaments()
})
</script>

<template>
  <section class="tournament-page">
    <el-card class="tournament-page__header" shadow="never">
      <div class="tournament-page__header-content">
        <h1>Tournament Management</h1>

        <el-button
          v-if="canManageTournaments"
          type="primary"
          :disabled="loading"
          @click="openCreateDialog"
        >
          Create Tournament
        </el-button>
      </div>
    </el-card>

    <el-skeleton v-if="loading" :rows="6" animated />

    <el-alert
      v-else-if="error"
      type="error"
      title="Failed to load tournaments"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadTournaments">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-card v-else class="tournament-page__table-card" shadow="never">
      <el-table :data="tournaments" stripe>
        <el-table-column prop="name" label="Name" min-width="180" />
        <el-table-column prop="tournamentType" label="Type" min-width="130" />
        <el-table-column prop="season" label="Season" min-width="120" />
        <el-table-column label="Status" min-width="130">
          <template #default="{ row }: { row: TournamentResponse }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startDate" label="Start Date" min-width="130" />
        <el-table-column prop="endDate" label="End Date" min-width="130" />
        <el-table-column prop="organizer" label="Organizer" min-width="180" />
        <el-table-column prop="version" label="Version" width="100" />
        <el-table-column label="Actions" fixed="right" width="260">
          <template #default="{ row }: { row: TournamentResponse }">
            <el-button link type="primary" :disabled="!row.id" @click="viewTournament(row)">
              View
            </el-button>
            <el-button
              v-if="canManageTournaments"
              link
              type="primary"
              :disabled="!row.id || actionLoadingId === row.id"
              @click="openEditDialog(row)"
            >
              Edit
            </el-button>
            <el-button
              v-if="canManageTournaments && row.status === 'ACTIVE'"
              link
              type="primary"
              :loading="actionLoadingId === row.id"
              :disabled="!row.id"
              @click="finishTournamentWithConfirm(row)"
            >
              Finish
            </el-button>
            <el-button
              v-if="canManageTournaments && row.status === 'ACTIVE'"
              link
              type="danger"
              :loading="actionLoadingId === row.id"
              :disabled="!row.id"
              @click="cancelTournamentWithConfirm(row)"
            >
              Cancel
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="No tournaments found" />
        </template>
      </el-table>

      <el-pagination
        class="tournament-page__pagination"
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
      width="560px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form
        ref="tournamentFormRef"
        :model="tournamentForm"
        :rules="rules"
        label-position="top"
      >
        <el-form-item label="Name" prop="name">
          <el-input v-model="tournamentForm.name" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="Tournament Type" prop="tournamentType">
          <el-select v-model="tournamentForm.tournamentType">
            <el-option
              v-for="type in TOURNAMENT_TYPES"
              :key="type"
              :label="type"
              :value="type"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Season" prop="season">
          <el-input v-model="tournamentForm.season" maxlength="30" show-word-limit />
        </el-form-item>

        <el-form-item label="Start Date" prop="startDate">
          <el-date-picker
            v-model="tournamentForm.startDate"
            type="date"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="End Date" prop="endDate">
          <el-date-picker
            v-model="tournamentForm.endDate"
            type="date"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="Organizer" prop="organizer">
          <el-input v-model="tournamentForm.organizer" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="Description" prop="description">
          <el-input v-model="tournamentForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="submitting" @click="dialogVisible = false">
          Cancel
        </el-button>
        <el-button type="primary" :loading="submitting" @click="submitTournament">
          Submit
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped lang="scss">
.tournament-page {
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
  .tournament-page {
    &__header-content {
      display: grid;
      align-items: stretch;
    }
  }
}
</style>
