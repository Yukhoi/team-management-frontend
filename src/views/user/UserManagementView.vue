<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from 'element-plus'

import {
  createUser,
  getRoles,
  getUsers,
  resetPassword,
  updateUserRoles,
  updateUserStatus,
} from '../../api/auth'
import { useAuthStore } from '../../stores/auth'
import type {
  CreateUserRequest,
  ResetPasswordRequest,
  UpdateUserRolesRequest,
  UpdateUserStatusRequest,
  UserManagementResponse,
  UserStatus,
} from '../../types/auth'

interface CreateUserFormState {
  username: string
  displayName: string
  password: string
  confirmPassword: string
  roles: string[]
}

interface EditUserFormState {
  roles: string[]
  status: UserStatus
  password: string
  confirmPassword: string
}

interface ResetPasswordFormState {
  password: string
  confirmPassword: string
}

const USER_STATUSES: UserStatus[] = ['ACTIVE', 'DISABLED', 'LOCKED']

const authStore = useAuthStore()

const users = ref<UserManagementResponse[]>([])
const roleOptions = ref<string[]>([])
const loading = ref(false)
const rolesLoading = ref(false)
const submittingCreate = ref(false)
const submittingEdit = ref(false)
const submittingResetPassword = ref(false)
const createDialogVisible = ref(false)
const editDialogVisible = ref(false)
const resetPasswordDialogVisible = ref(false)
const editingUser = ref<UserManagementResponse | null>(null)
const resettingUser = ref<UserManagementResponse | null>(null)
const createFormRef = ref<FormInstance>()
const editFormRef = ref<FormInstance>()
const resetPasswordFormRef = ref<FormInstance>()
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const searchKeyword = ref('')
const roleFilter = ref('')
const statusFilter = ref<UserStatus | ''>('')

const createForm = reactive<CreateUserFormState>({
  username: '',
  displayName: '',
  password: '',
  confirmPassword: '',
  roles: [],
})

const editForm = reactive<EditUserFormState>({
  roles: [],
  status: 'ACTIVE',
  password: '',
  confirmPassword: '',
})

const resetPasswordForm = reactive<ResetPasswordFormState>({
  password: '',
  confirmPassword: '',
})

const currentUserId = computed(() => authStore.currentUser?.id)
const filteredUsers = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  const normalizedRoleFilter = normalizeRole(roleFilter.value)

  return users.value.filter((user) => {
    const matchesKeyword = keyword
      ? [user.username, user.displayName]
          .some((value) => value?.toLowerCase().includes(keyword))
      : true
    const matchesRole = normalizedRoleFilter
      ? (user.roles ?? []).some((role) => normalizeRole(role) === normalizedRoleFilter)
      : true
    const matchesStatus = statusFilter.value
      ? user.status === statusFilter.value
      : true

    return matchesKeyword && matchesRole && matchesStatus
  })
})

function normalizeRole(role?: string): string {
  return (role ?? '').replace(/^ROLE_/, '').toUpperCase()
}

function getRoleLabel(role: string): string {
  return normalizeRole(role)
}

function getRolePayloadValue(role: string): string {
  const normalizedRole = normalizeRole(role)
  const option = roleOptions.value.find(
    (item) => normalizeRole(item) === normalizedRole,
  )

  return option ?? role
}

function getRoleTagType(role: string): 'success' | 'warning' | 'danger' | 'info' {
  const normalizedRole = normalizeRole(role)

  if (normalizedRole === 'ADMIN') {
    return 'danger'
  }

  if (normalizedRole === 'COACH') {
    return 'warning'
  }

  if (normalizedRole === 'PLAYER') {
    return 'success'
  }

  return 'info'
}

function getStatusTagType(status?: UserStatus): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'ACTIVE') {
    return 'success'
  }

  if (status === 'LOCKED') {
    return 'warning'
  }

  if (status === 'DISABLED') {
    return 'danger'
  }

  return 'info'
}

function getActionStatus(user: UserManagementResponse): UserStatus {
  return user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
}

function isCurrentUser(user: UserManagementResponse): boolean {
  return Boolean(user.id && currentUserId.value && user.id === currentUserId.value)
}

function validatePassword(
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void,
): void {
  if (!value) {
    callback(new Error('Password is required'))
    return
  }

  if (value.length < 6) {
    callback(new Error('Password must be at least 6 characters'))
    return
  }

  if (value.length > 100) {
    callback(new Error('Password must be at most 100 characters'))
    return
  }

  callback()
}

function validateCreateConfirmPassword(
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void,
): void {
  if (!value) {
    callback(new Error('Confirm password is required'))
    return
  }

  if (value !== createForm.password) {
    callback(new Error('Passwords do not match'))
    return
  }

  callback()
}

function validateOptionalEditPassword(
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void,
): void {
  if (!value) {
    callback()
    return
  }

  if (value.length < 6) {
    callback(new Error('Password must be at least 6 characters'))
    return
  }

  if (value.length > 100) {
    callback(new Error('Password must be at most 100 characters'))
    return
  }

  callback()
}

function validateEditConfirmPassword(
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void,
): void {
  if (!editForm.password && !value) {
    callback()
    return
  }

  if (value !== editForm.password) {
    callback(new Error('Passwords do not match'))
    return
  }

  callback()
}

function validateResetConfirmPassword(
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void,
): void {
  if (!value) {
    callback(new Error('Confirm new password is required'))
    return
  }

  if (value !== resetPasswordForm.password) {
    callback(new Error('Passwords do not match'))
    return
  }

  callback()
}

const createRules: FormRules<CreateUserFormState> = {
  username: [
    { required: true, message: 'Username is required', trigger: 'blur' },
    { min: 3, max: 50, message: 'Username must be 3 to 50 characters', trigger: 'blur' },
  ],
  displayName: [
    { required: true, message: 'Display name is required', trigger: 'blur' },
    { min: 1, max: 100, message: 'Display name must be at most 100 characters', trigger: 'blur' },
  ],
  password: [
    { validator: validatePassword, trigger: ['blur', 'change'] },
  ],
  confirmPassword: [
    { validator: validateCreateConfirmPassword, trigger: ['blur', 'change'] },
  ],
  roles: [
    { required: true, message: 'Select at least one role', trigger: 'change' },
  ],
}

const editRules: FormRules<EditUserFormState> = {
  roles: [
    { required: true, message: 'Select at least one role', trigger: 'change' },
  ],
  status: [
    { required: true, message: 'Status is required', trigger: 'change' },
  ],
  password: [
    { validator: validateOptionalEditPassword, trigger: ['blur', 'change'] },
  ],
  confirmPassword: [
    { validator: validateEditConfirmPassword, trigger: ['blur', 'change'] },
  ],
}

const resetPasswordRules: FormRules<ResetPasswordFormState> = {
  password: [
    { validator: validatePassword, trigger: ['blur', 'change'] },
  ],
  confirmPassword: [
    { validator: validateResetConfirmPassword, trigger: ['blur', 'change'] },
  ],
}

function resetCreateForm(): void {
  createForm.username = ''
  createForm.displayName = ''
  createForm.password = ''
  createForm.confirmPassword = ''
  createForm.roles = []
  createFormRef.value?.clearValidate()
}

function resetEditForm(): void {
  editForm.roles = []
  editForm.status = 'ACTIVE'
  editForm.password = ''
  editForm.confirmPassword = ''
  editingUser.value = null
  editFormRef.value?.clearValidate()
}

function resetResetPasswordForm(): void {
  resetPasswordForm.password = ''
  resetPasswordForm.confirmPassword = ''
  resettingUser.value = null
  resetPasswordFormRef.value?.clearValidate()
}

function handleCreatePasswordInput(): void {
  if (createForm.confirmPassword) {
    void createFormRef.value?.validateField('confirmPassword')
  }
}

function handleEditPasswordInput(): void {
  if (editForm.confirmPassword) {
    void editFormRef.value?.validateField('confirmPassword')
  }
}

function handleResetPasswordInput(): void {
  if (resetPasswordForm.confirmPassword) {
    void resetPasswordFormRef.value?.validateField('confirmPassword')
  }
}

async function loadUsers(): Promise<void> {
  loading.value = true

  try {
    const response = await getUsers({
      page: page.value - 1,
      size: pageSize.value,
    })

    users.value = response.content ?? []
    total.value = response.totalElements ?? 0
  } catch {
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function loadRoles(): Promise<void> {
  rolesLoading.value = true

  try {
    roleOptions.value = await getRoles()
  } catch {
    roleOptions.value = []
  } finally {
    rolesLoading.value = false
  }
}

function openCreateDialog(): void {
  resetCreateForm()
  createDialogVisible.value = true
}

function openEditDialog(user: UserManagementResponse): void {
  if (!user.id) {
    return
  }

  editingUser.value = user
  editForm.roles = (user.roles ?? []).map(getRolePayloadValue)
  editForm.status = user.status ?? 'ACTIVE'
  editForm.password = ''
  editForm.confirmPassword = ''
  editDialogVisible.value = true
}

function openResetPasswordDialog(user: UserManagementResponse): void {
  if (!user.id) {
    return
  }

  resettingUser.value = user
  resetPasswordForm.password = ''
  resetPasswordForm.confirmPassword = ''
  resetPasswordDialogVisible.value = true
}

async function submitCreateUser(): Promise<void> {
  if (!createFormRef.value) {
    return
  }

  try {
    await createFormRef.value.validate()
  } catch {
    return
  }

  const payload: CreateUserRequest = {
    username: createForm.username,
    displayName: createForm.displayName,
    password: createForm.password,
    roles: createForm.roles,
  }

  submittingCreate.value = true

  try {
    await createUser(payload)
    ElMessage.success('User created successfully')
    createDialogVisible.value = false
    resetCreateForm()
    await loadUsers()
  } catch {
    // Global HTTP interceptor displays backend validation and permission errors.
  } finally {
    submittingCreate.value = false
  }
}

async function submitEditUser(): Promise<void> {
  if (!editFormRef.value || !editingUser.value?.id) {
    return
  }

  try {
    await editFormRef.value.validate()
  } catch {
    return
  }

  const userId = editingUser.value.id
  const rolesPayload: UpdateUserRolesRequest = {
    roles: editForm.roles,
  }
  const statusPayload: UpdateUserStatusRequest = {
    status: editForm.status,
  }

  submittingEdit.value = true

  try {
    await updateUserRoles(userId, rolesPayload)

    if (!isCurrentUser(editingUser.value)) {
      await updateUserStatus(userId, statusPayload)
    }

    if (editForm.password) {
      const passwordPayload: ResetPasswordRequest = {
        password: editForm.password,
      }

      await resetPassword(userId, passwordPayload)
      editForm.password = ''
      editForm.confirmPassword = ''
    }

    ElMessage.success('User updated successfully')
    editDialogVisible.value = false
    await loadUsers()
  } catch {
    // Global HTTP interceptor displays backend validation and permission errors.
  } finally {
    submittingEdit.value = false
  }
}

async function updateStatus(user: UserManagementResponse, status: UserStatus): Promise<void> {
  if (!user.id) {
    return
  }

  if (isCurrentUser(user) && status !== 'ACTIVE') {
    ElMessage.warning('Cannot disable the current account')
    return
  }

  try {
    await ElMessageBox.confirm(
      `Are you sure you want to set ${user.username ?? 'this user'} to ${status}?`,
      'Confirm Status Change',
      { type: 'warning' },
    )
  } catch {
    return
  }

  try {
    await updateUserStatus(user.id, { status })
    ElMessage.success('User status updated successfully')
    await loadUsers()
  } catch {
    // Global HTTP interceptor displays backend validation and permission errors.
  }
}

async function submitResetPassword(): Promise<void> {
  if (!resetPasswordFormRef.value || !resettingUser.value?.id) {
    return
  }

  try {
    await resetPasswordFormRef.value.validate()
  } catch {
    return
  }

  const payload: ResetPasswordRequest = {
    password: resetPasswordForm.password,
  }

  submittingResetPassword.value = true

  try {
    await resetPassword(resettingUser.value.id, payload)
    ElMessage.success('Password reset successfully')
    resetPasswordDialogVisible.value = false
    resetResetPasswordForm()
  } catch {
    // Global HTTP interceptor displays backend validation and permission errors.
  } finally {
    submittingResetPassword.value = false
  }
}

async function handlePageChange(nextPage: number): Promise<void> {
  page.value = nextPage
  await loadUsers()
}

onMounted(() => {
  void loadUsers()
  void loadRoles()
})
</script>

<template>
  <section class="user-page">
    <el-card class="user-page__header" shadow="never">
      <div class="user-page__header-content">
        <div>
          <h1>User Management</h1>
          <p>Manage system accounts, roles, status, and passwords.</p>
        </div>

        <div class="user-page__actions">
          <el-button :disabled="loading" @click="loadUsers">
            Refresh
          </el-button>
          <el-button type="primary" @click="openCreateDialog">
            Create User
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="user-page__table-card" shadow="never">
      <div class="user-page__filters">
        <el-input
          v-model="searchKeyword"
          clearable
          placeholder="Search username or display name"
        />
        <el-select
          v-model="roleFilter"
          :loading="rolesLoading"
          clearable
          placeholder="Role"
        >
          <el-option
            v-for="role in roleOptions"
            :key="role"
            :label="getRoleLabel(role)"
            :value="role"
          />
        </el-select>
        <el-select v-model="statusFilter" clearable placeholder="Status">
          <el-option
            v-for="status in USER_STATUSES"
            :key="status"
            :label="status"
            :value="status"
          />
        </el-select>
      </div>

      <el-table v-loading="loading" :data="filteredUsers" stripe>
        <el-table-column prop="id" label="ID" width="90" />
        <el-table-column prop="username" label="Username" min-width="150" />
        <el-table-column prop="displayName" label="Display Name" min-width="170" />
        <el-table-column label="Roles" min-width="190">
          <template #default="{ row }: { row: UserManagementResponse }">
            <div class="user-page__tags">
              <el-tag
                v-for="role in row.roles ?? []"
                :key="role"
                :type="getRoleTagType(role)"
              >
                {{ getRoleLabel(role) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Status" min-width="120">
          <template #default="{ row }: { row: UserManagementResponse }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="Created At" min-width="180" />
        <el-table-column prop="updatedAt" label="Updated At" min-width="180" />
        <el-table-column label="Actions" fixed="right" width="300">
          <template #default="{ row }: { row: UserManagementResponse }">
            <el-button link type="primary" :disabled="!row.id" @click="openEditDialog(row)">
              Edit
            </el-button>
            <el-button link type="primary" :disabled="!row.id" @click="openResetPasswordDialog(row)">
              Reset Password
            </el-button>
            <el-button
              link
              :type="getActionStatus(row) === 'ACTIVE' ? 'success' : 'danger'"
              :disabled="!row.id || (isCurrentUser(row) && getActionStatus(row) !== 'ACTIVE')"
              @click="updateStatus(row, getActionStatus(row))"
            >
              {{ getActionStatus(row) === 'ACTIVE' ? 'Enable' : 'Disable' }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="No users found" />
        </template>
      </el-table>

      <el-pagination
        class="user-page__pagination"
        background
        layout="prev, pager, next"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        @current-change="handlePageChange"
      />
    </el-card>

    <el-dialog
      v-model="createDialogVisible"
      title="Create User"
      width="560px"
      destroy-on-close
      @closed="resetCreateForm"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-position="top"
        @submit.prevent="submitCreateUser"
      >
        <el-form-item label="Username" prop="username">
          <el-input v-model="createForm.username" maxlength="50" show-word-limit />
        </el-form-item>

        <el-form-item label="Display Name" prop="displayName">
          <el-input v-model="createForm.displayName" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="Password" prop="password">
          <el-input
            v-model="createForm.password"
            autocomplete="new-password"
            show-password
            type="password"
            @input="handleCreatePasswordInput"
          />
        </el-form-item>

        <el-form-item label="Confirm Password" prop="confirmPassword">
          <el-input
            v-model="createForm.confirmPassword"
            autocomplete="new-password"
            show-password
            type="password"
            @keyup.enter="submitCreateUser"
          />
        </el-form-item>

        <el-form-item label="Roles" prop="roles">
          <el-select
            v-model="createForm.roles"
            :loading="rolesLoading"
            multiple
            placeholder="Select roles"
          >
            <el-option
              v-for="role in roleOptions"
              :key="role"
              :label="getRoleLabel(role)"
              :value="role"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="submittingCreate" @click="createDialogVisible = false">
          Cancel
        </el-button>
        <el-button
          type="primary"
          :disabled="submittingCreate"
          :loading="submittingCreate"
          @click="submitCreateUser"
        >
          Create
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      title="Edit User"
      width="560px"
      destroy-on-close
      @closed="resetEditForm"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-position="top"
        @submit.prevent="submitEditUser"
      >
        <el-form-item label="Username">
          <el-input :model-value="editingUser?.username ?? ''" disabled />
        </el-form-item>

        <el-form-item label="Roles" prop="roles">
          <el-select
            v-model="editForm.roles"
            :loading="rolesLoading"
            multiple
            placeholder="Select roles"
          >
            <el-option
              v-for="role in roleOptions"
              :key="role"
              :label="getRoleLabel(role)"
              :value="role"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Status" prop="status">
          <el-select
            v-model="editForm.status"
            :disabled="Boolean(editingUser && isCurrentUser(editingUser))"
          >
            <el-option
              v-for="status in USER_STATUSES"
              :key="status"
              :label="status"
              :value="status"
            />
          </el-select>
          <span
            v-if="editingUser && isCurrentUser(editingUser)"
            class="user-page__hint"
          >
            Cannot disable the current account
          </span>
        </el-form-item>

        <el-alert
          title="Resetting the password requires the user to sign in with the new password."
          type="warning"
          show-icon
          :closable="false"
        />

        <el-form-item label="New Password" prop="password">
          <el-input
            v-model="editForm.password"
            autocomplete="new-password"
            placeholder="Leave blank to keep current password"
            show-password
            type="password"
            @input="handleEditPasswordInput"
          />
        </el-form-item>

        <el-form-item label="Confirm New Password" prop="confirmPassword">
          <el-input
            v-model="editForm.confirmPassword"
            autocomplete="new-password"
            show-password
            type="password"
            @keyup.enter="submitEditUser"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="submittingEdit" @click="editDialogVisible = false">
          Cancel
        </el-button>
        <el-button
          type="primary"
          :disabled="submittingEdit"
          :loading="submittingEdit"
          @click="submitEditUser"
        >
          Save
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="resetPasswordDialogVisible"
      title="Reset Password"
      width="520px"
      destroy-on-close
      @closed="resetResetPasswordForm"
    >
      <el-alert
        :title="`Resetting the password requires ${resettingUser?.username ?? 'the user'} to sign in with the new password.`"
        type="warning"
        show-icon
        :closable="false"
      />

      <el-form
        ref="resetPasswordFormRef"
        class="user-page__reset-form"
        :model="resetPasswordForm"
        :rules="resetPasswordRules"
        label-position="top"
        @submit.prevent="submitResetPassword"
      >
        <el-form-item label="New Password" prop="password">
          <el-input
            v-model="resetPasswordForm.password"
            autocomplete="new-password"
            show-password
            type="password"
            @input="handleResetPasswordInput"
          />
        </el-form-item>

        <el-form-item label="Confirm New Password" prop="confirmPassword">
          <el-input
            v-model="resetPasswordForm.confirmPassword"
            autocomplete="new-password"
            show-password
            type="password"
            @keyup.enter="submitResetPassword"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button
          :disabled="submittingResetPassword"
          @click="resetPasswordDialogVisible = false"
        >
          Cancel
        </el-button>
        <el-button
          type="primary"
          :disabled="submittingResetPassword"
          :loading="submittingResetPassword"
          @click="submitResetPassword"
        >
          Reset Password
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped lang="scss">
.user-page {
  display: grid;
  gap: 16px;

  &__header,
  &__table-card {
    border-radius: 8px;
  }

  &__header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__actions,
  &__filters,
  &__tags {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__filters {
    margin-bottom: 16px;

    .el-input {
      max-width: 280px;
    }

    .el-select {
      max-width: 180px;
    }
  }

  &__tags {
    flex-wrap: wrap;
  }

  &__pagination {
    margin-top: 16px;
    justify-content: flex-end;
  }

  &__hint {
    display: block;
    margin-top: 6px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  &__reset-form {
    margin-top: 16px;
  }

  h1,
  p {
    margin: 0;
  }

  h1 {
    font-size: 24px;
    font-weight: 650;
    letter-spacing: 0;
  }

  p {
    margin-top: 6px;
    color: var(--el-text-color-secondary);
    font-size: 14px;
  }
}

@media (max-width: 760px) {
  .user-page {
    &__header-content,
    &__actions,
    &__filters {
      display: grid;
      align-items: stretch;
    }

    &__filters {
      .el-input,
      .el-select {
        max-width: none;
      }
    }
  }
}
</style>
