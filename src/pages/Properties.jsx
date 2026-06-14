import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { formatMoney } from '../utils/formatters'
import { downloadXlsxTemplate, parseSheet, cellStr, cellNum } from '../lib/bulkImport'
import Modal from '../components/common/Modal'
import { PageHeader, Card, Button, Field, EmptyState, Pill, IconBtn, EditIcon, TrashIcon, inputClass } from '../components/common/ui'

const STATUS_MAP = {
  vacant: { color: 'yellow', label: '공실' },
  occupied: { color: 'green', label: '계약중' },
  expiring: { color: 'red', label: '만료예정' },
}
const TYPE_MAP = { apartment: '주택/아파트', office: '사무실', store: '상가' }

const TEMPLATE_HEADERS = ['매물명', '주소', '층', '전용면적(㎡)', '유형(apartment/office/store)', '상태(vacant/occupied/expiring)', '월세(원)', '보증금(원)', '비고']
const TEMPLATE_EXAMPLE = ['101호', '서울시 강남구 …', '1', '29.75', 'apartment', 'vacant', '700000', '10000000', '예시행 — 삭제 후 입력']

const normType = (v) => (['apartment', 'office', 'store'].includes(String(v).trim()) ? String(v).trim() : 'apartment')
const normStatus = (v) => (['vacant', 'occupied', 'expiring'].includes(String(v).trim()) ? String(v).trim() : 'vacant')

export default function Properties() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const fileRef = useRef(null)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  useEffect(() => { fetchList() }, [])

  async function fetchList() {
    setLoading(true)
    const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false })
    if (error) toast.error('매물 목록 로드 실패: ' + error.message)
    setList(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    reset({ name: '', address: '', floor: '', area_sqm: '', property_type: 'apartment', status: 'vacant', monthly_rent: '', deposit: '', note: '' })
    setOpen(true)
  }
  function openEdit(p) {
    setEditing(p)
    reset({
      name: p.name, address: p.address, floor: p.floor || '', area_sqm: p.area_sqm || '',
      property_type: p.property_type || 'apartment', status: p.status || 'vacant',
      monthly_rent: p.monthly_rent || '', deposit: p.deposit || '', note: p.note || '',
    })
    setOpen(true)
  }

  async function onSubmit(v) {
    const payload = {
      name: v.name, address: v.address, floor: v.floor || null,
      area_sqm: v.area_sqm ? Number(v.area_sqm) : null,
      property_type: v.property_type, status: v.status,
      monthly_rent: v.monthly_rent ? Number(v.monthly_rent) : null,
      deposit: v.deposit ? Number(v.deposit) : null, note: v.note || null,
    }

    // 신규 등록 시 중복 감지
    if (!editing) {
      const { data: dup } = await supabase.from('properties').select('id, name').ilike('name', v.name.trim()).limit(1)
      if (dup && dup.length) {
        const ok = confirm(`'${v.name}' 매물이 이미 등록되어 있습니다.\n\n[확인] 기존 항목을 이 내용으로 수정\n[취소] 중단`)
        if (!ok) return
        const res = await supabase.from('properties').update(payload).eq('id', dup[0].id)
        if (res.error) { toast.error('수정 실패: ' + res.error.message); return }
        toast.success('기존 매물을 수정했습니다.')
        setOpen(false); fetchList(); return
      }
    }

    const res = editing
      ? await supabase.from('properties').update(payload).eq('id', editing.id)
      : await supabase.from('properties').insert(payload)
    if (res.error) { toast.error('저장 실패: ' + res.error.message); return }
    toast.success(editing ? '매물이 수정되었습니다.' : '매물이 등록되었습니다.')
    setOpen(false)
    fetchList()
  }

  async function onDelete(p) {
    if (!confirm(`'${p.name}' 매물을 삭제할까요? 되돌릴 수 없습니다.`)) return
    const { error } = await supabase.from('properties').delete().eq('id', p.id)
    if (error) { toast.error('삭제 실패: ' + error.message); return }
    toast.success('삭제되었습니다.')
    fetchList()
  }

  function downloadTemplate() {
    downloadXlsxTemplate('매물_일괄등록_양식.xlsx', TEMPLATE_HEADERS, [TEMPLATE_EXAMPLE])
    toast.success('양식을 다운로드했습니다.')
  }

  async function handleBulk(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const t = toast.loading('엑셀 분석 중…')
    try {
      const rows = await parseSheet(file)
      const { data: existing } = await supabase.from('properties').select('name')
      const have = new Set((existing || []).map((p) => (p.name || '').trim()))
      const seen = new Set()
      let skipped = 0
      const toInsert = []
      for (const r of rows) {
        const name = cellStr(r['매물명'])
        const address = cellStr(r['주소'])
        if (!name || !address || name === '101호') { skipped++; continue } // 예시행/누락 제외
        if (have.has(name) || seen.has(name)) { skipped++; continue } // 중복 제외
        seen.add(name)
        toInsert.push({
          name, address,
          floor: cellStr(r['층']),
          area_sqm: cellNum(r['전용면적(㎡)']),
          property_type: normType(r['유형(apartment/office/store)']),
          status: normStatus(r['상태(vacant/occupied/expiring)']),
          monthly_rent: cellNum(r['월세(원)']),
          deposit: cellNum(r['보증금(원)']),
          note: cellStr(r['비고']),
        })
      }
      if (!toInsert.length) { toast.error(`등록할 신규 매물이 없습니다 (중복/누락 ${skipped}건).`, { id: t }); return }
      const { error } = await supabase.from('properties').insert(toInsert)
      if (error) throw error
      toast.success(`${toInsert.length}건 등록 완료${skipped ? `, ${skipped}건 건너뜀` : ''}.`, { id: t })
      fetchList()
    } catch (err) {
      toast.error('업로드 실패: ' + (err.message || err), { id: t })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader
        title="매물 관리"
        subtitle="개별 등록 또는 엑셀로 일괄 업로드할 수 있습니다."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={downloadTemplate}>양식 다운로드</Button>
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>엑셀 업로드</Button>
            <Button onClick={openCreate}>+ 신규 매물</Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleBulk} className="hidden" />
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <Card><EmptyState icon="🏢" title="등록된 매물이 없습니다" desc="개별 등록하거나 엑셀 양식으로 일괄 업로드하세요." action={<Button onClick={openCreate}>+ 신규 매물</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(p => {
            const s = STATUS_MAP[p.status] || STATUS_MAP.vacant
            return (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{p.address}</p>
                  </div>
                  <Pill color={s.color}>{s.label}</Pill>
                </div>
                <div className="text-sm text-gray-600 space-y-1 mt-3 tnum">
                  <Row k="유형" v={TYPE_MAP[p.property_type] || p.property_type} />
                  {p.floor && <Row k="층" v={p.floor} />}
                  {p.area_sqm && <Row k="전용면적" v={`${p.area_sqm}㎡`} />}
                  <Row k="월세" v={formatMoney(p.monthly_rent)} />
                  <Row k="보증금" v={formatMoney(p.deposit)} />
                </div>
                <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-gray-100">
                  <IconBtn title="수정" onClick={() => openEdit(p)}>{EditIcon}</IconBtn>
                  <IconBtn title="삭제" danger onClick={() => onDelete(p)}>{TrashIcon}</IconBtn>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? '매물 수정' : '신규 매물 등록'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <Field label="매물명 *"><input {...register('name', { required: true })} className={inputClass} placeholder="예: 101호" /></Field>
          <Field label="주소 *"><input {...register('address', { required: true })} className={inputClass} placeholder="서울시 ..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="층"><input {...register('floor')} className={inputClass} placeholder="3" /></Field>
            <Field label="전용면적(㎡)"><input type="number" step="0.01" {...register('area_sqm')} className={inputClass} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="유형">
              <select {...register('property_type')} className={inputClass}>
                <option value="apartment">주택/아파트</option>
                <option value="office">사무실</option>
                <option value="store">상가</option>
              </select>
            </Field>
            <Field label="상태">
              <select {...register('status')} className={inputClass}>
                <option value="vacant">공실</option>
                <option value="occupied">계약중</option>
                <option value="expiring">만료예정</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="월세(원)"><input type="number" {...register('monthly_rent')} className={inputClass} /></Field>
            <Field label="보증금(원)"><input type="number" {...register('deposit')} className={inputClass} /></Field>
          </div>
          <Field label="비고"><textarea {...register('note')} className={inputClass} rows={2} /></Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" disabled={isSubmitting}>{editing ? '수정' : '등록'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{k}</span>
      <span className="text-gray-700 font-medium">{v}</span>
    </div>
  )
}
