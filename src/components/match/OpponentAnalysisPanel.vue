<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  generateOpponentAnalysis,
  getLatestOpponentAnalysis,
} from '../../api/opponentAnalysis'
import { useAuthStore } from '../../stores/auth'
import { canWriteBusinessData } from '../../utils/permission'
import type { ErrorResponse, MatchResponse, MatchStatus } from '../../types/match'
import type {
  AnalysisFinding,
  ComparisonItem,
  GeneratedOpponentReport,
  OpponentAnalysisMetricsResponse,
  OpponentAnalysisReportResponse,
  TeamPerformanceMetrics,
  ThreatLevel,
} from '../../types/opponentAnalysis'

interface Props {
  matchId: number
  match: MatchResponse
}

interface ErrorWithResponse {
  response?: {
    status?: number
    data?: ErrorResponse & {
      error?: string
      errorCode?: string
      details?: string[]
      data?: Record<string, string>
      fieldErrors?: Record<string, string>
    }
  }
}

interface GeneratedErrorResult {
  error?: ErrorResponse & {
    error?: string
    errorCode?: string
    details?: string[]
    data?: Record<string, string>
    fieldErrors?: Record<string, string>
  }
  response?: Response
}

interface MetricRow {
  label: string
  ourValue: string
  opponentValue: string
}

const props = defineProps<Props>()
const authStore = useAuthStore()

const currentReport = ref<OpponentAnalysisReportResponse | null>(null)
const loadingLatest = ref(false)
const latestLoaded = ref(false)
const latestError = ref(false)
const generating = ref(false)
const regenerating = ref(false)

const canManageAnalysis = computed(() =>
  canWriteBusinessData(authStore.currentUser?.roles),
)
const currentMatchStatus = computed<MatchStatus | undefined>(
  () => props.match.status ?? props.match.matchStatus,
)
const canGenerateForMatch = computed(
  () =>
    currentMatchStatus.value !== 'FINISHED' &&
    currentMatchStatus.value !== 'CANCELLED',
)
const canGenerate = computed(
  () => canManageAnalysis.value && canGenerateForMatch.value,
)
const generatedReport = computed<GeneratedOpponentReport | undefined>(
  () => currentReport.value?.report,
)
const metrics = computed<OpponentAnalysisMetricsResponse | undefined>(
  () => currentReport.value?.metrics,
)
const hasCompletedReport = computed(
  () => currentReport.value?.status === 'COMPLETED' && Boolean(generatedReport.value),
)
const comparisonItems = computed<ComparisonItem[]>(
  () => generatedReport.value?.comparison ?? [],
)
const strengths = computed<AnalysisFinding[]>(
  () => generatedReport.value?.strengths ?? [],
)
const weaknesses = computed<AnalysisFinding[]>(
  () => generatedReport.value?.weaknesses ?? [],
)
const recommendations = computed<string[]>(
  () => generatedReport.value?.recommendations ?? [],
)
const dataLimitations = computed<string[]>(
  () => generatedReport.value?.dataLimitations ?? [],
)
const metricRows = computed<MetricRow[]>(() => [
  {
    label: 'Rank',
    ourValue: formatNumber(metrics.value?.ourTeam?.calculatedRank, 0),
    opponentValue: formatNumber(metrics.value?.opponent?.calculatedRank, 0),
  },
  {
    label: 'Points',
    ourValue: formatNumber(metrics.value?.ourTeam?.points, 0),
    opponentValue: formatNumber(metrics.value?.opponent?.points, 0),
  },
  {
    label: 'Played',
    ourValue: formatNumber(metrics.value?.ourTeam?.played, 0),
    opponentValue: formatNumber(metrics.value?.opponent?.played, 0),
  },
  {
    label: 'Wins / Draws / Losses',
    ourValue: formatRecord(metrics.value?.ourTeam),
    opponentValue: formatRecord(metrics.value?.opponent),
  },
  {
    label: 'Win Rate',
    ourValue: formatPercent(metrics.value?.ourTeam?.winRate),
    opponentValue: formatPercent(metrics.value?.opponent?.winRate),
  },
  {
    label: 'PPG',
    ourValue: formatNumber(metrics.value?.ourTeam?.pointsPerGame),
    opponentValue: formatNumber(metrics.value?.opponent?.pointsPerGame),
  },
  {
    label: 'Goals / Game',
    ourValue: formatNumber(metrics.value?.ourTeam?.goalsForPerGame),
    opponentValue: formatNumber(metrics.value?.opponent?.goalsForPerGame),
  },
  {
    label: 'Goals Against / Game',
    ourValue: formatNumber(metrics.value?.ourTeam?.goalsAgainstPerGame),
    opponentValue: formatNumber(metrics.value?.opponent?.goalsAgainstPerGame),
  },
  {
    label: 'Goal Difference',
    ourValue: formatNumber(metrics.value?.ourTeam?.goalDifference, 0),
    opponentValue: formatNumber(metrics.value?.opponent?.goalDifference, 0),
  },
  {
    label: 'Goals For',
    ourValue: formatNumber(metrics.value?.ourTeam?.goalsFor, 0),
    opponentValue: formatNumber(metrics.value?.opponent?.goalsFor, 0),
  },
  {
    label: 'Goals Against',
    ourValue: formatNumber(metrics.value?.ourTeam?.goalsAgainst, 0),
    opponentValue: formatNumber(metrics.value?.opponent?.goalsAgainst, 0),
  },
])

function getStatusCode(errorValue: unknown): number | undefined {
  if (isAxiosError(errorValue)) {
    return errorValue.response?.status
  }

  if (
    typeof errorValue === 'object' &&
    errorValue !== null &&
    'response' in errorValue &&
    (errorValue as GeneratedErrorResult).response instanceof Response
  ) {
    return (errorValue as GeneratedErrorResult).response?.status
  }

  if (
    typeof errorValue === 'object' &&
    errorValue !== null &&
    'response' in errorValue
  ) {
    return (errorValue as ErrorWithResponse).response?.status
  }

  return undefined
}

function getBackendMessage(errorValue: unknown): string | undefined {
  if (
    typeof errorValue === 'object' &&
    errorValue !== null &&
    'error' in errorValue &&
    (errorValue as GeneratedErrorResult).response instanceof Response
  ) {
    const generatedError = (errorValue as GeneratedErrorResult).error
    const fieldMessage = generatedError?.fieldErrors
      ? Object.values(generatedError.fieldErrors)[0]
      : undefined
    const dataMessage = generatedError?.data
      ? Object.values(generatedError.data)[0]
      : undefined

    return (
      generatedError?.message ??
      generatedError?.details?.[0] ??
      fieldMessage ??
      dataMessage ??
      generatedError?.error
    )
  }

  if (
    typeof errorValue !== 'object' ||
    errorValue === null ||
    !('response' in errorValue)
  ) {
    return errorValue instanceof Error ? errorValue.message : undefined
  }

  const responseData = (errorValue as ErrorWithResponse).response?.data
  const fieldMessage = responseData?.fieldErrors
    ? Object.values(responseData.fieldErrors)[0]
    : undefined
  const dataMessage = responseData?.data
    ? Object.values(responseData.data)[0]
    : undefined

  return (
    responseData?.message ??
    responseData?.details?.[0] ??
    fieldMessage ??
    dataMessage ??
    responseData?.error
  )
}

function isMappingError(errorValue: unknown): boolean {
  const generatedError =
    typeof errorValue === 'object' &&
    errorValue !== null &&
    'error' in errorValue
      ? (errorValue as GeneratedErrorResult).error
      : undefined
  const message = [
    getBackendMessage(errorValue),
    isAxiosError(errorValue) ? errorValue.response?.data?.code : undefined,
    isAxiosError(errorValue) ? errorValue.response?.data?.errorCode : undefined,
    generatedError?.code,
    generatedError?.errorCode,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return message.includes('mapping') || message.includes('fla')
}

function isTimeoutError(errorValue: unknown): boolean {
  if (isAxiosError(errorValue)) {
    return (
      errorValue.code === 'ECONNABORTED' ||
      errorValue.message.toLowerCase().includes('timeout')
    )
  }

  return errorValue instanceof Error &&
    errorValue.message.toLowerCase().includes('timeout')
}

function getGenerationErrorMessage(errorValue: unknown): string {
  const backendMessage = getBackendMessage(errorValue)
  const status = getStatusCode(errorValue)

  if (isTimeoutError(errorValue)) {
    return 'Opponent analysis generation timed out. Please try again.'
  }

  if ((status === 404 || status === 409) && isMappingError(errorValue)) {
    return 'FLA team mapping is missing or incomplete. Please configure the tournament FLA mapping first.'
  }

  if (backendMessage) {
    return backendMessage
  }

  if (status === 400) {
    return 'Invalid analysis request.'
  }

  if (status === 403) {
    return 'You do not have permission to generate opponent analysis.'
  }

  if (status === 404) {
    return 'Required match or mapping data could not be found.'
  }

  if (status === 409) {
    return 'Opponent analysis cannot be generated for this match state or required team mapping is missing.'
  }

  if (status === 429) {
    return 'AI service rate limit reached. Please try again later.'
  }

  if (status === 502) {
    return 'AI provider returned an invalid response.'
  }

  if (status === 503) {
    return 'AI service is temporarily unavailable.'
  }

  if (status === 504) {
    return 'External data source timed out.'
  }

  return 'Opponent analysis generation failed.'
}

function getLatestErrorMessage(errorValue: unknown): string {
  return getBackendMessage(errorValue) ?? 'Failed to load opponent analysis.'
}

function formatNumber(value?: number, digits = 2): string {
  if (value === undefined || value === null) {
    return '—'
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

function formatPercent(value?: number): string {
  if (value === undefined || value === null) {
    return '—'
  }

  return `${(value * 100).toFixed(1)}%`
}

function formatRecord(team?: TeamPerformanceMetrics): string {
  if (!team) {
    return '—'
  }

  return `${team.wins ?? '—'} / ${team.draws ?? '—'} / ${team.losses ?? '—'}`
}

function formatText(value?: string): string {
  return value || '—'
}

function getThreatLabel(threatLevel?: ThreatLevel): string {
  if (threatLevel === 'LOW') {
    return 'Low'
  }

  if (threatLevel === 'MEDIUM') {
    return 'Medium'
  }

  if (threatLevel === 'HIGH') {
    return 'High'
  }

  return '—'
}

function getThreatTagType(threatLevel?: ThreatLevel): 'success' | 'warning' | 'danger' | 'info' {
  if (threatLevel === 'LOW') {
    return 'success'
  }

  if (threatLevel === 'MEDIUM') {
    return 'warning'
  }

  if (threatLevel === 'HIGH') {
    return 'danger'
  }

  return 'info'
}

async function loadLatestReport(): Promise<void> {
  if (latestLoaded.value || loadingLatest.value) {
    return
  }

  loadingLatest.value = true
  latestError.value = false

  try {
    currentReport.value = await getLatestOpponentAnalysis(props.matchId)
  } catch (errorValue) {
    if (getStatusCode(errorValue) === 404) {
      currentReport.value = null
      latestLoaded.value = true
      return
    }

    currentReport.value = null
    latestError.value = true
    ElMessage.error(getLatestErrorMessage(errorValue))
  } finally {
    loadingLatest.value = false
  }

  latestLoaded.value = true
}

async function generateAnalysis(): Promise<void> {
  if (!canGenerate.value || generating.value || regenerating.value) {
    return
  }

  generating.value = true

  try {
    currentReport.value = await generateOpponentAnalysis(props.matchId, false)
    latestLoaded.value = true
    latestError.value = false
    ElMessage.success('Analysis generated successfully.')
  } catch (errorValue) {
    ElMessage.error(getGenerationErrorMessage(errorValue))
  } finally {
    generating.value = false
  }
}

async function regenerateAnalysis(): Promise<void> {
  if (!canGenerate.value || generating.value || regenerating.value) {
    return
  }

  try {
    await ElMessageBox.confirm(
      'Regenerating will refresh the latest FLA data and call the AI provider again.',
      'Regenerate Opponent Analysis',
      { type: 'warning' },
    )
  } catch {
    return
  }

  regenerating.value = true

  try {
    currentReport.value = await generateOpponentAnalysis(props.matchId, true)
    latestLoaded.value = true
    latestError.value = false
    ElMessage.success('Analysis generated successfully.')
  } catch (errorValue) {
    ElMessage.error(getGenerationErrorMessage(errorValue))
  } finally {
    regenerating.value = false
  }
}

onMounted(() => {
  void loadLatestReport()
})
</script>

<template>
  <div class="opponent-analysis">
    <el-skeleton v-if="loadingLatest" :rows="6" animated />

    <el-alert
      v-else-if="latestError"
      type="error"
      title="Failed to load opponent analysis"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button type="danger" plain size="small" @click="loadLatestReport">
          Retry
        </el-button>
      </template>
    </el-alert>

    <el-empty
      v-else-if="!currentReport"
      :description="canManageAnalysis ? '暂无对手分析报告' : '暂无可用分析报告'"
    >
      <template v-if="canManageAnalysis" #default>
        <p class="opponent-analysis__empty-copy">
          根据最新 FLA 比赛数据和双方表现指标生成赛前对手分析。
        </p>
        <el-alert
          v-if="!canGenerateForMatch"
          type="info"
          title="Opponent analysis can only be generated before the match."
          :closable="false"
          show-icon
        />
        <el-button
          v-else
          type="primary"
          :loading="generating"
          :disabled="generating || regenerating"
          @click="generateAnalysis"
        >
          Generate Analysis
        </el-button>
      </template>
    </el-empty>

    <template v-else>
      <el-card class="opponent-analysis__card" shadow="never">
        <template #header>
          <div class="opponent-analysis__header">
            <div>
              <h2>Opponent Analysis</h2>
              <div class="opponent-analysis__meta">
                Opponent: {{ formatText(currentReport.opponentTeamName) }}
              </div>
            </div>

            <el-button
              v-if="canManageAnalysis"
              type="primary"
              plain
              :loading="regenerating"
              :disabled="generating || regenerating || !canGenerateForMatch"
              @click="regenerateAnalysis"
            >
              Regenerate
            </el-button>
          </div>
        </template>

        <el-alert
          v-if="!canGenerateForMatch && canManageAnalysis"
          class="opponent-analysis__notice"
          type="info"
          title="Opponent analysis can only be generated before the match."
          :closable="false"
          show-icon
        />

        <el-alert
          v-if="currentReport.status === 'FAILED' || !generatedReport"
          type="error"
          title="Analysis generation failed."
          :description="currentReport.errorCode"
          :closable="false"
          show-icon
        />

        <template v-else>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="Threat Level">
              <el-tag :type="getThreatTagType(generatedReport.threatLevel)">
                {{ getThreatLabel(generatedReport.threatLevel) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Generated At">
              {{ formatText(currentReport.generatedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="Data Fetched At">
              {{ formatText(currentReport.sourceFetchedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="Provider">
              {{ formatText(currentReport.provider) }}
            </el-descriptions-item>
            <el-descriptions-item label="Model">
              {{ formatText(currentReport.model) }}
            </el-descriptions-item>
            <el-descriptions-item label="Prompt Version">
              {{ formatText(currentReport.promptVersion) }}
            </el-descriptions-item>
          </el-descriptions>

          <section class="opponent-analysis__section">
            <h3>Summary</h3>
            <p class="opponent-analysis__summary">
              {{ formatText(generatedReport.summary) }}
            </p>
          </section>
        </template>
      </el-card>

      <template v-if="hasCompletedReport">
        <el-card class="opponent-analysis__card" shadow="never">
          <template #header>
            <h3>Team Comparison</h3>
          </template>

          <div class="opponent-analysis__teams">
            <div>
              <span>Our Team</span>
              <strong>{{ formatText(metrics?.ourTeam?.teamName) }}</strong>
            </div>
            <div>
              <span>Opponent</span>
              <strong>{{ formatText(metrics?.opponent?.teamName) }}</strong>
            </div>
          </div>

          <el-table :data="metricRows" stripe>
            <el-table-column prop="label" label="Metric" min-width="180" />
            <el-table-column prop="ourValue" label="Our Team" min-width="160" />
            <el-table-column prop="opponentValue" label="Opponent" min-width="160" />
          </el-table>

          <div
            v-if="metrics?.ourTeam?.recentFive?.length || metrics?.opponent?.recentFive?.length"
            class="opponent-analysis__recent-form"
          >
            <h4>Recent Form</h4>
            <div class="opponent-analysis__form-grid">
              <div>
                <span>Our Team</span>
                <el-tag
                  v-for="(item, index) in metrics?.ourTeam?.recentFive ?? []"
                  :key="`our-${index}-${item}`"
                  type="info"
                >
                  {{ item }}
                </el-tag>
              </div>
              <div>
                <span>Opponent</span>
                <el-tag
                  v-for="(item, index) in metrics?.opponent?.recentFive ?? []"
                  :key="`opponent-${index}-${item}`"
                  type="info"
                >
                  {{ item }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>

        <el-card class="opponent-analysis__card" shadow="never">
          <template #header>
            <h3>AI Comparison</h3>
          </template>

          <el-table v-if="comparisonItems.length" :data="comparisonItems" stripe>
            <el-table-column prop="metric" label="Metric" min-width="160" />
            <el-table-column prop="ourValue" label="Our Team" min-width="150" />
            <el-table-column prop="opponentValue" label="Opponent" min-width="150" />
            <el-table-column prop="analysis" label="Analysis" min-width="260" />
          </el-table>
          <el-empty v-else description="No comparison data available." />
        </el-card>

        <el-card class="opponent-analysis__card" shadow="never">
          <template #header>
            <h3>Opponent Strengths</h3>
          </template>

          <div v-if="strengths.length" class="opponent-analysis__findings">
            <article
              v-for="(finding, index) in strengths"
              :key="`strength-${index}-${finding.title}`"
              class="opponent-analysis__finding"
            >
              <h4>{{ formatText(finding.title) }}</h4>
              <p>{{ formatText(finding.analysis) }}</p>
              <div v-if="finding.evidence?.length">
                <span>Evidence:</span>
                <ul>
                  <li
                    v-for="(evidence, evidenceIndex) in finding.evidence"
                    :key="`strength-evidence-${index}-${evidenceIndex}`"
                  >
                    {{ evidence }}
                  </li>
                </ul>
              </div>
            </article>
          </div>
          <el-empty v-else description="No opponent strengths available." />
        </el-card>

        <el-card class="opponent-analysis__card" shadow="never">
          <template #header>
            <h3>Opponent Weaknesses</h3>
          </template>

          <div v-if="weaknesses.length" class="opponent-analysis__findings">
            <article
              v-for="(finding, index) in weaknesses"
              :key="`weakness-${index}-${finding.title}`"
              class="opponent-analysis__finding"
            >
              <h4>{{ formatText(finding.title) }}</h4>
              <p>{{ formatText(finding.analysis) }}</p>
              <div v-if="finding.evidence?.length">
                <span>Evidence:</span>
                <ul>
                  <li
                    v-for="(evidence, evidenceIndex) in finding.evidence"
                    :key="`weakness-evidence-${index}-${evidenceIndex}`"
                  >
                    {{ evidence }}
                  </li>
                </ul>
              </div>
            </article>
          </div>
          <el-empty
            v-else
            description="No clear opponent weaknesses identified from available data."
          />
        </el-card>

        <el-card class="opponent-analysis__card" shadow="never">
          <template #header>
            <h3>Recommendations for Our Team</h3>
          </template>

          <ol v-if="recommendations.length" class="opponent-analysis__list">
            <li
              v-for="(recommendation, index) in recommendations"
              :key="`recommendation-${index}`"
            >
              {{ recommendation }}
            </li>
          </ol>
          <el-empty v-else description="No recommendations available." />
        </el-card>

        <el-card
          v-if="dataLimitations.length"
          class="opponent-analysis__card"
          shadow="never"
        >
          <template #header>
            <h3>Data Limitations</h3>
          </template>

          <ul class="opponent-analysis__list">
            <li
              v-for="(limitation, index) in dataLimitations"
              :key="`limitation-${index}`"
            >
              {{ limitation }}
            </li>
          </ul>
        </el-card>
      </template>
    </template>
  </div>
</template>

<style scoped lang="scss">
.opponent-analysis {
  display: grid;
  gap: 16px;

  &__card {
    border-radius: 8px;
  }

  &__header,
  &__teams,
  &__form-grid {
    display: flex;
    gap: 16px;
  }

  &__header {
    align-items: center;
    justify-content: space-between;
  }

  &__header h2,
  &__section h3,
  &__card h3,
  &__card h4,
  &__recent-form h4 {
    margin: 0;
    letter-spacing: 0;
  }

  &__meta,
  &__empty-copy,
  &__teams span,
  &__form-grid span {
    color: var(--el-text-color-secondary);
  }

  &__notice {
    margin-bottom: 16px;
  }

  &__section,
  &__recent-form {
    margin-top: 18px;
  }

  &__summary,
  &__finding p,
  &__list {
    line-height: 1.7;
  }

  &__teams {
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  &__teams > div,
  &__form-grid > div {
    display: grid;
    gap: 6px;
    min-width: 220px;
  }

  &__form-grid {
    flex-wrap: wrap;
  }

  &__form-grid > div {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  &__findings {
    display: grid;
    gap: 16px;
  }

  &__finding {
    display: grid;
    gap: 8px;
  }

  &__finding ul,
  &__list {
    margin: 0;
    padding-left: 20px;
  }
}

@media (max-width: 760px) {
  .opponent-analysis {
    &__header {
      align-items: flex-start;
      flex-direction: column;
    }

    :deep(.el-descriptions__body .el-descriptions__table) {
      display: block;
    }
  }
}
</style>
