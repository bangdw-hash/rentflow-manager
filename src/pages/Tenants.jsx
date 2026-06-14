import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { scanContract } from '../lib/ocr'
import { formatDate } from '../utils/formatters'
import { downloadXlsxTemplate, parseSheet, cellStr } from '../lib/bulkImport'
import Modal from '../components/common/Modal'
import { PageHeader, Card, Button, Field, EmptyState, IconBtn, EditIcon, TrashIcon, inputClass } from '../components/common/ui'

const TEMPLATE_HEADERS = ['이름', '연락처', '주민번호', '이메일', '배정매물명(선택)']
const TEMPLATE_EXAMPLE = ['홍길동', '010-1234-5678', '900101-1******', 'hong@example.com', '101호']

export default function Tenants() {
  const [list, setList] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
  const fileRef = useRef(null)
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
    // 신규 등록 시 연락처 기준 중복 감지
    if (!editing && v.phone) {
      const { data: dup } = await supabase.from('tenants').select('id, name, phone').eq('phone', v.phone.trim()).limit(1)
      if (dup && dup.length) {
        const ok = confirm(`연락처 '${v.phone}' 임차인(${dup[0].name})이 이미 등록되어 있습니다.\n\n[확인] 기존 항목을 이 내용으로 수정\n[취소] 중단`)
        if (!ok) return
        const res = await supabase.from('tenants').update(payload).eq('id', dup[0].id)
        if (res.error) { toast.error('수정 실패: ' + res.error.message); return }
        toast.success('기존 임차인을 수정했습니다.')
        setOpen(false); setOcrResult(null); fetchAll(); return
      }
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

  function downloadTemplate() {
    downloadXlsxTemplate('임차인_일괄등록_양식.xlsx', TEMPLATE_HEADERS, [TEMPLATE_EXAMPLE])
    toast.success('양식을 다운로드했습니다.')
  }

  async function handleBulk(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const t = toast.loading('엑셀 분석 중…')
    try {
      const rows = await parseSheet(file)
      const { data: existing } = await supabase.from('tenants').select('phone')
      const have = new Set((existing || []).map((p) => (p.phone || '').trim()))
      const propByName = new Map(properties.map((p) => [p.name.trim(), p.id]))
      const seen = new Set()
      let skipped = 0
      const toInsert = []
      for (const r of rows) {
        const name = cellStr(r['이름'])
        const phone = cellStr(r['연락처'])
        if (!name || !phone || name === '홍길동') { skipped++; continue }
        if (have.has(phone) || seen.has(phone)) { skipped++; continue }
        seen.add(phone)
        const pname = cellStr(r['배정매물명(선택)'])
        toInsert.push({
          name, phone,
          id_number: cellStr(r['주민번호']),
          email: cellStr(r['이메일']),
          property_id: pname ? propByName.get(pname) || null : null,
        })
      }
      if (!toInsert.length) { toast.error(`등록할 신규 임차인이 없습니다 (중복/누락 ${skipped}건).`, { id: t }); return }
      const { error } = await supabase.from('tenants').insert(toInsert)
      if (error) throw error
      toast.success(`${toInsert.length}건 등록 완료${skipped ? `, ${skipped}건 건너뜀` : ''}.`, { id: t })
      fetchAll()
    } catch (err) {
      toast.error('업로드 실패: ' + (err.message || err), { id: t })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader
        title="임차인 관리"
        subtitle="개별/일괄 등록, 계약서 OCR, 이메일(전자계산서용)을 관리합니다."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={downloadTemplate}>양식 다운로드</Button>
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>엑셀 업로드</Button>
            <Button onClick={openCreate}>+ 신규 임차인</Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleBulk} className="hidden" />
          </div>
        }
      />

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <Card><EmptyState icon="👤" title="등록된 임차인이 없습니다" desc="개별 등록하거나 엑셀 양식으로 일괄 업로드하세요." action={<Button onClick={openCreate}>+ 신규 임차인</Button>} /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">이름</th>
                <th className="text-left font-medium">연락처</th>
                <th className="text-left font-medium">이메일</th>
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
                    <td className="text-gray-600">{t.email || '-'}</td>
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
                <p className="text-gray-400">※ 계약 정보는 계약 페이지에서 OCR로 자동 입력됩니다.</p>
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <Field label="이름 *"><input {...register('name', { required: true })} className={inputClass} /></Field>
          <Field label="연락처 *"><input {...register('phone', { required: true })} className={inputClass} placeholder="010-0000-0000" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="주민번호"><input {...register('id_number')} className={inputClass} /></Field>
            <Field label="이메일" hint="전자계산서 발행 시 사용"><input type="email" {...register('email')} className={inputClass} /></Field>
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
