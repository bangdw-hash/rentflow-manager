import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatMoney, getDday } from '../utils/formatters'
import { PageHeader, Card, StatCard, EmptyState, Pill, Button } from '../components/common/ui'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, vacant: 0, occupied: 0 })
  const [expiring, setExpiring] = useState([])
  const [overdue, setOverdue] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [propRes, contractRes, payRes] = await Promise.all([
      supabase.from('properties').select('status'),
      supabase.from('contracts').select('*, tenants(name, phone), properties(name)').eq('status', 'active'),
      supabase.from('payments').select('*, contracts(*, tenants(name))').eq('status', 'overdue'),
    ])
    const props = propRes.data || []
    setStats({
      total: props.length,
      vacant: props.filter(p => p.status === 'vacant').length,
      occupied: props.filter(p => p.status === 'occupied').length,
    })
    const today = new Date()
    const in30 = new Date(); in30.setDate(today.getDate() + 30)
    setExpiring((contractRes.data || []).filter(c => {
      const end = new Date(c.contract_end)
      return end >= today && end <= in30
    }))
    setOverdue(payRes.data || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="대시보드"
        subtitle="오늘의 임대 현황을 한눈에 확인하세요."
        action={<Link to="/insights"><Button variant="subtle">인사이트 보기 →</Button></Link>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard accent="bg-blue-500" label="전체 매물" value={`${stats.total}개`} />
        <StatCard accent="bg-emerald-500" label="계약 중" value={`${stats.occupied}개`} />
        <StatCard accent="bg-amber-500" label="공실" value={`${stats.vacant}개`} />
      </div>

      <Card className="p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">⚠️ 계약 만료 임박 <span className="text-gray-400 font-normal text-sm">(30일 이내)</span></h2>
        {expiring.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">만료 임박 계약이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[480px]">
            <thead><tr className="text-gray-400 border-b border-gray-100"><th className="text-left py-2 font-medium">임차인</th><th className="text-left font-medium">매물</th><th className="text-left font-medium">만료일</th><th className="text-right font-medium">D-day</th></tr></thead>
            <tbody>
              {expiring.map(c => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="py-2.5 text-gray-900">{c.tenants?.name}</td>
                  <td className="text-gray-600">{c.properties?.name}</td>
                  <td className="text-gray-600 tnum">{c.contract_end}</td>
                  <td className="text-right"><Pill color="red">D-{getDday(c.contract_end)}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-gray-900 mb-3">🔴 미납 현황</h2>
        {overdue.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">미납이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[360px]">
            <thead><tr className="text-gray-400 border-b border-gray-100"><th className="text-left py-2 font-medium">임차인</th><th className="text-right font-medium">금액</th><th className="text-left pl-4 font-medium">납부기한</th></tr></thead>
            <tbody>
              {overdue.map(p => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="py-2.5 text-gray-900">{p.contracts?.tenants?.name}</td>
                  <td className="text-right font-medium text-rose-600 tnum">{formatMoney(p.amount)}</td>
                  <td className="pl-4 text-gray-600 tnum">{p.due_date}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </Card>
    </div>
  )
}
