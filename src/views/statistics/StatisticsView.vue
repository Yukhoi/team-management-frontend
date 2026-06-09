<script setup lang="ts">
const modules = [
  {
    title: 'Match Statistics',
    path: '/statistics/matches',
  },
  {
    title: 'Player Statistics',
    path: '/statistics/players',
  },
  {
    title: 'Team Statistics',
    path: '/statistics/teams',
  },
  {
    title: 'Leaderboards',
    path: '/statistics/leaderboards',
  },
]
</script>

<template>
  <section class="statistics-home">
    <el-card class="statistics-home__header" shadow="never">
      <h1>Statistics</h1>
    </el-card>

    <el-row :gutter="16">
      <el-col
        v-for="item in modules"
        :key="item.path"
        :xs="24"
        :sm="12"
        :lg="6"
      >
        <el-card class="statistics-home__module" shadow="never">
          <h2>{{ item.title }}</h2>
          <el-button type="primary" plain @click="$router.push(item.path)">
            Open
          </el-button>
        </el-card>
      </el-col>
    </el-row>
  </section>
</template>

<style scoped lang="scss">
.statistics-home {
  display: grid;
  gap: 16px;

  &__header,
  &__module {
    border-radius: 8px;
  }

  &__module {
    margin-bottom: 16px;

    :deep(.el-card__body) {
      display: grid;
      gap: 16px;
      min-height: 120px;
      align-content: space-between;
    }
  }

  h1,
  h2 {
    margin: 0;
    letter-spacing: 0;
  }

  h1 {
    font-size: 24px;
    font-weight: 650;
  }

  h2 {
    font-size: 18px;
    font-weight: 650;
  }
}
</style>
