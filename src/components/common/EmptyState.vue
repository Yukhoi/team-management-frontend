<script setup lang="ts">
withDefaults(
  defineProps<{
    description?: string
  }>(),
  {
    description: 'No data found',
  },
)
</script>

<template>
  <el-empty :description="description" />
</template>
