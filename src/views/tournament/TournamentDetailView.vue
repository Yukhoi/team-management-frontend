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
  deleteTeamFlaMapping,
  getFlaChampionnats,
  getFlaTeams,
  getTournamentFlaMappings,
  upsertTeamFlaMapping,
} from '../../api/fla'
import { getMatches } from '../../api/match'
import { getTournamentById } from '../../api/tournament'
import { useAuthStore } from '../../stores/auth'
import { canWriteBusinessData, isAdmin } from '../../utils/permission'
import type {
  FlaChampionnatResponse,
  FlaTeamMappingResponse,
  FlaTeamResponse,
  UpsertFlaTeamMappingRequest,
} from '../../types/fla'
import type { ErrorResponse, MatchResponse } from '../../types/match'
import type { TournamentResponse, TournamentStatus } from '../../types/tournament'

interface ErrorWithResponse {
  response?: {
    data?: ErrorResponse & {
      details?: string[]
      fieldErrors?: Record<string, string>
      errors?: { message?: string }[]
      data?: Record<string, string>
    }
  }
}

interface InternalTournamentTeam {
  id: number
  name: string
}

interface MappingTableRow {
  team: InternalTournamentTeam
  mapping?: FlaTeamMappingResponse
}

interface MappingFormState {
  selectedChampionnatKey: string
  flaTeamId?: number
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const tournament = ref<TournamentResponse | null>(null)
const loading = ref(false)
const error = ref(false)
const activeTab = ref('basic')
const teams = ref<InternalTournamentTeam[]>([])
const mappings = ref<FlaTeamMappingResponse[]>([])
const mappingLoading = ref(false)
const mappingError = ref(false)
const championnats = ref<FlaChampionnatResponse[]>([])
const flaTeams = ref<FlaTeamResponse[]>([])
const championnatLoading = ref(false)
const flaTeamsLoading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingTeam = ref<InternalTournamentTeam | null>(null)
const mappingFormRef = ref<FormInstance>()

const mappingForm = reactive<MappingFormState>({
  selectedChampionnatKey: '',
})

const mappingRules: FormRules<MappingFormState> = {
  selectedChampionnatKey: [
    { required: true, message: 'FLA championnat is required', trigger: 'change' },
  ],
  flaTeamId: [
    { required: true, message: 'FLA team is required', trigger: 'change' },
  ],
}

const tournamentId = computed(() => Number(route.params.id))
const hasTournamentData = computed(() => {
  if (!tournament.value) {
    return false
  }

  return Object.values(tournament.value).some(
    (value) => value !== undefined && value !== null && value !== '',
  )
})
const canEditMapping = computed(() => canWriteBusinessData(authStore.currentUser?.roles))
const canDeleteMapping = computed(() => isAdmin(authStore.currentUser?.roles))
const mappingByTeamId = computed(() => {
  const mappingMap = new Map<number, FlaTeamMappingResponse>()

  mappings.value.forEach((mapping) => {
    mappingMap.set(mapping.internalTeamId, mapping)
  })

  return mappingMap
})
const championnatByKey = computed(() => {
  const championnatMap = new Map<string, FlaChampionnatResponse>()

  championnats.value.forEach((championnat) => {
    championnatMap.set(getChampionnatKey(championnat), championnat)
  })

  return championnatMap
})
const mappingRows = computed<MappingTableRow[]>(() =>
  teams.value.map((team) => ({
    team,
    mapping: mappingByTeamId.value.get(team.id),
  })),
)
const selectedChampionnat = computed(() =>
  championnats.value.find(
    (championnat) =>
      getChampionnatKey(championnat) === mappingForm.selectedChampionnatKey,
  ),
)
const sortedFlaTeams = computed(() =>
  [...flaTeams.value].sort((left, right) =>
    left.teamName.localeCompare(right.teamName),
  ),
)
const dialogTitle = computed(() =>
  editingTeam.value && mappingByTeamId.value.has(editingTeam.value.id)
    ? 'Edit FLA Mapping'
    : 'Create FLA Mapping',
)
const saveDisabled = computed(
  () =>
    saving.value ||
    championnatLoading.value ||
    flaTeamsLoading.value ||
    !editingTeam.value,
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
    const dataMessage = responseData?.data
      ? Object.values(responseData.data)[0]
      : undefined
    const message =
      responseData?.message ??
      responseData?.details?.[0] ??
      fieldMessage ??
      responseData?.errors?.[0]?.message ??
      dataMessage

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

function getChampionnatKey(championnat: FlaChampionnatResponse): string {
  return `${championnat.championnatId}:${championnat.saisonId}`
}

function getChampionnatLabel(championnat: FlaChampionnatResponse): string {
  return `${championnat.name} / Season ${championnat.saisonId}`
}

function getMappingChampionnatName(mapping?: FlaTeamMappingResponse): string {
  if (!mapping) {
    return '-'
  }

  const championnat = championnatByKey.value.get(
    `${mapping.flaChampionnatId}:${mapping.flaSaisonId}`,
  )

  return championnat?.name ?? String(mapping.flaChampionnatId)
}

function getTeamNameFromMatch(match: MatchResponse, teamId: number): string {
  if (match.ourTeamId === teamId) {
    return match.ourTeamNameSnapshot ?? `Team ${teamId}`
  }

  return (
    match.opponentTeamNameSnapshot ??
    match.opponentName ??
    `Team ${teamId}`
  )
}

function collectTeamsFromMatches(matches: MatchResponse[]): InternalTournamentTeam[] {
  const teamMap = new Map<number, InternalTournamentTeam>()

  matches.forEach((match) => {
    const teamIds = [match.ourTeamId, match.opponentTeamId]

    teamIds.forEach((teamId) => {
      if (!teamId || teamMap.has(teamId)) {
        return
      }

      teamMap.set(teamId, {
        id: teamId,
        name: getTeamNameFromMatch(match, teamId),
      })
    })
  })

  return [...teamMap.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  )
}

function resetMappingForm(): void {
  mappingForm.selectedChampionnatKey = ''
  mappingForm.flaTeamId = undefined
  flaTeams.value = []
  mappingFormRef.value?.clearValidate()
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

async function loadTournamentTeams(): Promise<void> {
  const pageSize = 100
  let page = 0
  let totalPages = 1
  const tournamentMatches: MatchResponse[] = []

  do {
    const response = await getMatches({
      page,
      size: pageSize,
      tournamentId: tournamentId.value,
    })

    tournamentMatches.push(...(response.content ?? []))
    totalPages = response.totalPages ?? page + 1
    page += 1
  } while (page < totalPages)

  teams.value = collectTeamsFromMatches(tournamentMatches)
}

async function loadMappings(): Promise<void> {
  try {
    mappings.value = await getTournamentFlaMappings(tournamentId.value)
  } catch (errorValue) {
    mappings.value = []
    ElMessage.error(getErrorMessage(errorValue, 'Failed to load FLA mappings'))
  }
}

async function loadMappingData(): Promise<void> {
  if (!Number.isFinite(tournamentId.value)) {
    mappingError.value = true
    return
  }

  mappingLoading.value = true
  mappingError.value = false

  try {
    await Promise.all([loadTournamentTeams(), loadChampionnats()])
    await loadMappings()
  } catch (errorValue) {
    teams.value = []
    mappings.value = []
    mappingError.value = true
    ElMessage.error(getErrorMessage(errorValue, 'Failed to load tournament teams'))
  } finally {
    mappingLoading.value = false
  }
}

async function loadChampionnats(): Promise<void> {
  championnatLoading.value = true

  try {
    championnats.value = await getFlaChampionnats()
  } catch (errorValue) {
    championnats.value = []
    ElMessage.error(getErrorMessage(errorValue, 'Failed to load FLA championnats'))
  } finally {
    championnatLoading.value = false
  }
}

async function loadFlaTeamOptions(
  championnatId: number,
  saisonId: number,
): Promise<void> {
  flaTeamsLoading.value = true

  try {
    flaTeams.value = await getFlaTeams(championnatId, saisonId)
  } catch (errorValue) {
    flaTeams.value = []
    ElMessage.error(getErrorMessage(errorValue, 'Failed to load FLA teams'))
  } finally {
    flaTeamsLoading.value = false
  }
}

async function handleChampionnatChange(): Promise<void> {
  mappingForm.flaTeamId = undefined

  if (!selectedChampionnat.value) {
    flaTeams.value = []
    return
  }

  await loadFlaTeamOptions(
    selectedChampionnat.value.championnatId,
    selectedChampionnat.value.saisonId,
  )
}

async function openMappingDialog(team: InternalTournamentTeam): Promise<void> {
  editingTeam.value = team
  resetMappingForm()
  dialogVisible.value = true

  if (!championnats.value.length) {
    await loadChampionnats()
  }

  const existingMapping = mappingByTeamId.value.get(team.id)

  if (!existingMapping) {
    return
  }

  mappingForm.selectedChampionnatKey = `${existingMapping.flaChampionnatId}:${existingMapping.flaSaisonId}`
  await loadFlaTeamOptions(
    existingMapping.flaChampionnatId,
    existingMapping.flaSaisonId,
  )
  mappingForm.flaTeamId = existingMapping.flaTeamId
}

function buildMappingPayload(): UpsertFlaTeamMappingRequest | null {
  if (!selectedChampionnat.value || !mappingForm.flaTeamId) {
    return null
  }

  return {
    flaChampionnatId: selectedChampionnat.value.championnatId,
    flaSaisonId: selectedChampionnat.value.saisonId,
    flaTeamId: mappingForm.flaTeamId,
  }
}

async function submitMapping(): Promise<void> {
  if (!mappingFormRef.value || !editingTeam.value) {
    return
  }

  try {
    await mappingFormRef.value.validate()
  } catch {
    return
  }

  const payload = buildMappingPayload()

  if (!payload) {
    return
  }

  saving.value = true

  try {
    await upsertTeamFlaMapping(tournamentId.value, editingTeam.value.id, payload)
    ElMessage.success('FLA mapping saved successfully')
    dialogVisible.value = false
    await loadMappings()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to save FLA mapping'))
  } finally {
    saving.value = false
  }
}

async function deleteMappingWithConfirm(team: InternalTournamentTeam): Promise<void> {
  try {
    await ElMessageBox.confirm(
      'This only deletes the link between the internal team and the FLA team. Cached FLA team data will not be deleted.',
      'Delete FLA Mapping',
      { type: 'warning' },
    )
  } catch {
    return
  }

  try {
    await deleteTeamFlaMapping(tournamentId.value, team.id)
    ElMessage.success('FLA mapping deleted successfully')
    await loadMappings()
  } catch (errorValue) {
    ElMessage.error(getErrorMessage(errorValue, 'Failed to delete FLA mapping'))
  }
}

async function goBack(): Promise<void> {
  await router.push('/tournaments')
}

onMounted(() => {
  void loadTournament()
  void loadMappingData()
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

    <el-tabs v-else v-model="activeTab" class="tournament-detail__tabs">
      <el-tab-pane label="Basic Info" name="basic">
        <el-card class="tournament-detail__content" shadow="never">
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
      </el-tab-pane>

      <el-tab-pane label="Teams" name="teams">
        <el-card class="tournament-detail__content" shadow="never">
          <el-skeleton v-if="mappingLoading" :rows="4" animated />
          <el-alert
            v-else-if="mappingError"
            type="error"
            title="Failed to load tournament teams"
            show-icon
            :closable="false"
          >
            <template #default>
              <el-button type="danger" plain size="small" @click="loadMappingData">
                Retry
              </el-button>
            </template>
          </el-alert>

          <el-table v-else :data="teams" stripe>
            <el-table-column prop="name" label="Team" min-width="220" />
            <el-table-column prop="id" label="Team ID" width="120" />
            <template #empty>
              <el-empty description="No teams available for this tournament." />
            </template>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="FLA Mapping" name="fla-mapping">
        <el-card class="tournament-detail__content" shadow="never">
          <el-skeleton v-if="mappingLoading" :rows="6" animated />
          <el-alert
            v-else-if="mappingError"
            type="error"
            title="Failed to load FLA mapping data"
            show-icon
            :closable="false"
          >
            <template #default>
              <el-button type="danger" plain size="small" @click="loadMappingData">
                Retry
              </el-button>
            </template>
          </el-alert>

          <el-table v-else :data="mappingRows" stripe>
            <el-table-column label="Internal Team" min-width="220">
              <template #default="{ row }: { row: MappingTableRow }">
                {{ row.team.name }}
              </template>
            </el-table-column>
            <el-table-column label="FLA Championnat" min-width="220">
              <template #default="{ row }: { row: MappingTableRow }">
                {{ getMappingChampionnatName(row.mapping) }}
              </template>
            </el-table-column>
            <el-table-column label="FLA Season" min-width="120">
              <template #default="{ row }: { row: MappingTableRow }">
                {{ row.mapping?.flaSaisonId ?? '-' }}
              </template>
            </el-table-column>
            <el-table-column label="FLA Team" min-width="220">
              <template #default="{ row }: { row: MappingTableRow }">
                {{ row.mapping?.flaTeamName ?? '-' }}
              </template>
            </el-table-column>
            <el-table-column label="Status" min-width="130">
              <template #default="{ row }: { row: MappingTableRow }">
                <el-tag
                  :type="mappingByTeamId.has(row.team.id) ? 'success' : 'info'"
                >
                  {{ mappingByTeamId.has(row.team.id) ? 'Mapped' : 'Not mapped' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              v-if="canEditMapping || canDeleteMapping"
              label="Actions"
              fixed="right"
              width="180"
            >
              <template #default="{ row }: { row: MappingTableRow }">
                <el-button
                  v-if="canEditMapping"
                  link
                  type="primary"
                  @click="openMappingDialog(row.team)"
                >
                  {{ mappingByTeamId.has(row.team.id) ? 'Edit' : 'Create Mapping' }}
                </el-button>
                <el-button
                  v-if="canDeleteMapping && mappingByTeamId.has(row.team.id)"
                  link
                  type="danger"
                  @click="deleteMappingWithConfirm(row.team)"
                >
                  Delete
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="No teams available for this tournament." />
            </template>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="560px"
      destroy-on-close
    >
      <el-form
        ref="mappingFormRef"
        :model="mappingForm"
        :rules="mappingRules"
        label-width="150px"
      >
        <el-form-item label="Internal Team">
          <el-input :model-value="editingTeam?.name" disabled />
        </el-form-item>

        <el-form-item label="FLA Championnat" prop="selectedChampionnatKey">
          <el-select
            v-model="mappingForm.selectedChampionnatKey"
            :loading="championnatLoading"
            filterable
            placeholder="Select FLA championnat"
            @change="handleChampionnatChange"
          >
            <el-option
              v-for="championnat in championnats"
              :key="getChampionnatKey(championnat)"
              :label="getChampionnatLabel(championnat)"
              :value="getChampionnatKey(championnat)"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="FLA Season">
          <el-input :model-value="selectedChampionnat?.saisonId" disabled />
        </el-form-item>

        <el-form-item label="FLA Team" prop="flaTeamId">
          <el-select
            v-model="mappingForm.flaTeamId"
            :disabled="!selectedChampionnat || flaTeamsLoading"
            :loading="flaTeamsLoading"
            filterable
            placeholder="Select FLA team"
          >
            <el-option
              v-for="team in sortedFlaTeams"
              :key="team.flaTeamId"
              :label="team.teamName"
              :value="team.flaTeamId"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="saving" @click="dialogVisible = false">
          Cancel
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="saveDisabled"
          @click="submitMapping"
        >
          Save
        </el-button>
      </template>
    </el-dialog>
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

  &__tabs {
    min-width: 0;
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
