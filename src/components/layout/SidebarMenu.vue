<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">TDL</div>
      <div class="sidebar-title">Medicine Stock</div>
    </div>
    <nav class="sidebar-nav">
      <button
        class="sidebar-link"
        :class="{ 'sidebar-link-active': route.name === 'dashboard' }"
        @click="goTo('dashboard')"
      >
        <i class="fa-solid fa-gauge" style="margin-right:6px;"></i>แดชบอร์ด
      </button>
      <!-- <button
        class="sidebar-link"
        :class="{ 'sidebar-link-active': route.name === 'patients-dashboard' }"
        @click="goTo('patients-dashboard')"
      >
        <i class="fa-solid fa-user-injured" style="margin-right:6px;"></i>แดชบอร์ดคนไข้
      </button> -->
      <button
        class="sidebar-link"
        :class="{ 'sidebar-link-active': route.name === 'restock' }"
        @click="goTo('restock')"
      >
        <i class="fa-solid fa-boxes-stacked" style="margin-right:6px;"></i>จัดการคลังยา
      </button>
      <button
        class="sidebar-link"
        :class="{ 'sidebar-link-active': route.name === 'dispensing-history' }"
        @click="goTo('dispensing-history')"
      >
        <i class="fa-solid fa-history" style="margin-right:6px;"></i>ประวัติการจ่ายยา
      </button>
    </nav>
  </aside>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

function goTo(name) {
  if (route.name !== name) {
    router.push({ name })
  }
}
</script>
