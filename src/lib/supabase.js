import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경변수가 비어 있어도 createClient가 예외를 던져 앱 전체가 흰 화면이 되는 것을 방지한다.
// 키가 없으면 콘솔에 명확히 경고하고, 데이터 호출만 실패(토스트)하도록 placeholder로 안전하게 생성한다.
if (!supabaseUrl || !supabaseKey) {
  console.error(
    "[rentflow] Supabase 환경변수가 설정되지 않았습니다. " +
    "GitHub Actions Secrets(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)를 확인하세요."
  )
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder-anon-key"
)
