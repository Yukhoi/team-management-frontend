<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

import {
  changePlayerStatus,
  createPlayer,
  getPlayers,
  updatePlayer,
} from '../../api/player'
import { getOurTeam } from '../../api/team'
import { useAuthStore } from '../../stores/auth'
import { canWriteBusinessData } from '../../utils/permission'
import type {
  ChangePlayerStatusRequest,
  CreatePlayerRequest,
  ErrorResponse,
  PlayerCurrentStatus,
  PlayerPosition,
  PlayerRegistrationStatus,
  PlayerResponse,
  UpdatePlayerRequest,
} from '../../types/player'
import type { Team } from '../../types/team'

type PlayerDialogMode = 'create' | 'edit'

interface ErrorWithResponse {
  response?: {
    data?: ErrorResponse
  }
}

interface PlayerFormState {
  teamId?: number
  name: string
  jerseyNumber?: number
  birthDate?: string
  phone: string
  position?: PlayerPosition
  registrationStatus?: PlayerRegistrationStatus
  currentStatus?: PlayerCurrentStatus
  joinedDate?: string
  leftDate?: string
  remark: string
}

interface StatusFormState {
  newStatus?: PlayerCurrentStatus
  changedBy?: number
  remark: string
}

const PLAYER_POSITIONS: PlayerPosition[] = [
  'GOALKEEPER',
  'DEFENDER',
  'MIDFIELDER',
  'FORWARD',
]
const REGISTRATION_STATUSES: PlayerRegistrationStatus[] = [
  'REGISTERED',
  'UNREGISTERED',
]
const PLAYER_CURRENT_STATUSES: PlayerCurrentStatus[] = [
  'ACTIVE',
  'INJURED',
  'SUSPENDED',
  'LEFT',
]

const router = useRouter()
const authStore = useAuthStore()

const players = ref<PlayerResponse[]>([])
const ourTeam = ref<Team | null>(null)
const ourTeamLoading = ref(false)
const ourTeamError = ref<string | null>(null)
const loading = ref(false)
const error = ref(false)
const submitting = ref(false)
const statusSubmitting = ref(false)
const dialogVisible = ref(false)
const statusDialogVisible = ref(false)
const dialogMode = ref<PlayerDialogMode>('create')
const editingPlayerId = ref<number | null>(null)
const statusPlayerId = ref<number | null>(null)
const playerFormRef = ref<FormInstance>()
const statusFormRef = ref<FormInstance>()
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const playerForm = reactive<PlayerFormState>({
  name: '',
  phone: '',
  remark: '',
})

const statusForm = reactive<StatusFormState>({
  remark: '',
})

const playerRules = computed<FormRules<PlayerFormState>>(() => ({
  teamId:
    dialogMode.value === 'create'
      ? [{ required: true, message: 'Team is required', trigger: 'blur' }]
      : [],
  name: [{ required: true, message: 'Player name is required', trigger: 'blur' }],
  position: [{ required: true, message: 'Position is required', trigger: 'change' }],
}))

const statusRules: FormRules<StatusFormState> = {
  newStatus: [
    { required: true, message: 'New status is required', trigger: 'change' },
  ],
}

const canManagePlayers = computed(() => canWriteBusinessData(authStore.currentUser?.roles))

const dialogTitle = computed(() =>
  dialogMode.value === 'create' ? 'Create Player' : 'Edit Player',
)
const submitPlayerDisabled = computed(
  () =>
    submitting.value ||
    (dialogMode.value === 'create' && (ourTeamLoading.value || !ourTeam.value?.id)),
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

function resetPlayerForm(): void {
  playerForm.teamId =
    dialogMode.value === 'create' ? ourTeam.value?.id : undefined
  playerForm.name = ''
  playerForm.jerseyNumber = undefined
  playerForm.birthDate = undefined
  playerForm.phone = ''
  playerForm.position = undefined
  playerForm.registrationStatus = undefined
  playerForm.currentStatus = undefined
  playerForm.joinedDate = undefined
  playerForm.leftDate = undefined
  playerForm.remark = ''
  editingPlayerId.value = null
  playerFormRef.value?.clearValidate()
}

function resetStatusForm(): void {
  statusForm.newStatus = undefined
  statusForm.changedBy = undefined
  statusForm.remark = ''
  statusPlayerId.value = null
  statusFormRef.value?.clearValidate()
}

function buildCreatePayload(): CreatePlayerRequest | null {
  if (!ourTeam.value?.id || !playerForm.position) {
    return null
  }

  return {
    teamId: ourTeam.value.id,
    name: playerForm.name,
    jerseyNumber: playerForm.jerseyNumber,
    birthDate: playerForm.birthDate,
    phone: playerForm.phone,
    position: playerForm.position,
    registrationStatus: playerForm.registrationStatus,
    currentStatus: playerForm.currentStatus,
    joinedDate: playerForm.joinedDate,
    remark: playerForm.remark,
  }
}

function buildUpdatePayload(): UpdatePlayerRequest | null {
  if (!playerForm.position) {
    return null
  }

  return {
    name: playerForm.name,
    jerseyNumber: playerForm.jerseyNumber,
    birthDate: playerForm.birthDate,
    phone: playerForm.phone,
    position: playerForm.position,
    registrationStatus: playerForm.registrationStatus,
    joinedDate: playerForm.joinedDate,
    leftDate: playerForm.leftDate,
    remark: playerForm.remark,
  }
}

function buildStatusPayload(): ChangePlayerStatusRequest | null {
  if (!statusForm.newStatus) {
    return null
  }

  return {
    newStatus: statusForm.newStatus,
    changedBy: statusForm.changedBy,
    remark: statusForm.remark,
  }
}

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

async function loadPlayers(): Promise<void> {
  loading.value = true
  error.value = false

  try {
    const response = await getPlayers({
      page: page.value - 1,
      size: pageSize.value,
    })
    const data = response.data

    players.value = data?.content ?? []
    total.value = data?.totalElements ?? 0
  } catch {
    players.value = []
    total.value = 0
    error.value = true
  } finally {
    loading.value = false
  }
}

async function loadOurTeam(): Promise<void> {
  ourTeamLoading.value = true
  ourTeamError.value = null

  try {
    const response = await getOurTeam()
    const team = response.data

    if (!team?.id || team.isOurTeam !== true) {
      ourTeam.value = null
      ourTeamError.value = 'Unable to load our team.'
      return
    }

    ourTeam.value = team

    if (dialogMode.value === 'create') {
      playerForm.teamId = team.id
    }
  } catch {
    ourTeam.value = null
    ourTeamError.value = 'Unable to load our team.'
  } finally {
    ourTeamLoading.value = false
  }
}

function openCreateDialog(): void {
  dialogMode.value = 'create'
  resetPlayerForm()
  playerForm.teamId = ourTeam.value?.id
  dialogVisible.value = true
}

function openEditDialog(player: PlayerResponse): void {
  if (!player.id) {
    return
  }

  dialogMode.value = 'edit'
  resetPlayerForm()
  editingPlayerId.value = player.id
  playerForm.teamId = player.teamId
  playerForm.name = player.name ?? ''
  playerForm.jerseyNumber = player.jerseyNumber
  playerForm.birthDate = player.birthDate
  playerForm.phone = player.phone ?? ''
  playerForm.position = player.position
  playerForm.registrationStatus = player.registrationStatus
  playerForm.currentStatus = player.currentStatus
  playerForm.joinedDate = player.joinedDate
  playerForm.leftDate = player.leftDate
  playerForm.remark = player.remark ?? ''
  dialogVisible.value = true
}

function openStatusDialog(player: PlayerResponse): void {
  if (!player.id) {
    return
  }

  resetStatusForm()
  statusPlayerId.value = player.id
  statusForm.newStatus = player.currentStatus
  dialogVisible.value = false
  statusDialogVisible.value = true
}

async function submitPlayer(): Promise<void> {
  if (!playerFormRef.value) {
    return
  }

  if (dialogMode.value === 'create') {
    if (ourTeamLoading.value) {
      return
    }

    if (!ourTeam.value?.id) {
      ElMessage.error('Our team is unavailable')
      return
    }

    playerForm.teamId = ourTeam.value.id
  }

  try {
    await playerFormRef.value.validate()
  } catch {
    return
  }

  submitting.value = true

  try {
    if (dialogMode.value === 'create') {
      const payload = buildCreatePayload()

      if (!payload) {
        return
      }

      await createPlayer(payload)
      ElMessage.success('Player created successfully')
    } else if (editingPlayerId.value) {
      const payload = buildUpdatePayload()

      if (!payload) {
        return
      }

      await updatePlayer(editingPlayerId.value, payload)
      ElMessage.success('Player updated successfully')
    }

    dialogVisible.value = false
    await loadPlayers()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to save player'))
  } finally {
    submitting.value = false
  }
}

async function submitStatus(): Promise<void> {
  if (!statusFormRef.value || !statusPlayerId.value) {
    return
  }

  try {
    await statusFormRef.value.validate()
  } catch {
    return
  }

  statusSubmitting.value = true

  try {
    const payload = buildStatusPayload()

    if (!payload) {
      return
    }

    await changePlayerStatus(statusPlayerId.value, payload)
    ElMessage.success('Player status updated successfully')
    statusDialogVisible.value = false
    await loadPlayers()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to change player status'))
  } finally {
    statusSubmitting.value = false
  }
}

async function viewPlayer(player: PlayerResponse): Promise<void> {
  if (!player.id) {
    return
  }

  await router.push(`/players/${player.id}`)
}

async function handlePageChange(nextPage: number): Promise<void> {
  page.value = nextPage
  await loadPlayers()
}

onMounted(() => {
  void loadPlayers()
  void loadOurTeam()
})
</script>

<template>
  <section class="player-page">
    <el-card class="player-page__header" shadow="never">
      <div class="player-page__header-content">
        <h1>Player Management</h1>

        <el-button
          v-if="canManagePlayers"
          type="primary"
          :disabled="loading"
          @click="openCreateDialog"
        >
          Create Player
        </el-button>
      </div>
    </el-card>

    <el-alert
      v-if="canManagePlayers && ourTeamError"
      type="error"
      :title="ourTeamError"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadOurTeam">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-skeleton v-if="loading" :rows="6" animated />

    <el-alert
      v-else-if="error"
      type="error"
      title="Failed to load players"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadPlayers">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-card v-else class="player-page__table-card" shadow="never">
      <el-table :data="players" stripe>
        <el-table-column prop="name" label="Name" min-width="160" />
        <el-table-column prop="teamName" label="Team" min-width="180" />
        <el-table-column prop="teamId" label="Team ID" width="100" />
        <el-table-column prop="jerseyNumber" label="Jersey Number" min-width="140" />
        <el-table-column prop="position" label="Position" min-width="140" />
        <el-table-column prop="registrationStatus" label="Registration" min-width="150" />
        <el-table-column label="Status" min-width="130">
          <template #default="{ row }: { row: PlayerResponse }">
            <el-tag :type="getStatusTagType(row.currentStatus)">
              {{ row.currentStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="joinedDate" label="Joined Date" min-width="140" />
        <el-table-column prop="leftDate" label="Left Date" min-width="140" />
        <el-table-column prop="version" label="Version" width="100" />
        <el-table-column label="Actions" fixed="right" width="260">
          <template #default="{ row }: { row: PlayerResponse }">
            <el-button link type="primary" :disabled="!row.id" @click="viewPlayer(row)">
              View
            </el-button>
            <el-button
              v-if="canManagePlayers"
              link
              type="primary"
              :disabled="!row.id"
              @click="openEditDialog(row)"
            >
              Edit
            </el-button>
            <el-button
              v-if="canManagePlayers"
              link
              type="primary"
              :disabled="!row.id"
              @click="openStatusDialog(row)"
            >
              Change Status
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="No players found" />
        </template>
      </el-table>

      <el-pagination
        class="player-page__pagination"
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
      @closed="resetPlayerForm"
    >
      <el-form
        ref="playerFormRef"
        :model="playerForm"
        :rules="playerRules"
        label-position="top"
      >
        <el-form-item v-if="dialogMode === 'create'" label="Team" prop="teamId">
          <el-input
            :model-value="ourTeam?.name ?? ''"
            :placeholder="ourTeamLoading ? 'Loading team...' : 'Team unavailable'"
            disabled
          />
        </el-form-item>

        <el-form-item label="Name" prop="name">
          <el-input v-model="playerForm.name" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="Jersey Number" prop="jerseyNumber">
          <el-input-number v-model="playerForm.jerseyNumber" :min="0" :max="999" />
        </el-form-item>

        <el-form-item label="Birth Date" prop="birthDate">
          <el-date-picker
            v-model="playerForm.birthDate"
            type="date"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="Phone" prop="phone">
          <el-input v-model="playerForm.phone" maxlength="50" show-word-limit />
        </el-form-item>

        <el-form-item label="Position" prop="position">
          <el-select v-model="playerForm.position">
            <el-option
              v-for="position in PLAYER_POSITIONS"
              :key="position"
              :label="position"
              :value="position"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Registration Status" prop="registrationStatus">
          <el-select v-model="playerForm.registrationStatus" clearable>
            <el-option
              v-for="status in REGISTRATION_STATUSES"
              :key="status"
              :label="status"
              :value="status"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          v-if="dialogMode === 'create'"
          label="Current Status"
          prop="currentStatus"
        >
          <el-select v-model="playerForm.currentStatus" clearable>
            <el-option
              v-for="status in PLAYER_CURRENT_STATUSES"
              :key="status"
              :label="status"
              :value="status"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Joined Date" prop="joinedDate">
          <el-date-picker
            v-model="playerForm.joinedDate"
            type="date"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item v-if="dialogMode === 'edit'" label="Left Date" prop="leftDate">
          <el-date-picker
            v-model="playerForm.leftDate"
            type="date"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="Remark" prop="remark">
          <el-input v-model="playerForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="submitting" @click="dialogVisible = false">
          Cancel
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="submitPlayerDisabled"
          @click="submitPlayer"
        >
          {{ dialogMode === 'create' ? 'Create Player' : 'Submit' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="statusDialogVisible"
      title="Change Player Status"
      width="460px"
      destroy-on-close
      @closed="resetStatusForm"
    >
      <el-form
        ref="statusFormRef"
        :model="statusForm"
        :rules="statusRules"
        label-position="top"
      >
        <el-form-item label="New Status" prop="newStatus">
          <el-select v-model="statusForm.newStatus">
            <el-option
              v-for="status in PLAYER_CURRENT_STATUSES"
              :key="status"
              :label="status"
              :value="status"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Changed By" prop="changedBy">
          <el-input-number v-model="statusForm.changedBy" :min="1" />
        </el-form-item>

        <el-form-item label="Remark" prop="remark">
          <el-input v-model="statusForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="statusSubmitting" @click="statusDialogVisible = false">
          Cancel
        </el-button>
        <el-button type="primary" :loading="statusSubmitting" @click="submitStatus">
          Submit
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped lang="scss">
.player-page {
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
  .player-page {
    &__header-content {
      display: grid;
      align-items: stretch;
    }
  }
}
</style>
