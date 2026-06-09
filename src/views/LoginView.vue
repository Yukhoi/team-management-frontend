<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";

import { useAuthStore } from "../stores/auth";
import type { LoginRequest } from "../types/auth";

const router = useRouter();
const authStore = useAuthStore();

const loginFormRef = ref<FormInstance>();
const loading = ref(false);

const loginForm = reactive<LoginRequest>({
  username: "",
  password: "",
});

const rules: FormRules<LoginRequest> = {
  username: [
    { required: true, message: "Username is required", trigger: "blur" },
  ],
  password: [
    { required: true, message: "Password is required", trigger: "blur" },
  ],
};

async function submitLogin(): Promise<void> {
  if (!loginFormRef.value) {
    return;
  }

  try {
    await loginFormRef.value.validate();
  } catch {
    return;
  }

  try {
    loading.value = true;

    await authStore.login({
      username: loginForm.username,
      password: loginForm.password,
    });

    await router.push("/dashboard");
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message || "Login failed");
      return;
    }

    ElMessage.error("Login failed");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <el-card class="login-card" shadow="never">
      <template #header>
        <div class="login-card__header">
          <h1>Team Management</h1>
          <span>Sign in to continue</span>
        </div>
      </template>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        label-position="top"
        @submit.prevent="submitLogin"
      >
        <el-form-item label="Username" prop="username">
          <el-input
            v-model="loginForm.username"
            autocomplete="username"
            placeholder="Username"
          />
        </el-form-item>

        <el-form-item label="Password" prop="password">
          <el-input
            v-model="loginForm.password"
            autocomplete="current-password"
            placeholder="Password"
            show-password
            type="password"
            @keyup.enter="submitLogin"
          />
        </el-form-item>

        <el-button
          class="login-card__submit"
          :loading="loading"
          native-type="submit"
          type="primary"
        >
          Login
        </el-button>
      </el-form>
    </el-card>
  </main>
</template>

<style scoped lang="scss">
.login-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    linear-gradient(135deg, rgb(243 247 251 / 94%), rgb(238 242 247 / 96%)),
    var(--el-bg-color-page);
}

.login-card {
  width: min(100%, 420px);
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
