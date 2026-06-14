import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatMoney, getDday } from '../utils/formatters'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, vacant: 0, occupied: 0 })
  const [expiring, setExpiring] = useState([])
  const [overdue, setOverdue] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

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
    const in30 = new Date()
    in30.setDate(today.getDate() + 30)
    const exp = (contractRes.data || []).filter(c => {
      const end = new Date(c.contract_end)
      return end >= today && end <= in30
    })
    setExpiring(exp)
    setOverdue(payRes.data || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">대시보드</h1>

      {/* 매물 현황 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '전체 매물', value: stats.total + '개', color: 'border-blue-500' },
          { label: '계약 중', value: stats.occupied + '개', color: 'border-green-500' },
          { label: '공실', value: stats.vacant + '개', color: 'border-yellow-500' },
        ].map(card => (
          <div key={card.label} className={`bg-white rounded-xl shadow-sm border-t-4 ${card.color} p-5`}>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* 계약 만료 임박 */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">⚠️ 계약 만료 임박 (30일 이내)</h2>
        {expiring.length === 0 ? (
          <p className="text-sm text-gray-400">만료 임박 계약 없음</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b"><th className="text-left py-1">임차인</th><th className="text-left">매물</th><th className="text-left">만료일</th><th className="text-left">D-day</th></tr></thead>
            <tbody>
              {expiring.map(c => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2">{c.tenants?.name}</td>
                  <td>{c.properties?.name}</td>
                  <td>{c.contract_end}</td>
                  <td className="text-red-500 font-medium">D-{getDday(c.contract_end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 미납 현황 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-3">🔴 미납 현황</h2>
        {overdue.length === 0 ? (
          <p className="text-sm text-gray-400">미납 없음</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b"><th className="text-left py-1">임차인</th><th className="text-left">금액</th><th className="text-left">납부기한</th></tr></thead>
            <tbody>
              {overdue.map(p => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2">{p.contracts?.tenants?.name}</td>
                  <td className="text-red-500 font-medium">{formatMoney(p.amount)}</td>
                  <td>{p.due_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
