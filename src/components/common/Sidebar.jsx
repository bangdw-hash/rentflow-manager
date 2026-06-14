import { NavLink } from "react-router-dom"
import toast from "react-hot-toast"
import { useAuth, signOut } from "../../lib/AuthContext"

const menu = [
  { to: "/dashboard", label: "대시보드" },
  { to: "/insights", label: "인사이트" },
  { to: "/properties", label: "매물" },
  { to: "/tenants", label: "임차인" },
  { to: "/contracts", label: "계약" },
  { to: "/payments", label: "납부" },
  { to: "/billing", label: "관리비" },
  { to: "/notifications", label: "알림" },
  { to: "/reports", label: "보고서" },
]

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { user, guest, exitGuest } = useAuth()
  async function handleLogout() {
    if (guest) { exitGuest(); return }
    await signOut()
    toast.success("로그아웃되었습니다.")
  }
  return (
    <>
      {/* 모바일 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={
          "fixed z-40 top-0 left-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col " +
          "transform transition-transform duration-200 ease-out md:translate-x-0 " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-blue-600 text-white shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l9-7 9 7" />
                <path d="M5 10v10h14V10" />
              </svg>
            </span>
            <p className="font-bold text-gray-900 text-lg tracking-tight">rentflow</p>
          </div>
          <button
            className="md:hidden text-gray-400 hover:text-gray-600 text-xl leading-none"
            onClick={onClose}
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {menu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              onClick={onClose}
              className={({ isActive }) =>
                "block px-3 py-2.5 rounded text-sm " +
                (isActive
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50")
              }
            >
              {m.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3">
          {guest ? (
            <p className="px-2 pb-2 text-xs text-amber-600">둘러보기 모드</p>
          ) : user?.email ? (
            <p className="px-2 pb-2 text-xs text-gray-400 truncate" title={user.email}>{user.email}</p>
          ) : null}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded text-sm text-gray-600 hover:bg-gray-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
            {guest ? "로그인 화면으로" : "로그아웃"}
          </button>
        </div>
      </aside>
    </>
  )
}
