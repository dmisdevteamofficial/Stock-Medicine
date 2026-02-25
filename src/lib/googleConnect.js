const scriptUrl = import.meta.env.VITE_APP_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz9j2yGSy6qOmeWUt6yQa8_peKZTUeAUTEvAo4qk4ljJQJDsviH6mMmYoUjgxW2O7RZyw/exec'

async function callScript(payload) {
  if (!scriptUrl) {
    throw new Error('ยังไม่ได้ตั้งค่า VITE_APP_SCRIPT_URL')
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    // ใช้ content-type แบบ simple เพื่อหลีกเลี่ยง CORS preflight
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  })

  // Google Apps Script อาจจะคืนค่า redirect (302) ซึ่ง fetch จะตามไปให้เอง
  // แต่ถ้ามีปัญหา network หรือ URL ผิด จะติดที่นี่
  if (!res.ok) {
    throw new Error(`AppScript error: ${res.status}`)
  }

  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch (e) {
    console.error('Failed to parse JSON from AppScript response:', text)
    throw new Error('การตอบกลับจาก AppScript ไม่ใช่ JSON ที่ถูกต้อง')
  }

  if (json.error) {
    throw new Error(json.error)
  }
  return json
}

export async function submitRestockToSheet({
  medicine,
  amountRestock,
  remark,
  addBy
}) {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 8)

  return callScript({
    action: 'restock',
    medicine,
    amountRestock,
    remark,
    addBy,
    date,
    time
  })
}

export async function fetchHistory(limit = 20) {
  const json = await callScript({
    action: 'history',
    limit
  })
  return json.rows || []
}

export async function fetchDashboardSnapshot() {
  const json = await callScript({
    action: 'dashboard'
  })
  return json
}

export async function fetchMedicines() {
  const json = await callScript({
    action: 'medicines'
  })
  return json.rows || []
}

export async function addMedicine(payload) {
  const json = await callScript({
    action: 'addMedicine',
    name: payload.name,
    unit: payload.unit,
    sku: payload.sku || ''
  })
  return json.result
}

export async function fetchPatientStats(params = {}) {
  const json = await callScript({
    action: 'patientStats',
    ...params
  })
  return json.stats
}

export async function fetchDispensingHistory(params = {}) {
  const json = await callScript({
    action: 'dispensingHistory',
    ...params
  })
  return {
    groups: json.groups || [],
    totalCount: json.totalCount || 0,
    departments: json.departments || []
  }
}
