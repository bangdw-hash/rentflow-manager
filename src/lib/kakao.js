export async function sendBillingNotice({ phone, tenantName, month, amount, dueDate, apiKey }) {
  const message = `[rentflow] ${tenantName}님\n\n${month}월 관리비 청구\n청구금액: ${amount.toLocaleString('ko-KR')}원\n납부기한: ${dueDate}`
  return sendKakaoMessage({ phone, message, apiKey })
}

export async function sendExpiryNotice({ phone, tenantName, expiryDate, dday, apiKey }) {
  const message = `[rentflow] ${tenantName}님\n\n계약 만료 안내\n만료일: ${expiryDate} (D-${dday})\n계약 갱신 관련 연락 바랍니다.`
  return sendKakaoMessage({ phone, message, apiKey })
}

export async function sendOverdueNotice({ phone, tenantName, amount, overdueDays, apiKey }) {
  const message = `[rentflow] ${tenantName}님\n\n미납 안내\n미납금액: ${amount.toLocaleString('ko-KR')}원\n연체일수: ${overdueDays}일`
  return sendKakaoMessage({ phone, message, apiKey })
}

async function sendKakaoMessage({ phone, message, apiKey }) {
  const key = apiKey || import.meta.env.VITE_KAKAO_API_KEY
  if (!key) {
    return { success: false, error: '카카오 API 키가 설정되지 않았습니다. [설정] 메뉴에서 등록하세요.' }
  }
  try {
    const response = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `KakaoAK ${key}`,
      },
      body: new URLSearchParams({
        template_object: JSON.stringify({
          object_type: 'text',
          text: message,
          link: { web_url: 'https://bangdw-hash.github.io/rentflow-manager' },
        }),
      }),
    })
    const data = await response.json()
    return { success: data.result_code === 0, data }
  } catch (error) {
    return { success: false, error }
  }
}
