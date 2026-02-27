import { ref } from 'vue'

const notifications = ref([])
let nextId = 1

export function useNotificationStore() {
  function pushNotification(opts) {
    const {
      title,
      message,
      type = 'info',
      duration = 4000
    } = opts || {}
    const id = nextId++
    const n = { id, title, message, type, duration, ...opts }
    notifications.value.push(n)
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }
    return id
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
