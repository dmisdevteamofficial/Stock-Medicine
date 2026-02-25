import { ref, computed } from 'vue'

const currentUser = ref(null)

export function useAuthStore() {
  const isAuthenticated = computed(() => !!currentUser.value)

  function setUser(user) {
    currentUser.value = user
    if (user) {
      localStorage.setItem('clinic-tdl-user', JSON.stringify(user))
    } else {
      localStorage.removeItem('clinic-tdl-user')
    }
  }

  function restoreSession() {
    if (currentUser.value) return
    const raw = localStorage.getItem('clinic-tdl-user')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      currentUser.value = parsed
    } catch {
      localStorage.removeItem('clinic-tdl-user')
    }
  }

  function logout() {
    setUser(null)
  }

  return {
    currentUser,
    isAuthenticated,
    setUser,
    restoreSession,
    logout
  }
}
