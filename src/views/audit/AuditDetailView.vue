<script setup lang="ts">
import { isAxiosError } from 'axios'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getAuditLogById } from '../../api/audit'
import ErrorState from '../../components/common/ErrorState.vue'
import LoadingState from '../../components/common/LoadingState.vue'
import PageCard from '../../components/common/PageCard.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import type { AuditLogDetail, ErrorResponse } from '../../types/audit'

type JsonField = {
  label: string
  value?: string
}

const route = useRoute()
const router = useRouter()

const log = ref<AuditLogDetail>()
const loading = ref(false)
const error = ref(false)
const errorMessage = ref('Failed to load audit log detail')

const logId = computed(() => Number(route.params.id))
const jsonFields = computed<JsonField[]>(() => [
  {
    label: 'Before Data',
    value: log.value?.beforeData,
  },
  {
    label: 'After Data',
    value: log.value?.afterData,
  },
  {
    label: 'Data',
    value: log.value?.data,
  },
])

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

function formatJson(value?: string): string {
  if (!value) {
    return ''
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

async function loadAuditLog(): Promise<void> {
  if (!Number.isFinite(logId.value)) {
    error.value = true
    errorMessage.value = 'Invalid audit log ID'
    return
  }

  loading.value = true
  error.value = false
  errorMessage.value = 'Failed to load audit log detail'

  try {
    log.value = await getAuditLogById(logId.value)
  } catch (errorValue) {
    log.value = undefined
    errorMessage.value = getErrorMessage(errorValue, 'Failed to load audit log detail')
    error.value = true
  } finally {
    loading.value = false
  }
}

async function goBack(): Promise<void> {
  await router.push('/audit')
}

onMounted(() => {
  void loadAuditLog()
})
</script>

<template>
  <section class="audit-detail">
    <page-header title="Audit Log Detail">
        <el-button @click="goBack">
          Back
        </el-button>
    </page-header>

    <loading-state v-if="loading" />

    <error-state
      v-else-if="error"
      :title="errorMessage"
      @retry="loadAuditLog"
    />

    <template v-else-if="log">
      <page-card>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">
            {{ log.id }}
          </el-descriptions-item>
          <el-descriptions-item label="Event ID">
            {{ log.eventId }}
          </el-descriptions-item>
          <el-descriptions-item label="Event Type">
            {{ log.eventType }}
          </el-descriptions-item>
          <el-descriptions-item label="Aggregate Type">
            {{ log.aggregateType ?? log.bizType }}
          </el-descriptions-item>
          <el-descriptions-item label="Aggregate ID">
            {{ log.aggregateId ?? log.bizId }}
          </el-descriptions-item>
          <el-descriptions-item label="Occurred At">
            {{ log.occurredAt ?? log.operatedAt }}
          </el-descriptions-item>
          <el-descriptions-item label="Created At">
            {{ log.createdAt }}
          </el-descriptions-item>
          <el-descriptions-item label="User ID">
            {{ log.userId ?? log.operatorUserId }}
          </el-descriptions-item>
          <el-descriptions-item label="Username">
            {{ log.username ?? log.operatorUsername }}
          </el-descriptions-item>
          <el-descriptions-item label="Operator Name">
            {{ log.operatorNameSnapshot }}
          </el-descriptions-item>
          <el-descriptions-item label="Trace ID">
            {{ log.traceId }}
          </el-descriptions-item>
        </el-descriptions>
      </page-card>

      <page-card>
        <h2>Event JSON</h2>

        <div class="audit-detail__json-grid">
          <section
            v-for="item in jsonFields"
            :key="item.label"
            class="audit-detail__json-section"
          >
            <h3>{{ item.label }}</h3>
            <pre>{{ formatJson(item.value) }}</pre>
          </section>
        </div>
      </page-card>
    </template>

    <el-empty v-else description="Audit log not found" />
  </section>
</template>

<style scoped lang="scss">
.audit-detail {
  display: grid;
  gap: 16px;

  &__json-grid {
    display: grid;
    gap: 16px;
  }

  &__json-section {
    display: grid;
    gap: 8px;
    min-width: 0;
  }

  h2,
  h3 {
    margin: 0;
    letter-spacing: 0;
  }

  h2 {
    font-size: 20px;
    font-weight: 650;
  }

  h3 {
    font-size: 15px;
    font-weight: 650;
  }

  pre {
    max-height: 320px;
    overflow: auto;
    margin: 0;
    padding: 12px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    background: var(--el-fill-color-light);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
