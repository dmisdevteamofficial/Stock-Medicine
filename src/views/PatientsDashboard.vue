<template>
  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Patients Dashboard</div>
        <div class="page-subtitle">สถิติผู้ป่วย • จากชีต Patients</div>
      </div>
      <div>
        <div style="display:flex;gap:8px;align-items:end;">
          <div>
            <label class="field-label">จากวันที่</label>
            <input v-model="filters.dateFrom" type="date" class="field-input" />
          </div>
          <div>
            <label class="field-label">ถึงวันที่</label>
            <input v-model="filters.dateTo" type="date" class="field-input" />
          </div>
          <div style="display:flex;gap:8px;">
            <button class="button-primary" @click="applyFilter">กรอง</button>
            <button class="button-ghost" @click="clearFilter">ล้าง</button>
          </div>
        </div>
      </div>
    </div>

    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">ผู้ป่วยเดือนนี้</div>
        <div class="kpi-value">{{ summary.thisMonthCount }}</div>
        <div class="kpi-tag">Month-to-date</div>
        <div class="kpi-compare" :style="{ color: summary.growthAbs >= 0 ? '#ef4444' : '#16a34a' }">
          {{ diffText(summary.thisMonthCount, summary.lastMonthCount) }} เทียบเดือนก่อน
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">แผนกมากสุด (เดือนนี้)</div>
        <div class="kpi-value">{{ topDepartments[0]?.name || '-' }}</div>
        <div class="kpi-tag">ผู้ป่วย: {{ topDepartments[0]?.count ?? '-' }}</div>
        <div class="kpi-compare" style="color: var(--text-soft);">
          คิดเป็น {{ topDeptShare.toFixed(1) }}% ของผู้ป่วยเดือนนี้
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Diagnosis มากสุด</div>
        <div class="kpi-value">{{ topDiagnosis[0]?.name || '-' }}</div>
        <div class="kpi-tag">ครั้ง: {{ topDiagnosis[0]?.count ?? '-' }}</div>
        <div class="kpi-compare" style="color: var(--text-soft);">
          คิดเป็น {{ topDxShare.toFixed(1) }}% ของผู้ป่วยเดือนนี้
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">ยาที่ใช้มากสุด</div>
        <div class="kpi-value">{{ topMedicines[0]?.name || '-' }}</div>
        <div class="kpi-tag">หน่วย: {{ topMedicines[0]?.amount ?? '-' }}</div>
        <div class="kpi-compare" style="color: var(--text-soft);">
          คิดเป็น {{ topMedShare.toFixed(1) }}% ของหน่วยยาเดือนนี้
        </div>
      </div>
    </section>

    <!-- Inventory KPIs (moved from DashboardView) -->
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
          <div class="card-title">
            <i class="fa-solid fa-chart-line" style="margin-right:6px;"></i>แนวโน้ม 15 วันล่าสุด
          </div>
          <div class="card-subtitle">เลือกหมวดเพื่อเปรียบเทียบ</div>
        </div>
        <div>
          <select v-model="chartMode" class="field-select">
            <option value="combined">รวม 4 หมวด</option>
            <option value="overall">รวมผู้ป่วยทั้งหมด</option>
            <option value="department">ตามแผนก (Top 3)</option>
            <option value="diagnosis">ตาม Diagnosis (Top 3)</option>
            <option value="patient">ตามคนไข้ (Top 3)</option>
            <option value="medicine">ตามการใช้ยา (Top 3)</option>
          </select>
        </div>
      </div>
      <div style="padding: 8px;">
        <div style="width: 100%; height: 300px;">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>
    </section>

    <section class="kpi-grid" style="margin-top: 16px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Top 5 แผนก</div>
          <div class="card-subtitle">จำนวนผู้ป่วยเดือนนี้</div>
        </div>
        <table class="table">
          <thead>
            <tr><th>แผนก</th><th style="width:120px;text-align:right;">ผู้ป่วย</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in topDepartments" :key="d.name">
              <td>{{ d.name }}</td>
              <td style="text-align:right;">{{ d.count }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Top 5 Diagnosis</div>
          <div class="card-subtitle">เดือนนี้</div>
        </div>
        <table class="table">
          <thead>
            <tr><th>Diagnosis</th><th style="width:120px;text-align:right;">ครั้ง</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in topDiagnosis" :key="d.name">
              <td>{{ d.name }}</td>
              <td style="text-align:right;">{{ d.count }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Top 5 ยาที่ใช้มากสุด</div>
          <div class="card-subtitle">ผลรวมหน่วยยาเดือนนี้</div>
        </div>
        <table class="table">
          <thead>
            <tr><th>ยา</th><th style="width:120px;text-align:right;">หน่วย</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in topMedicines" :key="m.name">
              <td>{{ m.name }}</td>
              <td style="text-align:right;">{{ m.amount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Top 5 คนไข้มาใช้บริการบ่อยสุด</div>
          <div class="card-subtitle">นับครั้งเดือนนี้</div>
        </div>
        <table class="table">
          <thead>
            <tr><th>ชื่อ</th><th style="width:120px;text-align:right;">ครั้ง</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in topFrequentPatients" :key="p.name">
              <td>{{ p.name }}</td>
              <td style="text-align:right;">{{ p.count }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
  </template>

  <script setup>
import { computed, onMounted, ref } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { useDataStore } from '../stores/dataStore'
import { useNotificationStore } from '../stores/notificationStore'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const dataStore = useDataStore()
const { pushNotification, removeNotification } = useNotificationStore()

const filters = ref({ dateFrom: '', dateTo: '' })
const activeFilter = ref({ dateFrom: '', dateTo: '' })
const isFilterActive = computed(() => !!activeFilter.value.dateFrom || !!activeFilter.value.dateTo)

async function applyFilter() {
  const from = filters.value.dateFrom
  const to = filters.value.dateTo
  if (!from && !to) {
    activeFilter.value = { dateFrom: '', dateTo: '' }
    return
  }
  const loadingId = pushNotification({
    title: 'กำลังกรองช่วงวันที่...',
    message: 'กำลังคำนวณสถิติจากชีต Patients ตามช่วงที่เลือก',
    type: 'info',
    duration: 0
  })
  try {
    await dataStore.getPatientStats({ dateFrom: from || undefined, dateTo: to || undefined }, true)
    activeFilter.value = { dateFrom: from || '', dateTo: to || '' }
  } catch (err) {
    pushNotification({
      title: 'กรองข้อมูลไม่สำเร็จ',
      message: err.message || 'ตรวจสอบ AppScript',
      type: 'error'
    })
  } finally {
    removeNotification(loadingId)
  }
}

async function clearFilter() {
  filters.value = { dateFrom: '', dateTo: '' }
  activeFilter.value = { dateFrom: '', dateTo: '' }
  const loadingId = pushNotification({
    title: 'กำลังโหลดข้อมูลรวม...',
    message: 'กำลังดึงสถิติภาพรวมล่าสุด',
    type: 'info',
    duration: 0
  })
  try {
    await dataStore.getPatientStats({}, true)
  } finally {
    removeNotification(loadingId)
  }
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

function normalizeDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
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

const lastRestockDisplay = computed(() => {
  if (!lastHistory.value.length) return '-'
  const last = lastHistory.value[0]
  const date = formatDate(last.date)
  const time = formatTime(last.time)
  return `${date} ${time} • ${last.medicine} +${last.amount}`
})

const summary = computed(() => {
  if (!isFilterActive.value) {
    return {
      thisMonthCount: dataStore.patientStats?.thisMonthCount || 0,
      lastMonthCount: dataStore.patientStats?.lastMonthCount || 0,
      growthAbs: dataStore.patientStats?.growthAbs || 0,
      growthPct: dataStore.patientStats?.growthPct || 0
    }
  }
  const total = sum(seriesOverall.value || [])
  return {
    thisMonthCount: total,
    lastMonthCount: 0,
    growthAbs: total,
    growthPct: 0
  }
})

const totals = computed(() => ({
  totalMedicineAmountThisMonth: dataStore.patientStats?.totalMedicineAmountThisMonth || 0
}))

const dateLabels = computed(() => dataStore.patientStats?.daily?.dates || [])
const seriesOverall = computed(() => dataStore.patientStats?.daily?.overall || [])
const seriesDepartment = computed(() => dataStore.patientStats?.daily?.byDepartment || {})
const seriesDiagnosis = computed(() => dataStore.patientStats?.daily?.byDiagnosis || {})
const seriesPatient = computed(() => dataStore.patientStats?.daily?.byPatient || {})
const seriesMedicine = computed(() => dataStore.patientStats?.daily?.byMedicineAmount || {})

function sum(arr) { return (arr || []).reduce((a, b) => a + Number(b || 0), 0) }
function topFromSeriesMap(mapObj, valueKey) {
  const out = Object.keys(mapObj || {}).map(name => ({ name, value: sum(mapObj[name] || []) }))
  out.sort((a, b) => b.value - a.value)
  return out.slice(0, 5).map(v => valueKey === 'amount' ? ({ name: v.name, amount: v.value }) : ({ name: v.name, count: v.value }))
}

const topDepartments = computed(() => dataStore.patientStats?.topDepartments || [])
const topDiagnosis = computed(() => dataStore.patientStats?.topDiagnosis || [])
const topMedicines = computed(() => dataStore.patientStats?.topMedicines || [])
const topFrequentPatients = computed(() => dataStore.patientStats?.topFrequentPatients || [])

const chartMode = ref('overall')
chartMode.value = 'combined'

const thaiMonthsShort = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

const seriesByMode = computed(() => {
  if (chartMode.value === 'department') return seriesDepartment.value
  if (chartMode.value === 'diagnosis') return seriesDiagnosis.value
  if (chartMode.value === 'patient') return seriesPatient.value
  if (chartMode.value === 'medicine') return seriesMedicine.value
  return {}
})

const topDeptShare = computed(() => {
  const top = topDepartments.value?.[0]?.count || 0
  const total = summary.value.thisMonthCount || 0
  return total ? (top / total) * 100 : 0
})
const topDxShare = computed(() => {
  const top = topDiagnosis.value?.[0]?.count || 0
  const total = summary.value.thisMonthCount || 0
  return total ? (top / total) * 100 : 0
})
const topMedShare = computed(() => {
  const top = topMedicines.value?.[0]?.amount || 0
  const total = totals.value.totalMedicineAmountThisMonth || 0
  return total ? (top / total) * 100 : 0
})

const displayDateLabels = computed(() => {
  return (dateLabels.value || []).map(str => {
    if (!str) return ''
    const d = new Date(str + 'T00:00:00')
    if (Number.isNaN(d.getTime())) return str
    const day = String(d.getDate()).padStart(2, '0')
    const m = thaiMonthsShort[d.getMonth()] || ''
    return `${day} ${m}`
  })
})

function diffText(current, previous) {
  const curr = Number(current || 0)
  const prev = Number(previous || 0)
  if (!prev) return `+${curr} (ใหม่)`
  const diff = curr - prev
  const pct = (diff / prev) * 100
  const dir = diff >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'
  return `${dir} ${Math.abs(diff)} (${pct.toFixed(1)}%)`
}

const usageOverall = computed(() => dataStore.patientStats?.daily?.usageOverall || [])

const seriesCombined = computed(() => {
  const depName = topDepartments.value?.[0]?.name || 'Top Department'
  const dxName = topDiagnosis.value?.[0]?.name || 'Top Diagnosis'
  const dep = seriesDepartment.value?.[depName] || new Array((dateLabels.value || []).length).fill(0)
  const dx = seriesDiagnosis.value?.[dxName] || new Array((dateLabels.value || []).length).fill(0)
  const patients = seriesOverall.value || []
  const usage = usageOverall.value || []
  return {
    department: { name: depName, series: dep },
    diagnosis: { name: dxName, series: dx },
    patients: { name: 'ผู้ป่วย', series: patients },
    usage: { name: 'การใช้ยา', series: usage }
  }
})

const chartData = computed(() => {
  const labels = displayDateLabels.value
  if (!labels.length) {
    return { labels: [], datasets: [] }
  }

  if (chartMode.value === 'combined') {
    return {
      labels,
      datasets: [
        {
          label: 'ผู้ป่วย (คน)',
          data: seriesCombined.value.patients.series,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(248,113,113,0.15)',
          tension: 0.4,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#ef4444'
        },
        {
          label: 'การใช้ยา (หน่วย)',
          data: seriesCombined.value.usage.series,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.18)',
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#3b82f6',
          yAxisID: 'yUsage'
        },
        {
          label: seriesCombined.value.department.name,
          data: seriesCombined.value.department.series,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.12)',
          tension: 0.4,
          fill: false,
          pointRadius: 2,
          pointHoverRadius: 4
        },
        {
          label: seriesCombined.value.diagnosis.name,
          data: seriesCombined.value.diagnosis.series,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139,92,246,0.12)',
          tension: 0.4,
          fill: false,
          pointRadius: 2,
          pointHoverRadius: 4
        }
      ]
    }
  }

  if (chartMode.value === 'overall') {
    return {
      labels,
      datasets: [
        {
          label: 'ผู้ป่วย (คน)',
          data: seriesOverall.value,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(248,113,113,0.18)',
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#ef4444'
        }
      ]
    }
  }

  const datasets = []
  if (chartMode.value === 'department') {
    const names = topDepartments.value.slice(0, 3).map(d => d.name)
    const colors = ['#10b981', '#22c55e', '#6ee7b7']
    names.forEach((name, idx) => {
      const series = seriesDepartment.value?.[name] || new Array(labels.length).fill(0)
      datasets.push({
        label: name,
        data: series,
        borderColor: colors[idx] || '#10b981',
        backgroundColor: 'transparent',
        tension: 0.4,
        fill: false,
        pointRadius: 2,
        pointHoverRadius: 4
      })
    })
  } else if (chartMode.value === 'diagnosis') {
    const names = topDiagnosis.value.slice(0, 3).map(d => d.name)
    const colors = ['#8b5cf6', '#a855f7', '#c4b5fd']
    names.forEach((name, idx) => {
      const series = seriesDiagnosis.value?.[name] || new Array(labels.length).fill(0)
      datasets.push({
        label: name,
        data: series,
        borderColor: colors[idx] || '#8b5cf6',
        backgroundColor: 'transparent',
        tension: 0.4,
        fill: false,
        pointRadius: 2,
        pointHoverRadius: 4
      })
    })
  } else if (chartMode.value === 'patient') {
    const names = topFrequentPatients.value.slice(0, 3).map(p => p.name)
    const colors = ['#f97316', '#fb923c', '#fed7aa']
    names.forEach((name, idx) => {
      const series = seriesPatient.value?.[name] || new Array(labels.length).fill(0)
      datasets.push({
        label: name,
        data: series,
        borderColor: colors[idx] || '#f97316',
        backgroundColor: 'transparent',
        tension: 0.4,
        fill: false,
        pointRadius: 2,
        pointHoverRadius: 4
      })
    })
  } else if (chartMode.value === 'medicine') {
    const names = topMedicines.value.slice(0, 3).map(m => m.name)
    const colors = ['#3b82f6', '#60a5fa', '#bfdbfe']
    names.forEach((name, idx) => {
      const series = seriesMedicine.value?.[name] || new Array(labels.length).fill(0)
      datasets.push({
        label: name,
        data: series,
        borderColor: colors[idx] || '#3b82f6',
        backgroundColor: 'transparent',
        tension: 0.4,
        fill: false,
        pointRadius: 2,
        pointHoverRadius: 4
      })
    })
  }

  return {
    labels,
    datasets
  }
})

const chartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: {
        labels: {
          usePointStyle: true,
          color: getComputedStyle(document.documentElement).getPropertyValue('--text-soft') || '#cbd5f5',
          font: { family: 'SF Thonburi', size: 11 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.9)',
        borderColor: 'rgba(148,163,184,0.6)',
        borderWidth: 1,
        titleFont: { family: 'SF Thonburi', size: 12 },
        bodyFont: { family: 'SF Thonburi', size: 11 },
        callbacks: {
          title: items => items[0]?.label || '',
          label: ctx => {
            const v = ctx.parsed.y ?? 0
            return `${ctx.dataset.label}: ${v}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          drawBorder: false,
          color: 'rgba(148,163,184,0.15)'
        },
        ticks: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--text-soft') || '#cbd5f5',
          font: { family: 'SF Thonburi', size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8
        }
      },
      y: {
        grid: {
          display: true,
          drawBorder: false,
          color: 'rgba(148,163,184,0.2)'
        },
        ticks: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--text-soft') || '#cbd5f5',
          font: { family: 'SF Thonburi', size: 10 },
          precision: 0
        }
      },
      yUsage: {
        position: 'right',
        grid: { display: false, drawBorder: false },
        ticks: {
          color: '#3b82f6',
          font: { family: 'SF Thonburi', size: 10 },
          precision: 0
        }
      }
    }
  }
})

async function loadStats(force = false) {
  const loadingId = pushNotification({
    title: 'กำลังโหลดแดชบอร์ด...',
    message: 'กำลังดึงข้อมูลผู้ป่วยและสต๊อกพร้อมกัน',
    type: 'info',
    duration: 0
  })
  try {
    await dataStore.getHomeData(force)
  } catch (err) {
    pushNotification({
      title: 'โหลดแดชบอร์ดไม่สำเร็จ',
      message: err.message || 'ตรวจสอบ AppScript',
      type: 'error'
    })
  } finally {
    removeNotification(loadingId)
  }
}

onMounted(() => {
  if (!dataStore.isPatientStatsLoaded || !dataStore.isDashboardLoaded) {
    loadStats()
  }
})
</script>
