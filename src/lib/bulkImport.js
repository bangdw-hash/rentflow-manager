import * as XLSX from 'xlsx'

// 엑셀 양식(.xlsx) 다운로드: 헤더 + 예시행
export function downloadXlsxTemplate(filename, headers, examples = []) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples])
  ws['!cols'] = headers.map(() => ({ wch: 16 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '양식')
  XLSX.writeFile(wb, filename)
}

// 업로드된 엑셀 → 행 객체 배열(헤더 기준)
export async function parseSheet(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

// 셀 값 헬퍼
export const cellStr = (v) => {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}
export const cellNum = (v) => {
  if (v === '' || v == null) return null
  const n = Number(String(v).replace(/[, 원㎡]/g, ''))
  return Number.isFinite(n) ? n : null
}
