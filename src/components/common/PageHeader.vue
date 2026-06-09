<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <el-card class="page-header" shadow="never">
    <div class="page-header__content">
      <h1>{{ title }}</h1>
      <div class="page-header__actions">
        <slot />
      </div>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.page-header {
  border-radius: 8px;

  &__content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 650;
    letter-spacing: 0;
  }
}
</style>
