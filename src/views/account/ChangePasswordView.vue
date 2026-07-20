<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

import { changePassword } from '../../api/auth'
import type { ApiResponseVoid, ChangePasswordRequest } from '../../types/auth'

interface ChangePasswordForm {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

const changePasswordFormRef = ref<FormInstance>()
const submitting = ref(false)

const changePasswordForm = reactive<ChangePasswordForm>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

function validateNewPassword(
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void,
): void {
  if (!value) {
    callback(new Error('New password is required'))
    return
  }

  if (value.length < 6) {
    callback(new Error('New password must be at least 6 characters'))
    return
  }

  if (value.length > 100) {
    callback(new Error('New password must be at most 100 characters'))
    return
  }

  if (value === changePasswordForm.oldPassword) {
    callback(new Error('New password must be different from old password'))
    return
  }

  callback()
}

function validateConfirmPassword(
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void,
): void {
  if (!value) {
    callback(new Error('Confirm new password is required'))
    return
  }

  if (value !== changePasswordForm.newPassword) {
    callback(new Error('Passwords do not match'))
    return
  }

  callback()
}

const rules: FormRules<ChangePasswordForm> = {
  oldPassword: [
    { required: true, message: 'Old password is required', trigger: 'blur' },
  ],
  newPassword: [
    { validator: validateNewPassword, trigger: ['blur', 'change'] },
  ],
  confirmPassword: [
    { validator: validateConfirmPassword, trigger: ['blur', 'change'] },
  ],
}

function resetForm(): void {
  changePasswordForm.oldPassword = ''
  changePasswordForm.newPassword = ''
  changePasswordForm.confirmPassword = ''
  changePasswordFormRef.value?.clearValidate()
}

function handleNewPasswordInput(): void {
  if (changePasswordForm.confirmPassword) {
    void changePasswordFormRef.value?.validateField('confirmPassword')
  }
}

async function submitChangePassword(): Promise<void> {
  if (!changePasswordFormRef.value) {
    return
  }

  try {
    await changePasswordFormRef.value.validate()
  } catch {
    return
  }

  const payload: ChangePasswordRequest = {
    oldPassword: changePasswordForm.oldPassword,
    newPassword: changePasswordForm.newPassword,
  }

  submitting.value = true

  try {
    const response: ApiResponseVoid = await changePassword(payload)

    if (response.success === false) {
      ElMessage.error(response.message || 'Failed to change password')
      return
    }

    ElMessage.success('Password changed successfully')
    resetForm()
  } catch (error) {
    if (!(error instanceof Error)) {
      ElMessage.error('Failed to change password')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="change-password-page">
    <el-card class="change-password-card" shadow="never">
      <template #header>
        <div class="change-password-card__header">
          <h1>Change Password</h1>
          <span>Update your account password.</span>
        </div>
      </template>

      <el-form
        ref="changePasswordFormRef"
        :model="changePasswordForm"
        :rules="rules"
        label-position="top"
        @submit.prevent="submitChangePassword"
      >
        <el-form-item label="Old Password" prop="oldPassword">
          <el-input
            v-model="changePasswordForm.oldPassword"
            autocomplete="current-password"
            placeholder="Old Password"
            show-password
            type="password"
          />
        </el-form-item>

        <el-form-item label="New Password" prop="newPassword">
          <el-input
            v-model="changePasswordForm.newPassword"
            autocomplete="new-password"
            placeholder="New Password"
            show-password
            type="password"
            @input="handleNewPasswordInput"
          />
        </el-form-item>

        <el-form-item label="Confirm New Password" prop="confirmPassword">
          <el-input
            v-model="changePasswordForm.confirmPassword"
            autocomplete="new-password"
            placeholder="Confirm New Password"
            show-password
            type="password"
            @keyup.enter="submitChangePassword"
          />
        </el-form-item>

        <el-button
          class="change-password-card__submit"
          :disabled="submitting"
          :loading="submitting"
          native-type="submit"
          type="primary"
        >
          Change Password
        </el-button>
      </el-form>
    </el-card>
  </section>
</template>

<style scoped lang="scss">
.change-password-page {
  display: flex;
  justify-content: center;
}

.change-password-card {
  width: min(100%, 560px);
  border-radius: 8px;

  &__header {
    display: grid;
    gap: 6px;
  }

  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 650;
    letter-spacing: 0;
  }

  span {
    color: var(--el-text-color-secondary);
    font-size: 14px;
  }

  &__submit {
    width: 100%;
    margin-top: 8px;
  }
}
</style>
