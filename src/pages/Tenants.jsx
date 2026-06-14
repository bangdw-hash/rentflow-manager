import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { scanContract } from '../lib/ocr'
import { formatDate } from '../utils/formatters'
import Modal from '../components/common/Modal'

export default function Tenants() {
  const [list, setList] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
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

  async function handleOcr(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    try {
      // 계약서 파일 Supabase Storage 업로드
      const path = `contracts/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('contracts').upload(path, file)
      if (upErr) console.warn('파일 업로드 경고:', upErr.message)

      const parsed = await scanContract(file)
      setOcrResult(parsed)
      toast.success('계약서 OCR 분석 완료 — 자동 입력되었습니다.')
    } catch (err) {
      toast.error('OCR 분석 실패: ' + (err.message || err))
    } finally {
      setScanning(false)
    }
  }

  async function onSubmit(values) {
    const payload = {
      name: values.name,
      phone: values.phone,
      id_number: values.id_number || null,
      email: values.email || null,
      property_id: values.property_id || null,
    }
    const { error } = await supabase.from('tenants').insert(payload)
    if (error) { toast.error('등록 실패: ' + error.message); return }
    toast.success('임차인이 등록되었습니다.')
    reset()
    setOcrResult(null)
    setOpen(false)
    fetchAll()
  }

  function closeModal() {
    setOpen(false)
    setOcrResult(null)
    reset()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">임차인 관리</h1>
        <button onClick={() => setOpen(true)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">+ 신규 임차인</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <p className="text-gray-400 text-sm">등록된 임차인이 없습니다.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b bg-gray-50"><th className="text-left px-4 py-2">이름</th><th className="text-left">연락처</th><th className="text-left">매물</th><th className="text-left">계약기간</th></tr></thead>
            <tbody>
              {list.map(t => {
                const c = (t.contracts || [])[0]
                return (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                    <td>{t.phone}</td>
                    <td>{t.properties?.name || '-'}</td>
                    <td className="text-gray-600">{c ? `${formatDate(c.contract_start)} ~ ${formatDate(c.contract_end)}` : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={closeModal} title="신규 임차인 등록">
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <label className="block text-sm text-blue-700 font-medium mb-2">📄 계약서 OCR 스캔 (선택)</label>
          <input type="file" accept="image/*,.pdf" onChange={handleOcr} disabled={scanning} className="text-sm" />
          {scanning && <p className="text-xs text-blue-500 mt-2">분석 중...</p>}
          {ocrResult && (
            <div className="text-xs text-gray-600 mt-2 space-y-0.5">
              <p>보증금: {ocrResult.deposit ? ocrResult.deposit.toLocaleString('ko-KR') + '원' : '미인식'}</p>
              <p>월세: {ocrResult.monthly_rent ? ocrResult.monthly_rent.toLocaleString('ko-KR') + '원' : '미인식'}</p>
              <p>계약기간: {ocrResult.contract_start || '?'} ~ {ocrResult.contract_end || '?'}</p>
              <p className="text-gray-400">※ 계약 정보는 계약 페이지에서 등록하세요.</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="이름 *"><input {...register('name', { required: true })} className={inputCls} /></Field>
          <Field label="연락처 *"><input {...register('phone', { required: true })} className={inputCls} placeholder="010-0000-0000" /></Field>
          <Field label="주민번호"><input {...register('id_number')} className={inputCls} /></Field>
          <Field label="이메일"><input type="email" {...register('email')} className={inputCls} /></Field>
          <Field label="배정 매물">
            <select {...register('property_id')} className={inputCls} defaultValue="">
              <option value="">선택 안 함</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
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
