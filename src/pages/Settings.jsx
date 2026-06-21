import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useSettings } from '../lib/SettingsContext'
import { usePlan } from '../lib/PlanContext'
import { FONT_OPTIONS, applyFont, loadFontPref, saveFontPref } from '../lib/applyFont'
import { PageHeader, Card, Button, Field, Pill, inputClass } from '../components/common/ui'

export default function Settings() {
  const { user, guest } = useAuth()
  const { settings, reload } = useSettings()
  const { plan } = usePlan()
  const [form, setForm] = useState({ clova_ocr_url: '', clova_ocr_secret: '', kakao_api_key: '' })
  const [saving, setSaving] = useState(false)
  const [fontPref, setFontPref] = useState(() => loadFontPref() || { id: 'pretendard' })

  function chooseFont(id) {
    const pref = { id }
    setFontPref(pref)
    applyFont(pref)
    saveFontPref(pref)
    toast.success('서체를 적용했습니다.')
  }

  function handleFontUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      toast('3MB 이하 폰트를 권장합니다(큰 폰트는 저장이 안 될 수 있어요).', { icon: 'ℹ️' })
    }
    const reader = new FileReader()
    reader.onload = () => {
      const pref = { id: 'custom', dataUrl: reader.result, name: file.name }
      setFontPref(pref)
      applyFont(pref)
      const ok = saveFontPref(pref)
      toast.success(ok ? `사용자 글꼴 "${file.name}" 적용` : `적용됨(용량이 커서 이 세션만 유지)`)
    }
    reader.onerror = () => toast.error('폰트 파일을 읽지 못했습니다.')
    reader.readAsDataURL(file)
    e.target.value = ''
  }

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

      <Card className="p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-1">서체</h2>
        <p className="text-xs text-gray-400 mb-4">앱 전체에 적용됩니다. (이 기기에 저장)</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {FONT_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => chooseFont(o.id)}
              className={`text-left rounded-xl px-4 py-3 ring-1 transition ${fontPref.id === o.id ? 'ring-blue-400 bg-blue-50/40' : 'ring-gray-200 hover:bg-gray-50'}`}
            >
              <span className="block text-xs text-gray-400 mb-1">{o.label}</span>
              <span className="block text-base text-gray-900" style={{ fontFamily: o.stack }}>
                임대 관리 rentflow 가나다 12,345원
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700 mb-1">내 폰트 업로드</p>
          <p className="text-xs text-gray-400 mb-2">woff2 / ttf / otf — 업로드하면 HTML에 임베드되어 즉시 적용됩니다.</p>
          <input type="file" accept=".woff2,.woff,.ttf,.otf,font/*" onChange={handleFontUpload} className="text-sm" />
          {fontPref.id === 'custom' && (
            <p className="text-xs text-blue-600 mt-2" style={{ fontFamily: "'RFUserFont', sans-serif" }}>
              현재 적용: {fontPref.name || '사용자 글꼴'} — 임대 관리 rentflow 가나다
            </p>
          )}
        </div>
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
