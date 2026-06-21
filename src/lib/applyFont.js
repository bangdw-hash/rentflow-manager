// 서체 선택/업로드 적용 (클라이언트 사이드, localStorage 저장)
const KEY = 'rf_font'

export const FONT_OPTIONS = [
  { id: 'pretendard', label: 'Pretendard (기본)', stack: `"Pretendard Variable", Pretendard, system-ui, sans-serif`, google: null },
  { id: 'noto', label: '본고딕 · Noto Sans KR', stack: `"Noto Sans KR", "Pretendard Variable", sans-serif`, google: 'Noto+Sans+KR:wght@300;400;500;700' },
  { id: 'ibm', label: 'IBM Plex Sans KR', stack: `"IBM Plex Sans KR", "Pretendard Variable", sans-serif`, google: 'IBM+Plex+Sans+KR:wght@400;500;600;700' },
  { id: 'gowun', label: '고운돋움 · Gowun Dodum', stack: `"Gowun Dodum", "Pretendard Variable", sans-serif`, google: 'Gowun+Dodum' },
  { id: 'nanum', label: '나눔고딕 · Nanum Gothic', stack: `"Nanum Gothic", "Pretendard Variable", sans-serif`, google: 'Nanum+Gothic:wght@400;700;800' },
  { id: 'songmyung', label: '명조 · Song Myung', stack: `"Song Myung", "Pretendard Variable", serif`, google: 'Song+Myung' },
]

export function loadFontPref() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}
export function saveFontPref(pref) {
  try { localStorage.setItem(KEY, JSON.stringify(pref)); return true } catch { return false }
}
export function clearFontPref() { localStorage.removeItem(KEY) }

function ensureGoogle(googleParam) {
  if (!googleParam) return
  let link = document.getElementById('rf-google-font')
  if (!link) {
    link = document.createElement('link')
    link.id = 'rf-google-font'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  link.href = `https://fonts.googleapis.com/css2?family=${googleParam}&display=swap`
}

function applyCustom(dataUrl) {
  let st = document.getElementById('rf-custom-font')
  if (!st) {
    st = document.createElement('style')
    st.id = 'rf-custom-font'
    document.head.appendChild(st)
  }
  st.textContent = `@font-face{font-family:'RFUserFont';src:url(${dataUrl});font-display:swap;}`
}

export function applyFont(pref) {
  const root = document.documentElement
  if (!pref || pref.id === 'pretendard') {
    root.style.removeProperty('--font-sans')
    return
  }
  if (pref.id === 'custom' && pref.dataUrl) {
    applyCustom(pref.dataUrl)
    root.style.setProperty('--font-sans', `'RFUserFont', "Pretendard Variable", system-ui, sans-serif`)
    return
  }
  const opt = FONT_OPTIONS.find((o) => o.id === pref.id)
  if (!opt) { root.style.removeProperty('--font-sans'); return }
  ensureGoogle(opt.google)
  root.style.setProperty('--font-sans', opt.stack)
}
