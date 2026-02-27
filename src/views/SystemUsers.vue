<template>
  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title">ผู้ใช้งานระบบ</div>
        <div class="page-subtitle">จัดการบัญชีเข้าสู่ระบบ</div>
      </div>
      <div class="page-actions">
        <button class="button-ghost" @click="loadUsers(true)" :disabled="loading.list">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading.list }"></i> รีเฟรช
        </button>
        <button class="button-primary" @click="openAdd">เพิ่มผู้ใช้งาน</button>
      </div>
    </div>

    <section class="card">
      <div class="card-header">
        <div class="card-title">รายการผู้ใช้งาน</div>
        <div class="card-subtitle">ข้อมูลจาก system_users เชื่อม employees</div>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Username</th>
            <th>รหัสพนักงาน</th>
            <th>ชื่อ-สกุล</th>
            <th>ตำแหน่ง</th>
            <th>แผนก</th>
            <th>เพิ่มโดย</th>
            <th>วันที่เพิ่ม</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.username }}</td>
            <td>{{ u.emp_code }}</td>
            <td>{{ u.full_name }}</td>
            <td>{{ u.position || '-' }}</td>
            <td>{{ u.department || '-' }}</td>
            <td>{{ u.created_by_name || '-' }}</td>
            <td>{{ formatDateTime(u.created_at) }}</td>
          </tr>
          <tr v-if="!loading.list && users.length === 0">
            <td colspan="7" style="text-align:center;color:var(--text-soft);padding:16px;">ไม่มีข้อมูล</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div v-if="showAdd" class="side-panel-overlay" @click.self="closeAdd">
      <div class="side-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">เพิ่มผู้ใช้งานระบบ</div>
          <button class="side-panel-close" @click="closeAdd"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="side-panel-body">
          <div class="detail-section">
            <div class="section-title">ค้นหาพนักงาน</div>
            <div class="field">
              <label class="field-label">รหัสพนักงานหรือชื่อ</label>
              <input class="field-input" v-model="searchTerm" @input="debouncedSearch" placeholder="พิมพ์เพื่อค้นหา..." />
            </div>
            <div v-if="suggestions.length" class="su-suggest">
              <div class="su-suggest-item" v-for="s in suggestions" :key="s.employee_code" @click="selectEmployee(s)">
                <div style="font-weight:600">{{ s.fullname }}</div>
                <div style="font-size:12px;color:var(--text-soft)">รหัส: {{ s.employee_code }} • {{ s.position || '-' }} • {{ s.department || '-' }}</div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-title">ข้อมูลพนักงาน</div>
            <div class="form-grid">
              <div class="field">
                <label class="field-label">รหัสพนักงาน</label>
                <input class="field-input" v-model="form.emp_code" readonly />
              </div>
              <div class="field">
                <label class="field-label">ชื่อ-สกุล</label>
                <input class="field-input" v-model="form.full_name" readonly />
              </div>
              <div class="field">
                <label class="field-label">ตำแหน่ง</label>
                <input class="field-input" v-model="form.position" readonly />
              </div>
              <div class="field">
                <label class="field-label">แผนก</label>
                <input class="field-input" v-model="form.department" readonly />
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-title">ตั้งค่าบัญชี</div>
            <div class="field">
              <label class="field-label">Username</label>
              <input class="field-input" v-model="form.username" placeholder="เช่น รหัสพนักงาน" />
            </div>
            <div class="field">
              <label class="field-label">รหัสผ่าน</label>
              <input class="field-input" type="password" v-model="form.password" />
            </div>
            <div class="field">
              <label class="field-label">ยืนยันรหัสผ่าน</label>
              <input class="field-input" type="password" v-model="form.confirm" />
            </div>
            <div v-if="passwordError" style="font-size:12px;color:var(--accent-danger)">{{ passwordError }}</div>
          </div>
        </div>
        <div class="side-panel-footer" v-if="!confirmPhase">
          <button class="button-primary w-full" :disabled="!canSave || saving" @click="startConfirm">บันทึก</button>
        </div>
        <div class="side-panel-footer" v-else></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useNotificationStore } from '../stores/notificationStore'
import { useAuthStore } from '../stores/authStore'
import bcrypt from 'bcryptjs-react'

const { pushNotification, removeNotification } = useNotificationStore()
const { currentUser } = useAuthStore()

const users = ref([])
const loading = ref({ list: false })

function formatDateTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`
}

async function loadUsers(force = false) {
  loading.value.list = true
  let id = pushNotification({ title: 'กำลังโหลดผู้ใช้งาน...', message: 'ดึงข้อมูลจาก Supabase', type: 'info', duration: 0 })
  try {
    const { data: sys, error } = await supabase.from('system_users').select('*').order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const codes = Array.from(new Set((sys || []).map(r => r.emp_code).filter(Boolean)))
    let empMap = {}
    if (codes.length) {
      const { data: emps } = await supabase.from('employees').select('employee_code,fullname,position,department').in('employee_code', codes)
      empMap = Object.fromEntries((emps || []).map(e => [e.employee_code, e]))
    }
    const creatorIds = Array.from(new Set((sys || []).map(r => r.created_by).filter(Boolean)))
    let cMap = {}
    if (creatorIds.length) {
      const { data: creators } = await supabase.from('system_users').select('id,username,full_name').in('id', creatorIds)
      cMap = Object.fromEntries((creators || []).map(c => [c.id, c.full_name || c.username]))
    }
    users.value = (sys || []).map(r => {
      const emp = empMap[r.emp_code] || {}
      return {
        ...r,
        full_name: r.full_name || emp.fullname || '',
        position: emp.position || null,
        department: emp.department || null,
        created_by_name: cMap[r.created_by] || null
      }
    })
  } catch (err) {
    pushNotification({ title: 'โหลดข้อมูลไม่สำเร็จ', message: err.message, type: 'error' })
  } finally {
    loading.value.list = false
    removeNotification(id)
  }
}

const showAdd = ref(false)
function openAdd() {
  resetForm()
  showAdd.value = true
}
function closeAdd() {
  showAdd.value = false
  stopCountdown()
}

const searchTerm = ref('')
const suggestions = ref([])
let timer = null
function debouncedSearch() {
  clearTimeout(timer)
  timer = setTimeout(searchEmployees, 300)
}
async function searchEmployees() {
  const t = searchTerm.value.trim()
  if (!t) { suggestions.value = []; return }
  const pattern = `%${t}%`
  const { data, error } = await supabase
    .from('employees')
    .select('employee_code,fullname,position,department')
    .or(`employee_code.ilike.${pattern},fullname.ilike.${pattern}`)
    .limit(10)
  if (!error) suggestions.value = data || []
}
function selectEmployee(e) {
  form.value.emp_code = e.employee_code
  form.value.full_name = e.fullname
  form.value.position = e.position || ''
  form.value.department = e.department || ''
  if (!form.value.username) form.value.username = e.employee_code
  suggestions.value = []
  searchTerm.value = `${e.fullname} (${e.employee_code})`
}

const form = ref({
  emp_code: '',
  full_name: '',
  position: '',
  department: '',
  username: '',
  password: '',
  confirm: ''
})

const passwordError = computed(() => {
  if (!form.value.password && !form.value.confirm) return ''
  if (form.value.password.length < 6) return 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร'
  if (form.value.password !== form.value.confirm) return 'รหัสผ่านไม่ตรงกัน'
  return ''
})
const canSave = computed(() => {
  return !!form.value.emp_code && !!form.value.username && !!form.value.password && !passwordError.value
})

let countdown = ref(10)
let confirmPhase = ref(false)
let saving = ref(false)
let countdownTimer = null

function startConfirm() {
  pushNotification({
    title: 'ยืนยันการเพิ่มผู้ใช้งาน',
    message: 'ปุ่มยืนยันจะเปิดใช้งานใน 10 วินาที',
    type: 'warning',
    duration: 0,
    modal: true,
    delaySeconds: 10,
    confirmText: 'ยืนยัน',
    cancelText: 'ยกเลิก',
    onConfirm: () => confirmSave()
  })
}
function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}
function cancelConfirm() {
  confirmPhase.value = false
  stopCountdown()
}

async function confirmSave() {
  saving.value = true
  const id = pushNotification({ title: 'กำลังบันทึก...', message: 'กำลังเพิ่มผู้ใช้งานใหม่', type: 'info', duration: 0 })
  try {
    const salt = bcrypt.genSaltSync(10)
    const hash = bcrypt.hashSync(form.value.password, salt)
    const payload = {
      username: form.value.username.trim(),
      password_hash: hash,
      emp_code: form.value.emp_code,
      full_name: form.value.full_name,
      created_by: currentUser.value?.id || null,
      created_at: new Date().toISOString()
    }
    const { error } = await supabase.from('system_users').insert(payload)
    if (error) throw new Error(error.message)
    pushNotification({ title: 'สำเร็จ', message: 'เพิ่มผู้ใช้งานเรียบร้อย', type: 'success' })
    closeAdd()
    await loadUsers(true)
  } catch (err) {
    pushNotification({ title: 'บันทึกไม่สำเร็จ', message: err.message, type: 'error' })
  } finally {
    saving.value = false
    removeNotification(id)
  }
}

function resetForm() {
  form.value = { emp_code: '', full_name: '', position: '', department: '', username: '', password: '', confirm: '' }
  searchTerm.value = ''
  suggestions.value = []
  confirmPhase.value = false
  stopCountdown()
}

loadUsers()
</script>

<style scoped>
.page-actions {
  display: flex;
  gap: 8px;
}
.su-suggest {
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: var(--bg-elevated);
  margin-top: 8px;
  max-height: 200px;
  overflow: auto;
}
.su-suggest-item {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
}
.su-suggest-item:hover {
  background: var(--bg-elevated-soft);
}
.w-full { width: 100%; }

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
