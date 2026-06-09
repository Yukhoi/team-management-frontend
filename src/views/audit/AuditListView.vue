<script setup lang="ts">
import { isAxiosError } from 'axios'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getAuditLogs } from '../../api/audit'
import EmptyState from '../../components/common/EmptyState.vue'
import ErrorState from '../../components/common/ErrorState.vue'
import LoadingState from '../../components/common/LoadingState.vue'
import PageCard from '../../components/common/PageCard.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import type { AuditLog, AuditLogQuery, ErrorResponse } from '../../types/audit'

type DateRange = [string, string]

const router = useRouter()

const logs = ref<AuditLog[]>([])
const loading = ref(false)
const error = ref(false)
const errorMessage = ref('Failed to load audit logs')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const dateRange = ref<DateRange | undefined>()
const debounceTimer = ref<ReturnType<typeof setTimeout>>()

const filters = reactive({
  eventType: '',
  aggregateType: '',
  aggregateId: undefined as number | undefined,
  username: '',
})

const eventTypeOptions = computed(() => {
  const values = logs.value
    .map((log) => log.eventType)
    .filter((value): value is string => Boolean(value))

  return [...new Set(values)].sort()
})

const aggregateTypeOptions = computed(() => {
  const values = logs.value
    .map((log) => log.aggregateType ?? log.bizType)
    .filter((value): value is string => Boolean(value))

  return [...new Set(values)].sort()
})

function getErrorMessage(errorValue: unknown, fallback: string): string {
  if (isAxiosError<ErrorResponse>(errorValue)) {
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

function buildParams(): AuditLogQuery {
  const params: AuditLogQuery = {
    page: page.value - 1,
    size: pageSize.value,
  }

  if (filters.eventType) {
    params.eventType = filters.eventType
  }

  if (filters.aggregateType) {
    params.aggregateType = filters.aggregateType
  }

  if (filters.aggregateId) {
    params.aggregateId = filters.aggregateId
  }

  if (filters.username) {
    params.username = filters.username
  }

  if (dateRange.value) {
    const [from, to] = dateRange.value
    params.from = from
    params.to = to
  }

  return params
}

async function loadAuditLogs(): Promise<void> {
  loading.value = true
  error.value = false
  errorMessage.value = 'Failed to load audit logs'

  try {
    const response = await getAuditLogs(buildParams())
    logs.value = response.content ?? []
    total.value = response.totalElements ?? 0
  } catch (errorValue) {
    logs.value = []
    total.value = 0
    errorMessage.value = getErrorMessage(errorValue, 'Failed to load audit logs')
    error.value = true
  } finally {
    loading.value = false
  }
}

function scheduleLoad(): void {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }

  debounceTimer.value = setTimeout(() => {
    page.value = 1
    void loadAuditLogs()
  }, 300)
}

function clearFilters(): void {
  filters.eventType = ''
  filters.aggregateType = ''
  filters.aggregateId = undefined
  filters.username = ''
  dateRange.value = undefined
}

async function handlePageChange(nextPage: number): Promise<void> {
  page.value = nextPage
  await loadAuditLogs()
}

async function viewLog(id: number): Promise<void> {
  await router.push(`/audit/${id}`)
}

watch(
  () => [
    filters.eventType,
    filters.aggregateType,
    filters.aggregateId,
    filters.username,
    dateRange.value?.[0],
    dateRange.value?.[1],
  ],
  () => {
    scheduleLoad()
  },
)

onMounted(() => {
  void loadAuditLogs()
})

onBeforeUnmount(() => {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
})
</script>

<template>
  <section class="audit-page">
    <page-header title="Audit Logs">
      <template #default>
        <el-form inline>
          <el-form-item label="Event Type">
            <el-select
              v-model="filters.eventType"
              class="audit-page__select"
              allow-create
              clearable
              filterable
              placeholder="Event type"
            >
              <el-option
                v-for="item in eventTypeOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="Aggregate Type">
            <el-select
              v-model="filters.aggregateType"
              class="audit-page__select"
              allow-create
              clearable
              filterable
              placeholder="Aggregate type"
            >
              <el-option
                v-for="item in aggregateTypeOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="Aggregate ID">
            <el-input-number v-model="filters.aggregateId" :min="1" clearable />
          </el-form-item>

          <el-form-item label="User">
            <el-input v-model="filters.username" clearable placeholder="Username" />
          </el-form-item>

          <el-form-item label="Date Range">
            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              start-placeholder="From"
              end-placeholder="To"
              value-format="YYYY-MM-DDTHH:mm:ss[Z]"
            />
          </el-form-item>

          <el-button type="primary" :disabled="loading" @click="loadAuditLogs">
            Refresh
          </el-button>
          <el-button :disabled="loading" @click="clearFilters">
            Clear
          </el-button>
        </el-form>
      </template>
    </page-header>

    <loading-state v-if="loading" />

    <error-state
      v-else-if="error"
      :title="errorMessage"
      @retry="loadAuditLogs"
    />

    <page-card v-else>
      <el-table :data="logs" stripe>
        <el-table-column prop="id" label="ID" min-width="90" />
        <el-table-column prop="eventType" label="Event Type" min-width="220" />
        <el-table-column prop="aggregateType" label="Aggregate Type" min-width="150">
          <template #default="{ row }: { row: AuditLog }">
            {{ row.aggregateType ?? row.bizType }}
          </template>
        </el-table-column>
        <el-table-column prop="aggregateId" label="Aggregate ID" min-width="130">
          <template #default="{ row }: { row: AuditLog }">
            {{ row.aggregateId ?? row.bizId }}
          </template>
        </el-table-column>
        <el-table-column prop="occurredAt" label="Occurred At" min-width="190">
          <template #default="{ row }: { row: AuditLog }">
            {{ row.occurredAt ?? row.operatedAt }}
          </template>
        </el-table-column>
        <el-table-column prop="username" label="User" min-width="150">
          <template #default="{ row }: { row: AuditLog }">
            {{ row.username ?? row.operatorUsername }}
          </template>
        </el-table-column>
        <el-table-column prop="traceId" label="Trace ID" min-width="180" />
        <el-table-column label="Actions" fixed="right" width="110">
          <template #default="{ row }: { row: AuditLog }">
            <el-button type="primary" link @click="viewLog(row.id)">
              View
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <empty-state description="No audit logs found" />
        </template>
      </el-table>

      <el-pagination
        class="audit-page__pagination"
        background
        layout="prev, pager, next"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        @current-change="handlePageChange"
      />
    </page-card>
  </section>
</template>

<style scoped lang="scss">
.audit-page {
  display: grid;
  gap: 16px;

  &__select {
    width: 220px;
  }

  &__pagination {
    margin-top: 16px;
    justify-content: flex-end;
  }

}
</style>
