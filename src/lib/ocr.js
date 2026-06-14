const CLOVA_OCR_URL = import.meta.env.VITE_CLOVA_OCR_URL
const CLOVA_OCR_SECRET = import.meta.env.VITE_CLOVA_OCR_SECRET

export async function scanContract(file) {
  const base64 = await fileToBase64(file)
  const ext = file.name.split('.').pop().toLowerCase()

  const response = await fetch(CLOVA_OCR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OCR-SECRET': CLOVA_OCR_SECRET,
    },
    body: JSON.stringify({
      version: 'V2',
      requestId: Date.now().toString(),
      timestamp: Date.now(),
      images: [{ format: ext === 'pdf' ? 'pdf' : 'jpg', name: 'contract', data: base64 }],
    }),
  })

  const result = await response.json()
  return parseContractData(result)
}

function parseContractData(ocrResult) {
  const allText = ocrResult.images?.[0]?.fields?.map(f => f.inferText)?.join(' ') || ''
  const depositMatch = allText.match(/보증금[^\d]*(\d[\d,]+)원/)
  const rentMatch = allText.match(/월세[^\d]*(\d[\d,]+)원/)
  const startMatch = allText.match(/(\d{4})[년.\s]+(\d{1,2})[월.\s]+(\d{1,2})일.*부터/)
  const endMatch = allText.match(/(\d{4})[년.\s]+(\d{1,2})[월.\s]+(\d{1,2})일.*까지/)

  return {
    deposit: depositMatch ? parseInt(depositMatch[1].replace(/,/g, '')) : null,
    monthly_rent: rentMatch ? parseInt(rentMatch[1].replace(/,/g, '')) : null,
    contract_start: startMatch ? `${startMatch[1]}-${startMatch[2].padStart(2,'0')}-${startMatch[3].padStart(2,'0')}` : null,
    contract_end: endMatch ? `${endMatch[1]}-${endMatch[2].padStart(2,'0')}-${endMatch[3].padStart(2,'0')}` : null,
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
