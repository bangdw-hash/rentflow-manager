import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { formatMoney, getDday } from '../utils/formatters'

const THIS_YEAR = new Date().getFullYear()

/** 연도 내 각 월에 유효한 계약의 월세를 합산해 월별 임대수입을 추정 */
function monthlyProjection(contracts, year) {
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: 0 }))
  contracts.forEach((c) => {
    if (!c.contract_start || !c.contract_end || !c.monthly_rent) return
    const start = new Date(c.contract_start)
    const end = new Date(c.contract_end)
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1)
      const mEnd = new Date(year, m + 1, 0)
      if (start <= mEnd && end >= mStart) months[m].amount += c.monthly_rent
    }
  })
  return months
}

export default function Insights() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [contracts, setContracts] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [taxYear, setTaxYear] = useState(THIS_YEAR)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [propRes, conRes, payRes] = await Promise.all([
      supabase.from('properties').select('id, name, status, monthly_rent, deposit'),
      supabase
        .from('contracts')
        .select('*, properties(name), tenants(name)')
        .order('contract_end', { ascending: true }),
      supabase.from('payments').select('amount, status, due_date'),
    ])
    setProperties(propRes.data || [])
    setContracts(conRes.data || [])
    setPayments(payRes.data || [])
    setLoading(false)
  }

  const active = useMemo(
    () => contracts.filter((c) => c.status === 'active'),
    [contracts]
  )

  const kpi = useMemo(() => {
    const monthly = active.reduce((s, c) => s + (c.monthly_rent || 0), 0)
    const total = properties.length || 0
    const occupied = properties.filter((p) => p.status === 'occupied').length
    const overdue = payments
      .filter((p) => p.status === 'overdue')
      .reduce((s, p) => s + (p.amount || 0), 0)
    return {
      monthly,
      annual: monthly * 12,
      occupancy: total ? Math.round((occupied / total) * 100) : 0,
      occupied,
      total,
      overdue,
    }
  }, [active, properties, payments])

  const tasks = useMemo(() => {
    const list = []
    const expiring = active.filter((c) => {
      const d = getDday(c.contract_end)
      return d >= 0 && d <= 30
    })
    if (expiring.length) {
      list.push({
        tone: 'amber',
        title: `계약 만료 임박 ${expiring.length}건`,
        desc: `30일 이내 만료 — 갱신/퇴거 협의가 필요합니다.`,
        cta: '계약 관리',
        to: '/contracts',
      })
    }
    const overdueCnt = payments.filter((p) => p.status === 'overdue').length
    if (overdueCnt) {
      list.push({
        tone: 'red',
        title: `미납 ${overdueCnt}건`,
        desc: `미납 임차인에게 알림을 발송하세요.`,
        cta: '알림 발송',
        to: '/notifications',
      })
    }
    const vacant = properties.filter((p) => p.status === 'vacant').length
    if (vacant) {
      list.push({
        tone: 'blue',
        title: `공실 ${vacant}호`,
        desc: `공실 손실을 줄이려면 빠른 임차인 매칭이 필요합니다.`,
        cta: '매물 관리',
        to: '/properties',
      })
    }
    return list
  }, [active, payments, properties])

  const yields = useMemo(() => {
    return properties
      .map((p) => {
        const c = active.find((x) => x.property_id === p.id)
        const rent = c?.monthly_rent ?? p.monthly_rent ?? 0
        const deposit = c?.deposit ?? p.deposit ?? 0
        const annualRent = rent * 12
        const pct = deposit > 0 ? (annualRent / deposit) * 100 : null
        return { id: p.id, name: p.name, rent, deposit, annualRent, pct, occupied: !!c }
      })
      .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))
  }, [properties, active])

  const taxMonths = useMemo(
    () => monthlyProjection(contracts, taxYear),
    [contracts, taxYear]
  )
  const taxTotal = taxMonths.reduce((s, m) => s + m.amount, 0)
  const depositSum = useMemo(
    () => active.reduce((s, c) => s + (c.deposit || 0), 0),
    [active]
  )

  function exportTaxExcel() {
    if (taxTotal === 0) {
      toast.error('해당 연도에 계약 기준 임대수입이 없습니다.')
      return
    }
    const rows = taxMonths.map((m) => ({
      연도: taxYear,
      월: `${m.month}월`,
      '임대수입(원)': m.amount,
    }))
    rows.push({ 연도: taxYear, 월: '합계', '임대수입(원)': taxTotal })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${taxYear}년 임대소득`)
    XLSX.writeFile(wb, `임대소득리포트_${taxYear}.xlsx`)
    toast.success('세무용 임대소득 리포트를 내보냈습니다.')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">인사이트</h1>
        <p className="text-sm text-gray-500 mt-1">
          임대 경영과 세무를 한눈에 — 현금흐름, 할 일, 수익률, 연간 임대소득.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard accent="bg-blue-500" label="월 예상 임대수입" value={formatMoney(kpi.monthly)} />
        <KpiCard accent="bg-indigo-500" label="연 환산 수입" value={formatMoney(kpi.annual)} />
        <KpiCard
          accent="bg-emerald-500"
          label="점유율"
          value={`${kpi.occupancy}%`}
          sub={`${kpi.occupied}/${kpi.total}호`}
        />
        <KpiCard
          accent="bg-rose-500"
          label="미납 합계"
          value={formatMoney(kpi.overdue)}
          danger={kpi.overdue > 0}
        />
      </div>

      {/* 이번 달 할 일 */}
      <section className="rf-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">이번 달 할 일</h2>
          <span className="text-xs text-gray-400">{tasks.length}건</span>
        </div>
        {tasks.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-3xl mb-1">✅</p>
            <p className="text-sm text-gray-500">처리할 항목이 없습니다. 모두 정상입니다.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {tasks.map((t, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 rounded-xl border-l-4 ${TONE[t.tone].border} ${TONE[t.tone].bg} p-3.5`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${TONE[t.tone].text}`}>{t.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                </div>
                <button
                  onClick={() => navigate(t.to)}
                  className="shrink-0 text-sm font-medium text-gray-700 bg-white ring-1 ring-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                >
                  {t.cta} →
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 매물별 수익률 */}
      <section className="rf-card p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">매물별 수익률</h2>
        <p className="text-xs text-gray-400 mb-4">보증금 대비 연 임대수입 비율 (연 월세 ÷ 보증금)</p>
        {yields.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 매물이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px] tnum">
              <thead>
                <tr className="text-gray-400 border-b">
                  <th className="text-left py-2 font-medium">매물</th>
                  <th className="text-right font-medium">월세</th>
                  <th className="text-right font-medium">보증금</th>
                  <th className="text-right font-medium">연 임대수입</th>
                  <th className="text-right font-medium">연 수익률</th>
                </tr>
              </thead>
              <tbody>
                {yields.map((y) => (
                  <tr key={y.id} className="border-b last:border-0">
                    <td className="py-2.5 text-gray-800">
                      {y.name}
                      {!y.occupied && (
                        <span className="ml-2 text-[11px] text-yellow-600 bg-yellow-50 rounded px-1.5 py-0.5">
                          공실
                        </span>
                      )}
                    </td>
                    <td className="text-right text-gray-600">{formatMoney(y.rent)}</td>
                    <td className="text-right text-gray-600">{formatMoney(y.deposit)}</td>
                    <td className="text-right text-gray-800 font-medium">{formatMoney(y.annualRent)}</td>
                    <td className="text-right font-semibold text-blue-600">
                      {y.pct == null ? '-' : `${y.pct.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 세무용 연간 임대소득 리포트 */}
      <section className="rf-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">세무용 연간 임대소득 리포트</h2>
            <p className="text-xs text-gray-400 mt-0.5">계약 기준 월별 임대수입 추정 — 종합소득세 신고 참고용</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(Number(e.target.value))}
              className="rf-input w-28"
            >
              {[THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2].map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <button onClick={exportTaxExcel} className="rf-btn-primary">
              엑셀 내보내기
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <SummaryBox label={`${taxYear}년 총 임대소득(추정)`} value={formatMoney(taxTotal)} strong />
          <SummaryBox label="현재 보증금 합계" value={formatMoney(depositSum)} />
          <SummaryBox label="월 평균(추정)" value={formatMoney(Math.round(taxTotal / 12))} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px] tnum">
            <thead>
              <tr className="text-gray-400 border-b">
                {taxMonths.map((m) => (
                  <th key={m.month} className="text-right font-medium py-2 px-2">{m.month}월</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {taxMonths.map((m) => (
                  <td key={m.month} className="text-right px-2 py-2.5 text-gray-700">
                    {m.amount ? (m.amount / 10000).toLocaleString('ko-KR') : '-'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-gray-400 mt-2">단위: 만원</p>
        </div>

        <p className="text-xs text-gray-500 mt-4 leading-relaxed bg-gray-50 rounded-xl p-3">
          ※ 보증금 합계가 일정 기준(주택 임대의 경우 3억원)을 초과하면 <b>간주임대료</b>가 임대소득에
          가산될 수 있습니다. 실제 신고 금액은 실수령 내역·필요경비·세무 전문가 확인을 따르세요.
        </p>
      </section>
    </div>
  )
}

const TONE = {
  amber: { border: 'border-amber-400', bg: 'bg-amber-50/60', text: 'text-amber-700' },
  red: { border: 'border-rose-400', bg: 'bg-rose-50/60', text: 'text-rose-700' },
  blue: { border: 'border-blue-400', bg: 'bg-blue-50/60', text: 'text-blue-700' },
}

function KpiCard({ accent, label, value, sub, danger }) {
  return (
    <div className="rf-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${accent}`} />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className={`text-xl font-bold tnum ${danger ? 'text-rose-600' : 'text-gray-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function SummaryBox({ label, value, strong }) {
  return (
    <div className={`rounded-xl p-3.5 ${strong ? 'bg-blue-50' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-bold tnum ${strong ? 'text-blue-700 text-lg' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}
