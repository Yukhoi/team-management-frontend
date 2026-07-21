<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowDown,
  DataAnalysis,
  DataBoard,
  Document,
  Football,
  Lock,
  SwitchButton,
  Trophy,
  User,
  UserFilled,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import { useAuthStore } from '../stores/auth'
import { hasAnyRole, type RoleCode } from '../utils/permission'

interface MenuItem {
  label: string
  path: string
  icon: Component
  allowedRoles?: RoleCode[]
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: DataBoard,
  },
  {
    label: 'Teams',
    path: '/teams',
    icon: UserFilled,
  },
  {
    label: 'Players',
    path: '/players',
    icon: User,
  },
  {
    label: 'Tournaments',
    path: '/tournaments',
    icon: Trophy,
  },
  {
    label: 'Matches',
    path: '/matches',
    icon: Football,
  },
  {
    label: 'Statistics',
    path: '/statistics',
    icon: DataAnalysis,
  },
  {
    label: 'User Management',
    path: '/users',
    icon: UserFilled,
    allowedRoles: ['ADMIN'],
  },
  {
    label: 'Audit',
    path: '/audit',
    icon: Document,
    allowedRoles: ['ADMIN'],
  },
]

const username = computed(() => authStore.currentUser?.username ?? '')
const roles = computed(() =>
  authStore.currentUser?.roles
    ?.map((role) => role.code ?? role.name ?? '')
    .filter(Boolean)
    .map((role) => role.replace(/^ROLE_/, '')) ?? [],
)
const roleText = computed(() => roles.value.join(', '))
const visibleMenuItems = computed(() =>
  menuItems.filter((item) => {
    if (!item.allowedRoles) {
      return true
    }

    return hasAnyRole(item.allowedRoles, authStore.currentUser?.roles)
  }),
)
const pageTitle = computed(() => String(route.meta.title ?? 'Dashboard'))
const activeMenu = computed(() => {
  const matchedItem = visibleMenuItems.value.find(
    (item) => route.path === item.path || route.path.startsWith(`${item.path}/`),
  )

  return matchedItem?.path ?? route.path
})

async function logout(): Promise<void> {
  try {
    await authStore.logout()
  } catch (error) {
    if (error instanceof Error && error.message) {
      ElMessage.error(error.message)
    }
  } finally {
    await router.push('/login')
  }
}

async function handleUserCommand(command: string): Promise<void> {
  if (command === 'change-password') {
    await router.push('/account/change-password')
    return
  }

  if (command === 'logout') {
    await logout()
  }
}
</script>

<template>
  <el-container class="main-layout">
    <el-header class="main-layout__header">
      <div class="main-layout__brand">
        <span class="main-layout__title">Team Management</span>
      </div>

      <el-dropdown trigger="click" @command="handleUserCommand">
        <button class="main-layout__user" type="button">
          <span class="main-layout__identity">
            <strong>{{ username }}</strong>
            <span>{{ roleText }}</span>
          </span>
          <el-icon>
            <ArrowDown />
          </el-icon>
        </button>

        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="change-password">
              <el-icon>
                <Lock />
              </el-icon>
              <span>Change Password</span>
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon>
                <SwitchButton />
              </el-icon>
              <span>Logout</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </el-header>

    <el-container class="main-layout__body">
      <el-aside class="main-layout__aside" width="220px">
        <el-menu
          class="main-layout__menu"
          :default-active="activeMenu"
          router
        >
          <el-menu-item
            v-for="item in visibleMenuItems"
            :key="item.path"
            :index="item.path"
          >
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-main class="main-layout__content">
        <el-breadcrumb class="main-layout__breadcrumb" separator="/">
          <el-breadcrumb-item>{{ pageTitle }}</el-breadcrumb-item>
        </el-breadcrumb>

        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.main-layout {
  min-height: 100vh;

  &__header {
    display: flex;
    min-height: 64px;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--el-border-color-light);
    background-color: var(--el-bg-color);
  }

  &__title {
    font-size: 18px;
    font-weight: 650;
    letter-spacing: 0;
    white-space: nowrap;
  }

  &__user {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 12px;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 0;
  }

  &__identity {
    display: grid;
    min-width: 0;
    justify-items: end;
    gap: 3px;
    line-height: 1.2;

    strong,
    span {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }
  }

  &__body {
    min-height: calc(100vh - 64px);
  }

  &__aside {
    width: 220px !important;
    border-right: 1px solid var(--el-border-color-light);
    background-color: var(--el-bg-color);
  }

  &__menu {
    border-right: 0;
  }

  &__content {
    display: grid;
    align-content: start;
    gap: 16px;
    padding: 20px;
    background-color: var(--el-fill-color-lighter);
  }

  &__breadcrumb {
    min-height: 22px;
  }
}

@media (max-width: 760px) {
  .main-layout {
    &__header {
      min-height: auto;
      flex-wrap: wrap;
      padding-top: 12px;
      padding-bottom: 12px;
    }

    &__user {
      width: 100%;
      justify-content: space-between;
    }

    &__identity {
      justify-items: start;
    }

    &__body {
      flex-direction: column;
    }

    &__aside {
      width: 100% !important;
      border-right: 0;
      border-bottom: 1px solid var(--el-border-color-light);
    }

    &__menu {
      display: flex;
      overflow-x: auto;

      :deep(.el-menu-item) {
        flex: 0 0 auto;
      }
    }

    &__content {
      padding: 16px;
    }
  }
}
</style>
