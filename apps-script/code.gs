const RESTOCK_SHEET_NAME = 'Restock'
const HISTORY_SHEET_NAME = 'History'
const MEDICINE_SHEET_NAME = 'Medicine List'
const PATIENTS_SHEET_NAME = 'Patients'

function doGet(e) {
  return createResponse({ ok: true, message: 'Clinic TDL Restock API' })
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents)
    const action = payload.action

    if (action === 'restock') {
      const result = handleRestock(payload)
      return createResponse({ ok: true, result })
    }

    if (action === 'history') {
      const limit = payload.limit || 20
      const rows = getHistoryRows(limit)
      return createResponse({ ok: true, rows })
    }

    if (action === 'dashboard') {
      const snapshot = getDashboardSnapshot()
      return createResponse(snapshot)
    }

    if (action === 'patientStats') {
      const stats = getPatientStats(payload)
      return createResponse({ ok: true, stats })
    }

    if (action === 'medicines') {
      const rows = getMedicineList()
      return createResponse({ ok: true, rows })
    }

    if (action === 'addMedicine') {
      const result = addMedicine(payload)
      return createResponse({ ok: true, result })
    }

    if (action === 'dispensingHistory') {
      const result = getDispensingHistory(payload)
      return createResponse({ ok: true, ...result })
    }

    return createResponse({ error: 'Unknown action' }, 400)
  } catch (err) {
    return createResponse({ error: err.message || 'Unexpected error' }, 500)
  }
}

function handleRestock(payload) {
  const medicine = payload.medicine
  const amountRestock = Number(payload.amountRestock || 0)
  const remark = payload.remark || ''
  const addBy = payload.addBy || ''
  const date = payload.date || ''
  const time = payload.time || ''

  if (!medicine || amountRestock <= 0) {
    throw new Error('Invalid restock payload')
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const historySheet = ss.getSheetByName(HISTORY_SHEET_NAME)
  const medSheet = ss.getSheetByName(MEDICINE_SHEET_NAME)

  if (!medSheet || !historySheet) {
    throw new Error('Medicine List หรือ History sheet ไม่พบ')
  }

  const lastMedRow = medSheet.getLastRow()
  let targetRow = null
  let currentStock = 0

  if (lastMedRow >= 2) {
    const medRange = medSheet.getRange(2, 1, lastMedRow - 1, 4) // คอลัมน์ A..D
    const medValues = medRange.getValues()
    for (let i = 0; i < medValues.length; i++) {
      const name = medValues[i][0]
      if (name && String(name).trim() === String(medicine).trim()) {
        targetRow = i + 2
        currentStock = Number(medValues[i][3] || 0) // คอลัมน์ D
        break
      }
    }
  }

  if (!targetRow) {
    throw new Error('ไม่พบรายการยาใน Medicine List')
  }

  const total = currentStock + amountRestock

  // อัปเดต current stock ใน Medicine List (คอลัมน์ D)
  medSheet.getRange(targetRow, 4).setValue(total)

  // บันทึกลง History
  historySheet.appendRow([
    medicine,
    amountRestock,
    total,
    remark,
    addBy,
    date,
    time
  ])

  return {
    medicine: medicine,
    amountRestock: amountRestock,
    total: total
  }
}

function getMedicineList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const medSheet = ss.getSheetByName(MEDICINE_SHEET_NAME)

  if (!medSheet) {
    throw new Error('Medicine List sheet ไม่พบ')
  }

  const lastMedRow = medSheet.getLastRow()
  if (lastMedRow < 2) {
    return []
  }

  const medRange = medSheet.getRange(2, 1, lastMedRow - 1, 4) // คอลัมน์ A..D
  const medValues = medRange.getValues()

  const list = []
  for (let i = 0; i < medValues.length; i++) {
    const row = medValues[i]
    const name = row[0]
    if (!name) continue
    
    list.push({
      id: 2 + i,
      name: name,
      unit: row[1] || '',
      sku: row[2] || '',
      currentStock: Number(row[3] || 0)
    })
  }

  return list.sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

function getPatientStats(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName(PATIENTS_SHEET_NAME)
  if (!sheet) {
    throw new Error('Patients sheet ไม่พบ')
  }

  const lastRow = sheet.getLastRow()
  if (lastRow < 2) {
    return {
      thisMonthCount: 0,
      lastMonthCount: 0,
      growthAbs: 0,
      growthPct: 0,
      topDepartments: [],
      topDiagnosis: [],
      topMedicines: [],
      topFrequentPatients: [],
      daily: {
        dates: [],
        overall: [],
        byDepartment: {},
        byDiagnosis: {},
        byPatient: {},
        byMedicineAmount: {}
      }
    }
  }

  const range = sheet.getRange(2, 1, lastRow - 1, 15) // A..O
  const values = range.getValues()

  const now = new Date()
  const tz = Session.getScriptTimeZone() || 'Asia/Bangkok'
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  // Build day window from payload or default last 15 days
  let rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14)
  let rangeEnd = now
  if (payload && (payload.dateFrom || payload.dateTo)) {
    if (payload.dateFrom) {
      const df = new Date(payload.dateFrom)
      if (!isNaN(df.getTime())) rangeStart = new Date(df.getFullYear(), df.getMonth(), df.getDate())
    }
    if (payload.dateTo) {
      const dt = new Date(payload.dateTo)
      if (!isNaN(dt.getTime())) rangeEnd = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
    }
  }
  const dayKeys = []
  for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
    const key = Utilities.formatDate(new Date(d), tz, 'yyyy-MM-dd')
    dayKeys.push(key)
  }

  // Helpers
  function normalizeDateCell(cell) {
    if (!cell) return null
    if (cell instanceof Date) return cell

    // Text date: รองรับ dd/MM/yyyy, dd-MM-yyyy, dd.MM.yyyy, และปี 2 หลัก
    if (typeof cell === 'string') {
      const trimmed = cell.trim()
      const m = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/)
      if (m) {
        const day = Number(m[1])
        const month = Number(m[2]) - 1
        let year = Number(m[3])
        if (year < 100) {
          year = year >= 70 ? 1900 + year : 2000 + year
        }
        const d = new Date(year, month, day)
        if (!isNaN(d.getTime())) return d
      }
    }

    // Serial number (บางกรณี)
    if (typeof cell === 'number') {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30)) // 30 Dec 1899
      const millis = Math.round(cell * 24 * 60 * 60 * 1000)
      const d = new Date(excelEpoch.getTime() + millis)
      if (!isNaN(d.getTime())) return d
    }

    const d = new Date(cell)
    if (isNaN(d.getTime())) return null
    return d
  }

  function inRange(d, start, end) {
    return d && d >= start && d <= end
  }

  // Aggregators
  let thisMonthCount = 0
  let lastMonthCount = 0

  const depCountThisMonth = {}
  const dxCountThisMonth = {}
  const medAmountThisMonth = {}
  const patientCountThisMonth = {}

  const overallByDay = {}
  const usageOverallByDay = {}
  const byDepartment = {}
  const byDiagnosis = {}
  const byPatient = {}
  const byMedicineAmount = {}

  // visit-level dedupe: 1 คน / 1 วัน = 1 visit
  const seenVisitThisMonth = {}
  const seenVisitLastMonth = {}
  const seenVisitWindow = {}

  // Determine if filtered by range
  const hasFilterEarly = payload && (payload.dateFrom || payload.dateTo)

  // Column mapping:
  // A=Emp Code(1) B=Fullname(2) C=Position(3) D=Department(4) E=Project(5)
  // F=Status(6) G=Symptoms(7) H=Diagnosis(8) I=Medicine List(9) J=Amount(10)
  // K=Unit(11) L=Date(12) M=Time(13) N=Checkup by(14) O=Canonical Date (15, yyyy-MM-dd)
  for (let i = 0; i < values.length; i++) {
    const row = values[i]
    const empCode = String(row[0] || '').trim()
    const fullname = String(row[1] || '').trim()
    const department = String(row[3] || '').trim() || 'Unknown'
    const diagnosis = String(row[7] || '').trim() || 'Unknown'
    const medicine = String(row[8] || '').trim() || 'Unknown'
    const amount = Number(row[9] || 0)
    const dateCell = normalizeDateCell(row[14] || row[11])
    if (!dateCell) continue

    const visitIdPart = empCode || fullname || 'UNKNOWN'
    const dayKey = Utilities.formatDate(dateCell, tz, 'yyyy-MM-dd')

    // Monthly counts (skip when using date range filter for speed)
    if (!hasFilterEarly) {
      if (inRange(dateCell, thisMonthStart, now)) {
        const visitKey = visitIdPart + '|' + dayKey
        if (!seenVisitThisMonth[visitKey]) {
          seenVisitThisMonth[visitKey] = true
          thisMonthCount++
          depCountThisMonth[department] = (depCountThisMonth[department] || 0) + 1
          dxCountThisMonth[diagnosis] = (dxCountThisMonth[diagnosis] || 0) + 1
          patientCountThisMonth[fullname] = (patientCountThisMonth[fullname] || 0) + 1
        }
        // ยอดใช้ยารวมเดือนนี้ยังต้องนับทุกแถว
        medAmountThisMonth[medicine] = (medAmountThisMonth[medicine] || 0) + amount
      } else if (inRange(dateCell, lastMonthStart, lastMonthEnd)) {
        const visitKeyLast = visitIdPart + '|' + dayKey
        if (!seenVisitLastMonth[visitKeyLast]) {
          seenVisitLastMonth[visitKeyLast] = true
          lastMonthCount++
        }
      }
    }

    // 15-day series
    if (dateCell >= rangeStart && dateCell <= rangeEnd) {
      const visitKeyWindow = visitIdPart + '|' + dayKey
      if (!seenVisitWindow[visitKeyWindow]) {
        seenVisitWindow[visitKeyWindow] = true
        overallByDay[dayKey] = (overallByDay[dayKey] || 0) + 1

        // Department daily
        if (!byDepartment[department]) byDepartment[department] = {}
        byDepartment[department][dayKey] = (byDepartment[department][dayKey] || 0) + 1

        // Diagnosis daily
        if (!byDiagnosis[diagnosis]) byDiagnosis[diagnosis] = {}
        byDiagnosis[diagnosis][dayKey] = (byDiagnosis[diagnosis][dayKey] || 0) + 1

        // Patient daily
        if (!byPatient[fullname]) byPatient[fullname] = {}
        byPatient[fullname][dayKey] = (byPatient[fullname][dayKey] || 0) + 1
      }

      // Medicine amount daily (ไม่ dedupe, ใช้หน่วยยาทั้งหมด)
      if (!byMedicineAmount[medicine]) byMedicineAmount[medicine] = {}
      byMedicineAmount[medicine][dayKey] = (byMedicineAmount[medicine][dayKey] || 0) + amount
      usageOverallByDay[dayKey] = (usageOverallByDay[dayKey] || 0) + amount
    }
  }

  function topNFromMap(mapObj, n, byAmount) {
    const arr = Object.keys(mapObj).map(k => ({
      name: k,
      value: Number(mapObj[k] || 0)
    }))
    arr.sort((a, b) => b.value - a.value)
    return arr.slice(0, n)
  }

  const topDepartmentsMonth = topNFromMap(depCountThisMonth, 5, false).map(r => ({ name: r.name, count: r.value }))
  const topDiagnosisMonth = topNFromMap(dxCountThisMonth, 5, false).map(r => ({ name: r.name, count: r.value }))
  const topMedicinesMonth = topNFromMap(medAmountThisMonth, 5, true).map(r => ({ name: r.name, amount: r.value }))
  const topFrequentPatientsMonth = topNFromMap(patientCountThisMonth, 5, false).map(r => ({ name: r.name, count: r.value }))

  // Totals for shares
  const totalMedicineAmountThisMonth = Object.keys(medAmountThisMonth).reduce((sum, k) => sum + Number(medAmountThisMonth[k] || 0), 0)

  // For line chart series, select top 3 for each category (this month’s top to keep relevance)
  const hasFilter = payload && (payload.dateFrom || payload.dateTo)

  // For filtered window, compute top lists from window daily maps instead of month
  function topFromDailyMap(mapByName, n, isAmount) {
    const totals = {}
    for (const name in mapByName) {
      const dayMap = mapByName[name] || {}
      let sum = 0
      for (const k of dayKeys) {
        sum += Number(dayMap[k] || 0)
      }
      totals[name] = sum
    }
    const arr = Object.keys(totals).map(k => ({ name: k, value: totals[k] }))
    arr.sort((a, b) => b.value - a.value)
    if (isAmount) {
      return arr.slice(0, n).map(r => ({ name: r.name, amount: r.value }))
    } else {
      return arr.slice(0, n).map(r => ({ name: r.name, count: r.value }))
    }
  }

  const topDepartments = hasFilter
    ? topFromDailyMap(byDepartment, 5, false)
    : topDepartmentsMonth
  const topDiagnosis = hasFilter
    ? topFromDailyMap(byDiagnosis, 5, false)
    : topDiagnosisMonth
  const topMedicines = hasFilter
    ? topFromDailyMap(byMedicineAmount, 5, true)
    : topMedicinesMonth
  const topFrequentPatients = hasFilter
    ? topFromDailyMap(byPatient, 5, false)
    : topFrequentPatientsMonth

  const top3Deps = topDepartments.slice(0, 3).map(t => t.name)
  const top3Dx = topDiagnosis.slice(0, 3).map(t => t.name)
  const top3Patients = topFrequentPatients.slice(0, 3).map(t => t.name)
  const top3Meds = topMedicines.slice(0, 3).map(t => t.name)

  function seriesFromDailyMap(mapByName, names) {
    const out = {}
    for (const n of names) {
      const dayMap = mapByName[n] || {}
      out[n] = dayKeys.map(k => Number(dayMap[k] || 0))
    }
    return out
  }

  // If filtered, reflect totalMedicineAmount as window sum for better UI consistency
  const totalMedicineAmountWindow = dayKeys.reduce((sum, k) => sum + Number(usageOverallByDay[k] || 0), 0)

  // Window visit total (sum of overallByDay)
  const windowVisitTotal = dayKeys.reduce((sum, k) => sum + Number(overallByDay[k] || 0), 0)

  const stats = {
    thisMonthCount: hasFilter ? windowVisitTotal : thisMonthCount,
    lastMonthCount: hasFilter ? 0 : lastMonthCount,
    growthAbs: hasFilter ? windowVisitTotal : (thisMonthCount - lastMonthCount),
    growthPct: hasFilter ? 0 : (lastMonthCount ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0),
    topDepartments,
    topDiagnosis,
    topMedicines,
    topFrequentPatients,
    totalMedicineAmountThisMonth: hasFilter ? totalMedicineAmountWindow : totalMedicineAmountThisMonth,
    daily: {
      dates: dayKeys,
      overall: dayKeys.map(k => Number(overallByDay[k] || 0)),
      usageOverall: dayKeys.map(k => Number(usageOverallByDay[k] || 0)),
      byDepartment: seriesFromDailyMap(byDepartment, top3Deps),
      byDiagnosis: seriesFromDailyMap(byDiagnosis, top3Dx),
      byPatient: seriesFromDailyMap(byPatient, top3Patients),
      byMedicineAmount: seriesFromDailyMap(byMedicineAmount, top3Meds)
    }
  }

  // Cache result for faster subsequent loads within same range
  try {
    cache.put(cacheKey, JSON.stringify(stats), 300)
  } catch (e) {
    // ignore cache errors
  }

  return stats
}

function addMedicine(payload) {
  const name = payload.name
  const unit = payload.unit || ''
  const sku = payload.sku || ''
  const currentStock = Number(payload.current_stock || 0)

  if (!name) {
    throw new Error('ต้องระบุชื่อยา')
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName(MEDICINE_SHEET_NAME)
  if (!sheet) {
    throw new Error('Medicine List sheet ไม่พบ')
  }

  const lastRow = sheet.getLastRow()
  const newRow = lastRow + 1
  
  // บันทึกลงคอลัมน์ A..D (Name, Unit, SKU, Current Stock)
  // ส่วน E, F ปล่อยว่างไว้ตามคำขอ
  sheet.getRange(newRow, 1).setValue(name)
  sheet.getRange(newRow, 2).setValue(unit)
  sheet.getRange(newRow, 3).setValue(sku)
  sheet.getRange(newRow, 4).setValue(currentStock)

  return {
    row: newRow,
    name: name,
    unit: unit,
    sku: sku,
    currentStock: currentStock
  }
}

function getHistoryRows(limit) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName(HISTORY_SHEET_NAME)
  if (!sheet) {
    throw new Error('History sheet ไม่พบ')
  }

  const lastRow = sheet.getLastRow()
  if (lastRow < 2) {
    return []
  }

  const rowCount = Math.min(limit, lastRow - 1)
  const startRow = lastRow - rowCount + 1
  const range = sheet.getRange(startRow, 1, rowCount, 7)
  const values = range.getValues()

  const rows = []
  const tz = Session.getScriptTimeZone() || 'Asia/Bangkok'
  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i]
    let dateValue = row[5]
    let timeValue = row[6]

    let dateText = ''
    let timeText = ''

    if (dateValue instanceof Date) {
      dateText = Utilities.formatDate(dateValue, tz, 'dd/MM/yyyy')
    } else if (dateValue) {
      const s = String(dateValue).trim()
      const d = new Date(s)
      if (!isNaN(d.getTime())) {
        dateText = Utilities.formatDate(d, tz, 'dd/MM/yyyy')
      } else {
        dateText = s
      }
    }

    if (timeValue instanceof Date) {
      timeText = Utilities.formatDate(timeValue, tz, 'HH:mm:ss')
    } else if (timeValue) {
      const s = String(timeValue).trim()
      if (/^\d{2}:\d{2}:\d{2}$/.test(s)) {
        timeText = s
      } else {
        const d = new Date(s)
        if (!isNaN(d.getTime())) {
          timeText = Utilities.formatDate(d, tz, 'HH:mm:ss')
        } else {
          timeText = s
        }
      }
    }

    rows.push({
      id: startRow + i,
      medicine: row[0],
      amount: row[1],
      total: row[2],
      remark: row[3],
      addBy: row[4],
      date: dateText,
      time: timeText
    })
  }

  return rows
}

function getDashboardSnapshot() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const medSheet = ss.getSheetByName(MEDICINE_SHEET_NAME)
  const historySheet = ss.getSheetByName(HISTORY_SHEET_NAME)

  if (!medSheet || !historySheet) {
    throw new Error('Medicine List หรือ History sheet ไม่พบ')
  }

  const lastMedRow = medSheet.getLastRow()
  let totalMedicines = 0
  let totalStock = 0
  let lowStockCount = 0

  if (lastMedRow >= 2) {
    const range = medSheet.getRange(2, 1, lastMedRow - 1, 4) // คอลัมน์ A..D
    const values = range.getValues()
    
    const validRows = values.filter(r => r[0]) // แถวที่มีชื่อยา
    totalMedicines = validRows.length
    totalStock = validRows.reduce((sum, r) => sum + Number(r[3] || 0), 0) // คอลัมน์ D

    const threshold = 10
    lowStockCount = validRows.filter(r => Number(r[3] || 0) > 0 && Number(r[3]) <= threshold).length
  }

  const historyRows = getHistoryRows(5)
  let lastRestockDisplay = '-'
  if (historyRows.length > 0) {
    const last = historyRows[0]
    lastRestockDisplay =
      last.date + ' ' + last.time + ' • ' + last.medicine + ' +' + last.amount
  }

  return {
    totalMedicines: totalMedicines,
    totalStock: totalStock,
    lowStockCount: lowStockCount,
    lastRestockDisplay: lastRestockDisplay,
    lastHistory: historyRows
  }
}

function getDispensingHistory(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName(PATIENTS_SHEET_NAME)
  if (!sheet) throw new Error('Patients sheet ไม่พบ')

  const lastRow = sheet.getLastRow()
  if (lastRow < 2) return { groups: [], totalCount: 0, departments: [] }

  const range = sheet.getRange(2, 1, lastRow - 1, 15) // A..O
  const values = range.getValues()
  const tz = ss.getSpreadsheetTimeZone()

  const search = (payload.search || '').toLowerCase()
  const deptFilter = payload.department || ''
  const dateFrom = payload.dateFrom || ''
  const dateTo = payload.dateTo || ''
  const limit = payload.limit || 15

  const departments = new Set()
  const visits = {} // key: empCode|dateRef

  for (let i = 0; i < values.length; i++) {
    const row = values[i]
    const empCode = String(row[0] || '').trim()
    const fullname = String(row[1] || '').trim()
    const dept = String(row[3] || '').trim()
    const symptoms = String(row[6] || '').trim()
    const diagnosis = String(row[7] || '').trim()
    const medicine = String(row[8] || '').trim()
    const amount = Number(row[9] || 0)
    const unit = String(row[10] || '').trim()
    const checkupBy = String(row[13] || '').trim()

    // จัดการวันที่ (Date Ref - Column O)
    let dateRef = ''
    const dateVal = row[14] || row[11] // Fallback to column L if O is empty
    if (dateVal instanceof Date) {
      dateRef = Utilities.formatDate(dateVal, "GMT+7", 'yyyy-MM-dd')
    } else if (dateVal) {
      // If it's a string, try to parse it. If it's already yyyy-MM-dd, keep it.
      const dateStr = String(dateVal).trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        dateRef = dateStr
      } else {
        const d = new Date(dateVal)
        if (!isNaN(d.getTime())) {
          dateRef = Utilities.formatDate(d, "GMT+7", 'yyyy-MM-dd')
        } else {
          dateRef = dateStr
        }
      }
    }

    // จัดการเวลา (Time - Column M)
    let time = ''
    const timeVal = row[12]
    if (timeVal instanceof Date) {
      time = Utilities.formatDate(timeVal, "GMT+7", 'HH:mm:ss')
    } else if (timeVal) {
      const timeStr = String(timeVal).trim()
      if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
        time = timeStr
      } else {
        const d = new Date(timeVal)
        if (!isNaN(d.getTime())) {
          time = Utilities.formatDate(d, "GMT+7", 'HH:mm:ss')
        } else {
          time = timeStr
        }
      }
    }

    if (dept) departments.add(dept)

    // Filters
    if (deptFilter && dept !== deptFilter) continue
    if (dateFrom && dateRef < dateFrom) continue
    if (dateTo && dateRef > dateTo) continue
    if (search) {
      const match = empCode.toLowerCase().includes(search) || 
                    fullname.toLowerCase().includes(search) || 
                    diagnosis.toLowerCase().includes(search) ||
                    medicine.toLowerCase().includes(search)
      if (!match) continue
    }

    const visitKey = `${empCode || fullname}|${dateRef}`
    if (!visits[visitKey]) {
      visits[visitKey] = {
        empCode,
        fullname,
        position: String(row[2] || '').trim(),
        department: dept,
        project: String(row[4] || '').trim(),
        statusEmp: String(row[5] || '').trim(),
        dateRef,
        time,
        diagnosis,
        symptoms,
        checkupBy,
        medicines: [],
        totalItems: 0
      }
    }

    visits[visitKey].medicines.push({
      name: medicine,
      amount,
      unit
    })
    visits[visitKey].totalItems += amount
  }

  // Convert to array and sort by dateRef desc, then time desc
  const groups = Object.values(visits).sort((a, b) => {
    if (a.dateRef !== b.dateRef) return b.dateRef.localeCompare(a.dateRef)
    return b.time.localeCompare(a.time)
  })

  return {
    groups: groups.slice(0, limit),
    totalCount: groups.length,
    departments: Array.from(departments).sort()
  }
}

function createResponse(obj, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(obj))
  output.setMimeType(ContentService.MimeType.JSON)

  const response = HtmlService.createHtmlOutput()
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }

  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

