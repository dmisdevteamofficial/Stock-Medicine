import { ref, computed } from 'vue'

const currentUser = ref(null)
const isProfileOpen = ref(false)

export function useAuthStore() {
  const isAuthenticated = computed(() => !!currentUser.value)

  function setUser(user) {
    console.log('authStore: setUser', user)
    currentUser.value = user
    if (user) {
      localStorage.setItem('clinic-tdl-user', JSON.stringify(user))
    } else {
      localStorage.removeItem('clinic-tdl-user')
    }
  }

  function openProfile() {
    console.log('authStore: openProfile called')
    isProfileOpen.value = true
  }

  function closeProfile() {
    console.log('authStore: closeProfile called')
    isProfileOpen.value = false
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
    console.log('authStore: logout')
    setUser(null)
    closeProfile()
  }

  return {
    currentUser,
    isProfileOpen,
    isAuthenticated,
    setUser,
    openProfile,
    closeProfile,
    restoreSession,
    logout
  }
}
