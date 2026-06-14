import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDate } from '../utils/formatters'
import { PageHeader, Card, Button, EmptyState, Pill, IconBtn, TrashIcon } from '../components/common/ui'

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')

// 표시용 실효 상태: pending인데 납부기한이 지났으면 '연체'
function effectiveStatus(p) {
  if (p.status === 'paid') return 'paid'
  if (p.status === 'overdue') return 'overdue'
  if (p.due_date && new Date(p.due_date) < new Date(new Date().toDateString())) return 'overdue'
  return 'pending'
}
const STATUS = {
  paid: { color: 'green', label: '완료' },
  pending: { color: 'yellow', label: '대기' },
  overdue: { color: 'red', label: '연체' },
}
const TYPE = { rent: '월세', utility: '관리비', deposit: '보증금' }

export default function Payments() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data, error } = await supabase
      .from('payments')
      .select('*, contracts(tenants(name), properties(name))')
      .order('due_date', { ascending: false })
    if (error) toast.error('납부 내역 로드 실패: ' + error.message)
    setList(data || [])
    setLoading(false)
  }

  // 이번 달 월세 청구 자동 생성 (활성 계약 기준, 중복 방지)
  async function generateDues() {
    setBusy(true)
    try {
      const { data: cons, error: cErr } = await supabase
        .from('contracts')
        .select('id, monthly_rent, payment_day')
        .eq('status', 'active')
      if (cErr) throw cErr
      if (!cons || cons.length === 0) { toast.error('활성 계약이 없습니다.'); return }

      const y = now.getFullYear(), m = now.getMonth() + 1
      const monthStart = `${y}-${pad(m)}-01`
      const monthEnd = `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`
      const { data: existing } = await supabase
        .from('payments')
        .select('contract_id')
        .eq('payment_type', 'rent')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
      const have = new Set((existing || []).map((e) => e.contract_id))

      const rows = cons
        .filter((c) => !have.has(c.id) && c.monthly_rent)
        .map((c) => ({
          contract_id: c.id,
          payment_type: 'rent',
          amount: c.monthly_rent,
          due_date: `${y}-${pad(m)}-${pad(Math.min(c.payment_day || 1, 28))}`,
          status: 'pending',
        }))
      if (rows.length === 0) { toast('이미 이번 달 청구가 생성되어 있습니다.', { icon: 'ℹ️' }); return }
      const { error } = await supabase.from('payments').insert(rows)
      if (error) throw error
      toast.success(`${rows.length}건의 ${m}월 월세 청구를 생성했습니다.`)
      fetchAll()
    } catch (e) {
      toast.error('생성 실패: ' + (e.message || e))
    } finally {
      setBusy(false)
    }
  }

  // 연체 반영: 기한 지난 대기 건을 overdue로
  async function applyOverdue() {
    setBusy(true)
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('payments')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_date', today)
      .select('id')
    setBusy(false)
    if (error) { toast.error('연체 반영 실패: ' + error.message); return }
    toast.success(`${data?.length || 0}건을 연체로 반영했습니다.`)
    fetchAll()
  }

  async function markPaid(p) {
    const { error } = await supabase
      .from('payments')
      .update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) })
      .eq('id', p.id)
    if (error) { toast.error('처리 실패: ' + error.message); return }
    toast.success('납부 완료 처리했습니다.')
    fetchAll()
  }
  async function markUnpaid(p) {
    const { error } = await supabase
      .from('payments')
      .update({ status: 'pending', paid_date: null })
      .eq('id', p.id)
    if (error) { toast.error('처리 실패: ' + error.message); return }
    fetchAll()
  }
  async function remove(p) {
    if (!confirm('이 납부 건을 삭제할까요?')) return
    const { error } = await supabase.from('payments').delete().eq('id', p.id)
    if (error) { toast.error('삭제 실패: ' + error.message); return }
    toast.success('삭제되었습니다.')
    fetchAll()
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return list
    return list.filter((p) => effectiveStatus(p) === filter)
  }, [list, filter])

  const summary = useMemo(() => {
    const s = { paid: 0, pending: 0, overdue: 0, overdueAmt: 0 }
    list.forEach((p) => {
      const e = effectiveStatus(p)
      s[e] += 1
      if (e === 'overdue') s.overdueAmt += p.amount || 0
    })
    return s
  }, [list])

  return (
    <div>
      <PageHeader
        title="납부 관리"
        subtitle="월세 청구를 생성하고 납부/미납을 추적합니다."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={applyOverdue} disabled={busy}>연체 반영</Button>
            <Button onClick={generateDues} disabled={busy}>이번 달 청구 생성</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { k: 'all', label: '전체', val: list.length, color: 'bg-gray-400' },
          { k: 'pending', label: '대기', val: summary.pending, color: 'bg-amber-500' },
          { k: 'overdue', label: '연체', val: summary.overdue, color: 'bg-rose-500' },
          { k: 'paid', label: '완료', val: summary.paid, color: 'bg-emerald-500' },
        ].map((c) => (
          <button key={c.k} onClick={() => setFilter(c.k)}
            className={`text-left rounded-2xl p-4 ring-1 transition ${filter === c.k ? 'ring-blue-400 bg-blue-50/40' : 'ring-gray-200/70 bg-white hover:bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2 h-2 rounded-full ${c.color}`} />
              <span className="text-xs text-gray-500">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 tnum">{c.val}</p>
          </button>
        ))}
      </div>

      {summary.overdueAmt > 0 && (
        <div className="mb-4 rounded-xl bg-rose-50 ring-1 ring-rose-100 px-4 py-3 text-sm text-rose-700">
          연체 금액 합계: <b className="tnum">{formatMoney(summary.overdueAmt)}</b> — 알림 발송을 검토하세요.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="💳"
            title={filter === 'all' ? '납부 내역이 없습니다' : '해당 상태의 내역이 없습니다'}
            desc="‘이번 달 청구 생성’으로 활성 계약의 월세 청구를 만들 수 있습니다."
            action={<Button onClick={generateDues} disabled={busy}>이번 달 청구 생성</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">임차인</th>
                <th className="text-left font-medium">매물</th>
                <th className="text-left font-medium">유형</th>
                <th className="text-right font-medium">금액</th>
                <th className="text-left pl-4 font-medium">납부기한</th>
                <th className="text-left font-medium">상태</th>
                <th className="text-right px-5 font-medium">처리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const e = effectiveStatus(p)
                const s = STATUS[e]
                return (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{p.contracts?.tenants?.name || '-'}</td>
                    <td className="text-gray-600">{p.contracts?.properties?.name || '-'}</td>
                    <td className="text-gray-600">{TYPE[p.payment_type] || p.payment_type}</td>
                    <td className="text-right text-gray-800 font-medium tnum">{formatMoney(p.amount)}</td>
                    <td className="pl-4 text-gray-600 tnum">{formatDate(p.due_date)}</td>
                    <td><Pill color={s.color}>{s.label}</Pill></td>
                    <td className="px-5">
                      <div className="flex justify-end items-center gap-1">
                        {e === 'paid' ? (
                          <Button variant="ghost" size="sm" onClick={() => markUnpaid(p)}>취소</Button>
                        ) : (
                          <Button variant="subtle" size="sm" onClick={() => markPaid(p)}>완료</Button>
                        )}
                        <IconBtn title="삭제" danger onClick={() => remove(p)}>{TrashIcon}</IconBtn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
