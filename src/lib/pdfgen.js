import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function generateBillingPdf(elementId, filename) {
  const element = document.getElementById(elementId)
  if (!element) throw new Error('PDF 대상 요소 없음')

  const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
  pdf.save(filename || `관리비정산서_${new Date().toISOString().slice(0,7)}.pdf`)
}
