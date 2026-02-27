<template>
  <div class="notify-root">
    <transition-group name="notify">
      <template v-for="n in normalNotifications" :key="n.id">
        <div
          class="notify-item"
          :class="`notify-${n.type}`"
        >
          <div class="notify-content">
            <div class="notify-title">{{ n.title }}</div>
            <div class="notify-message">{{ n.message }}</div>
          </div>
          <button class="notify-close" @click="removeNotification(n.id)">×</button>
        </div>
      </template>
    </transition-group>
  </div>

  <div v-for="n in confirmNotifications" :key="`modal-${n.id}`" class="notify-confirm-overlay">
    <div class="notify-confirm-card">
      <div class="notify-title" style="margin-bottom:6px;">{{ n.title }}</div>
      <div class="notify-message" style="margin-bottom:14px;">{{ n.message }}</div>
      <div class="notify-actions">
        <button class="button-ghost" @click="handleCancel(n)">{{ n.cancelText || 'ยกเลิก' }}</button>
        <button
          class="button-primary"
          @click="handleConfirm(n)"
          :disabled="(countdowns[n.id] ?? 0) > 0"
        >
          {{ n.confirmText || 'ยืนยัน' }}
          <span v-if="(countdowns[n.id] ?? 0) > 0"> ({{ countdowns[n.id] }})</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, onBeforeUnmount, computed } from 'vue'
import { useNotificationStore } from '../../stores/notificationStore'

const { notifications, removeNotification } = useNotificationStore()

const countdowns = reactive({})
const timers = reactive({})

const confirmNotifications = computed(() => {
  const list = Array.isArray(notifications.value) ? notifications.value : notifications
  return (list || []).filter(n => n && (n.onConfirm || n.onCancel || n.modal))
})
const normalNotifications = computed(() => {
  const list = Array.isArray(notifications.value) ? notifications.value : notifications
  return (list || []).filter(n => !(n && (n.onConfirm || n.onCancel || n.modal)))
})

watch(
  notifications,
  (list) => {
    const arr = Array.isArray(list) ? list : []
    const ids = new Set(arr.map(n => n.id))
    arr.forEach(n => {
      if (n && n.delaySeconds && n.delaySeconds > 0 && !timers[n.id]) {
        countdowns[n.id] = n.delaySeconds
        timers[n.id] = setInterval(() => {
          countdowns[n.id] = Math.max(0, (countdowns[n.id] || 0) - 1)
          if (countdowns[n.id] === 0) {
            clearInterval(timers[n.id])
            delete timers[n.id]
          }
        }, 1000)
      }
    })
    Object.keys(timers).forEach(id => {
      if (!ids.has(Number(id))) {
        clearInterval(timers[id])
        delete timers[id]
        delete countdowns[id]
      }
    })
  },
  { immediate: true, deep: true }
)

function handleConfirm(n) {
  if (typeof n.onConfirm === 'function') n.onConfirm()
  removeNotification(n.id)
}
function handleCancel(n) {
  if (typeof n.onCancel === 'function') n.onCancel()
  removeNotification(n.id)
}

onBeforeUnmount(() => {
  Object.values(timers).forEach(t => clearInterval(t))
})
</script>

<style scoped>
.notify-confirm-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  z-index: 4000;
  pointer-events: auto;
}
.notify-confirm-card {
  width: 520px;
  max-width: calc(100% - 40px);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 18px;
  padding: 18px 20px;
  box-shadow:
    0 18px 40px var(--shadow-color-strong),
    0 0 0 1px var(--shadow-color-outline);
}
.notify-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>
