<template>
  <div class="app-root">
    <router-view />
    <notification-container />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import NotificationContainer from './components/ui/NotificationContainer.vue'

onMounted(() => {
  const saved = localStorage.getItem('clinic-tdl-theme') || 'dark'
  const root = document.documentElement
  root.classList.toggle('theme-dark', saved === 'dark')
  root.classList.toggle('theme-light', saved === 'light')
})
</script>
