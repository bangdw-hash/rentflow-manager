import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { scanContract } from '../lib/ocr'
import { useSettings } from '../lib/SettingsContext'
import { formatMoney, formatDate } from '../utils/formatters'
import Modal from '../components/common/Modal'
import { PageHeader, Card, Button, Field, EmptyState, Pill, IconBtn, EditIcon, TrashIcon, inputClass } from '../components/common/ui'

const STATUS_MAP = {
  active: { color: 'green', label: '유효' },
  expired: { color: 'gray', label: '만료' },
  terminated: { color: 'red', label: '해지' },
}

export default function Contracts() {
  const [list, setList] = useState([])
  const [tenants, setTenants] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [file, setFile] = useState(null)
  const [scanning, setScanning] = useState(false)
  const { settings } = useSettings()
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm()

  async function handleOcr(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setScanning(true)
    try {
      const parsed = await scanContract(f, { url: settings.clova_ocr_url, secret: settings.clova_ocr_secret })
      let n = 0
      if (parsed.deposit) { setValue('deposit', parsed.deposit); n++ }
      if (parsed.monthly_rent) { setValue('monthly_rent', parsed.monthly_rent); n++ }
      if (parsed.contract_start) { setValue('contract_start', parsed.contract_start); n++ }
      if (parsed.contract_end) { setValue('contract_end', parsed.contract_end); n++ }
      setFile(f) // 계약서 파일로도 첨부
      toast.success(n ? `OCR로 ${n}개 항목을 자동 입력했습니다.` : 'OCR 인식 결과가 없습니다. 직접 입력하세요.')
    } catch (err) {
      toast.error('OCR 분석 실패: ' + (err.message || err))
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [contractRes, tenantRes, propRes] = await Promise.all([
      supabase.from('contracts').select('*, tenants(name), properties(name)').order('created_at', { ascending: false }),
      supabase.from('tenants').select('id, name').order('name'),
      supabase.from('properties').select('id, name').order('name'),
    ])
    if (contractRes.error) toast.error('계약 로드 실패: ' + contractRes.error.message)
    setList(contractRes.data || [])
    setTenants(tenantRes.data || [])
    setProperties(propRes.data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null); setFile(null)
    reset({ tenant_id: '', property_id: '', contract_start: '', contract_end: '', deposit: '', monthly_rent: '', payment_day: 1, status: 'active' })
    setOpen(true)
  }
  function openEdit(c) {
    setEditing(c); setFile(null)
    reset({
      tenant_id: c.tenant_id, property_id: c.property_id, contract_start: c.contract_start, contract_end: c.contract_end,
      deposit: c.deposit, monthly_rent: c.monthly_rent, payment_day: c.payment_day || 1, status: c.status || 'active',
    })
    setOpen(true)
  }

  async function onSubmit(v) {
    let fileUrl = editing?.contract_file_url || null
    if (file) {
      const path = `contracts/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('contracts').upload(path, file)
      if (upErr) toast.error('파일 업로드 실패: ' + upErr.message)
      else fileUrl = supabase.storage.from('contracts').getPublicUrl(path).data?.publicUrl || fileUrl
    }
    const payload = {
      tenant_id: v.tenant_id, property_id: v.property_id,
      contract_start: v.contract_start, contract_end: v.contract_end,
      deposit: Number(v.deposit), monthly_rent: Number(v.monthly_rent),
      payment_day: v.payment_day ? Number(v.payment_day) : 1,
      contract_file_url: fileUrl, status: v.status,
    }
    const res = editing
      ? await supabase.from('contracts').update(payload).eq('id', editing.id)
      : await supabase.from('contracts').insert(payload)
    if (res.error) { toast.error('저장 실패: ' + res.error.message); return }
    toast.success(editing ? '계약이 수정되었습니다.' : '계약이 등록되었습니다.')
    setOpen(false); setFile(null)
    fetchAll()
  }

  async function onDelete(c) {
    if (!confirm('이 계약을 삭제할까요? 되돌릴 수 없습니다.')) return
    const { error } = await supabase.from('contracts').delete().eq('id', c.id)
    if (error) { toast.error('삭제 실패: ' + error.message); return }
    toast.success('삭제되었습니다.')
    fetchAll()
  }

  return (
    <div>
      <PageHeader
        title="계약 관리"
        subtitle="임차인·매물을 연결해 계약을 등록하고 만료를 추적합니다."
        action={<Button onClick={openCreate}>+ 신규 계약</Button>}
      />

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <Card><EmptyState icon="📄" title="등록된 계약이 없습니다" desc="임차인과 매물을 먼저 등록한 뒤 계약을 추가하세요." action={<Button onClick={openCreate}>+ 신규 계약</Button>} /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">임차인</th>
                <th className="text-left font-medium">매물</th>
                <th className="text-left font-medium">기간</th>
                <th className="text-right font-medium">보증금/월세</th>
                <th className="text-left pl-4 font-medium">상태</th>
                <th className="text-left font-medium">계약서</th>
                <th className="text-right px-5 font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => {
                const s = STATUS_MAP[c.status] || STATUS_MAP.active
                return (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{c.tenants?.name || '-'}</td>
                    <td className="text-gray-600">{c.properties?.name || '-'}</td>
                    <td className="text-gray-600">{formatDate(c.contract_start)} ~ {formatDate(c.contract_end)}</td>
                    <td className="text-right text-gray-600 tnum">{formatMoney(c.deposit)} / {formatMoney(c.monthly_rent)}</td>
                    <td className="pl-4"><Pill color={s.color}>{s.label}</Pill></td>
                    <td>{c.contract_file_url ? <a href={c.contract_file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">보기</a> : '-'}</td>
                    <td className="px-5">
                      <div className="flex justify-end gap-1">
                        <IconBtn title="수정" onClick={() => openEdit(c)}>{EditIcon}</IconBtn>
                        <IconBtn title="삭제" danger onClick={() => onDelete(c)}>{TrashIcon}</IconBtn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? '계약 수정' : '신규 계약 등록'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div className="p-3.5 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-700 font-medium mb-2">📄 계약서 OCR 자동 입력 (선택)</p>
            <input type="file" accept="image/*,.pdf" onChange={handleOcr} disabled={scanning} className="text-sm" />
            {scanning && <p className="text-xs text-blue-500 mt-2">분석 중…</p>}
            <p className="text-xs text-gray-400 mt-1.5">보증금·월세·계약기간을 자동으로 채웁니다. 결과는 확인 후 수정하세요.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="임차인 *">
              <select {...register('tenant_id', { required: true })} className={inputClass}>
                <option value="" disabled>선택</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="매물 *">
              <select {...register('property_id', { required: true })} className={inputClass}>
                <option value="" disabled>선택</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="시작일 *"><input type="date" {...register('contract_start', { required: true })} className={inputClass} /></Field>
            <Field label="종료일 *"><input type="date" {...register('contract_end', { required: true })} className={inputClass} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="보증금(원) *"><input type="number" {...register('deposit', { required: true })} className={inputClass} /></Field>
            <Field label="월세(원) *"><input type="number" {...register('monthly_rent', { required: true })} className={inputClass} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="월세 납부일"><input type="number" min="1" max="31" {...register('payment_day')} className={inputClass} placeholder="1" /></Field>
            <Field label="상태">
              <select {...register('status')} className={inputClass}>
                <option value="active">유효</option>
                <option value="expired">만료</option>
                <option value="terminated">해지</option>
              </select>
            </Field>
          </div>
          <Field label="계약서 파일"><input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" /></Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" disabled={isSubmitting}>{editing ? '수정' : '등록'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
