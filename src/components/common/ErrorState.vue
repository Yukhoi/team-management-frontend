<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
  }>(),
  {
    title: 'Something went wrong',
  },
)

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <el-alert
    :title="title"
    type="error"
    show-icon
    :closable="false"
  >
    <template #default>
      <el-button type="danger" plain size="small" @click="emit('retry')">
        Retry
      </el-button>
    </template>
  </el-alert>
</template>
