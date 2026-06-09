<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from 'element-plus'

import {
  createGoal,
  deleteAssist,
  deleteGoal,
  getMatchById,
  getMatchGoals,
  updateGoal,
  updateMatchAppearances,
  upsertAssist,
} from '../../api/match'
import { getPlayers } from '../../api/player'
import { useAuthStore } from '../../stores/auth'
import { canWriteBusinessData } from '../../utils/permission'
import type {
  CreateGoalRequest,
  ErrorResponse,
  GoalResponse,
  GoalType,
  MatchResponse,
  MatchStatus,
  PlayerAppearanceRequest,
  UpsertAssistRequest,
  UpdateGoalRequest,
} from '../../types/match'
import type { PlayerResponse } from '../../types/player'

type GoalDialogMode = 'create' | 'edit'
type AssistDialogMode = 'create' | 'edit'

interface ErrorWithResponse {
  response?: {
    data?: ErrorResponse
  }
}

interface AppearanceRow {
  playerId?: number
  playerNameSnapshot: string
  jerseyNumberSnapshot?: number
  positionSnapshot?: string
  starter: boolean
  onMinute?: number
  offMinute?: number
  remark: string
}

interface GoalFormState {
  playerId?: number
  goalMinute?: number
  goalType?: GoalType
  remark: string
}

interface AssistFormState {
  playerId?: number
  assistMinute?: number
  remark: string
}

const GOAL_TYPES: GoalType[] = ['NORMAL', 'PENALTY', 'OWN_GOAL']

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('basic')
const match = ref<MatchResponse | null>(null)
const goals = ref<GoalResponse[]>([])
const players = ref<PlayerResponse[]>([])
const loading = ref(false)
const error = ref(false)
const goalsLoading = ref(false)
const goalsError = ref(false)
const playersLoading = ref(false)
const appearanceDialogVisible = ref(false)
const appearanceSubmitting = ref(false)
const appearanceRows = ref<AppearanceRow[]>([])
const goalDialogVisible = ref(false)
const goalSubmitting = ref(false)
const goalDialogMode = ref<GoalDialogMode>('create')
const editingGoalId = ref<number | null>(null)
const goalFormRef = ref<FormInstance>()
const assistDialogVisible = ref(false)
const assistSubmitting = ref(false)
const assistDialogMode = ref<AssistDialogMode>('create')
const editingAssistGoal = ref<GoalResponse | null>(null)
const assistFormRef = ref<FormInstance>()

const goalForm = reactive<GoalFormState>({
  remark: '',
})

const assistForm = reactive<AssistFormState>({
  remark: '',
})

const goalRules: FormRules<GoalFormState> = {
  playerId: [
    { required: true, message: 'Goal player is required', trigger: 'change' },
  ],
  goalType: [
    { required: true, message: 'Goal type is required', trigger: 'change' },
  ],
}

const assistRules: FormRules<AssistFormState> = {
  playerId: [
    { required: true, message: 'Assist player is required', trigger: 'change' },
  ],
}

const matchId = computed(() => Number(route.params.id))
const canManageEvents = computed(() => canWriteBusinessData(authStore.currentUser?.roles))
const hasMatchData = computed(() => {
  if (!match.value) {
    return false
  }

  return Object.values(match.value).some(
    (value) => value !== undefined && value !== null && value !== '',
  )
})
const appearances = computed(() => match.value?.appearances ?? [])
const goalDialogTitle = computed(() =>
  goalDialogMode.value === 'create' ? 'Add Goal' : 'Edit Goal',
)
const assistDialogTitle = computed(() =>
  assistDialogMode.value === 'create' ? 'Add Assist' : 'Edit Assist',
)

function hasErrorResponse(errorValue: unknown): errorValue is ErrorWithResponse {
  return typeof errorValue === 'object' && errorValue !== null && 'response' in errorValue
}

function getErrorMessage(errorValue: unknown, fallback: string): string {
  if (hasErrorResponse(errorValue)) {
    const message = errorValue.response?.data?.message

    if (message) {
      return message
    }
  }

  if (errorValue instanceof Error && errorValue.message) {
    return errorValue.message
  }

  return fallback
}

function getStatusTagType(status?: MatchStatus): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'FINISHED') {
    return 'success'
  }

  if (status === 'ONGOING') {
    return 'warning'
  }

  if (status === 'CANCELLED') {
    return 'danger'
  }

  return 'info'
}

function getResultTagType(result?: string): 'success' | 'warning' | 'danger' | 'info' {
  if (result === 'WIN') {
    return 'success'
  }

  if (result === 'DRAW') {
    return 'warning'
  }

  if (result === 'LOSS') {
    return 'danger'
  }

  return 'info'
}

function getGoalId(goal: GoalResponse): number {
  return goal.goalId ?? goal.id
}

function getAssistPlayerId(goal: GoalResponse): number | undefined {
  return goal.assist?.playerId ?? goal.assistPlayerId
}

function getAssistPlayerName(goal: GoalResponse): string {
  return goal.assist?.playerNameSnapshot ?? goal.assistPlayerNameSnapshot ?? ''
}

function syncAppearancePlayer(row: AppearanceRow): void {
  const player = players.value.find((item) => item.id === row.playerId)

  row.playerNameSnapshot = player?.name ?? ''
  row.jerseyNumberSnapshot = player?.jerseyNumber
  row.positionSnapshot = player?.position
}

function resetGoalForm(): void {
  goalForm.playerId = undefined
  goalForm.goalMinute = undefined
  goalForm.goalType = undefined
  goalForm.remark = ''
  editingGoalId.value = null
  goalFormRef.value?.clearValidate()
}

function resetAssistForm(): void {
  assistForm.playerId = undefined
  assistForm.assistMinute = undefined
  assistForm.remark = ''
  editingAssistGoal.value = null
  assistFormRef.value?.clearValidate()
}

async function loadMatch(): Promise<void> {
  if (!Number.isFinite(matchId.value)) {
    error.value = true
    return
  }

  loading.value = true
  error.value = false

  try {
    match.value = await getMatchById(matchId.value)
  } catch (errorValue) {
    match.value = null
    error.value = true
    ElMessage.error(getErrorMessage(errorValue, 'Failed to load match detail'))
  } finally {
    loading.value = false
  }
}

async function loadGoals(): Promise<void> {
  if (!Number.isFinite(matchId.value)) {
    goalsError.value = true
    return
  }

  goalsLoading.value = true
  goalsError.value = false

  try {
    goals.value = await getMatchGoals(matchId.value)
  } catch (errorValue) {
    goals.value = []
    goalsError.value = true
    ElMessage.error(getErrorMessage(errorValue, 'Failed to load goals'))
  } finally {
    goalsLoading.value = false
  }
}

async function loadPlayers(): Promise<void> {
  playersLoading.value = true

  try {
    const response = await getPlayers({ page: 0, size: 200 })
    players.value = response.data?.content ?? []
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to load players'))
  } finally {
    playersLoading.value = false
  }
}

function openAppearanceDialog(): void {
  appearanceRows.value = appearances.value.map((appearance) => ({
    playerId: appearance.playerId,
    playerNameSnapshot: appearance.playerNameSnapshot ?? '',
    jerseyNumberSnapshot: appearance.jerseyNumberSnapshot,
    positionSnapshot: appearance.positionSnapshot,
    starter: appearance.starter ?? false,
    onMinute: appearance.onMinute,
    offMinute: appearance.offMinute,
    remark: appearance.remark ?? '',
  }))

  appearanceDialogVisible.value = true
}

function addAppearanceRow(): void {
  appearanceRows.value.push({
    playerNameSnapshot: '',
    starter: false,
    remark: '',
  })
}

function removeAppearanceRow(index: number): void {
  appearanceRows.value.splice(index, 1)
}

function buildAppearancePayload(): PlayerAppearanceRequest[] | null {
  const playersPayload: PlayerAppearanceRequest[] = []

  for (const row of appearanceRows.value) {
    if (!row.playerId || !row.playerNameSnapshot) {
      return null
    }

    playersPayload.push({
      playerId: row.playerId,
      playerNameSnapshot: row.playerNameSnapshot,
      jerseyNumberSnapshot: row.jerseyNumberSnapshot,
      positionSnapshot: row.positionSnapshot,
      starter: row.starter,
      onMinute: row.onMinute,
      offMinute: row.offMinute,
      remark: row.remark,
    })
  }

  return playersPayload
}

async function submitAppearances(): Promise<void> {
  const playersPayload = buildAppearancePayload()

  if (!playersPayload) {
    ElMessage.error('Appearance player is required')
    return
  }

  appearanceSubmitting.value = true

  try {
    match.value = await updateMatchAppearances(matchId.value, {
      players: playersPayload,
    })
    ElMessage.success('Appearances updated successfully')
    appearanceDialogVisible.value = false
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to update appearances'))
  } finally {
    appearanceSubmitting.value = false
  }
}

function openCreateGoalDialog(): void {
  goalDialogMode.value = 'create'
  resetGoalForm()
  goalDialogVisible.value = true
}

function openEditGoalDialog(goal: GoalResponse): void {
  goalDialogMode.value = 'edit'
  resetGoalForm()
  editingGoalId.value = getGoalId(goal)
  goalForm.playerId = goal.playerId
  goalForm.goalMinute = goal.goalMinute
  goalForm.goalType = goal.goalType
  goalForm.remark = goal.remark ?? ''
  goalDialogVisible.value = true
}

function buildGoalPayload(): CreateGoalRequest | UpdateGoalRequest | null {
  if (!goalForm.playerId || !goalForm.goalType) {
    return null
  }

  return {
    playerId: goalForm.playerId,
    goalMinute: goalForm.goalMinute,
    goalType: goalForm.goalType,
    remark: goalForm.remark,
  }
}

async function submitGoal(): Promise<void> {
  if (!goalFormRef.value) {
    return
  }

  try {
    await goalFormRef.value.validate()
  } catch {
    return
  }

  const payload = buildGoalPayload()

  if (!payload) {
    ElMessage.error('Goal player is required')
    return
  }

  goalSubmitting.value = true

  try {
    if (goalDialogMode.value === 'create') {
      await createGoal(matchId.value, payload)
      ElMessage.success('Goal created successfully')
    } else if (editingGoalId.value) {
      await updateGoal(editingGoalId.value, payload)
      ElMessage.success('Goal updated successfully')
    }

    goalDialogVisible.value = false
    await loadGoals()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to save goal'))
  } finally {
    goalSubmitting.value = false
  }
}

async function deleteGoalWithConfirm(goal: GoalResponse): Promise<void> {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to delete this goal?',
      'Delete Goal',
      { type: 'warning' },
    )
  } catch {
    return
  }

  try {
    await deleteGoal(getGoalId(goal))
    ElMessage.success('Goal deleted successfully')
    await loadGoals()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to delete goal'))
  }
}

function openAssistDialog(goal: GoalResponse): void {
  resetAssistForm()
  editingAssistGoal.value = goal
  assistDialogMode.value = getAssistPlayerId(goal) ? 'edit' : 'create'
  assistForm.playerId = getAssistPlayerId(goal)
  assistForm.assistMinute = goal.assist?.assistMinute
  assistForm.remark = goal.assist?.remark ?? ''
  assistDialogVisible.value = true
}

function buildAssistPayload(): UpsertAssistRequest | null {
  if (!assistForm.playerId) {
    return null
  }

  return {
    playerId: assistForm.playerId,
    assistMinute: assistForm.assistMinute,
    remark: assistForm.remark,
  }
}

async function submitAssist(): Promise<void> {
  if (!assistFormRef.value || !editingAssistGoal.value) {
    return
  }

  try {
    await assistFormRef.value.validate()
  } catch {
    return
  }

  if (assistForm.playerId === editingAssistGoal.value.playerId) {
    ElMessage.error('Assist player cannot be the same as goal player')
    return
  }

  const payload = buildAssistPayload()

  if (!payload) {
    ElMessage.error('Assist player is required')
    return
  }

  assistSubmitting.value = true

  try {
    await upsertAssist(getGoalId(editingAssistGoal.value), payload)
    ElMessage.success('Assist saved successfully')
    assistDialogVisible.value = false
    await loadGoals()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to save assist'))
  } finally {
    assistSubmitting.value = false
  }
}

async function deleteAssistWithConfirm(goal: GoalResponse): Promise<void> {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to delete this assist?',
      'Delete Assist',
      { type: 'warning' },
    )
  } catch {
    return
  }

  try {
    await deleteAssist(getGoalId(goal))
    ElMessage.success('Assist deleted successfully')
    await loadGoals()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to delete assist'))
  }
}

async function goBack(): Promise<void> {
  await router.push('/matches')
}

onMounted(async () => {
  await Promise.all([loadMatch(), loadGoals(), loadPlayers()])
})
</script>

<template>
  <section class="match-detail">
    <el-card class="match-detail__header" shadow="never">
      <div class="match-detail__header-content">
        <h1>Match Detail</h1>

        <el-button @click="goBack">
          Back
        </el-button>
      </div>
    </el-card>

    <el-skeleton v-if="loading" :rows="6" animated />

    <el-alert
      v-else-if="error"
      type="error"
      title="Failed to load match detail"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadMatch">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-empty v-else-if="!hasMatchData" description="No match detail found" />

    <el-tabs v-else v-model="activeTab" class="match-detail__tabs">
      <el-tab-pane label="Basic Info" name="basic">
        <el-card class="match-detail__content" shadow="never">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="ID">
              {{ match?.id }}
            </el-descriptions-item>
            <el-descriptions-item label="Match ID">
              {{ match?.matchId }}
            </el-descriptions-item>
            <el-descriptions-item label="Tournament ID">
              {{ match?.tournamentId }}
            </el-descriptions-item>
            <el-descriptions-item label="Tournament Name">
              {{ match?.tournamentNameSnapshot }}
            </el-descriptions-item>
            <el-descriptions-item label="Season">
              {{ match?.seasonSnapshot }}
            </el-descriptions-item>
            <el-descriptions-item label="Our Team ID">
              {{ match?.ourTeamId }}
            </el-descriptions-item>
            <el-descriptions-item label="Our Team Name">
              {{ match?.ourTeamNameSnapshot }}
            </el-descriptions-item>
            <el-descriptions-item label="Opponent Team ID">
              {{ match?.opponentTeamId }}
            </el-descriptions-item>
            <el-descriptions-item label="Opponent Team Name">
              {{ match?.opponentTeamNameSnapshot }}
            </el-descriptions-item>
            <el-descriptions-item label="Opponent Name">
              {{ match?.opponentName }}
            </el-descriptions-item>
            <el-descriptions-item label="Match Time">
              {{ match?.matchTime }}
            </el-descriptions-item>
            <el-descriptions-item label="Match Date">
              {{ match?.matchDate }}
            </el-descriptions-item>
            <el-descriptions-item label="Home/Away">
              {{ match?.homeAway }}
            </el-descriptions-item>
            <el-descriptions-item label="Venue">
              {{ match?.venue }}
            </el-descriptions-item>
            <el-descriptions-item label="Round/Stage">
              {{ match?.roundStage }}
            </el-descriptions-item>
            <el-descriptions-item label="Match Status">
              <el-tag :type="getStatusTagType(match?.matchStatus)">
                {{ match?.matchStatus }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Status">
              <el-tag :type="getStatusTagType(match?.status)">
                {{ match?.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Our Score">
              {{ match?.ourScore }}
            </el-descriptions-item>
            <el-descriptions-item label="Opponent Score">
              {{ match?.opponentScore }}
            </el-descriptions-item>
            <el-descriptions-item label="Home Score">
              {{ match?.homeScore }}
            </el-descriptions-item>
            <el-descriptions-item label="Away Score">
              {{ match?.awayScore }}
            </el-descriptions-item>
            <el-descriptions-item label="Finished">
              {{ match?.finished }}
            </el-descriptions-item>
            <el-descriptions-item label="Result">
              <el-tag v-if="match?.result" :type="getResultTagType(match.result)">
                {{ match.result }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Created At">
              {{ match?.createdAt }}
            </el-descriptions-item>
            <el-descriptions-item label="Updated At">
              {{ match?.updatedAt }}
            </el-descriptions-item>
            <el-descriptions-item label="Version">
              {{ match?.version }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Appearances" name="appearances">
        <el-card class="match-detail__content" shadow="never">
          <template #header>
            <div class="match-detail__section-header">
              <span>Appearances</span>
              <el-button
                v-if="canManageEvents"
                type="primary"
                :disabled="playersLoading"
                @click="openAppearanceDialog"
              >
                Edit Appearances
              </el-button>
            </div>
          </template>

          <el-table :data="appearances" stripe>
            <el-table-column prop="playerNameSnapshot" label="Player" min-width="160" />
            <el-table-column prop="jerseyNumberSnapshot" label="Jersey Number" min-width="140" />
            <el-table-column prop="positionSnapshot" label="Position" min-width="140" />
            <el-table-column prop="appeared" label="Appeared" min-width="110" />
            <el-table-column prop="starter" label="Starter" min-width="110" />
            <el-table-column prop="onMinute" label="On Minute" min-width="120" />
            <el-table-column prop="offMinute" label="Off Minute" min-width="120" />
            <el-table-column prop="remark" label="Remark" min-width="180" />
            <template #empty>
              <el-empty description="No appearances found" />
            </template>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Goals & Assists" name="goals">
        <el-card class="match-detail__content" shadow="never">
          <template #header>
            <div class="match-detail__section-header">
              <span>Goals</span>
              <el-button
                v-if="canManageEvents"
                type="primary"
                :disabled="playersLoading"
                @click="openCreateGoalDialog"
              >
                Add Goal
              </el-button>
            </div>
          </template>

          <el-skeleton v-if="goalsLoading" :rows="4" animated />
          <el-alert
            v-else-if="goalsError"
            type="error"
            title="Failed to load goals"
            show-icon
            :closable="false"
          >
            <template #default>
              <el-button type="danger" plain size="small" @click="loadGoals">
                Retry
              </el-button>
            </template>
          </el-alert>

          <el-table v-else :data="goals" stripe>
            <el-table-column prop="playerNameSnapshot" label="Scorer" min-width="160" />
            <el-table-column prop="jerseyNumberSnapshot" label="Jersey Number" min-width="140" />
            <el-table-column prop="goalMinute" label="Goal Minute" min-width="130" />
            <el-table-column prop="goalType" label="Goal Type" min-width="130" />
            <el-table-column prop="remark" label="Remark" min-width="180" />
            <el-table-column label="Assist" min-width="180">
              <template #default="{ row }: { row: GoalResponse }">
                {{ getAssistPlayerName(row) }}
              </template>
            </el-table-column>
            <el-table-column label="Actions" fixed="right" width="300">
              <template #default="{ row }: { row: GoalResponse }">
                <template v-if="canManageEvents">
                  <el-button link type="primary" @click="openEditGoalDialog(row)">
                    Edit Goal
                  </el-button>
                  <el-button link type="danger" @click="deleteGoalWithConfirm(row)">
                    Delete Goal
                  </el-button>
                  <el-button link type="primary" @click="openAssistDialog(row)">
                    {{ getAssistPlayerId(row) ? 'Edit Assist' : 'Add Assist' }}
                  </el-button>
                  <el-button
                    v-if="getAssistPlayerId(row)"
                    link
                    type="danger"
                    @click="deleteAssistWithConfirm(row)"
                  >
                    Delete Assist
                  </el-button>
                </template>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="No goals found" />
            </template>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="appearanceDialogVisible"
      title="Edit Appearances"
      width="860px"
      destroy-on-close
    >
      <el-table :data="appearanceRows" stripe>
        <el-table-column label="Player" min-width="220">
          <template #default="{ row }: { row: AppearanceRow }">
            <el-select
              v-model="row.playerId"
              :loading="playersLoading"
              filterable
              @change="syncAppearancePlayer(row)"
            >
              <el-option
                v-for="player in players"
                :key="player.id"
                :label="player.name"
                :value="player.id"
                :disabled="!player.id"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="playerNameSnapshot" label="Player Snapshot" min-width="170" />
        <el-table-column prop="jerseyNumberSnapshot" label="Jersey Number" min-width="140" />
        <el-table-column prop="positionSnapshot" label="Position" min-width="140" />
        <el-table-column label="Starter" min-width="100">
          <template #default="{ row }: { row: AppearanceRow }">
            <el-checkbox v-model="row.starter" />
          </template>
        </el-table-column>
        <el-table-column label="On Minute" min-width="130">
          <template #default="{ row }: { row: AppearanceRow }">
            <el-input-number v-model="row.onMinute" :min="0" />
          </template>
        </el-table-column>
        <el-table-column label="Off Minute" min-width="130">
          <template #default="{ row }: { row: AppearanceRow }">
            <el-input-number v-model="row.offMinute" :min="0" />
          </template>
        </el-table-column>
        <el-table-column label="Remark" min-width="180">
          <template #default="{ row }: { row: AppearanceRow }">
            <el-input v-model="row.remark" />
          </template>
        </el-table-column>
        <el-table-column label="Actions" fixed="right" width="100">
          <template #default="{ $index }">
            <el-button link type="danger" @click="removeAppearanceRow($index)">
              Remove
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-button class="match-detail__add-row" plain @click="addAppearanceRow">
        Add Player
      </el-button>

      <template #footer>
        <el-button
          :disabled="appearanceSubmitting"
          @click="appearanceDialogVisible = false"
        >
          Cancel
        </el-button>
        <el-button
          type="primary"
          :loading="appearanceSubmitting"
          @click="submitAppearances"
        >
          Save
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="goalDialogVisible"
      :title="goalDialogTitle"
      width="480px"
      destroy-on-close
      @closed="resetGoalForm"
    >
      <el-form ref="goalFormRef" :model="goalForm" :rules="goalRules" label-position="top">
        <el-form-item label="Player" prop="playerId">
          <el-select v-model="goalForm.playerId" :loading="playersLoading" filterable>
            <el-option
              v-for="player in players"
              :key="player.id"
              :label="player.name"
              :value="player.id"
              :disabled="!player.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Goal Minute" prop="goalMinute">
          <el-input-number v-model="goalForm.goalMinute" :min="0" />
        </el-form-item>

        <el-form-item label="Goal Type" prop="goalType">
          <el-select v-model="goalForm.goalType">
            <el-option
              v-for="goalType in GOAL_TYPES"
              :key="goalType"
              :label="goalType"
              :value="goalType"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Remark" prop="remark">
          <el-input v-model="goalForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="goalSubmitting" @click="goalDialogVisible = false">
          Cancel
        </el-button>
        <el-button type="primary" :loading="goalSubmitting" @click="submitGoal">
          Submit
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="assistDialogVisible"
      :title="assistDialogTitle"
      width="480px"
      destroy-on-close
      @closed="resetAssistForm"
    >
      <el-form
        ref="assistFormRef"
        :model="assistForm"
        :rules="assistRules"
        label-position="top"
      >
        <el-form-item label="Player" prop="playerId">
          <el-select v-model="assistForm.playerId" :loading="playersLoading" filterable>
            <el-option
              v-for="player in players"
              :key="player.id"
              :label="player.name"
              :value="player.id"
              :disabled="!player.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Assist Minute" prop="assistMinute">
          <el-input-number v-model="assistForm.assistMinute" :min="0" />
        </el-form-item>

        <el-form-item label="Remark" prop="remark">
          <el-input v-model="assistForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="assistSubmitting" @click="assistDialogVisible = false">
          Cancel
        </el-button>
        <el-button type="primary" :loading="assistSubmitting" @click="submitAssist">
          Submit
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped lang="scss">
.match-detail {
  display: grid;
  gap: 16px;

  &__header,
  &__content {
    border-radius: 8px;
  }

  &__header-content,
  &__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__tabs {
    min-width: 0;
  }

  &__add-row {
    margin-top: 16px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 650;
    letter-spacing: 0;
  }
}

@media (max-width: 760px) {
  .match-detail {
    &__header-content,
    &__section-header {
      display: grid;
      align-items: stretch;
    }

    :deep(.el-descriptions__body .el-descriptions__table) {
      display: block;
    }
  }
}
</style>
