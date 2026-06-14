import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDate } from '../utils/formatters'
import { PageHeader, Card, Button, EmptyState } from '../components/common/ui'

export default function Reports() {
  const [income, setIncome] = useState([])
  const [vacancy, setVacancy] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [contractRes, propRes, payRes] = await Promise.all([
      supabase.from('contracts').select('monthly_rent, status').eq('status', 'active'),
      supabase.from('properties').select('status'),
      supabase.from('payments').select('*, contracts(tenants(name))').order('due_date', { ascending: false }).limit(100),
    ])
    const monthlyRent = (contractRes.data || []).reduce((s, c) => s + (c.monthly_rent || 0), 0)
    const months = []
    const base = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      months.push({ month: `${d.getMonth() + 1}월`, income: monthlyRent })
    }
    setIncome(months)
    const props = propRes.data || []
    const total = props.length || 1
    const vacant = props.filter(p => p.status === 'vacant').length
    const occ = props.filter(p => p.status === 'occupied').length
    setVacancy([
      { name: '공실', value: vacant, rate: Math.round((vacant / total) * 100) },
      { name: '계약중', value: occ, rate: Math.round((occ / total) * 100) },
    ])
    setPayments(payRes.data || [])
    setLoading(false)
  }

  function exportExcel() {
    const rows = payments.map(p => ({
      임차인: p.contracts?.tenants?.name || '-', 유형: p.payment_type, 금액: p.amount,
      납부기한: p.due_date, 납부일: p.paid_date || '', 상태: p.status,
    }))
    if (rows.length === 0) { toast.error('내보낼 납부 이력이 없습니다.'); return }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '납부이력')
    XLSX.writeFile(wb, `납부이력_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('엑셀 파일이 저장되었습니다.')
  }

  if (loading) return (
    <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
  )

  return (
    <div>
      <PageHeader
        title="보고서"
        subtitle="임대수입 추이와 공실률, 납부 이력을 분석합니다."
        action={<Button variant="secondary" onClick={exportExcel}>엑셀 내보내기</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">월별 임대수입</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={income}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="month" fontSize={12} stroke="#9ca3af" />
              <YAxis fontSize={12} stroke="#9ca3af" tickFormatter={v => `${(v / 10000).toLocaleString()}만`} />
              <Tooltip formatter={v => formatMoney(v)} />
              <Line type="monotone" dataKey="income" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-gray-900 mb-3">공실률</h2>
          <div className="space-y-3">
            {vacancy.map(v => (
              <div key={v.name}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{v.name}</span><span className="font-medium tnum">{v.value}개 ({v.rate}%)</span></div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${v.name === '공실' ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${v.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold text-gray-900 px-5 py-4 border-b border-gray-100">임차인별 납부 이력</h2>
        {payments.length === 0 ? (
          <EmptyState icon="📊" title="납부 이력이 없습니다" desc="납부 데이터가 쌓이면 분석이 표시됩니다." />
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
            <thead><tr className="text-gray-400 border-b border-gray-100"><th className="text-left px-5 py-3 font-medium">임차인</th><th className="text-left font-medium">유형</th><th className="text-right font-medium">금액</th><th className="text-left pl-4 font-medium">납부기한</th><th className="text-left font-medium">상태</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-5 py-3.5 text-gray-900">{p.contracts?.tenants?.name || '-'}</td>
                  <td className="text-gray-600">{p.payment_type}</td>
                  <td className="text-right text-gray-700 tnum">{formatMoney(p.amount)}</td>
                  <td className="pl-4 text-gray-600 tnum">{formatDate(p.due_date)}</td>
                  <td className={p.status === 'overdue' ? 'text-rose-500' : p.status === 'paid' ? 'text-emerald-600' : 'text-gray-500'}>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </Card>
    </div>
  )
}
