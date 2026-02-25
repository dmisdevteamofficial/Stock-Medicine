<template>
  <header class="toolbar">
    <div class="toolbar-left">
      <h1 class="toolbar-title">Clinic TDL</h1>
      <span class="toolbar-subtitle">Medicine Stock Dashboard</span>
    </div>
    <div class="toolbar-right">
      <button class="toolbar-button" @click="toggleTheme">
        <i class="fa-solid fa-circle-half-stroke" style="margin-right:6px;"></i>{{ themeLabel }}
      </button>
      <div class="toolbar-user">
        <div class="toolbar-user-info">
          <div class="user-name"><i class="fa-solid fa-user" style="margin-right:6px;"></i>{{ currentUser?.full_name || currentUser?.username }}</div>
          <div class="user-role"><i class="fa-solid fa-id-badge" style="margin-right:6px;"></i>ผู้ใช้งาน</div>
        </div>
        <button class="toolbar-button danger" @click="logoutUser">
          <i class="fa-solid fa-right-from-bracket" style="margin-right:6px;"></i>ออก
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useNotificationStore } from '../../stores/notificationStore'

const { currentUser, logout } = useAuthStore()
const { pushNotification } = useNotificationStore()
const router = useRouter()

const themeLabel = computed(() => {
  const stored = localStorage.getItem('clinic-tdl-theme')
  return stored === 'dark' ? 'Light theme' : 'Dark theme'
})

function toggleTheme() {
  const current = localStorage.getItem('clinic-tdl-theme') === 'dark' ? 'dark' : 'light'
  const next = current === 'dark' ? 'light' : 'dark'
  localStorage.setItem('clinic-tdl-theme', next)
  document.documentElement.classList.toggle('theme-dark', next === 'dark')
  document.documentElement.classList.toggle('theme-light', next === 'light')
  pushNotification({
    title: 'Theme changed',
    message: next === 'dark' ? 'Dark theme is active' : 'Light theme is active',
    type: 'info'
  })
}

function logoutUser() {
  logout()
  pushNotification({
    title: 'Logged out',
    message: 'You have been signed out',
    type: 'success'
  })
  router.push({ name: 'login' })
}
</script>
