# rentflow-manager — 전체 작업 지시서 (Task Brief)

> GitHub: https://github.com/bangdw-hash/rentflow-manager  
> 기준일: 2026-06-14  
> 작성 목적: Claude Code 투입 즉시 실행 가능한 초기화 + 전체 개발 지시서

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | rentflow-manager |
| 목적 | 임대인·임차인 통합 관리 PWA |
| 배포 대상 | GitHub Pages (frontend) + Supabase (backend/DB) |
| 주요 사용자 | 임대인 (소규모 다가구·다세대 건물 관리자) |
| 기술 스택 | React 18 + Vite + Tailwind CSS + Supabase + jsPDF |

---

## 1. 초기 셋업 명령어 (터미널에서 순서대로 실행)

```bash
# 1. 로컬 클론
git clone https://github.com/bangdw-hash/rentflow-manager.git
cd rentflow-manager

# 2. Vite + React 프로젝트 초기화
npm create vite@latest . -- --template react
npm install

# 3. 핵심 패키지 설치
npm install @supabase/supabase-js
npm install react-router-dom
npm install @tailwindcss/vite tailwindcss
npm install jspdf html2canvas
npm install react-hook-form
npm install date-fns
npm install lucide-react
npm install react-hot-toast

# 4. Tailwind 초기화
npx tailwindcss init -p

# 5. GitHub Pages 배포 패키지
npm install --save-dev gh-pages
```

---

## 2. 폴더 구조 (전체)

```
rentflow-manager/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx
│   │   │   └── Toast.jsx
│   │   ├── properties/
│   │   │   ├── PropertyCard.jsx
│   │   │   ├── PropertyForm.jsx
│   │   │   └── PropertyList.jsx
│   │   ├── tenants/
│   │   │   ├── TenantCard.jsx
│   │   │   ├── TenantForm.jsx
│   │   │   └── OcrScanner.jsx
│   │   ├── billing/
│   │   │   ├── BillingForm.jsx
│   │   │   ├── WaterCalc.jsx
│   │   │   └── BillingPdf.jsx
│   │   └── notifications/
│   │       ├── KakaoSender.jsx
│   │       └── NotifLog.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Properties.jsx
│   │   ├── Tenants.jsx
│   │   ├── Contracts.jsx
│   │   ├── Billing.jsx
│   │   ├── Notifications.jsx
│   │   └── Reports.jsx
│   ├── hooks/
│   │   ├── useProperties.js
│   │   ├── useTenants.js
│   │   └── useBilling.js
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── kakao.js
│   │   ├── ocr.js
│   │   └── pdfgen.js
│   ├── utils/
│   │   ├── waterCalc.js
│   │   ├── dateUtils.js
│   │   └── formatters.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.local              ← Supabase 키 (gitignore)
├── .env.example
├── .gitignore
├── vite.config.js
├── tailwind.config.js
├── package.json
├── CLAUDE.md               ← Claude Code 작업 지침
└── README.md
```

---

## 3. CLAUDE.md (Claude Code 전용 작업 지침)

```markdown
# CLAUDE.md — rentflow-manager

## 프로젝트 목적
소규모 다가구/다세대 건물을 보유한 임대인이 임차인, 계약, 관리비, 수도요금,
카카오 알림을 한 곳에서 관리할 수 있는 PWA.

## 기술 스택
- Frontend: React 18 + Vite + Tailwind CSS
- Backend: Supabase (DB + Auth + Storage)
- 배포: GitHub Pages (vite build → gh-pages)
- OCR: Naver Clova OCR API (환경변수: VITE_CLOVA_OCR_SECRET)
- 알림: 카카오 알림톡 API (환경변수: VITE_KAKAO_API_KEY)
- PDF: jsPDF + html2canvas

## 환경변수 (.env.local)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CLOVA_OCR_SECRET=
VITE_CLOVA_OCR_URL=
VITE_KAKAO_API_KEY=

## 코드 원칙
1. 모든 컴포넌트는 함수형 + React Hooks 사용
2. Tailwind만 사용, 인라인 style 금지
3. Supabase 호출은 반드시 src/lib/supabase.js 경유
4. 에러는 react-hot-toast로 사용자에게 표시
5. 날짜 처리는 date-fns 사용 (한국 로케일 적용)
6. 금액 표기: toLocaleString('ko-KR') 적용

## 배포 명령
npm run build && npm run deploy

## DB 스키마 위치
/database/schema.sql — 이 파일 기준으로 Supabase 테이블 생성
```

---

## 4. Supabase DB 스키마 (database/schema.sql)

```sql
-- =============================================
-- rentflow-manager Supabase Schema
-- =============================================

-- 1. 매물(건물/호수) 테이블
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- 건물명 또는 호수명 (예: 101호)
  address TEXT NOT NULL,
  floor TEXT,
  area_sqm NUMERIC(6,2),                -- 전용면적 (㎡)
  property_type TEXT DEFAULT 'apartment', -- apartment / office / store
  status TEXT DEFAULT 'vacant',          -- vacant / occupied / expiring
  monthly_rent INTEGER,                  -- 월세 (원)
  deposit INTEGER,                       -- 보증금 (원)
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 임차인 테이블
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_number TEXT,                        -- 주민번호 (암호화 저장 권장)
  email TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 계약 테이블
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  deposit INTEGER NOT NULL,
  monthly_rent INTEGER NOT NULL,
  payment_day INTEGER DEFAULT 1,         -- 월세 납부일
  contract_file_url TEXT,               -- Supabase Storage 파일 URL
  ocr_raw_data JSONB,                   -- OCR 추출 원본 데이터
  status TEXT DEFAULT 'active',          -- active / expired / terminated
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 관리비 청구 테이블
CREATE TABLE utility_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  bill_year INTEGER NOT NULL,
  bill_month INTEGER NOT NULL,
  water_total INTEGER DEFAULT 0,         -- 수도요금 전체 (원)
  water_usage_total NUMERIC(8,2),       -- 수도 전체 사용량 (㎥)
  water_usage_unit NUMERIC(8,2),        -- 세대별 수도 사용량 (㎥)
  electric_common INTEGER DEFAULT 0,    -- 공용전기 (원)
  cleaning_fee INTEGER DEFAULT 0,       -- 청소비 (원)
  elevator_fee INTEGER DEFAULT 0,       -- 승강기 유지비 (원)
  etc_fee INTEGER DEFAULT 0,            -- 기타 관리비 (원)
  total_fee INTEGER GENERATED ALWAYS AS (
    water_total + electric_common + cleaning_fee + elevator_fee + etc_fee
  ) STORED,
  allocation_method TEXT DEFAULT 'area', -- area (면적비) / usage (사용량)
  is_finalized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, bill_year, bill_month)
);

-- 5. 납부 현황 테이블
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL,            -- rent / utility / deposit
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pending',         -- pending / paid / overdue
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 알림 발송 이력 테이블
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  notif_type TEXT NOT NULL,              -- billing / expiry / overdue
  channel TEXT DEFAULT 'kakao',          -- kakao / sms / email
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',         -- pending / sent / failed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 인덱스
CREATE INDEX idx_contracts_end ON contracts(contract_end);
CREATE INDEX idx_payments_status ON payments(status, due_date);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
```

---

## 5. 핵심 소스 파일

### 5-1. src/lib/supabase.js

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

---

### 5-2. src/utils/waterCalc.js (수도요금 공동 분산 계산)

```javascript
/**
 * 수도요금 세대별 배분 계산 유틸리티
 * @param {number} totalBill - 전체 수도요금 (원)
 * @param {number} totalUsage - 전체 사용량 (㎥)
 * @param {Array} units - 세대 배열 [{ id, area, usage }]
 * @param {string} method - 'area' (면적비율) | 'usage' (사용량 비율)
 * @returns {Array} 세대별 청구액 배열
 */
export function calcWaterBill(totalBill, totalUsage, units, method = 'area') {
  if (!units || units.length === 0) return []

  const unitRate = totalUsage > 0 ? totalBill / totalUsage : 0

  return units.map(unit => {
    let share = 0

    if (method === 'usage') {
      // 개별 계량기 사용량 기준
      share = totalUsage > 0 ? (unit.usage / totalUsage) * totalBill : 0
    } else {
      // 면적 비율 기준 (개별 계량기 없을 때 대체)
      const totalArea = units.reduce((sum, u) => sum + (u.area || 0), 0)
      share = totalArea > 0 ? (unit.area / totalArea) * totalBill : 0
    }

    return {
      id: unit.id,
      name: unit.name,
      area: unit.area,
      usage: unit.usage || 0,
      unitRate: Math.round(unitRate),
      billedAmount: Math.round(share),
      method,
    }
  })
}

/**
 * 전월 대비 이상 사용량 감지 (누수 의심)
 * @param {number} current - 이번달 사용량
 * @param {number} prev - 전월 사용량
 * @param {number} threshold - 경보 기준 배율 (기본 2배)
 */
export function detectLeakage(current, prev, threshold = 2) {
  if (!prev || prev === 0) return false
  return current >= prev * threshold
}
```

---

### 5-3. src/lib/kakao.js (카카오 알림톡 발송)

```javascript
/**
 * 카카오 알림톡 발송 모듈
 * 카카오 비즈니스 채널 등록 및 발신 프로필 키 발급 필요
 * API 문서: https://developers.kakao.com/docs/latest/ko/message/rest-api
 */

const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_API_KEY

/**
 * 관리비 청구 메시지 발송
 */
export async function sendBillingNotice({ phone, tenantName, month, amount, dueDate }) {
  const message = `[rentflow] ${tenantName}님\n\n` +
    `${month}월 관리비 청구 안내입니다.\n` +
    `청구금액: ${amount.toLocaleString('ko-KR')}원\n` +
    `납부기한: ${dueDate}\n\n` +
    `문의: 임대인 연락처로 연락 바랍니다.`

  return await sendKakaoMessage({ phone, message })
}

/**
 * 계약 만료 안내 메시지 발송
 */
export async function sendExpiryNotice({ phone, tenantName, expiryDate, dday }) {
  const message = `[rentflow] ${tenantName}님\n\n` +
    `임대차 계약 만료 안내입니다.\n` +
    `만료일: ${expiryDate} (D-${dday})\n\n` +
    `계약 갱신 또는 퇴거 관련 사항을\n` +
    `임대인에게 연락 바랍니다.`

  return await sendKakaoMessage({ phone, message })
}

/**
 * 미납 안내 메시지 발송
 */
export async function sendOverdueNotice({ phone, tenantName, amount, overdueDays }) {
  const message = `[rentflow] ${tenantName}님\n\n` +
    `미납 관리비 안내입니다.\n` +
    `미납금액: ${amount.toLocaleString('ko-KR')}원\n` +
    `연체일수: ${overdueDays}일\n\n` +
    `조속한 납부를 부탁드립니다.`

  return await sendKakaoMessage({ phone, message })
}

/**
 * 카카오 API 실제 호출 (서버 환경 필요 시 Supabase Edge Function으로 이동)
 */
async function sendKakaoMessage({ phone, message }) {
  try {
    // ※ CORS 제한으로 프론트엔드 직접 호출 불가 시
    //   Supabase Edge Function 또는 별도 프록시 서버 경유 필요
    const response = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `KakaoAK ${KAKAO_API_KEY}`,
      },
      body: new URLSearchParams({
        template_object: JSON.stringify({
          object_type: 'text',
          text: message,
          link: { web_url: 'https://bangdw-hash.github.io/rentflow-manager' },
        }),
      }),
    })

    const data = await response.json()
    return { success: data.result_code === 0, data }
  } catch (error) {
    console.error('카카오 알림 발송 실패:', error)
    return { success: false, error }
  }
}
```

---

### 5-4. src/lib/ocr.js (계약서 OCR 스캔)

```javascript
/**
 * Naver Clova OCR 연동 모듈
 * API 문서: https://api.ncloud-docs.com/docs/ai-application-service-ocr
 */

const CLOVA_OCR_URL = import.meta.env.VITE_CLOVA_OCR_URL
const CLOVA_OCR_SECRET = import.meta.env.VITE_CLOVA_OCR_SECRET

/**
 * 이미지/PDF → OCR 텍스트 추출
 * @param {File} file - 계약서 이미지 또는 PDF 파일
 * @returns {Object} 추출된 계약 정보
 */
export async function scanContract(file) {
  const base64 = await fileToBase64(file)
  const ext = file.name.split('.').pop().toLowerCase()

  const requestBody = {
    version: 'V2',
    requestId: Date.now().toString(),
    timestamp: Date.now(),
    images: [{
      format: ext === 'pdf' ? 'pdf' : 'jpg',
      name: 'contract',
      data: base64,
    }],
  }

  const response = await fetch(CLOVA_OCR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OCR-SECRET': CLOVA_OCR_SECRET,
    },
    body: JSON.stringify(requestBody),
  })

  const result = await response.json()

  // OCR 결과 → 계약 정보 파싱
  return parseContractData(result)
}

/**
 * OCR 원문 텍스트에서 계약 핵심 정보 추출
 */
function parseContractData(ocrResult) {
  const allText = ocrResult.images?.[0]?.fields
    ?.map(f => f.inferText)
    ?.join(' ') || ''

  // 정규식 기반 파싱 (한국 표준 임대차계약서 기준)
  const depositMatch = allText.match(/보증금[^\d]*(\d[\d,]+)원/)
  const rentMatch = allText.match(/월세[^\d]*(\d[\d,]+)원/)
  const startMatch = allText.match(/(\d{4})[년.\s]+(\d{1,2})[월.\s]+(\d{1,2})일.*부터/)
  const endMatch = allText.match(/(\d{4})[년.\s]+(\d{1,2})[월.\s]+(\d{1,2})일.*까지/)

  return {
    deposit: depositMatch ? parseInt(depositMatch[1].replace(/,/g, '')) : null,
    monthly_rent: rentMatch ? parseInt(rentMatch[1].replace(/,/g, '')) : null,
    contract_start: startMatch
      ? `${startMatch[1]}-${startMatch[2].padStart(2,'0')}-${startMatch[3].padStart(2,'0')}`
      : null,
    contract_end: endMatch
      ? `${endMatch[1]}-${endMatch[2].padStart(2,'0')}-${endMatch[3].padStart(2,'0')}`
      : null,
    raw_text: allText,
    ocr_raw: ocrResult,
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

---

### 5-5. src/lib/pdfgen.js (관리비 정산서 PDF 생성)

```javascript
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * 관리비 정산서 PDF 생성
 * @param {string} elementId - PDF로 변환할 DOM element ID
 * @param {string} filename - 저장 파일명
 */
export async function generateBillingPdf(elementId, filename) {
  const element = document.getElementById(elementId)
  if (!element) throw new Error('PDF 대상 요소를 찾을 수 없습니다.')

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
  pdf.save(filename || `관리비정산서_${new Date().toISOString().slice(0,7)}.pdf`)
}
```

---

### 5-6. vite.config.js

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/rentflow-manager/',  // GitHub Pages 배포 경로
})
```

---

### 5-7. package.json (scripts 섹션)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "gh-pages -d dist",
    "predeploy": "npm run build"
  },
  "homepage": "https://bangdw-hash.github.io/rentflow-manager"
}
```

---

### 5-8. .env.example

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_CLOVA_OCR_SECRET=your-clova-secret
VITE_CLOVA_OCR_URL=https://xxxx.apigw.ntruss.com/custom/v1/xxxxx/general
VITE_KAKAO_API_KEY=your-kakao-rest-api-key
```

---

### 5-9. .gitignore

```
node_modules/
dist/
.env.local
.env.*.local
*.log
.DS_Store
```

---

## 6. App.jsx (라우팅 설정)

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/common/Sidebar'
import Dashboard from './pages/Dashboard'
import Properties from './pages/Properties'
import Tenants from './pages/Tenants'
import Contracts from './pages/Contracts'
import Billing from './pages/Billing'
import Notifications from './pages/Notifications'
import Reports from './pages/Reports'

export default function App() {
  return (
    <BrowserRouter basename="/rentflow-manager">
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
      <Toaster position="top-right" />
    </BrowserRouter>
  )
}
```

---

## 7. 개발 Phase 순서 (Claude Code 투입 순서)

### Phase 1 — 기반 구조 (Day 1~2)
```
- [ ] 위 5-6, 5-7, 5-8, 5-9 파일 생성
- [ ] npm install 실행
- [ ] Supabase 프로젝트 생성 → schema.sql 실행
- [ ] .env.local 작성
- [ ] App.jsx + Sidebar.jsx 기본 레이아웃 완성
- [ ] GitHub Actions 배포 설정
```

### Phase 2 — 매물·임차인 관리 (Day 3~5)
```
- [ ] Properties 페이지 (목록 + 등록 폼)
- [ ] Tenants 페이지 (목록 + 등록 폼)
- [ ] Contracts 페이지 (계약 등록)
- [ ] OcrScanner.jsx (파일 업로드 → Clova OCR 호출 → 폼 자동 입력)
- [ ] Supabase Storage 연동 (계약서 파일 업로드)
```

### Phase 3 — 관리비·수도 계산 (Day 6~8)
```
- [ ] Billing 페이지 (월별 항목 입력)
- [ ] WaterCalc.jsx (수도요금 공동 분산 계산 UI)
- [ ] waterCalc.js 유틸 연동
- [ ] 누수 이상 감지 알림
- [ ] 정산서 미리보기 컴포넌트
```

### Phase 4 — 카카오 알림 (Day 9~10)
```
- [ ] Notifications 페이지
- [ ] KakaoSender.jsx (발송 버튼 + 미리보기)
- [ ] 자동 발송 스케줄 설정 UI
- [ ] 발송 이력 로그 테이블
```

### Phase 5 — PDF·보고서 (Day 11~12)
```
- [ ] BillingPdf.jsx (정산서 인쇄 레이아웃)
- [ ] pdfgen.js 연동
- [ ] Reports 페이지 (수익 차트 + 공실률)
- [ ] 엑셀 내보내기 (SheetJS)
```

---

## 8. GitHub Actions 자동 배포 설정 (.github/workflows/deploy.yml)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_CLOVA_OCR_SECRET: ${{ secrets.VITE_CLOVA_OCR_SECRET }}
          VITE_CLOVA_OCR_URL: ${{ secrets.VITE_CLOVA_OCR_URL }}
          VITE_KAKAO_API_KEY: ${{ secrets.VITE_KAKAO_API_KEY }}

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 9. README.md

```markdown
# rentflow-manager

> 임대인·임차인 통합 관리 PWA

## 주요 기능
- 매물(건물·호수) 등록 및 상태 관리
- 임차인 등록 + 계약서 OCR 자동 파싱
- 관리비 정산 (수도요금 공동 분산 포함)
- 카카오 알림톡 자동 발송
- 계약 만료·미납 D-day 알림
- 관리비 정산서 PDF 출력

## 기술 스택
React 18 · Vite · Tailwind CSS · Supabase · Clova OCR · jsPDF

## 배포
https://bangdw-hash.github.io/rentflow-manager

## 로컬 실행
cp .env.example .env.local   # 환경변수 입력
npm install
npm run dev

## 배포
npm run deploy
```

---

## 10. GitHub Secrets 등록 목록 (Settings → Secrets → Actions)

| Secret 이름 | 설명 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_CLOVA_OCR_SECRET` | Naver Clova OCR 시크릿 |
| `VITE_CLOVA_OCR_URL` | Clova OCR API 엔드포인트 |
| `VITE_KAKAO_API_KEY` | 카카오 REST API 키 |

---

*작업 지시서 끝 — Phase 1부터 순서대로 Claude Code에 투입*
