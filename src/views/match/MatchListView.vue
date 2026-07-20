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
  createMatch,
  getMatches,
  updateMatchResult,
} from '../../api/match'
import { getOurTeam, getTeams } from '../../api/team'
import { getTournaments } from '../../api/tournament'
import { useAuthStore } from '../../stores/auth'
import { canWriteBusinessData } from '../../utils/permission'
import type {
  CreateMatchRequest,
  ErrorResponse,
  HomeAway,
  MatchResponse,
  MatchStatus,
  UpdateMatchResultRequest,
} from '../../types/match'
import type { Team } from '../../types/team'
import type { TournamentResponse } from '../../types/tournament'

interface ErrorWithResponse {
  response?: {
    data?: ErrorResponse
  }
}

interface MatchFormState {
  tournamentId?: number
  ourTeamId?: number
  ourTeamNameSnapshot: string
  opponentTeamId?: number
  opponentTeamName: string
  matchTime: string
  homeAway?: HomeAway
  venue: string
  roundStage: string
}

interface ResultFormState {
  ourScore?: number
  opponentScore?: number
  finished: boolean
  remark: string
}

const HOME_AWAY_OPTIONS: HomeAway[] = ['HOME', 'AWAY']

const router = useRouter()
const authStore = useAuthStore()

const matches = ref<MatchResponse[]>([])
const tournaments = ref<TournamentResponse[]>([])
const ourTeam = ref<Team | null>(null)
const opponentTeams = ref<Team[]>([])
const loading = ref(false)
const error = ref(false)
const tournamentLoading = ref(false)
const ourTeamLoading = ref(false)
const opponentTeamsLoading = ref(false)
const ourTeamError = ref<string | null>(null)
const opponentTeamsError = ref<string | null>(null)
const submitting = ref(false)
const resultSubmitting = ref(false)
const createDialogVisible = ref(false)
const resultDialogVisible = ref(false)
const resultMatchId = ref<number | null>(null)
const matchFormRef = ref<FormInstance>()
const resultFormRef = ref<FormInstance>()
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const matchForm = reactive<MatchFormState>({
  ourTeamNameSnapshot: '',
  opponentTeamName: '',
  matchTime: '',
  venue: '',
  roundStage: '',
})

const resultForm = reactive<ResultFormState>({
  finished: true,
  remark: '',
})

const matchRules: FormRules<MatchFormState> = {
  tournamentId: [
    { required: true, message: 'Tournament is required', trigger: 'change' },
  ],
  ourTeamId: [
    { required: true, message: 'Our team is required', trigger: 'change' },
  ],
  opponentTeamId: [
    { required: true, message: 'Opponent team is required', trigger: 'change' },
  ],
  matchTime: [
    { required: true, message: 'Match time is required', trigger: 'change' },
  ],
  homeAway: [
    { required: true, message: 'Home or away is required', trigger: 'change' },
  ],
}

const resultRules: FormRules<ResultFormState> = {
  ourScore: [
    { required: true, message: 'Our score is required', trigger: 'blur' },
  ],
  opponentScore: [
    { required: true, message: 'Opponent score is required', trigger: 'blur' },
  ],
  finished: [
    { required: true, message: 'Finished is required', trigger: 'change' },
  ],
}

const canManageMatches = computed(() => canWriteBusinessData(authStore.currentUser?.roles))
const submitMatchDisabled = computed(
  () =>
    submitting.value ||
    ourTeamLoading.value ||
    opponentTeamsLoading.value ||
    !ourTeam.value?.id ||
    !matchForm.opponentTeamId,
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

function getMatchId(match: MatchResponse): number | undefined {
  return match.id ?? match.matchId
}

function getMatchStatus(match: MatchResponse): MatchStatus | undefined {
  return match.status ?? match.matchStatus
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

function getOpponentName(match: MatchResponse): string {
  return match.opponentName ?? match.opponentTeamNameSnapshot ?? ''
}

function getMatchTime(match: MatchResponse): string {
  return match.matchDate ?? match.matchTime ?? ''
}

function getTeamSnapshot(team: Team): string {
  return team.shortName || team.name || ''
}

function getOpponentTeamLabel(team: Team): string {
  if (team.shortName && team.name) {
    return `${team.shortName} - ${team.name}`
  }

  return team.shortName || team.name || ''
}

function getScoreText(match: MatchResponse): string {
  const ourScore = match.ourScore ?? match.homeScore
  const opponentScore = match.opponentScore ?? match.awayScore

  if (ourScore === undefined || opponentScore === undefined) {
    return ''
  }

  return `${ourScore} - ${opponentScore}`
}

function resetMatchForm(): void {
  matchForm.tournamentId = undefined
  matchForm.ourTeamId = ourTeam.value?.id
  matchForm.ourTeamNameSnapshot = ourTeam.value
    ? getTeamSnapshot(ourTeam.value)
    : ''
  matchForm.opponentTeamId = undefined
  matchForm.opponentTeamName = ''
  matchForm.matchTime = ''
  matchForm.homeAway = undefined
  matchForm.venue = ''
  matchForm.roundStage = ''
  matchFormRef.value?.clearValidate()
}

function resetResultForm(): void {
  resultForm.ourScore = undefined
  resultForm.opponentScore = undefined
  resultForm.finished = true
  resultForm.remark = ''
  resultMatchId.value = null
  resultFormRef.value?.clearValidate()
}

function buildCreatePayload(): CreateMatchRequest | null {
  const opponentTeam = opponentTeams.value.find(
    (team) => team.id === matchForm.opponentTeamId,
  )

  if (
    !matchForm.tournamentId ||
    !ourTeam.value?.id ||
    !opponentTeam?.id ||
    !matchForm.matchTime ||
    !matchForm.homeAway
  ) {
    return null
  }

  return {
    tournamentId: matchForm.tournamentId,
    ourTeamId: ourTeam.value.id,
    ourTeamNameSnapshot: getTeamSnapshot(ourTeam.value),
    opponentTeamId: opponentTeam.id,
    opponentTeamName: getTeamSnapshot(opponentTeam),
    matchTime: matchForm.matchTime,
    homeAway: matchForm.homeAway,
    venue: matchForm.venue,
    roundStage: matchForm.roundStage,
  }
}

function buildResultPayload(): UpdateMatchResultRequest | null {
  if (
    resultForm.ourScore === undefined ||
    resultForm.opponentScore === undefined
  ) {
    return null
  }

  return {
    ourScore: resultForm.ourScore,
    opponentScore: resultForm.opponentScore,
    finished: resultForm.finished,
    remark: resultForm.remark,
  }
}

async function loadTournaments(): Promise<void> {
  tournamentLoading.value = true

  try {
    const response = await getTournaments({
      page: 0,
      size: 100,
    })

    tournaments.value = response.content ?? []
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to load tournaments'))
  } finally {
    tournamentLoading.value = false
  }
}

async function loadMatches(): Promise<void> {
  loading.value = true
  error.value = false

  try {
    const response = await getMatches({
      page: page.value - 1,
      size: pageSize.value,
    })

    matches.value = response.content ?? []
    total.value = response.totalElements ?? 0
  } catch {
    matches.value = []
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
      ourTeamError.value = 'Unable to load our team'
      return
    }

    ourTeam.value = team

    if (createDialogVisible.value) {
      matchForm.ourTeamId = team.id
      matchForm.ourTeamNameSnapshot = getTeamSnapshot(team)
    }
  } catch {
    ourTeam.value = null
    ourTeamError.value = 'Unable to load our team'
  } finally {
    ourTeamLoading.value = false
  }
}

async function loadOpponentTeams(): Promise<void> {
  opponentTeamsLoading.value = true
  opponentTeamsError.value = null

  try {
    const response = await getTeams({
      page: 0,
      size: 100,
    })
    const teams = response.data?.content ?? []

    opponentTeams.value = teams.filter((team) => team.id && team.isOurTeam !== true)
  } catch {
    opponentTeams.value = []
    opponentTeamsError.value = 'Unable to load opponent teams'
  } finally {
    opponentTeamsLoading.value = false
  }
}

async function openCreateDialog(): Promise<void> {
  resetMatchForm()
  createDialogVisible.value = true

  if (!tournaments.value.length) {
    await loadTournaments()
  }
}

function handleOpponentTeamChange(): void {
  const opponentTeam = opponentTeams.value.find(
    (team) => team.id === matchForm.opponentTeamId,
  )

  matchForm.opponentTeamName = opponentTeam ? getTeamSnapshot(opponentTeam) : ''
}

function openResultDialog(match: MatchResponse): void {
  const matchId = getMatchId(match)

  if (!matchId) {
    return
  }

  resetResultForm()
  resultMatchId.value = matchId
  resultForm.ourScore = match.ourScore ?? match.homeScore
  resultForm.opponentScore = match.opponentScore ?? match.awayScore
  resultForm.finished = match.finished ?? true
  resultDialogVisible.value = true
}

async function submitMatch(): Promise<void> {
  if (!matchFormRef.value) {
    return
  }

  if (ourTeamLoading.value || opponentTeamsLoading.value) {
    return
  }

  if (!ourTeam.value?.id) {
    ElMessage.error('Our team is unavailable')
    return
  }

  const opponentTeam = opponentTeams.value.find(
    (team) => team.id === matchForm.opponentTeamId,
  )

  if (!opponentTeam?.id) {
    ElMessage.error('Please select an opponent team')
    return
  }

  matchForm.ourTeamId = ourTeam.value.id
  matchForm.ourTeamNameSnapshot = getTeamSnapshot(ourTeam.value)
  matchForm.opponentTeamId = opponentTeam.id
  matchForm.opponentTeamName = getTeamSnapshot(opponentTeam)

  try {
    await matchFormRef.value.validate()
  } catch {
    return
  }

  const payload = buildCreatePayload()

  if (!payload) {
    return
  }

  submitting.value = true

  try {
    await createMatch(payload)
    ElMessage.success('Match created successfully')
    createDialogVisible.value = false
    await loadMatches()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to create match'))
  } finally {
    submitting.value = false
  }
}

async function submitResult(): Promise<void> {
  if (!resultFormRef.value || !resultMatchId.value) {
    return
  }

  try {
    await resultFormRef.value.validate()
  } catch {
    return
  }

  const payload = buildResultPayload()

  if (!payload) {
    return
  }

  try {
    await ElMessageBox.confirm(
      'Are you sure you want to update this match result?',
      'Update Match Result',
      { type: 'warning' },
    )
  } catch {
    return
  }

  resultSubmitting.value = true

  try {
    await updateMatchResult(resultMatchId.value, payload)
    ElMessage.success('Match result updated successfully')
    resultDialogVisible.value = false
    await loadMatches()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to update match result'))
  } finally {
    resultSubmitting.value = false
  }
}

async function viewMatch(match: MatchResponse): Promise<void> {
  const matchId = getMatchId(match)

  if (!matchId) {
    return
  }

  await router.push(`/matches/${matchId}`)
}

async function handlePageChange(nextPage: number): Promise<void> {
  page.value = nextPage
  await loadMatches()
}

onMounted(() => {
  void loadMatches()
  void loadOurTeam()
  void loadOpponentTeams()
})
</script>

<template>
  <section class="match-page">
    <el-card class="match-page__header" shadow="never">
      <div class="match-page__header-content">
        <h1>Match Management</h1>

        <el-button
          v-if="canManageMatches"
          type="primary"
          :disabled="loading"
          @click="openCreateDialog"
        >
          Create Match
        </el-button>
      </div>
    </el-card>

    <el-alert
      v-if="canManageMatches && ourTeamError"
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

    <el-alert
      v-if="canManageMatches && opponentTeamsError"
      type="error"
      :title="opponentTeamsError"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadOpponentTeams">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-skeleton v-if="loading" :rows="6" animated />

    <el-alert
      v-else-if="error"
      type="error"
      title="Failed to load matches"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadMatches">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-card v-else class="match-page__table-card" shadow="never">
      <el-table :data="matches" stripe>
        <el-table-column prop="tournamentNameSnapshot" label="Tournament" min-width="190" />
        <el-table-column label="Opponent" min-width="180">
          <template #default="{ row }: { row: MatchResponse }">
            {{ getOpponentName(row) }}
          </template>
        </el-table-column>
        <el-table-column label="Match Date" min-width="190">
          <template #default="{ row }: { row: MatchResponse }">
            {{ getMatchTime(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="venue" label="Venue" min-width="160" />
        <el-table-column prop="roundStage" label="Round/Stage" min-width="150" />
        <el-table-column prop="homeAway" label="Home/Away" min-width="120" />
        <el-table-column label="Status" min-width="130">
          <template #default="{ row }: { row: MatchResponse }">
            <el-tag :type="getStatusTagType(getMatchStatus(row))">
              {{ getMatchStatus(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Score" min-width="110">
          <template #default="{ row }: { row: MatchResponse }">
            {{ getScoreText(row) }}
          </template>
        </el-table-column>
        <el-table-column label="Result" min-width="110">
          <template #default="{ row }: { row: MatchResponse }">
            <el-tag v-if="row.result" :type="getResultTagType(row.result)">
              {{ row.result }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" fixed="right" width="210">
          <template #default="{ row }: { row: MatchResponse }">
            <el-button link type="primary" :disabled="!getMatchId(row)" @click="viewMatch(row)">
              View
            </el-button>
            <el-button
              v-if="canManageMatches"
              link
              type="primary"
              :disabled="!getMatchId(row)"
              @click="openResultDialog(row)"
            >
              Update Result
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="No matches found" />
        </template>
      </el-table>

      <el-pagination
        class="match-page__pagination"
        background
        layout="prev, pager, next"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        @current-change="handlePageChange"
      />
    </el-card>

    <el-dialog
      v-model="createDialogVisible"
      title="Create Match"
      width="560px"
      destroy-on-close
      @closed="resetMatchForm"
    >
      <el-form
        ref="matchFormRef"
        :model="matchForm"
        :rules="matchRules"
        label-position="top"
      >
        <el-form-item label="Tournament" prop="tournamentId">
          <el-select
            v-model="matchForm.tournamentId"
            :loading="tournamentLoading"
            filterable
          >
            <el-option
              v-for="tournament in tournaments"
              :key="tournament.id"
              :label="tournament.name"
              :value="tournament.id"
              :disabled="!tournament.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Our Team" prop="ourTeamId">
          <el-input
            :model-value="ourTeam ? getTeamSnapshot(ourTeam) : ''"
            :placeholder="ourTeamLoading ? 'Loading team...' : 'Team unavailable'"
            disabled
          />
        </el-form-item>

        <el-form-item label="Opponent Team" prop="opponentTeamId">
          <el-select
            v-model="matchForm.opponentTeamId"
            :loading="opponentTeamsLoading"
            filterable
            placeholder="Select opponent team"
            @change="handleOpponentTeamChange"
          >
            <el-option
              v-for="team in opponentTeams"
              :key="team.id"
              :label="getOpponentTeamLabel(team)"
              :value="team.id"
              :disabled="!team.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Match Time" prop="matchTime">
          <el-date-picker
            v-model="matchForm.matchTime"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss[Z]"
          />
        </el-form-item>

        <el-form-item label="Home Away" prop="homeAway">
          <el-select v-model="matchForm.homeAway">
            <el-option
              v-for="option in HOME_AWAY_OPTIONS"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Venue" prop="venue">
          <el-input v-model="matchForm.venue" />
        </el-form-item>

        <el-form-item label="Round Stage" prop="roundStage">
          <el-input v-model="matchForm.roundStage" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="submitting" @click="createDialogVisible = false">
          Cancel
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="submitMatchDisabled"
          @click="submitMatch"
        >
          Submit
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="resultDialogVisible"
      title="Update Match Result"
      width="460px"
      destroy-on-close
      @closed="resetResultForm"
    >
      <el-form
        ref="resultFormRef"
        :model="resultForm"
        :rules="resultRules"
        label-position="top"
      >
        <el-form-item label="Our Score" prop="ourScore">
          <el-input-number v-model="resultForm.ourScore" :min="0" />
        </el-form-item>

        <el-form-item label="Opponent Score" prop="opponentScore">
          <el-input-number v-model="resultForm.opponentScore" :min="0" />
        </el-form-item>

        <el-form-item label="Finished" prop="finished">
          <el-switch v-model="resultForm.finished" />
        </el-form-item>

        <el-form-item label="Remark" prop="remark">
          <el-input v-model="resultForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="resultSubmitting" @click="resultDialogVisible = false">
          Cancel
        </el-button>
        <el-button type="primary" :loading="resultSubmitting" @click="submitResult">
          Submit
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped lang="scss">
.match-page {
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
  .match-page {
    &__header-content {
      display: grid;
      align-items: stretch;
    }
  }
}
</style>
