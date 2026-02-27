<template>
  <header class="toolbar" v-bind="$attrs">
    <div class="toolbar-left">
      <h1 class="toolbar-title">Clinic TDL</h1>
      <span class="toolbar-subtitle">Medicine Stock Dashboard</span>
    </div>
    <div class="toolbar-right">
      <button class="toolbar-button" @click="toggleTheme">
        <i class="fa-solid fa-circle-half-stroke" style="margin-right:6px;"></i>{{ themeLabel }}
      </button>
      <div class="toolbar-profile" @click.stop="toggleDropdown">
        <div class="profile-avatar"><i class="fa-solid fa-user"></i></div>
        <div class="profile-info">
          <div class="profile-name">{{ currentUser?.full_name || currentUser?.username }}</div>
          <div class="profile-id">ID: {{ currentUser?.emp_code || '-' }}</div>
        </div>
        <i class="fa-solid fa-chevron-down profile-caret" :class="{ open: dropdownOpen }"></i>
        
        <!-- Dropdown and Overlay positioning fix -->
        <template v-if="dropdownOpen">
          <div class="profile-overlay" @click.stop="dropdownOpen = false"></div>
          <div class="profile-dropdown" @click.stop>
            <div class="dropdown-header">
              <div class="profile-avatar large"><i class="fa-solid fa-user"></i></div>
              <div>
                <div class="profile-name">{{ currentUser?.full_name || currentUser?.username }}</div>
                <div class="profile-id">ID: {{ currentUser?.emp_code || '-' }}</div>
              </div>
            </div>
            <button class="toolbar-button" style="width:100%;" @click="handleOpenProfile">
              <i class="fa-solid fa-user-pen" style="margin-right:6px;"></i>แก้ไขข้อมูลโปรไฟล์
            </button>
            <button class="toolbar-button danger" style="width:100%;" @click="logoutUser">
              <i class="fa-solid fa-right-from-bracket" style="margin-right:6px;"></i>ออกจากระบบ
            </button>
          </div>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { computed, ref } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useNotificationStore } from '../../stores/notificationStore'

const { currentUser, logout, openProfile } = useAuthStore()
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

const dropdownOpen = ref(false)
function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

function handleOpenProfile() {
  console.log('TopToolbar: handleOpenProfile clicked')
  dropdownOpen.value = false
  openProfile()
}
</script>

<style scoped>
.toolbar-profile {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  position: relative;
}
.profile-avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--bg-elevated-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}
.profile-avatar.large {
  width: 44px;
  height: 44px;
  font-size: 18px;
}
.profile-info {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.profile-name {
  font-size: 13px;
  font-weight: 600;
}
.profile-id {
  font-size: 11px;
  color: var(--text-soft);
}
.profile-caret {
  color: var(--text-soft);
  transition: transform .15s ease;
}
.profile-caret.open {
  transform: rotate(180deg);
}
.profile-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 260px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  box-shadow:
    0 18px 40px var(--shadow-color-strong),
    0 0 0 1px var(--shadow-color-outline);
  padding: 12px;
  z-index: 3000;
}
.dropdown-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 10px;
}
.profile-overlay {
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: 2500;
}
</style>
