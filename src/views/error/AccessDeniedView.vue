<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

async function goDashboard(): Promise<void> {
  await router.push('/dashboard')
}
</script>

<template>
  <section class="error-page">
    <el-result
      icon="warning"
      title="Access Denied"
      sub-title="You do not have permission to access this page."
    >
      <template #extra>
        <el-button type="primary" @click="goDashboard">
          Back to Dashboard
        </el-button>
      </template>
    </el-result>
  </section>
</template>

<style scoped lang="scss">
.error-page {
  display: grid;
  min-height: 60vh;
  place-items: center;
}
</style>
