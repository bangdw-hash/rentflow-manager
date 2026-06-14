import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

export const PLAN_LIMITS = {
  free: { properties: 3, tenants: 5, kakao: 10, label: 'Free' },
  pro: { properties: Infinity, tenants: Infinity, kakao: Infinity, label: 'Pro' },
}

const PlanCtx = createContext({ plan: 'free', limits: PLAN_LIMITS.free, loading: true })

export function PlanProvider({ children }) {
  const { user } = useAuth()
  const [plan, setPlan] = useState('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      if (!user) { setPlan('free'); setLoading(false); return }
      // profiles 테이블이 없거나 행이 없으면 free 로 안전 처리
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle()
      if (!active) return
      setPlan(data?.plan === 'pro' ? 'pro' : 'free')
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [user])

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free
  return <PlanCtx.Provider value={{ plan, limits, loading }}>{children}</PlanCtx.Provider>
}

export const usePlan = () => useContext(PlanCtx)
