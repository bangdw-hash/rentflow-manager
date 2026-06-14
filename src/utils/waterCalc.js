export function calcWaterBill(totalBill, totalUsage, units, method = 'area') {
  if (!units || units.length === 0) return []
  return units.map(unit => {
    let share = 0
    if (method === 'usage') {
      share = totalUsage > 0 ? (unit.usage / totalUsage) * totalBill : 0
    } else {
      const totalArea = units.reduce((sum, u) => sum + (u.area || 0), 0)
      share = totalArea > 0 ? (unit.area / totalArea) * totalBill : 0
    }
    return {
      id: unit.id,
      name: unit.name,
      area: unit.area,
      usage: unit.usage || 0,
      billedAmount: Math.round(share),
      method,
    }
  })
}

export function detectLeakage(current, prev, threshold = 2) {
  if (!prev || prev === 0) return false
  return current >= prev * threshold
}
