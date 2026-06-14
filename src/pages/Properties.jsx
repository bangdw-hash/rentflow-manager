import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { formatMoney } from '../utils/formatters'
import Modal from '../components/common/Modal'
import Badge from '../components/common/Badge'

const STATUS_MAP = {
  vacant: { color: 'yellow', label: '공실' },
  occupied: { color: 'green', label: '계약중' },
  expiring: { color: 'red', label: '만료예정' },
}

const TYPE_MAP = { apartment: '주택/아파트', office: '사무실', store: '상가' }

export default function Properties() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  useEffect(() => { fetchList() }, [])

  async function fetchList() {
    setLoading(true)
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('매물 목록 로드 실패: ' + error.message)
    setList(data || [])
    setLoading(false)
  }

  async function onSubmit(values) {
    const payload = {
      name: values.name,
      address: values.address,
      floor: values.floor || null,
      area_sqm: values.area_sqm ? Number(values.area_sqm) : null,
      property_type: values.property_type,
      monthly_rent: values.monthly_rent ? Number(values.monthly_rent) : null,
      deposit: values.deposit ? Number(values.deposit) : null,
      note: values.note || null,
    }
    const { error } = await supabase.from('properties').insert(payload)
    if (error) { toast.error('등록 실패: ' + error.message); return }
    toast.success('매물이 등록되었습니다.')
    reset()
    setOpen(false)
    fetchList()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">매물 관리</h1>
        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 신규 매물
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <p className="text-gray-400 text-sm">등록된 매물이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(p => {
            const s = STATUS_MAP[p.status] || STATUS_MAP.vacant
            return (
              <div key={p.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{p.name}</h3>
                  <Badge color={s.color}>{s.label}</Badge>
                </div>
                <p className="text-sm text-gray-500 mb-3">{p.address}</p>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>유형: {TYPE_MAP[p.property_type] || p.property_type}</p>
                  {p.floor && <p>층: {p.floor}</p>}
                  {p.area_sqm && <p>전용면적: {p.area_sqm}㎡</p>}
                  <p>월세: {formatMoney(p.monthly_rent)}</p>
                  <p>보증금: {formatMoney(p.deposit)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="신규 매물 등록">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="매물명 *"><input {...register('name', { required: true })} className={inputCls} placeholder="예: 101호" /></Field>
          <Field label="주소 *"><input {...register('address', { required: true })} className={inputCls} placeholder="서울시 ..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="층"><input {...register('floor')} className={inputCls} placeholder="3" /></Field>
            <Field label="전용면적(㎡)"><input type="number" step="0.01" {...register('area_sqm')} className={inputCls} /></Field>
          </div>
          <Field label="유형">
            <select {...register('property_type')} className={inputCls} defaultValue="apartment">
              <option value="apartment">주택/아파트</option>
              <option value="office">사무실</option>
              <option value="store">상가</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="월세(원)"><input type="number" {...register('monthly_rent')} className={inputCls} /></Field>
            <Field label="보증금(원)"><input type="number" {...register('deposit')} className={inputCls} /></Field>
          </div>
          <Field label="비고"><textarea {...register('note')} className={inputCls} rows={2} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100">취소</button>
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
