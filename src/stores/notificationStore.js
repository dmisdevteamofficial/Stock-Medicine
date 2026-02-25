import { ref } from 'vue'

const notifications = ref([])
let nextId = 1

export function useNotificationStore() {
  function pushNotification({ title, message, type = 'info', duration = 4000 }) {
    const id = nextId++
    notifications.value.push({ id, title, message, type })
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }
    return id // คืนค่า id เพื่อใช้อ้างอิงตอนลบเอง
  }

  function removeNotification(id) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  return {
    notifications,
    pushNotification,
    removeNotification
  }
}
