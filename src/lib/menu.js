// 공용 메뉴 정의 (사이드바 + 하단 탭바 공유)
export const MENU = [
  { to: "/dashboard", label: "대시보드" },
  { to: "/insights", label: "인사이트" },
  { to: "/properties", label: "매물" },
  { to: "/tenants", label: "임차인" },
  { to: "/contracts", label: "계약" },
  { to: "/payments", label: "납부" },
  { to: "/invoices", label: "계산서" },
  { to: "/billing", label: "관리비" },
  { to: "/notifications", label: "알림" },
  { to: "/reports", label: "보고서" },
  { to: "/settings", label: "설정" },
]

// 모바일 하단 탭바 주요 4개 + 더보기
export const PRIMARY = ["/dashboard", "/insights", "/properties", "/tenants"]
