<template>
  <div class="notify-root">
    <transition-group name="notify">
      <div
        v-for="n in notifications"
        :key="n.id"
        class="notify-item"
        :class="`notify-${n.type}`"
      >
        <div class="notify-content">
          <div class="notify-title">{{ n.title }}</div>
          <div class="notify-message">{{ n.message }}</div>
        </div>
        <button class="notify-close" @click="removeNotification(n.id)">×</button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useNotificationStore } from '../../stores/notificationStore'

const { notifications, removeNotification } = useNotificationStore()
</script>
