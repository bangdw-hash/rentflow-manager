const FORMAT_MAP = { jpg: 'jpg', jpeg: 'jpg', png: 'png', pdf: 'pdf', tif: 'tiff', tiff: 'tiff' }

// config.url / config.secret 를 우선 사용하고, 없으면 빌드 환경변수로 폴백
export async function scanContract(file, config = {}) {
  const url = config.url || import.meta.env.VITE_CLOVA_OCR_URL
  const secret = config.secret || import.meta.env.VITE_CLOVA_OCR_SECRET

  if (!url || !secret) {
    throw new Error('OCR이 아직 설정되지 않았습니다. [설정] 메뉴에서 Clova OCR URL/Secret을 등록하세요.')
  }

  const base64 = await fileToBase64(file)
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const format = FORMAT_MAP[ext] || 'jpg'

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OCR-SECRET': secret },
      body: JSON.stringify({
        version: 'V2',
        requestId: Date.now().toString(),
        timestamp: Date.now(),
        images: [{ format, name: 'contract', data: base64 }],
      }),
    })
  } catch {
    throw new Error('OCR 서버에 연결하지 못했습니다. (네트워크/CORS 또는 OCR URL 오류)')
  }

  if (!response.ok) {
    let detail = ''
    try { detail = (await response.text()).slice(0, 120) } catch { /* noop */ }
    throw new Error(`OCR 요청 실패 (HTTP ${response.status}). API 키/URL을 확인하세요. ${detail}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('json')) {
    throw new Error('OCR 응답이 JSON이 아닙니다. VITE_CLOVA_OCR_URL이 올바른 Clova OCR 엔드포인트인지 확인하세요.')
  }

  const result = await response.json()
  return parseContractData(result)
}

function parseContractData(ocrResult) {
  const allText = ocrResult.images?.[0]?.fields?.map((f) => f.inferText)?.join(' ') || ''
  const depositMatch = allText.match(/보증금[^\d]*(\d[\d,]+)원/)
  const rentMatch = allText.match(/월세[^\d]*(\d[\d,]+)원/)
  const startMatch = allText.match(/(\d{4})[년.\s]+(\d{1,2})[월.\s]+(\d{1,2})일.*부터/)
  const endMatch = allText.match(/(\d{4})[년.\s]+(\d{1,2})[월.\s]+(\d{1,2})일.*까지/)

  return {
    deposit: depositMatch ? parseInt(depositMatch[1].replace(/,/g, '')) : null,
    monthly_rent: rentMatch ? parseInt(rentMatch[1].replace(/,/g, '')) : null,
    contract_start: startMatch ? `${startMatch[1]}-${startMatch[2].padStart(2, '0')}-${startMatch[3].padStart(2, '0')}` : null,
    contract_end: endMatch ? `${endMatch[1]}-${endMatch[2].padStart(2, '0')}-${endMatch[3].padStart(2, '0')}` : null,
    raw_text: allText,
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
