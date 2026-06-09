import { useAuthStore } from '../stores/auth'
import type { RoleResponse } from '../types/auth'

export type RoleCode = 'ADMIN' | 'COACH' | 'PLAYER'
type RoleLike = RoleResponse | string

function normalizeRole(role: RoleLike): string {
  const value = typeof role === 'string' ? role : role.code ?? role.name ?? ''

  return value.replace(/^ROLE_/, '').toUpperCase()
}

function getCurrentRoles(): RoleLike[] {
  const authStore = useAuthStore()

  return authStore.currentUser?.roles ?? []
}

export function hasRole(role: RoleCode, roles: RoleLike[] = getCurrentRoles()): boolean {
  return roles.some((item) => normalizeRole(item) === role)
}

export function hasAnyRole(
  rolesToMatch: RoleCode[],
  roles: RoleLike[] = getCurrentRoles(),
): boolean {
  return rolesToMatch.some((role) => hasRole(role, roles))
}

export function isAdmin(roles: RoleLike[] = getCurrentRoles()): boolean {
  return hasRole('ADMIN', roles)
}

export function isCoach(roles: RoleLike[] = getCurrentRoles()): boolean {
  return hasRole('COACH', roles)
}

export function isPlayer(roles: RoleLike[] = getCurrentRoles()): boolean {
  return hasRole('PLAYER', roles)
}

export function canWriteBusinessData(roles: RoleLike[] = getCurrentRoles()): boolean {
  return hasAnyRole(['ADMIN', 'COACH'], roles)
}
