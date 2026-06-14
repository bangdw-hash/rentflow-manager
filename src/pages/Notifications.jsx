import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { sendBillingNotice, sendExpiryNotice, sendOverdueNotice } from '../lib/kakao'
import { formatDate, getDday } from '../utils/formatters'
import Modal from '../components/common/Modal'
import { PageHeader, Card, Button, Field, EmptyState, Pill, inputClass } from '../components/common/ui'

const TYPE_OPTIONS = [
  { value: 'billing', label: '관리비 청구' },
  { value: 'expiry', label: '계약 만료' },
  { value: 'overdue', label: '미납 안내' },
]
const STATUS_MAP = {
  sent: { color: 'green', label: '발송완료' },
  pending: { color: 'yellow', label: '대기' },
  failed: { color: 'red', label: '실패' },
}

export default function Notifications() {
  const [tenants, setTenants] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ tenant_id: '', notif_type: 'billing', month: new Date().getMonth() + 1, amount: 0, dueDate: '' })
  const [sending, setSending] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [tenantRes, logRes] = await Promise.all([
      supabase.from('tenants').select('id, name, phone, contracts(contract_end)').order('name'),
      supabase.from('notifications').select('*, tenants(name)').order('created_at', { ascending: false }).limit(50),
    ])
    setTenants(tenantRes.data || [])
    setLogs(logRes.data || [])
    setLoading(false)
  }

  const selectedTenant = tenants.find(t => t.id === form.tenant_id)

  function buildMessage() {
    if (!selectedTenant) return '임차인을 선택하세요.'
    const name = selectedTenant.name
    if (form.notif_type === 'billing') {
      return `[rentflow] ${name}님\n\n${form.month}월 관리비 청구\n청구금액: ${Number(form.amount).toLocaleString('ko-KR')}원\n납부기한: ${form.dueDate || '-'}`
    }
    if (form.notif_type === 'expiry') {
      const end = selectedTenant.contracts?.[0]?.contract_end
      return `[rentflow] ${name}님\n\n계약 만료 안내\n만료일: ${end || '-'} (D-${end ? getDday(end) : '?'})\n계약 갱신 관련 연락 바랍니다.`
    }
    return `[rentflow] ${name}님\n\n미납 안내\n미납금액: ${Number(form.amount).toLocaleString('ko-KR')}원`
  }

  async function handleSend() {
    if (!selectedTenant) { toast.error('임차인을 선택하세요.'); return }
    setSending(true)
    const { name, phone, contracts } = selectedTenant
    let res
    if (form.notif_type === 'billing') res = await sendBillingNotice({ phone, tenantName: name, month: form.month, amount: Number(form.amount), dueDate: form.dueDate })
    else if (form.notif_type === 'expiry') { const end = contracts?.[0]?.contract_end; res = await sendExpiryNotice({ phone, tenantName: name, expiryDate: end, dday: end ? getDday(end) : 0 }) }
    else res = await sendOverdueNotice({ phone, tenantName: name, amount: Number(form.amount), overdueDays: 0 })

    await supabase.from('notifications').insert({
      tenant_id: form.tenant_id, notif_type: form.notif_type, channel: 'kakao',
      message: buildMessage(), sent_at: res?.success ? new Date().toISOString() : null,
      status: res?.success ? 'sent' : 'failed',
    })
    if (res?.success) toast.success('알림이 발송되었습니다.')
    else toast.error('발송 실패 (카카오 API 키/권한 확인). 이력은 기록됨.')
    setSending(false); setOpen(false)
    fetchAll()
  }

  return (
    <div>
      <PageHeader
        title="알림 관리"
        subtitle="관리비·만료·미납 안내를 카카오로 발송하고 이력을 관리합니다."
        action={<Button onClick={() => setOpen(true)}>+ 알림 발송</Button>}
      />

      <Card>
        <h2 className="font-semibold text-gray-900 px-5 py-4 border-b border-gray-100">발송 이력</h2>
        {loading ? (
          <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : logs.length === 0 ? (
          <EmptyState icon="🔔" title="발송 이력이 없습니다" desc="알림을 발송하면 여기에 기록됩니다." action={<Button onClick={() => setOpen(true)}>+ 알림 발송</Button>} />
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
            <thead><tr className="text-gray-400 border-b border-gray-100"><th className="text-left px-5 py-3 font-medium">임차인</th><th className="text-left font-medium">유형</th><th className="text-left font-medium">채널</th><th className="text-left font-medium">발송시각</th><th className="text-left font-medium">상태</th></tr></thead>
            <tbody>
              {logs.map(l => {
                const s = STATUS_MAP[l.status] || STATUS_MAP.pending
                return (
                  <tr key={l.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-5 py-3.5 text-gray-900">{l.tenants?.name || '-'}</td>
                    <td className="text-gray-600">{TYPE_OPTIONS.find(o => o.value === l.notif_type)?.label || l.notif_type}</td>
                    <td className="text-gray-600">{l.channel}</td>
                    <td className="text-gray-600 tnum">{l.sent_at ? formatDate(l.sent_at) : '-'}</td>
                    <td><Pill color={s.color}>{s.label}</Pill></td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="알림 발송">
        <div className="space-y-3.5">
          <Field label="임차인 *">
            <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })} className={inputClass}>
              <option value="">선택</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.phone})</option>)}
            </select>
          </Field>
          <Field label="발송 유형">
            <select value={form.notif_type} onChange={e => setForm({ ...form, notif_type: e.target.value })} className={inputClass}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          {form.notif_type === 'billing' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="월"><input type="number" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className={inputClass} /></Field>
              <Field label="금액"><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputClass} /></Field>
              <Field label="납부기한"><input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className={inputClass} /></Field>
            </div>
          )}
          {form.notif_type === 'overdue' && (
            <Field label="미납 금액"><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputClass} /></Field>
          )}
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1.5">미리보기</span>
            <pre className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap font-sans">{buildMessage()}</pre>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={handleSend} disabled={sending}>{sending ? '발송 중...' : '발송'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
