import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDate } from '../utils/formatters'

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

    // 월별 임대수입 (최근 6개월, 활성 계약 월세 합계를 기준선으로)
    const monthlyRent = (contractRes.data || []).reduce((s, c) => s + (c.monthly_rent || 0), 0)
    const months = []
    const base = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      months.push({ month: `${d.getMonth() + 1}월`, income: monthlyRent })
    }
    setIncome(months)

    // 공실률
    const props = propRes.data || []
    const total = props.length || 1
    const vacant = props.filter(p => p.status === 'vacant').length
    setVacancy([
      { name: '공실', value: vacant, rate: Math.round((vacant / total) * 100) },
      { name: '계약중', value: props.filter(p => p.status === 'occupied').length, rate: Math.round((props.filter(p => p.status === 'occupied').length / total) * 100) },
    ])

    setPayments(payRes.data || [])
    setLoading(false)
  }

  function exportExcel() {
    const rows = payments.map(p => ({
      임차인: p.contracts?.tenants?.name || '-',
      유형: p.payment_type,
      금액: p.amount,
      납부기한: p.due_date,
      납부일: p.paid_date || '',
      상태: p.status,
    }))
    if (rows.length === 0) { toast.error('내보낼 납부 이력이 없습니다.'); return }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '납부이력')
    XLSX.writeFile(wb, `납부이력_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('엑셀 파일이 저장되었습니다.')
  }

  if (loading) return (
    <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}</div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">보고서</h1>
        <button onClick={exportExcel} className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700">엑셀 내보내기</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-700 mb-3">월별 임대수입</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={income}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={v => `${(v / 10000).toLocaleString()}만`} />
              <Tooltip formatter={v => formatMoney(v)} />
              <Line type="monotone" dataKey="income" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-3">공실률</h2>
          <div className="space-y-3">
            {vacancy.map(v => (
              <div key={v.name}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{v.name}</span><span className="font-medium">{v.value}개 ({v.rate}%)</span></div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${v.name === '공실' ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${v.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <h2 className="font-semibold text-gray-700 px-4 py-3 border-b">임차인별 납부 이력</h2>
        {payments.length === 0 ? (
          <p className="text-gray-400 text-sm p-4">납부 이력이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
            <thead><tr className="text-gray-400 border-b bg-gray-50"><th className="text-left px-4 py-2">임차인</th><th className="text-left">유형</th><th className="text-left">금액</th><th className="text-left">납부기한</th><th className="text-left">상태</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{p.contracts?.tenants?.name || '-'}</td>
                  <td>{p.payment_type}</td>
                  <td>{formatMoney(p.amount)}</td>
                  <td className="text-gray-600">{formatDate(p.due_date)}</td>
                  <td className={p.status === 'overdue' ? 'text-red-500' : p.status === 'paid' ? 'text-green-600' : 'text-gray-500'}>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}
