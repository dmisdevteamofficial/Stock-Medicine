<template>
  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Inventory Management</div>
        <div class="page-subtitle">จัดการรายการยาและเติมสต๊อก • ข้อมูลจาก Medicine List</div>
      </div>
      <div class="page-actions">
        <button class="button-primary" @click="openAddMedicineModal">
          <i class="fa-solid fa-plus"></i> เพิ่มยาใหม่
        </button>
      </div>
    </div>

    <!-- Medicine Master Table -->
    <section class="card">
      <div class="card-header">
        <div>
          <div class="card-title">รายการยาทั้งหมด</div>
          <div class="card-subtitle">รายการยาในระบบและสต๊อกปัจจุบัน</div>
        </div>
        <div class="card-tools">
          <div class="field">
            <input v-model="searchQuery" class="field-input" placeholder="ค้นหาชื่อยา..." style="width: 240px;" />
          </div>
        </div>
      </div>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>ชื่อยา</th>
              <th>หน่วย</th>
              <th>สต๊อกปัจจุบัน</th>
              <th>SKU</th>
              <th style="width: 100px; text-align: center;">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in filteredMedicines" :key="m.id">
              <td>{{ m.name }}</td>
              <td><span class="pill-soft">{{ m.unit }}</span></td>
              <td>
                <span :style="{ color: m.currentStock <= 10 ? 'var(--accent-danger)' : 'inherit', fontWeight: m.currentStock <= 10 ? '600' : 'normal' }">
                  {{ m.currentStock }}
                </span>
              </td>
              <td>{{ m.sku || '-' }}</td>
              <td style="text-align: center;">
                <button class="icon-button" title="เติมสต๊อก" @click="openRestockModal(m)">
                  <i class="fa-solid fa-cart-plus"></i>
                </button>
              </td>
            </tr>
            <tr v-if="filteredMedicines.length === 0">
              <td colspan="5" style="text-align: center; padding: 32px; color: var(--text-soft);">
                ไม่พบข้อมูลรายการยา
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Restock History -->
    <section class="card" style="margin-top: 20px;">
      <div class="card-header">
        <div>
          <div class="card-title">ประวัติการเติมล่าสุด (History)</div>
          <div class="card-subtitle">รายการเติมสต๊อกย้อนหลัง</div>
        </div>
      </div>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Amount</th>
              <th>Total</th>
              <th>Remark</th>
              <th>Add by</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in history" :key="row.id">
              <td>{{ row.medicine }}</td>
              <td>+{{ row.amount }}</td>
              <td>{{ row.total }}</td>
              <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                {{ row.remark || '-' }}
              </td>
              <td>{{ row.addBy }}</td>
              <td>{{ formatDate(row.date) }}</td>
              <td>{{ formatTime(row.time) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Add Medicine Side Panel -->
    <div v-if="showAddModal" class="side-panel-overlay" @click.self="closeAddModal">
      <div class="side-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">เพิ่มรายการยาใหม่</div>
          <button class="side-panel-close" @click="closeAddModal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="side-panel-body">
          <div class="form-vertical">
            <div class="field">
              <label class="field-label">ชื่อยา</label>
              <input v-model="newMed.name" class="field-input" placeholder="ระบุชื่อยา" />
            </div>
            <div class="field">
              <label class="field-label">หน่วย (unit)</label>
              <input v-model="newMed.unit" class="field-input" placeholder="เช่น กล่อง, แผง, ขวด" />
            </div>
            <div class="field">
              <label class="field-label">SKU (optional)</label>
              <input v-model="newMed.sku" class="field-input" placeholder="ระบุรหัสสินค้า" />
            </div>
            <div class="field">
              <label class="field-label">สต๊อกเริ่มต้น</label>
              <input v-model.number="newMed.current_stock" type="number" min="0" class="field-input" />
            </div>
          </div>
        </div>
        <div class="side-panel-footer">
          <button class="button-ghost" @click="closeAddModal" style="flex: 1;">ยกเลิก</button>
          <button class="button-primary" :disabled="submitting" @click="createMedicine" style="flex: 2; justify-content: center;">
            <span v-if="submitting">กำลังบันทึก...</span>
            <span v-else>บันทึกยาใหม่</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Restock Side Panel -->
    <div v-if="showRestockModal" class="side-panel-overlay" @click.self="closeRestockModal">
      <div class="side-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">เติมสต๊อกยา: {{ targetMedicine?.name }}</div>
          <button class="side-panel-close" @click="closeRestockModal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="side-panel-body">
          <div class="form-vertical">
            <div class="field">
              <label class="field-label">สต๊อกปัจจุบัน</label>
              <input class="field-input" :value="targetMedicine?.currentStock" disabled />
            </div>
            <div class="field">
              <label class="field-label">หน่วย</label>
              <input class="field-input" :value="targetMedicine?.unit" disabled />
            </div>
            <div class="field">
              <label class="field-label">จำนวนที่เติม</label>
              <input v-model.number="amount" type="number" min="1" class="field-input" ref="amountInput" />
            </div>
            <div class="field">
              <label class="field-label">Total หลังเติม</label>
              <input class="field-input" :value="computedTotal" disabled style="font-weight: 600; color: var(--accent);" />
            </div>
            <div class="field">
              <label class="field-label">หมายเหตุ (Remark)</label>
              <textarea v-model="remark" class="field-textarea" placeholder="ระบุหมายเหตุการเติมสต๊อก (ถ้ามี)" />
            </div>
          </div>
        </div>
        <div class="side-panel-footer">
          <button class="button-ghost" @click="closeRestockModal" style="flex: 1;">ยกเลิก</button>
          <button class="button-primary" :disabled="submitting" @click="submitRestock" style="flex: 2; justify-content: center;">
            <span v-if="submitting">กำลังบันทึก...</span>
            <span v-else>ยืนยันการเติมสต๊อก</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, nextTick } from 'vue'
import { submitRestockToSheet, addMedicine } from '../lib/googleConnect'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useDataStore } from '../stores/dataStore'

// State
const dataStore = useDataStore()
const medicines = computed(() => dataStore.medicines)
const history = computed(() => dataStore.restockHistory)
const searchQuery = ref('')
const submitting = ref(false)

// Add Medicine Modal State
const showAddModal = ref(false)
const newMed = ref({
  name: '',
  unit: '',
  sku: '',
  current_stock: 0
})

// Restock Modal State
const showRestockModal = ref(false)
const targetMedicine = ref(null)
const amount = ref(0)
const remark = ref('')
const amountInput = ref(null)

const { currentUser } = useAuthStore()
const { pushNotification, removeNotification } = useNotificationStore()

// Computed
const filteredMedicines = computed(() => {
  if (!searchQuery.value) return medicines.value
  const query = searchQuery.value.toLowerCase()
  return medicines.value.filter(m => 
    m.name.toLowerCase().includes(query) || 
    (m.sku && m.sku.toLowerCase().includes(query))
  )
})

const computedTotal = computed(() => {
  if (!targetMedicine.value || !amount.value) return targetMedicine.value?.currentStock || 0
  const current = targetMedicine.value.currentStock || 0
  const a = Number(amount.value) || 0
  return current + a
})

// Functions - Formatting
function normalizeDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDate(value) {
  const d = normalizeDate(value)
  if (!d) return value || ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function formatTime(value) {
  const d = normalizeDate(value)
  if (!d) return value || ''
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

// Functions - Data Loading
async function loadData(force = false) {
  const loadingId = pushNotification({
    title: 'กำลังโหลดข้อมูล...',
    message: 'กรุณารอสักครู่ ระบบกำลังดึงข้อมูลล่าสุดจาก Medicine List',
    type: 'info',
    duration: 0 // แสดงค้างไว้จนกว่าจะโหลดเสร็จ
  })
  
  try {
    await Promise.all([
      dataStore.getMedicines(force),
      dataStore.getRestockHistory(force)
    ])
  } catch (err) {
    pushNotification({
      title: 'โหลดข้อมูลไม่สำเร็จ',
      message: err.message || 'ตรวจสอบ AppScript',
      type: 'error'
    })
  } finally {
    removeNotification(loadingId)
  }
}

// Functions - Modals
function openAddMedicineModal() {
  newMed.value = { name: '', unit: '', sku: '', current_stock: 0 }
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

function openRestockModal(med) {
  targetMedicine.value = med
  amount.value = 0
  remark.value = ''
  showRestockModal.value = true
  nextTick(() => {
    if (amountInput.value) amountInput.value.focus()
  })
}

function closeRestockModal() {
  showRestockModal.value = false
  targetMedicine.value = null
}

// Functions - Actions
async function createMedicine() {
  if (!newMed.value.name || !newMed.value.unit) {
    pushNotification({
      title: 'ข้อมูลไม่ครบ',
      message: 'กรุณากรอกชื่อยาและหน่วย',
      type: 'warning'
    })
    return
  }

  submitting.value = true
  try {
    await addMedicine(newMed.value)
    pushNotification({
      title: 'เพิ่มยาใหม่สำเร็จ',
      message: `เพิ่ม ${newMed.value.name} เข้าสู่ระบบแล้ว`,
      type: 'success'
    })
    closeAddModal()
    await loadData(true) // Force reload after update
  } catch (err) {
    pushNotification({
      title: 'บันทึกยาไม่สำเร็จ',
      message: err.message,
      type: 'error'
    })
  } finally {
    submitting.value = false
  }
}

async function submitRestock() {
  if (!targetMedicine.value || !amount.value || amount.value <= 0) {
    pushNotification({
      title: 'ข้อมูลไม่ครบ',
      message: 'กรุณาระบุจำนวนที่เติมมากกว่า 0',
      type: 'warning'
    })
    return
  }

  submitting.value = true
  try {
    const addBy = currentUser.value?.full_name || currentUser.value?.username || 'unknown'
    await submitRestockToSheet({
      medicine: targetMedicine.value.name,
      amountRestock: Number(amount.value),
      remark: remark.value,
      addBy
    })

    pushNotification({
      title: 'บันทึกสำเร็จ',
      message: `เติม ${targetMedicine.value.name} +${amount.value} หน่วย`,
      type: 'success'
    })
    closeRestockModal()
    await loadData(true) // Force reload after update
  } catch (err) {
    pushNotification({
      title: 'บันทึกไม่สำเร็จ',
      message: err.message,
      type: 'error'
    })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (!dataStore.isMedicinesLoaded || !dataStore.isHistoryLoaded) {
    loadData()
  }
})
</script>

<style scoped>
.page-actions {
  display: flex;
  gap: 10px;
}

.table-container {
  overflow-x: auto;
  max-height: 500px;
}

.icon-button {
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-button:hover {
  background: var(--accent);
  color: white;
  transform: scale(1.05);
}

/* Side Panel Styles */
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
  max-width: 400px;
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
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.side-panel-footer {
  padding: 20px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  gap: 12px;
}

.form-vertical {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.button-ghost {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-soft);
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
}

.button-ghost:hover {
  background: var(--bg-main);
  color: var(--text-main);
}
</style>
