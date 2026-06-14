import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { scanContract } from '../lib/ocr'
import { formatDate } from '../utils/formatters'
import Modal from '../components/common/Modal'
import { PageHeader, Card, Button, Field, EmptyState, IconBtn, EditIcon, TrashIcon, inputClass } from '../components/common/ui'

export default function Tenants() {
  const [list, setList] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [tenantRes, propRes] = await Promise.all([
      supabase.from('tenants').select('*, properties(name), contracts(contract_start, contract_end, status)').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name').order('name'),
    ])
    if (tenantRes.error) toast.error('임차인 로드 실패: ' + tenantRes.error.message)
    setList(tenantRes.data || [])
    setProperties(propRes.data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null); setOcrResult(null)
    reset({ name: '', phone: '', id_number: '', email: '', property_id: '' })
    setOpen(true)
  }
  function openEdit(t) {
    setEditing(t); setOcrResult(null)
    reset({ name: t.name, phone: t.phone, id_number: t.id_number || '', email: t.email || '', property_id: t.property_id || '' })
    setOpen(true)
  }

  async function handleOcr(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    try {
      const path = `contracts/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('contracts').upload(path, file)
      if (upErr) console.warn('파일 업로드 경고:', upErr.message)
      const parsed = await scanContract(file)
      setOcrResult(parsed)
      toast.success('계약서 OCR 분석 완료')
    } catch (err) {
      toast.error('OCR 분석 실패: ' + (err.message || err))
    } finally {
      setScanning(false)
    }
  }

  async function onSubmit(v) {
    const payload = {
      name: v.name, phone: v.phone, id_number: v.id_number || null,
      email: v.email || null, property_id: v.property_id || null,
    }
    const res = editing
      ? await supabase.from('tenants').update(payload).eq('id', editing.id)
      : await supabase.from('tenants').insert(payload)
    if (res.error) { toast.error('저장 실패: ' + res.error.message); return }
    toast.success(editing ? '임차인이 수정되었습니다.' : '임차인이 등록되었습니다.')
    setOpen(false); setOcrResult(null)
    fetchAll()
  }

  async function onDelete(t) {
    if (!confirm(`'${t.name}' 임차인을 삭제할까요? 관련 계약도 함께 삭제됩니다.`)) return
    const { error } = await supabase.from('tenants').delete().eq('id', t.id)
    if (error) { toast.error('삭제 실패: ' + error.message); return }
    toast.success('삭제되었습니다.')
    fetchAll()
  }

  return (
    <div>
      <PageHeader
        title="임차인 관리"
        subtitle="임차인 정보를 등록하고 계약서를 OCR로 자동 인식합니다."
        action={<Button onClick={openCreate}>+ 신규 임차인</Button>}
      />

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <Card><EmptyState icon="👤" title="등록된 임차인이 없습니다" desc="임차인을 등록하면 계약·알림과 연결됩니다." action={<Button onClick={openCreate}>+ 신규 임차인</Button>} /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">이름</th>
                <th className="text-left font-medium">연락처</th>
                <th className="text-left font-medium">매물</th>
                <th className="text-left font-medium">계약기간</th>
                <th className="text-right px-5 font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {list.map(t => {
                const c = (t.contracts || [])[0]
                return (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{t.name}</td>
                    <td className="text-gray-600 tnum">{t.phone}</td>
                    <td className="text-gray-600">{t.properties?.name || '-'}</td>
                    <td className="text-gray-600">{c ? `${formatDate(c.contract_start)} ~ ${formatDate(c.contract_end)}` : '-'}</td>
                    <td className="px-5">
                      <div className="flex justify-end gap-1">
                        <IconBtn title="수정" onClick={() => openEdit(t)}>{EditIcon}</IconBtn>
                        <IconBtn title="삭제" danger onClick={() => onDelete(t)}>{TrashIcon}</IconBtn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? '임차인 수정' : '신규 임차인 등록'}>
        {!editing && (
          <div className="mb-4 p-3.5 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-700 font-medium mb-2">📄 계약서 OCR 스캔 (선택)</p>
            <input type="file" accept="image/*,.pdf" onChange={handleOcr} disabled={scanning} className="text-sm" />
            {scanning && <p className="text-xs text-blue-500 mt-2">분석 중...</p>}
            {ocrResult && (
              <div className="text-xs text-gray-600 mt-2 space-y-0.5 tnum">
                <p>보증금: {ocrResult.deposit ? ocrResult.deposit.toLocaleString('ko-KR') + '원' : '미인식'}</p>
                <p>월세: {ocrResult.monthly_rent ? ocrResult.monthly_rent.toLocaleString('ko-KR') + '원' : '미인식'}</p>
                <p>계약기간: {ocrResult.contract_start || '?'} ~ {ocrResult.contract_end || '?'}</p>
                <p className="text-gray-400">※ 계약 정보는 계약 페이지에서 등록하세요.</p>
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <Field label="이름 *"><input {...register('name', { required: true })} className={inputClass} /></Field>
          <Field label="연락처 *"><input {...register('phone', { required: true })} className={inputClass} placeholder="010-0000-0000" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="주민번호"><input {...register('id_number')} className={inputClass} /></Field>
            <Field label="이메일"><input type="email" {...register('email')} className={inputClass} /></Field>
          </div>
          <Field label="배정 매물">
            <select {...register('property_id')} className={inputClass}>
              <option value="">선택 안 함</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" disabled={isSubmitting}>{editing ? '수정' : '등록'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
