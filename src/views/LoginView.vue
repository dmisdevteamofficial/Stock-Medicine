<template>
  <div class="login-shell">
    <div class="login-card">
      <div class="login-header">
        <div>
          <div class="login-title">เข้าสู่ระบบเพื่อจัดการสต๊อกยา</div>
          <div class="login-subtitle">ระบบจัดการสต๊อกยา • Supabase Auth (system_users)</div>
        </div>
      </div>
      <form class="login-form" @submit.prevent="submit">
        <div class="field">
          <label class="field-label">Username</label>
          <input v-model="username" class="field-input" autocomplete="username" />
        </div>
        <div class="field">
          <label class="field-label">Password</label>
          <input
            v-model="password"
            class="field-input"
            type="password"
            autocomplete="current-password"
          />
        </div>
        <button class="button-primary" type="submit" :disabled="loading">
          <span v-if="loading">กำลังเข้าสู่ระบบ...</span>
          <span v-else>เข้าสู่ระบบ</span>
        </button>
      </form>
      <div class="login-footer">
        * การเข้าสู่ระบบของคุณจะถูกเก็บไว้อย่าง <span class="pill-soft">ปอดภัย</span> ที่สุด
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import bcrypt from 'bcryptjs-react'

const username = ref('')
const password = ref('')
const loading = ref(false)

const router = useRouter()
const route = useRoute()

const { setUser } = useAuthStore()
const { pushNotification } = useNotificationStore()

async function submit() {
  if (!username.value || !password.value) {
    pushNotification({
      title: 'กรอกข้อมูลไม่ครบ',
      message: 'กรุณากรอกทั้ง Username และ Password',
      type: 'warning'
    })
    return
  }

  loading.value = true
  try {
    const uname = username.value.trim()
    const pwd = password.value.trim()

    const { data, error } = await supabase
      .from('system_users')
      .select('id, username, full_name, emp_code, password_hash')
      .ilike('username', uname)
      .maybeSingle()

    if (error) {
      console.error('Supabase login error', error)
      throw error
    }

    if (!data) {
      console.warn('Supabase login: no user found for username', uname)
      pushNotification({
        title: 'เข้าสู่ระบบไม่สำเร็จ',
        message: 'ไม่พบผู้ใช้งานนี้ในระบบ',
        type: 'error'
      })
      return
    }

    console.log('Supabase login: got user', data)

    // ตรวจ password โดยใช้ bcryptjs-react เทียบกับ hash จากฐานข้อมูล (Supabase)
    if (data.password_hash) {
      const ok = bcrypt.compareSync(pwd, String(data.password_hash))
      if (!ok) {
        console.warn('Supabase login: password mismatch for user', uname)
        pushNotification({
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          message: 'รหัสผ่านไม่ถูกต้อง',
          type: 'error'
        })
        return
      }
    }

    setUser({
      id: data.id,
      username: data.username,
      full_name: data.full_name,
      emp_code: data.emp_code
    })
    pushNotification({
      title: 'เข้าสู่ระบบสำเร็จ',
      message: `ยินดีต้อนรับ ${data.full_name || data.username}`,
      type: 'success'
    })

    // หลังเข้าสู่ระบบ ส่งไปหน้า Dashboard โดยตรง
    router.push({ name: 'dashboard' })
  } catch (err) {
    console.error('Login submit catch', err)
    pushNotification({
      title: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
      message: err.message || 'ไม่สามารถเชื่อมต่อ Supabase',
      type: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>
