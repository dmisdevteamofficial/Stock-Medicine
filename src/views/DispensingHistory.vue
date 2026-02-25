<template>
  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Dispensing History</div>
        <div class="page-subtitle">ประวัติการจ่ายยา • ข้อมูลรวมตามรอบการเข้ารักษา</div>
      </div>
      <div class="page-actions">
        <button class="button-ghost" @click="loadData(true)" :disabled="loading">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i> รีเฟรช
        </button>
        <button class="button-primary" @click="exportToExcel" :disabled="loading || groups.length === 0">
          <i class="fa-solid fa-file-excel"></i> ส่งออก Excel
        </button>
      </div>
    </div>

    <!-- Filters -->
    <section class="card filters-card">
      <div class="filters-grid">
        <div class="field">
          <label class="field-label">ค้นหา (ชื่อ/รหัส/โรค/ยา)</label>
          <input v-model="filters.search" class="field-input" placeholder="ระบุคำค้นหา..." @keyup.enter="loadData" />
        </div>
        <div class="field">
          <label class="field-label">แผนก</label>
          <select v-model="filters.department" class="field-select">
            <option value="">ทั้งหมด</option>
            <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">จากวันที่</label>
          <input v-model="filters.dateFrom" type="date" class="field-input" />
        </div>
        <div class="field">
          <label class="field-label">ถึงวันที่</label>
          <input v-model="filters.dateTo" type="date" class="field-input" />
        </div>
        <div class="field flex-end">
          <button class="button-primary w-full" @click="loadData" :disabled="loading">
            <i class="fa-solid fa-magnifying-glass"></i> ค้นหา
          </button>
        </div>
      </div>
    </section>

    <!-- History List -->
    <section class="card list-card">
      <div class="card-header">
        <div class="card-title" style="padding:10px">รายการประวัติ (แสดง {{ groups.length }} จาก {{ totalCount }} รายการ)</div>
      </div>
      
      <div class="history-list">
        <div v-if="groups.length === 0 && !loading" class="empty-state">
          <i class="fa-solid fa-inbox fa-3x"></i>
          <p>ไม่พบข้อมูลประวัติการจ่ายยา</p>
        </div>

        <div v-for="group in groups" :key="group.empCode + group.dateRef + group.time" 
             class="history-item" @click="openDetail(group)">
          <div class="item-main">
            <div class="item-info">
              <div class="info-primary">
                <span class="emp-code">{{ group.empCode }}</span>
                <span class="emp-name">{{ group.fullname }}</span>
                <span class="dept-tag">{{ group.department }}</span>
              </div>
              <div class="info-secondary">
                <span class="diag-label"><i class="fa-solid fa-stethoscope"></i> {{ group.diagnosis }}</span>
                <span class="med-summary">
                  <i class="fa-solid fa-pills"></i> จ่าย {{ group.medicines.length }} รายการ ({{ group.totalItems }} หน่วย)
                </span>
              </div>
            </div>
            <div class="item-meta">
              <div class="date-text">{{ formatThaiDate(group.dateRef) }}</div>
              <div class="time-text">{{ formatDisplayTime(group.time) }}</div>
            </div>
            <div class="item-chevron">
              <i class="fa-solid fa-chevron-right"></i>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Detail Side Panel -->
    <div v-if="showDetail" class="side-panel-overlay" @click.self="closeDetail">
      <div class="side-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">รายละเอียดการรักษา/จ่ายยา</div>
          <button class="side-panel-close" @click="closeDetail"><i class="fa-solid fa-xmark"></i></button>
        </div>
        
        <div class="side-panel-body" v-if="selectedGroup">
          <!-- Patient Header -->
          <div class="detail-section">
            <div class="detail-patient-card">
              <div class="patient-avatar">
                <i class="fa-solid fa-user-injured fa-2x"></i>
              </div>
              <div class="patient-info">
                <h3>{{ selectedGroup.fullname }}</h3>
                <p>รหัส: {{ selectedGroup.empCode }} | แผนก: {{ selectedGroup.department }}</p>
                <p>ตำแหน่ง: {{ selectedGroup.position || '-' }}</p>
              </div>
            </div>
          </div>

          <!-- Visit Info -->
          <div class="detail-section">
            <div class="section-title">ข้อมูลการเข้ารับบริการ</div>
            <div class="info-grid-2">
              <div class="info-box">
                <label>วันที่</label>
                <div>{{ formatThaiDate(selectedGroup.dateRef) }}</div>
              </div>
              <div class="info-box">
                <label>เวลา</label>
                <div>{{ formatDisplayTime(selectedGroup.time) }}</div>
              </div>
              <div class="info-box">
                <label>อาการ</label>
                <div>{{ selectedGroup.symptoms || '-' }}</div>
              </div>
              <div class="info-box">
                <label>Diagnosis</label>
                <div>{{ selectedGroup.diagnosis }}</div>
              </div>
              <div class="info-box" style="grid-column: span 2;">
                <label>ผู้จ่ายยา/ตรวจ</label>
                <div>{{ selectedGroup.checkupBy || '-' }}</div>
              </div>
            </div>
          </div>

          <!-- Medicine List -->
          <div class="detail-section">
            <div class="section-title">รายการยาที่จ่าย</div>
            <table class="detail-table">
              <thead>
                <tr>
                  <th>รายการยา</th>
                  <th style="text-align: right;">จำนวน</th>
                  <th>หน่วย</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(m, idx) in selectedGroup.medicines" :key="idx">
                  <td>{{ m.name }}</td>
                  <td style="text-align: right; font-weight: 600;">{{ m.amount }}</td>
                  <td><span class="pill-soft">{{ m.unit }}</span></td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="text-align: right; font-weight: 600;">รวมทั้งหมด</td>
                  <td style="font-weight: 600; color: var(--accent);">{{ selectedGroup.totalItems }} หน่วย</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="side-panel-footer">
          <button class="button-primary w-full" @click="closeDetail">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useDataStore } from '../stores/dataStore'
import { useNotificationStore } from '../stores/notificationStore'
import * as XLSX from 'xlsx'

const dataStore = useDataStore()
const { pushNotification, removeNotification } = useNotificationStore()

// State
const loading = ref(false)
const groups = ref([])
const totalCount = ref(0)
const departments = ref([])
const selectedGroup = ref(null)
const showDetail = ref(false)

const filters = reactive({
  search: '',
  department: '',
  dateFrom: '',
  dateTo: '',
  limit: 15
})

// Functions
async function loadData(force = false) {
  const isDefault = !filters.search && !filters.department && !filters.dateFrom && !filters.dateTo && filters.limit === 15
  
  // Show notification only for non-cached or forced loads
  let loadingId = null
  if (force || !isDefault || !dataStore.isDispensingLoaded) {
    loadingId = pushNotification({
      title: 'กำลังโหลดประวัติการจ่ายยา...',
      message: 'กรุณารอสักครู่ ระบบกำลังดึงข้อมูลล่าสุดจาก Patients List',
      type: 'info',
      duration: 0
    })
  }

  loading.value = true
  try {
    const res = await dataStore.getDispensingHistory({
      search: filters.search,
      department: filters.department,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      limit: filters.limit
    }, force)
    
    groups.value = res.groups
    totalCount.value = res.totalCount
    departments.value = res.departments
  } catch (err) {
    pushNotification({
      title: 'โหลดข้อมูลไม่สำเร็จ',
      message: err.message || 'ตรวจสอบการเชื่อมต่อ AppScript',
      type: 'error'
    })
  } finally {
    loading.value = false
    if (loadingId) removeNotification(loadingId)
  }
}

function openDetail(group) {
  selectedGroup.value = group
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  selectedGroup.value = null
}

function formatThaiDate(dateValue) {
  if (!dateValue) return '-'
  
  // AppScript returns yyyy-MM-dd string now
  const d = new Date(dateValue + 'T00:00:00')
  if (isNaN(d.getTime())) return dateValue
  
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatDisplayTime(timeValue) {
  if (!timeValue) return '-'
  // AppScript returns HH:mm:ss string now
  return timeValue
}

function exportToExcel() {
  try {
    // Flatten data for Excel
    const exportData = []
    groups.value.forEach(group => {
      group.medicines.forEach(med => {
        exportData.push({
          'รหัสพนักงาน': group.empCode,
          'ชื่อ-นามสกุล': group.fullname,
          'แผนก': group.department,
          'ตำแหน่ง': group.position,
          'วันที่': group.dateRef,
          'เวลา': group.time,
          'อาการ': group.symptoms,
          'Diagnosis': group.diagnosis,
          'รายการยา': med.name,
          'จำนวน': med.amount,
          'หน่วย': med.unit,
          'ผู้ตรวจ/จ่ายยา': group.checkupBy
        })
      })
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Dispensing History")
    XLSX.writeFile(wb, `Dispensing_History_${new Date().toISOString().slice(0,10)}.xlsx`)

    pushNotification({
      title: 'ส่งออกสำเร็จ',
      message: 'ไฟล์ Excel ถูกสร้างเรียบร้อยแล้ว',
      type: 'success'
    })
  } catch (err) {
    pushNotification({
      title: 'ส่งออกไม่สำเร็จ',
      message: err.message,
      type: 'error'
    })
  }
}

onMounted(loadData)
</script>

<style scoped>
.filters-card {
  padding: 20px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  align-items: flex-end;
}

.flex-end {
  display: flex;
  align-items: flex-end;
}

.w-full {
  width: 100%;
}

.list-card {
  margin-top: 20px;
  padding: 0;
  overflow: hidden;
}

.history-list {
  display: flex;
  flex-direction: column;
}

.history-item {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background: var(--bg-elevated-soft);
  transform: translateX(4px);
}

.item-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-primary {
  display: flex;
  align-items: center;
  gap: 10px;
}

.emp-code {
  font-weight: 600;
  color: var(--accent);
  font-size: 14px;
}

.emp-name {
  font-weight: 500;
  font-size: 15px;
}

.dept-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg-main);
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  color: var(--text-soft);
}

.info-secondary {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-soft);
}

.diag-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.med-summary {
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-meta {
  text-align: right;
  min-width: 120px;
}

.date-text {
  font-weight: 500;
  font-size: 13px;
}

.time-text {
  font-size: 12px;
  color: var(--text-soft);
}

.item-chevron {
  color: var(--border-subtle);
}

.empty-state {
  padding: 60px;
  text-align: center;
  color: var(--text-soft);
}

.empty-state i {
  margin-bottom: 16px;
  opacity: 0.5;
}

/* Side Panel Custom Detail Styles */
.detail-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-patient-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-main);
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
}

.patient-avatar {
  width: 56px;
  height: 56px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.patient-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
}

.patient-info p {
  margin: 0;
  font-size: 12px;
  color: var(--text-soft);
}

.info-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-box {
  background: var(--bg-elevated-soft);
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
}

.info-box label {
  font-size: 10px;
  color: var(--text-soft);
  display: block;
  margin-bottom: 2px;
}

.info-box div {
  font-size: 13px;
  font-weight: 500;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
}

.detail-table th {
  text-align: left;
  font-size: 12px;
  color: var(--text-soft);
  padding: 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.detail-table td {
  padding: 10px 8px;
  font-size: 13px;
  border-bottom: 1px solid var(--border-subtle);
}

.detail-table tfoot td {
  padding-top: 12px;
  border-bottom: none;
}

/* Side Panel Base Styles (Re-using from RestockView but local) */
.side-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: flex-end;
  z-index: 1000;
}

.side-panel {
  background: var(--bg-elevated);
  width: 100%;
  max-width: 450px;
  height: 100%;
  border-left: 1px solid var(--border-subtle);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.side-panel-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.side-panel-title {
  font-size: 16px;
  font-weight: 600;
}

.side-panel-close {
  background: transparent;
  border: none;
  color: var(--text-soft);
  cursor: pointer;
  font-size: 18px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.side-panel-close:hover {
  background: var(--bg-elevated-soft);
  color: var(--text-main);
}

.side-panel-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

.side-panel-footer {
  padding: 20px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  gap: 12px;
}
</style>