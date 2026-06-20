import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const SettingsCtx = createContext({ settings: {}, loading: true, reload: () => {} })

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!user) { setSettings({}); setLoading(false); return }
    const { data } = await supabase.from('user_settings').select('*').eq('id', user.id).maybeSingle()
    setSettings(data || {})
    setLoading(false)
  }, [user])

  useEffect(() => { setLoading(true); reload() }, [reload])

  return (
    <SettingsCtx.Provider value={{ settings, loading, reload }}>
      {children}
    </SettingsCtx.Provider>
  )
}

export const useSettings = () => useContext(SettingsCtx)
