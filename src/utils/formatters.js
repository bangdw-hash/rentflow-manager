export const formatMoney = (n) => (n || 0).toLocaleString('ko-KR') + '원'
export const formatDate = (d) => d ? new Date(d).toLocaleDateString('ko-KR') : '-'
export const getDday = (dateStr) => {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}
