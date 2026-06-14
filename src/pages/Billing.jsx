import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { calcWaterBill, detectLeakage } from '../utils/waterCalc'
import { generateBillingPdf } from '../lib/pdfgen'
import { formatMoney } from '../utils/formatters'
import { PageHeader, Card, Button, Field, inputClass } from '../components/common/ui'

const now = new Date()
const cellCls = 'w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200'

export default function Billing() {
  const [tab, setTab] = useState('fees')
  const [properties, setProperties] = useState([])
  const [fees, setFees] = useState({
    property_id: '', bill_year: now.getFullYear(), bill_month: now.getMonth() + 1,
    water_total: 0, electric_common: 0, cleaning_fee: 0, elevator_fee: 0, etc_fee: 0,
  })
  const [waterTotal, setWaterTotal] = useState(0)
  const [usageTotal, setUsageTotal] = useState(0)
  const [method, setMethod] = useState('area')
  const [units, setUnits] = useState([{ id: 1, name: '101호', area: 0, usage: 0, prevUsage: 0 }])
  const [result, setResult] = useState([])

  useEffect(() => {
    supabase.from('properties').select('id, name').order('name').then(({ data }) => setProperties(data || []))
  }, [])

  const feeTotal = Number(fees.water_total) + Number(fees.electric_common) + Number(fees.cleaning_fee) + Number(fees.elevator_fee) + Number(fees.etc_fee)

  async function saveFees() {
    if (!fees.property_id) { toast.error('매물을 선택하세요.'); return }
    const payload = {
      property_id: fees.property_id, bill_year: Number(fees.bill_year), bill_month: Number(fees.bill_month),
      water_total: Number(fees.water_total), electric_common: Number(fees.electric_common),
      cleaning_fee: Number(fees.cleaning_fee), elevator_fee: Number(fees.elevator_fee),
      etc_fee: Number(fees.etc_fee), allocation_method: method,
    }
    const { error } = await supabase.from('utility_bills').upsert(payload, { onConflict: 'property_id,bill_year,bill_month' })
    if (error) { toast.error('저장 실패: ' + error.message); return }
    toast.success('관리비 항목이 저장되었습니다.')
  }

  function updateUnit(idx, key, value) { setUnits(prev => prev.map((u, i) => i === idx ? { ...u, [key]: value } : u)) }
  function addUnit() { setUnits(prev => [...prev, { id: Date.now(), name: `${prev.length + 1}호`, area: 0, usage: 0, prevUsage: 0 }]) }
  function removeUnit(idx) { setUnits(prev => prev.filter((_, i) => i !== idx)) }

  function calculate() {
    const parsed = units.map(u => ({ ...u, area: Number(u.area), usage: Number(u.usage) }))
    const calc = calcWaterBill(Number(waterTotal), Number(usageTotal), parsed, method)
    const withLeak = calc.map((c, i) => ({ ...c, leak: detectLeakage(Number(units[i].usage), Number(units[i].prevUsage)) }))
    setResult(withLeak)
    const leaks = withLeak.filter(r => r.leak)
    if (leaks.length > 0) toast.error(`⚠️ 누수 의심 ${leaks.length}건 (전월 대비 2배 초과)`)
  }

  async function downloadPdf() {
    try {
      await generateBillingPdf('billing-preview', `수도정산서_${now.getFullYear()}-${now.getMonth() + 1}.pdf`)
      toast.success('PDF가 저장되었습니다.')
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="관리비 정산" subtitle="월별 관리비 입력과 수도요금 공동 분산 계산을 한 곳에서." />

      <div className="inline-flex p-1 bg-gray-100 rounded-xl mb-5">
        <TabBtn active={tab === 'fees'} onClick={() => setTab('fees')}>관리비 항목</TabBtn>
        <TabBtn active={tab === 'water'} onClick={() => setTab('water')}>수도요금 공동 분산</TabBtn>
      </div>

      {tab === 'fees' && (
        <Card className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Field label="매물">
              <select value={fees.property_id} onChange={e => setFees({ ...fees, property_id: e.target.value })} className={inputClass}>
                <option value="">선택</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="연도"><input type="number" value={fees.bill_year} onChange={e => setFees({ ...fees, bill_year: e.target.value })} className={inputClass} /></Field>
            <Field label="월"><input type="number" min="1" max="12" value={fees.bill_month} onChange={e => setFees({ ...fees, bill_month: e.target.value })} className={inputClass} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="수도요금(원)"><input type="number" value={fees.water_total} onChange={e => setFees({ ...fees, water_total: e.target.value })} className={inputClass} /></Field>
            <Field label="공용전기(원)"><input type="number" value={fees.electric_common} onChange={e => setFees({ ...fees, electric_common: e.target.value })} className={inputClass} /></Field>
            <Field label="청소비(원)"><input type="number" value={fees.cleaning_fee} onChange={e => setFees({ ...fees, cleaning_fee: e.target.value })} className={inputClass} /></Field>
            <Field label="승강기 유지비(원)"><input type="number" value={fees.elevator_fee} onChange={e => setFees({ ...fees, elevator_fee: e.target.value })} className={inputClass} /></Field>
            <Field label="기타(원)"><input type="number" value={fees.etc_fee} onChange={e => setFees({ ...fees, etc_fee: e.target.value })} className={inputClass} /></Field>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-gray-700">합계: <span className="font-bold text-blue-600 tnum">{formatMoney(feeTotal)}</span></p>
            <Button onClick={saveFees}>저장</Button>
          </div>
        </Card>
      )}

      {tab === 'water' && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Field label="전체 고지 금액(원)"><input type="number" value={waterTotal} onChange={e => setWaterTotal(e.target.value)} className={inputClass} /></Field>
              <Field label="전체 사용량(㎥)"><input type="number" value={usageTotal} onChange={e => setUsageTotal(e.target.value)} className={inputClass} /></Field>
              <Field label="배분 방식">
                <select value={method} onChange={e => setMethod(e.target.value)} className={inputClass}>
                  <option value="area">면적 비율</option>
                  <option value="usage">사용량 비율</option>
                </select>
              </Field>
            </div>
            <div className="overflow-x-auto mb-3"><table className="w-full text-sm min-w-[460px] tnum">
              <thead><tr className="text-gray-400 border-b border-gray-100"><th className="text-left py-2 font-medium">세대</th><th className="text-left font-medium">면적(㎡)</th><th className="text-left font-medium">사용량(㎥)</th><th className="text-left font-medium">전월 사용량</th><th></th></tr></thead>
              <tbody>
                {units.map((u, i) => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 pr-2"><input value={u.name} onChange={e => updateUnit(i, 'name', e.target.value)} className={cellCls} /></td>
                    <td className="pr-2"><input type="number" value={u.area} onChange={e => updateUnit(i, 'area', e.target.value)} className={cellCls} /></td>
                    <td className="pr-2"><input type="number" value={u.usage} onChange={e => updateUnit(i, 'usage', e.target.value)} className={cellCls} /></td>
                    <td className="pr-2"><input type="number" value={u.prevUsage} onChange={e => updateUnit(i, 'prevUsage', e.target.value)} className={cellCls} /></td>
                    <td><button onClick={() => removeUnit(i)} className="text-rose-400 hover:text-rose-600 text-xs">삭제</button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={addUnit}>+ 세대 추가</Button>
              <Button size="sm" onClick={calculate}>계산</Button>
            </div>
          </Card>

          {result.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">정산서 미리보기</h2>
                <Button variant="secondary" size="sm" onClick={downloadPdf}>PDF 저장</Button>
              </div>
              <div id="billing-preview" className="border border-gray-200 rounded-xl p-5 bg-white">
                <h3 className="text-lg font-bold text-center mb-1">수도요금 정산서</h3>
                <p className="text-center text-sm text-gray-500 mb-4">{now.getFullYear()}년 {now.getMonth() + 1}월 · 전체 {formatMoney(Number(waterTotal))}</p>
                <div className="overflow-x-auto"><table className="w-full text-sm min-w-[420px] tnum">
                  <thead><tr className="border-b bg-gray-50"><th className="text-left px-2 py-2 font-medium">세대</th><th className="text-left font-medium">면적</th><th className="text-left font-medium">사용량</th><th className="text-right font-medium">청구액</th><th className="text-left pl-3 font-medium">비고</th></tr></thead>
                  <tbody>
                    {result.map(r => (
                      <tr key={r.id} className={`border-b last:border-0 ${r.leak ? 'bg-rose-50' : ''}`}>
                        <td className="px-2 py-2">{r.name}</td>
                        <td>{r.area}㎡</td>
                        <td>{r.usage}㎥</td>
                        <td className="text-right font-medium">{formatMoney(r.billedAmount)}</td>
                        <td className="pl-3 text-rose-500 text-xs">{r.leak ? '⚠️ 누수 의심' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold border-t-2"><td className="px-2 py-2">합계</td><td></td><td></td><td className="text-right">{formatMoney(result.reduce((s, r) => s + r.billedAmount, 0))}</td><td></td></tr>
                  </tfoot>
                </table></div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
      {children}
    </button>
  )
}
