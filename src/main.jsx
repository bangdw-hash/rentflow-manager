import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'pretendard/dist/web/variable/pretendardvariable.css'
import './index.css'
import App from './App.jsx'
import { applyFont, loadFontPref } from './lib/applyFont'

// 저장된 서체 선택을 렌더 전에 적용
applyFont(loadFontPref())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: 서비스워커 등록 (오프라인 지원 + 홈 화면 설치)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {})
  })
}
