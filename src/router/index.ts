import { createRouter, createWebHistory } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'
import { useAuthStore } from '../stores/auth'
import { hasAnyRole, type RoleCode } from '../utils/permission'
import AuditDetailView from '../views/audit/AuditDetailView.vue'
import AuditListView from '../views/audit/AuditListView.vue'
import DashboardView from '../views/DashboardView.vue'
import AccessDeniedView from '../views/error/AccessDeniedView.vue'
import NotFoundView from '../views/error/NotFoundView.vue'
import LoginView from '../views/LoginView.vue'
import MatchDetailView from '../views/match/MatchDetailView.vue'
import MatchListView from '../views/match/MatchListView.vue'
import PlayerDetailView from '../views/player/PlayerDetailView.vue'
import PlayerListView from '../views/player/PlayerListView.vue'
import LeaderboardsView from '../views/statistics/LeaderboardsView.vue'
import MatchStatisticsView from '../views/statistics/MatchStatisticsView.vue'
import PlayerStatisticsView from '../views/statistics/PlayerStatisticsView.vue'
import StatisticsView from '../views/statistics/StatisticsView.vue'
import TeamStatisticsView from '../views/statistics/TeamStatisticsView.vue'
import TeamDetailView from '../views/team/TeamDetailView.vue'
import TeamListView from '../views/team/TeamListView.vue'
import TournamentDetailView from '../views/tournament/TournamentDetailView.vue'
import TournamentListView from '../views/tournament/TournamentListView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    title?: string
    allowedRoles?: RoleCode[]
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      redirect: '/dashboard',
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: DashboardView,
          meta: {
            title: 'Dashboard',
          },
        },
        {
          path: 'teams',
          name: 'teams',
          component: TeamListView,
          meta: {
            title: 'Team Management',
          },
        },
        {
          path: 'teams/:id',
          name: 'team-detail',
          component: TeamDetailView,
          meta: {
            title: 'Team Detail',
          },
        },
        {
          path: 'players',
          name: 'players',
          component: PlayerListView,
          meta: {
            title: 'Player Management',
          },
        },
        {
          path: 'players/:id',
          name: 'player-detail',
          component: PlayerDetailView,
          meta: {
            title: 'Player Detail',
          },
        },
        {
          path: 'tournaments',
          name: 'tournaments',
          component: TournamentListView,
          meta: {
            title: 'Tournament Management',
          },
        },
        {
          path: 'tournaments/:id',
          name: 'tournament-detail',
          component: TournamentDetailView,
          meta: {
            title: 'Tournament Detail',
          },
        },
        {
          path: 'matches',
          name: 'matches',
          component: MatchListView,
          meta: {
            title: 'Match Management',
          },
        },
        {
          path: 'matches/:id',
          name: 'match-detail',
          component: MatchDetailView,
          meta: {
            title: 'Match Detail',
          },
        },
        {
          path: 'statistics',
          name: 'statistics',
          component: StatisticsView,
          meta: {
            title: 'Statistics',
          },
        },
        {
          path: 'statistics/matches',
          name: 'statistics-matches',
          component: MatchStatisticsView,
          meta: {
            title: 'Match Statistics',
          },
        },
        {
          path: 'statistics/players',
          name: 'statistics-players',
          component: PlayerStatisticsView,
          meta: {
            title: 'Player Statistics',
          },
        },
        {
          path: 'statistics/teams',
          name: 'statistics-teams',
          component: TeamStatisticsView,
          meta: {
            title: 'Team Statistics',
          },
        },
        {
          path: 'statistics/leaderboards',
          name: 'statistics-leaderboards',
          component: LeaderboardsView,
          meta: {
            title: 'Leaderboards',
          },
        },
        {
          path: 'audit',
          name: 'audit',
          component: AuditListView,
          meta: {
            title: 'Audit Log',
            allowedRoles: ['ADMIN'],
          },
        },
        {
          path: 'audit/:id',
          name: 'audit-detail',
          component: AuditDetailView,
          meta: {
            title: 'Audit Log Detail',
            allowedRoles: ['ADMIN'],
          },
        },
        {
          path: '403',
          name: 'access-denied',
          component: AccessDeniedView,
          meta: {
            title: 'Access Denied',
          },
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some((route) => route.meta.requiresAuth)
  const allowedRoles = to.meta.allowedRoles

  if (requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }

  if (allowedRoles && !hasAnyRole(allowedRoles, authStore.currentUser?.roles)) {
    return '/403'
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    return '/dashboard'
  }

  return true
})

export default router
