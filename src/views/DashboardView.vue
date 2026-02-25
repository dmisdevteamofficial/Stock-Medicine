<template>
  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle">ภาพรวมสต๊อกยา KPI หลักของ Clinic TDL</div>
      </div>
    </div>
    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">จำนวนรายการยา</div>
        <div class="kpi-value">{{ kpis.totalMedicines }}</div>
        <div class="kpi-tag">รายการทั้งหมดใน master</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">สต๊อกคงเหลือรวม</div>
        <div class="kpi-value">{{ kpis.totalStock }}</div>
        <div class="kpi-tag">รวม Current Stock</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">จำนวนยาใกล้หมด</div>
        <div class="kpi-value">{{ kpis.lowStockCount }}</div>
        <div class="kpi-tag">ต่ำกว่า threshold</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">การนำเข้าล่าสุด</div>
        <div class="kpi-value" style="font-size: 13px;">{{ lastRestockDisplay }}</div>
        <div class="kpi-tag">อัพเดทจากประวัติการนำเข้า</div>
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <div class="card-title">ประวัติการเติมล่าสุด</div>
          <div class="card-subtitle">ข้อมูลจากชีต History (ตัวอย่างเรียลไทม์จาก AppScript)</div>
        </div>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Amount Restock</th>
            <th>Total</th>
            <th>Remark</th>
            <th>Add by</th>
            <th>Date</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in lastHistory" :key="row.id">
            <td>{{ row.medicine }}</td>
            <td>{{ row.amount }}</td>
            <td>{{ row.total }}</td>
            <td>{{ row.remark }}</td>
            <td>{{ row.addBy }}</td>
            <td>{{ formatDate(row.date) }}</td>
            <td>{{ formatTime(row.time) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useDataStore } from '../stores/dataStore'
import { useNotificationStore } from '../stores/notificationStore'

const dataStore = useDataStore()
const { pushNotification, removeNotification } = useNotificationStore()

function normalizeDate(value) {
  if (!value) return null
  if (value instanceof Date) {
    return value
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    return null
  }
  return d
}

function formatDate(value) {
  const d = normalizeDate(value)
  if (!d) {
    return value || ''
  }
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function formatTime(value) {
  const d = normalizeDate(value)
  if (!d) {
    return value || ''
  }
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

const kpis = computed(() => {
  const s = dataStore.dashboardSnapshot
  return {
    totalMedicines: s?.totalMedicines ?? '-',
    totalStock: s?.totalStock ?? '-',
    lowStockCount: s?.lowStockCount ?? '-',
    lastRestockDisplay: s?.lastRestockDisplay ?? '-'
  }
})

const lastHistory = computed(() => dataStore.dashboardSnapshot?.lastHistory || [])

const lastRestockDisplay = computed(() => {
  if (!lastHistory.value.length) {
    return '-'
  }
  const last = lastHistory.value[0]
  return `${formatDate(last.date)} ${formatTime(last.time)} • ${last.medicine} +${last.amount}`
})

async function loadDashboard(force = false) {
  const loadingId = pushNotification({
    title: 'กำลังโหลด Dashboard...',
    message: 'กรุณารอสักครู่ ระบบกำลังดึงข้อมูลล่าสุด',
    type: 'info',
    duration: 0
  })

  try {
    await dataStore.getDashboardSnapshot(force)
  } catch (err) {
    pushNotification({
      title: 'โหลด Dashboard ไม่สำเร็จ',
      message: err.message || 'ตรวจสอบ AppScript URL',
      type: 'error'
    })
  } finally {
    removeNotification(loadingId)
  }
}

onMounted(() => {
  if (!dataStore.isDashboardLoaded) {
    loadDashboard()
  }
})
</script>
