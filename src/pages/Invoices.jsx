import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { generateBillingPdf } from '../lib/pdfgen'
import { formatMoney } from '../utils/formatters'
import Modal from '../components/common/Modal'
import { PageHeader, Card, Button, Field, EmptyState, Pill, inputClass } from '../components/common/ui'

const now = new Date()
const SUPPLIER_KEY = 'rf_supplier'
const emptySupplier = { name: '', bizNo: '', ceo: '', address: '', bizType: '부동산업', item: '부동산임대', email: '' }

function loadSupplier() {
  try { return { ...emptySupplier, ...JSON.parse(localStorage.getItem(SUPPLIER_KEY) || '{}') } }
  catch { return { ...emptySupplier } }
}

// 상가=과세(세금계산서/VAT10%), 그 외(주택 등)=면세(계산서)
const isTaxable = (propType) => propType === 'store'

export default function Invoices() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [selected, setSelected] = useState(() => new Set())
  const [supplier, setSupplier] = useState(loadSupplier())
  const [supOpen, setSupOpen] = useState(false)
  const [preview, setPreview] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data, error } = await supabase
      .from('contracts')
      .select('id, monthly_rent, status, tenants(name, email), properties(name, property_type)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (error) toast.error('계약 로드 실패: ' + error.message)
    setContracts(data || [])
    setLoading(false)
  }

  const rows = useMemo(() => contracts.map((c) => {
    const taxable = isTaxable(c.properties?.property_type)
    const supply = c.monthly_rent || 0
    const vat = taxable ? Math.round(supply * 0.1) : 0
    return {
      id: c.id,
      tenant: c.tenants?.name || '-',
      email: c.tenants?.email || '',
      property: c.properties?.name || '-',
      taxable,
      supply,
      vat,
      total: supply + vat,
    }
  }), [contracts])

  function toggle(id) {
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))))
  }

  function saveSupplier(e) {
    e.preventDefault()
    localStorage.setItem(SUPPLIER_KEY, JSON.stringify(supplier))
    setSupOpen(false)
    toast.success('공급자 정보를 저장했습니다.')
  }

  function exportHometax() {
    const picked = rows.filter((r) => selected.has(r.id))
    if (picked.length === 0) { toast.error('내보낼 항목을 선택하세요.'); return }
    if (!supplier.bizNo || !supplier.name) { toast.error('먼저 공급자(임대인) 정보를 입력하세요.'); setSupOpen(true); return }
    const writeDate = `${month}-01`
    const data = picked.map((r) => ({
      '작성일자': writeDate,
      '문서종류': r.taxable ? '세금계산서' : '계산서',
      '영수청구': '청구',
      '공급자등록번호': supplier.bizNo,
      '공급자상호': supplier.name,
      '공급자대표자': supplier.ceo,
      '공급받는자상호': r.tenant,
      '공급받는자이메일': r.email,
      '품목': `${month} 임대료 (${r.property})`,
      '공급가액': r.supply,
      '세액': r.vat,
      '합계금액': r.total,
      '비고': r.taxable ? '과세(상가)' : '면세(주택)',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '전자계산서')
    XLSX.writeFile(wb, `전자계산서_홈택스일괄_${month}.xlsx`)
    toast.success(`${picked.length}건을 홈택스 호환 양식으로 내보냈습니다.`)
  }

  async function downloadPdf() {
    if (!supplier.bizNo || !supplier.name) { toast.error('먼저 공급자 정보를 입력하세요.'); setSupOpen(true); return }
    try {
      await generateBillingPdf('invoice-preview', `${preview.taxable ? '세금계산서' : '계산서'}_${preview.tenant}_${month}.pdf`)
      toast.success('PDF를 저장했습니다.')
    } catch (err) { toast.error(err.message) }
  }

  const supplierReady = supplier.bizNo && supplier.name

  return (
    <div>
      <PageHeader
        title="전자(세금)계산서"
        subtitle="임차인 이메일 기준으로 계산서를 발행하고 홈택스 일괄발행 양식으로 내보냅니다."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSupOpen(true)}>공급자 정보</Button>
            <Button size="sm" onClick={exportHometax}>홈택스 일괄 내보내기</Button>
          </div>
        }
      />

      {!supplierReady && (
        <div className="mb-4 rounded-xl bg-amber-50 ring-1 ring-amber-100 px-4 py-3 text-sm text-amber-700">
          공급자(임대인) 사업자 정보가 없습니다. <button className="font-semibold underline" onClick={() => setSupOpen(true)}>지금 입력</button> 하면 계산서에 자동 반영됩니다.
        </div>
      )}

      <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
        <Field label="발행월"><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} /></Field>
        <p className="text-sm text-gray-500 self-end pb-2">상가=과세(세금계산서, VAT 10%) · 주택 등=면세(계산서) 자동 구분</p>
      </Card>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon="🧾" title="발행할 활성 계약이 없습니다" desc="계약을 등록하면 임대료 계산서를 발행할 수 있습니다." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3"><input type="checkbox" checked={selected.size === rows.length} onChange={toggleAll} /></th>
                <th className="text-left font-medium">임차인</th>
                <th className="text-left font-medium">이메일</th>
                <th className="text-left font-medium">매물</th>
                <th className="text-left font-medium">구분</th>
                <th className="text-right font-medium">공급가액</th>
                <th className="text-right font-medium">세액</th>
                <th className="text-right font-medium">합계</th>
                <th className="text-right px-5 font-medium">발행</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-5 py-3.5"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td className="font-medium text-gray-900">{r.tenant}</td>
                  <td className={r.email ? 'text-gray-600' : 'text-rose-500'}>{r.email || '이메일 없음'}</td>
                  <td className="text-gray-600">{r.property}</td>
                  <td><Pill color={r.taxable ? 'blue' : 'gray'}>{r.taxable ? '과세' : '면세'}</Pill></td>
                  <td className="text-right tnum text-gray-700">{formatMoney(r.supply)}</td>
                  <td className="text-right tnum text-gray-500">{formatMoney(r.vat)}</td>
                  <td className="text-right tnum font-medium text-gray-900">{formatMoney(r.total)}</td>
                  <td className="px-5 text-right"><Button variant="subtle" size="sm" onClick={() => setPreview(r)}>PDF</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <p className="text-xs text-gray-400 mt-4 leading-relaxed bg-gray-50 rounded-xl p-3">
        ※ 홈택스 직접 전송은 공인인증·사업자 인증과 서버 연동이 필요해 본 앱(정적 웹)에서는 제공하지 않습니다.
        대신 ① 계산서 <b>PDF 발행</b> ② <b>홈택스 일괄발행용 엑셀</b> 내보내기를 제공합니다.
        홈택스 &gt; 전자(세금)계산서 &gt; 건별/일괄 발급에서 본 엑셀을 활용하세요(컬럼 매핑은 홈택스 양식 버전에 맞춰 확인).
      </p>

      {/* 공급자 정보 모달 */}
      <Modal open={supOpen} onClose={() => setSupOpen(false)} title="공급자(임대인) 정보">
        <form onSubmit={saveSupplier} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="상호/성명 *"><input value={supplier.name} onChange={(e) => setSupplier({ ...supplier, name: e.target.value })} className={inputClass} required /></Field>
            <Field label="사업자등록번호 *"><input value={supplier.bizNo} onChange={(e) => setSupplier({ ...supplier, bizNo: e.target.value })} className={inputClass} placeholder="000-00-00000" required /></Field>
            <Field label="대표자"><input value={supplier.ceo} onChange={(e) => setSupplier({ ...supplier, ceo: e.target.value })} className={inputClass} /></Field>
            <Field label="이메일"><input value={supplier.email} onChange={(e) => setSupplier({ ...supplier, email: e.target.value })} className={inputClass} /></Field>
          </div>
          <Field label="사업장 주소"><input value={supplier.address} onChange={(e) => setSupplier({ ...supplier, address: e.target.value })} className={inputClass} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="업태"><input value={supplier.bizType} onChange={(e) => setSupplier({ ...supplier, bizType: e.target.value })} className={inputClass} /></Field>
            <Field label="종목"><input value={supplier.item} onChange={(e) => setSupplier({ ...supplier, item: e.target.value })} className={inputClass} /></Field>
          </div>
          <p className="text-xs text-gray-400">이 정보는 이 기기에만 저장됩니다(localStorage).</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setSupOpen(false)}>취소</Button>
            <Button type="submit">저장</Button>
          </div>
        </form>
      </Modal>

      {/* 계산서 PDF 미리보기 모달 */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.taxable ? '세금계산서 미리보기' : '계산서 미리보기'}>
        {preview && (
          <div className="space-y-4">
            <div id="invoice-preview" className="bg-white border border-gray-300 rounded-lg p-5 text-sm">
              <h3 className="text-center text-lg font-bold mb-4">{preview.taxable ? '세 금 계 산 서' : '계 산 서'}</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-gray-200 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">공급자</p>
                  <p className="font-medium">{supplier.name || '-'} ({supplier.bizNo || '-'})</p>
                  <p className="text-gray-600">{supplier.ceo}</p>
                  <p className="text-gray-600 text-xs">{supplier.address}</p>
                  <p className="text-gray-600 text-xs">{supplier.bizType} / {supplier.item}</p>
                </div>
                <div className="border border-gray-200 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">공급받는자</p>
                  <p className="font-medium">{preview.tenant}</p>
                  <p className="text-gray-600 text-xs">{preview.email || '이메일 없음'}</p>
                  <p className="text-gray-600 text-xs mt-1">매물: {preview.property}</p>
                </div>
              </div>
              <table className="w-full text-sm border-t border-gray-300 tnum">
                <thead><tr className="border-b border-gray-200 text-gray-500"><th className="text-left py-2">품목</th><th className="text-right">공급가액</th><th className="text-right">세액</th><th className="text-right">합계</th></tr></thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2">{month} 임대료</td>
                    <td className="text-right">{formatMoney(preview.supply)}</td>
                    <td className="text-right">{formatMoney(preview.vat)}</td>
                    <td className="text-right font-medium">{formatMoney(preview.total)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-right mt-3 font-bold">합계금액 {formatMoney(preview.total)}</p>
              <p className="text-xs text-gray-400 mt-3">작성일자 {month}-01 · {preview.taxable ? '과세(부가세 10%)' : '면세'}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPreview(null)}>닫기</Button>
              <Button onClick={downloadPdf}>PDF 저장</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
