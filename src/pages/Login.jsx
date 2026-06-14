import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { Button, Field, inputClass } from '../components/common/ui'

export default function Login() {
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!email || !pw) { toast.error('이메일과 비밀번호를 입력하세요.'); return }
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
        if (error) throw error
        toast.success('로그인되었습니다.')
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password: pw })
        if (error) throw error
        if (data.session) toast.success('가입 완료! 로그인되었습니다.')
        else toast.success('확인 메일을 보냈습니다. 메일 인증 후 로그인하세요.')
      }
    } catch (err) {
      toast.error(err.message || '인증에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-blue-600 text-white shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
          </span>
          <span className="font-bold text-gray-900 text-2xl tracking-tight">rentflow</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 p-6">
          <h1 className="text-lg font-bold text-gray-900 mb-1">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h1>
          <p className="text-sm text-gray-500 mb-5">임대 관리를 시작하세요.</p>

          <form onSubmit={submit} className="space-y-3.5">
            <Field label="이메일">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" autoComplete="email" />
            </Field>
            <Field label="비밀번호">
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputClass} placeholder="6자 이상" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? '처리 중…' : mode === 'login' ? '로그인' : '회원가입'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-blue-600 font-medium hover:underline"
            >
              {mode === 'login' ? '회원가입' : '로그인'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          rentflow — 임대인·임차인 통합 관리
        </p>
      </div>
    </div>
  )
}
