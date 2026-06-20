import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useSettings } from '../lib/SettingsContext'
import { usePlan } from '../lib/PlanContext'
import { PageHeader, Card, Button, Field, Pill, inputClass } from '../components/common/ui'

export default function Settings() {
  const { user, guest } = useAuth()
  const { settings, reload } = useSettings()
  const { plan } = usePlan()
  const [form, setForm] = useState({ clova_ocr_url: '', clova_ocr_secret: '', kakao_api_key: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({
      clova_ocr_url: settings.clova_ocr_url || '',
      clova_ocr_secret: settings.clova_ocr_secret || '',
      kakao_api_key: settings.kakao_api_key || '',
    })
  }, [settings])

  async function save(e) {
    e.preventDefault()
    if (!user) { toast.error('로그인 후 이용하세요.'); return }
    setSaving(true)
    const { error } = await supabase.from('user_settings').upsert({
      id: user.id,
      clova_ocr_url: form.clova_ocr_url || null,
      clova_ocr_secret: form.clova_ocr_secret || null,
      kakao_api_key: form.kakao_api_key || null,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) { toast.error('저장 실패: ' + error.message); return }
    toast.success('설정을 저장했습니다.')
    reload()
  }

  if (guest) {
    return (
      <div>
        <PageHeader title="설정" />
        <Card className="p-6 text-sm text-gray-500">둘러보기 모드에서는 설정을 저장할 수 없습니다. 로그인 후 이용하세요.</Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="설정" subtitle="계정에 연동되는 API 키와 정보를 관리합니다. (내 계정에만 저장)" />

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">현재 플랜</h2>
            <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
          </div>
          <Pill color={plan === 'pro' ? 'blue' : 'gray'}>{plan === 'pro' ? 'Pro' : 'Free'}</Pill>
        </div>
        <p className="text-xs text-gray-400">Free: 매물 3 · 임차인 5 · 알림 월 10건 · Pro: 무제한</p>
      </Card>

      <form onSubmit={save}>
        <Card className="p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-1">Naver Clova OCR</h2>
          <p className="text-xs text-gray-400 mb-4">계약서 OCR 자동 인식에 사용됩니다. (네이버 클라우드 콘솔 → CLOVA OCR)</p>
          <div className="space-y-3.5">
            <Field label="OCR Invoke URL" hint="예: https://xxxx.apigw.ntruss.com/custom/v1/.../general">
              <input value={form.clova_ocr_url} onChange={(e) => setForm({ ...form, clova_ocr_url: e.target.value })} className={inputClass} placeholder="https://..." />
            </Field>
            <Field label="OCR Secret Key">
              <input type="password" value={form.clova_ocr_secret} onChange={(e) => setForm({ ...form, clova_ocr_secret: e.target.value })} className={inputClass} placeholder="시크릿 키" autoComplete="off" />
            </Field>
          </div>
        </Card>

        <Card className="p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-1">카카오 알림</h2>
          <p className="text-xs text-gray-400 mb-4">알림 발송에 사용됩니다. (카카오 REST API 키)</p>
          <Field label="Kakao REST API Key">
            <input type="password" value={form.kakao_api_key} onChange={(e) => setForm({ ...form, kakao_api_key: e.target.value })} className={inputClass} placeholder="REST API 키" autoComplete="off" />
          </Field>
          <p className="text-[11px] text-gray-400 mt-2">※ 브라우저 직접 호출은 CORS 제한이 있을 수 있어, 향후 서버(Edge Function) 경유가 권장됩니다.</p>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? '저장 중…' : '설정 저장'}</Button>
        </div>
      </form>

      <p className="text-xs text-gray-400 mt-4 leading-relaxed bg-gray-50 rounded-xl p-3">
        키는 본인 계정(user_settings)에만 저장되며 RLS로 다른 사용자는 접근할 수 없습니다.
        GitHub Secrets에 동일 값을 넣어두면 전역 기본값으로도 동작합니다(개인 설정이 우선).
      </p>
    </div>
  )
}
