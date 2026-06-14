import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDate } from '../utils/formatters'
import Modal from '../components/common/Modal'
import Badge from '../components/common/Badge'

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
  const [file, setFile] = useState(null)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

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

  async function onSubmit(values) {
    let fileUrl = null
    if (file) {
      const path = `contracts/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('contracts').upload(path, file)
      if (upErr) {
        toast.error('파일 업로드 실패: ' + upErr.message)
      } else {
        const { data } = supabase.storage.from('contracts').getPublicUrl(path)
        fileUrl = data?.publicUrl || null
      }
    }

    const payload = {
      tenant_id: values.tenant_id,
      property_id: values.property_id,
      contract_start: values.contract_start,
      contract_end: values.contract_end,
      deposit: Number(values.deposit),
      monthly_rent: Number(values.monthly_rent),
      payment_day: values.payment_day ? Number(values.payment_day) : 1,
      contract_file_url: fileUrl,
      status: 'active',
    }
    const { error } = await supabase.from('contracts').insert(payload)
    if (error) { toast.error('등록 실패: ' + error.message); return }
    toast.success('계약이 등록되었습니다.')
    reset()
    setFile(null)
    setOpen(false)
    fetchAll()
  }

  function closeModal() {
    setOpen(false)
    setFile(null)
    reset()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">계약 관리</h1>
        <button onClick={() => setOpen(true)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">+ 신규 계약</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <p className="text-gray-400 text-sm">등록된 계약이 없습니다.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead><tr className="text-gray-400 border-b bg-gray-50"><th className="text-left px-4 py-2">임차인</th><th className="text-left">매물</th><th className="text-left">기간</th><th className="text-left">보증금/월세</th><th className="text-left">상태</th><th className="text-left">계약서</th></tr></thead>
            <tbody>
              {list.map(c => {
                const s = STATUS_MAP[c.status] || STATUS_MAP.active
                return (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.tenants?.name || '-'}</td>
                    <td>{c.properties?.name || '-'}</td>
                    <td className="text-gray-600">{formatDate(c.contract_start)} ~ {formatDate(c.contract_end)}</td>
                    <td className="text-gray-600">{formatMoney(c.deposit)} / {formatMoney(c.monthly_rent)}</td>
                    <td><Badge color={s.color}>{s.label}</Badge></td>
                    <td>{c.contract_file_url ? <a href={c.contract_file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">보기</a> : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={closeModal} title="신규 계약 등록">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="임차인 *">
            <select {...register('tenant_id', { required: true })} className={inputCls} defaultValue="">
              <option value="" disabled>선택</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="매물 *">
            <select {...register('property_id', { required: true })} className={inputCls} defaultValue="">
              <option value="" disabled>선택</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="시작일 *"><input type="date" {...register('contract_start', { required: true })} className={inputCls} /></Field>
            <Field label="종료일 *"><input type="date" {...register('contract_end', { required: true })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="보증금(원) *"><input type="number" {...register('deposit', { required: true })} className={inputCls} /></Field>
            <Field label="월세(원) *"><input type="number" {...register('monthly_rent', { required: true })} className={inputCls} /></Field>
          </div>
          <Field label="월세 납부일"><input type="number" min="1" max="31" {...register('payment_day')} className={inputCls} placeholder="1" /></Field>
          <Field label="계약서 파일">
            <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100">취소</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">등록</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  )
}
