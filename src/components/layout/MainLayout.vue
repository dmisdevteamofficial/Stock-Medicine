<template>
  <div class="layout-root">
    <sidebar-menu class="layout-sidebar" />
    <div class="layout-main">
      <top-toolbar class="layout-toolbar" />
      <div class="layout-content">
        <router-view />
      </div>
    </div>
    <notification-container />

    <!-- 100% Fix: Profile Sidebar moved here -->
    <teleport to="body">
      <div v-if="isProfileOpen" class="side-panel-overlay" @click.self="closeProfile">
        <div class="side-panel">
          <div class="side-panel-header">
            <div class="side-panel-title">แก้ไขโปรไฟล์</div>
            <button class="side-panel-close" @click="closeProfile">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="side-panel-body">
            <div class="detail-section">
              <div class="section-title">ข้อมูลพนักงาน</div>
              <div class="form-grid">
                <div class="field">
                  <label class="field-label">รหัสพนักงาน</label>
                  <input class="field-input" :value="empInfo.emp_code" readonly />
                </div>
                <div class="field">
                  <label class="field-label">ชื่อ-สกุล</label>
                  <input class="field-input" :value="empInfo.full_name" readonly />
                </div>
                <div class="field">
                  <label class="field-label">ตำแหน่ง</label>
                  <input class="field-input" :value="empInfo.position || '-'" readonly />
                </div>
              </div>
            </div>

            <div class="detail-section">
              <div class="section-title">บัญชีผู้ใช้งาน</div>
              <div class="field">
                <label class="field-label">Username</label>
                <input class="field-input" v-model="form.username" />
              </div>
              <button class="button-ghost" @click="togglePassword" style="align-self:flex-start;">
                <i class="fa-solid fa-key" style="margin-right:6px;"></i>แก้ไขรหัสผ่าน
              </button>
              
              <div v-if="editPassword" class="form-grid" style="margin-top: 10px;">
                <div class="field">
                  <label class="field-label">รหัสผ่านเดิม</label>
                  <input class="field-input" type="password" v-model="form.currentPassword" autocomplete="current-password" />
                </div>
                <div class="field">
                  <label class="field-label">รหัสผ่านใหม่</label>
                  <input class="field-input" type="password" v-model="form.newPassword" autocomplete="new-password" />
                </div>
                <div class="field">
                  <label class="field-label">ยืนยันรหัสผ่าน</label>
                  <input class="field-input" type="password" v-model="form.confirmPassword" autocomplete="new-password" />
                </div>
                <div v-if="passwordError" style="font-size:12px;color:var(--accent-danger)">{{ passwordError }}</div>
              </div>
            </div>
          </div>
          <div class="side-panel-footer">
            <button class="button-ghost" @click="closeProfile" :disabled="saving">ยกเลิก</button>
            <button class="button-primary" @click="saveProfile" :disabled="!canSave || saving">บันทึก</button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import SidebarMenu from './SidebarMenu.vue'
import TopToolbar from './TopToolbar.vue'
import NotificationContainer from '../ui/NotificationContainer.vue'
import { useAuthStore } from '../../stores/authStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { supabase } from '../../lib/supabaseClient'
import bcrypt from 'bcryptjs-react'

const auth = useAuthStore()
const { isProfileOpen, closeProfile } = auth
const { pushNotification } = useNotificationStore()

const saving = ref(false)
const originalUsername = ref('')
const editPassword = ref(false)
const form = ref({
  username: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const empInfo = ref({
  emp_code: '',
  full_name: '',
  position: ''
})

const passwordError = computed(() => {
  if (!editPassword.value) return ''
  if (!form.value.newPassword || !form.value.confirmPassword) return 'กรุณากรอกรหัสผ่านใหม่และยืนยัน'
  if (form.value.newPassword.length < 6) return 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร'
  if (form.value.newPassword !== form.value.confirmPassword) return 'รหัสผ่านใหม่ไม่ตรงกัน'
  return ''
})

const canSave = computed(() => {
  const usernameChanged = form.value.username.trim() !== originalUsername.value.trim()
  const passwordReady = editPassword.value && !passwordError.value && !!form.value.currentPassword
  return usernameChanged || passwordReady
})

function togglePassword() {
  editPassword.value = !editPassword.value
}

async function loadProfile() {
  const u = auth.currentUser.value
  console.log('MainLayout: loadProfile', u)
  if (!u) return
  form.value.username = u.username || ''
  originalUsername.value = u.username || ''
  empInfo.value.emp_code = u.emp_code || ''
  empInfo.value.full_name = u.full_name || u.username || ''
  
  if (u.emp_code) {
    const { data } = await supabase.from('employees').select('position').eq('employee_code', u.emp_code).maybeSingle()
    empInfo.value.position = data?.position || ''
  }
}

async function saveProfile() {
  if (!canSave.value) return
  saving.value = true
  try {
    const id = auth.currentUser.value?.id
    if (!id) throw new Error('ไม่พบผู้ใช้งานปัจจุบัน')

    let payload = {}
    if (form.value.username.trim() !== originalUsername.value.trim()) {
      payload.username = form.value.username.trim()
    }

    if (editPassword.value) {
      const { data: userRow } = await supabase.from('system_users').select('password_hash').eq('id', id).maybeSingle()
      const ok = bcrypt.compareSync(form.value.currentPassword || '', String(userRow?.password_hash || ''))
      if (!ok) {
        pushNotification({ title: 'บันทึกไม่สำเร็จ', message: 'รหัสผ่านเดิมไม่ถูกต้อง', type: 'error' })
        saving.value = false
        return
      }
      const salt = bcrypt.genSaltSync(10)
      payload.password_hash = bcrypt.hashSync(form.value.newPassword, salt)
    }

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from('system_users').update(payload).eq('id', id)
      if (error) throw error
      
      if (payload.username) {
        auth.currentUser.value.username = payload.username
      }

      // แจ้งเตือนตามประเภทข้อมูลที่เปลี่ยน
      let successMsg = 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว'
      if (payload.password_hash && payload.username) {
        successMsg = 'เปลี่ยนชื่อผู้ใช้งานและรหัสผ่านสำเร็จ'
      } else if (payload.password_hash) {
        successMsg = 'เปลี่ยนรหัสผ่านใหม่สำเร็จ'
      } else if (payload.username) {
        successMsg = 'เปลี่ยนชื่อผู้ใช้งานสำเร็จ'
      }

      pushNotification({ 
        title: 'บันทึกสำเร็จ', 
        message: successMsg, 
        type: 'success' 
      })
      
      originalUsername.value = form.value.username
      closeProfile()
    }
  } catch (err) {
    pushNotification({ title: 'บันทึกไม่สำเร็จ', message: err.message, type: 'error' })
  } finally {
    saving.value = false
  }
}

watch(isProfileOpen, (val) => {
  console.log('MainLayout: isProfileOpen changed', val)
  if (val) {
    loadProfile()
    editPassword.value = false
    form.value.currentPassword = ''
    form.value.newPassword = ''
    form.value.confirmPassword = ''
  }
})
</script>
