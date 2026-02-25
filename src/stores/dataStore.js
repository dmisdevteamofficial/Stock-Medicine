import { ref } from 'vue'
import { defineStore } from 'pinia'
import { 
  fetchMedicines, 
  fetchHistory, 
  fetchDashboardSnapshot, 
  fetchPatientStats, 
  fetchDispensingHistory 
} from '../lib/googleConnect'

export const useDataStore = defineStore('data', () => {
  // State
  const medicines = ref([])
  const restockHistory = ref([])
  const dashboardSnapshot = ref(null)
  const patientStats = ref(null)
  const dispensingHistory = ref({ groups: [], totalCount: 0, departments: [] })

  // Loading states
  const loading = ref({
    medicines: false,
    history: false,
    dashboard: false,
    patientStats: false,
    dispensing: false
  })

  // Cache flags (to determine if we should fetch)
  const isMedicinesLoaded = ref(false)
  const isHistoryLoaded = ref(false)
  const isDashboardLoaded = ref(false)
  const isPatientStatsLoaded = ref(false)
  const isDispensingLoaded = ref(false)

  // Actions
  async function getMedicines(force = false) {
    if (isMedicinesLoaded.value && !force) return medicines.value
    loading.value.medicines = true
    try {
      const data = await fetchMedicines()
      medicines.value = data
      isMedicinesLoaded.value = true
      return data
    } finally {
      loading.value.medicines = false
    }
  }

  async function getRestockHistory(force = false) {
    if (isHistoryLoaded.value && !force) return restockHistory.value
    loading.value.history = true
    try {
      const data = await fetchHistory()
      restockHistory.value = data
      isHistoryLoaded.value = true
      return data
    } finally {
      loading.value.history = false
    }
  }

  async function getDashboardSnapshot(force = false) {
    if (isDashboardLoaded.value && !force) return dashboardSnapshot.value
    loading.value.dashboard = true
    try {
      const data = await fetchDashboardSnapshot()
      dashboardSnapshot.value = data
      isDashboardLoaded.value = true
      return data
    } finally {
      loading.value.dashboard = false
    }
  }

  async function getPatientStats(params = {}, force = false) {
    // If params are provided (dateFrom/dateTo), we bypass cache to refresh range
    const hasParams = !!(params.dateFrom || params.dateTo)
    if (!hasParams && isPatientStatsLoaded.value && !force) return patientStats.value
    loading.value.patientStats = true
    try {
      const data = await fetchPatientStats(params)
      patientStats.value = data
      if (!hasParams) {
        isPatientStatsLoaded.value = true
      }
      return data
    } finally {
      loading.value.patientStats = false
    }
  }

  async function getDispensingHistory(params = {}, force = false) {
    // Only cache the "default" state (no search, no specific department)
    const isDefault = !params.search && !params.department && !params.dateFrom && !params.dateTo && (!params.limit || params.limit === 15)
    
    if (isDefault && isDispensingLoaded.value && !force) return dispensingHistory.value
    
    loading.value.dispensing = true
    try {
      const data = await fetchDispensingHistory(params)
      if (isDefault) {
        dispensingHistory.value = data
        isDispensingLoaded.value = true
      }
      return data
    } finally {
      loading.value.dispensing = false
    }
  }

  // Unified loader for Home/Patients dashboard
  async function getHomeData(force = false) {
    await Promise.all([
      getPatientStats({}, force),
      getDashboardSnapshot(force)
    ])
    return {
      patientStats: patientStats.value,
      dashboardSnapshot: dashboardSnapshot.value
    }
  }

  function clearCache() {
    isMedicinesLoaded.value = false
    isHistoryLoaded.value = false
    isDashboardLoaded.value = false
    isPatientStatsLoaded.value = false
    isDispensingLoaded.value = false
  }

  return {
    medicines,
    restockHistory,
    dashboardSnapshot,
    patientStats,
    dispensingHistory,
    loading,
    isMedicinesLoaded,
    isHistoryLoaded,
    isDashboardLoaded,
    isPatientStatsLoaded,
    isDispensingLoaded,
    getMedicines,
    getRestockHistory,
    getDashboardSnapshot,
    getPatientStats,
    getDispensingHistory,
    getHomeData,
    clearCache
  }
})
