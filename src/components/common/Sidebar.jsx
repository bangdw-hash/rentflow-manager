import { NavLink } from "react-router-dom"

const menu = [
  { to: "/dashboard", label: "대시보드" },
  { to: "/properties", label: "매물" },
  { to: "/tenants", label: "임차인" },
  { to: "/contracts", label: "계약" },
  { to: "/billing", label: "관리비" },
  { to: "/notifications", label: "알림" },
  { to: "/reports", label: "보고서" },
]

export default function Sidebar({ open = false, onClose = () => {} }) {
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
          <p className="font-bold text-blue-600 text-lg">rentflow</p>
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
      </aside>
    </>
  )
}
