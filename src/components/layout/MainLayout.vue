<template>
  <div class="layout-root">
    <sidebar-menu class="layout-sidebar" />
    <div class="layout-main">
      <top-toolbar class="layout-toolbar" />
      <div class="layout-content">
        <router-view />
      </div>
    </div>
    <notification-container />
  </div>
</template>

<script setup>
import SidebarMenu from './SidebarMenu.vue'
import TopToolbar from './TopToolbar.vue'
import NotificationContainer from '../ui/NotificationContainer.vue'
</script>
