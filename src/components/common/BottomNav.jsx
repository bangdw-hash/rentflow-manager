import { useState } from "react"
import { NavLink } from "react-router-dom"
import toast from "react-hot-toast"
import { useAuth, signOut } from "../../lib/AuthContext"
import { MENU, PRIMARY } from "../../lib/menu"

const ICONS = {
  "/dashboard": <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" />,
  "/insights": <path d="M3 3v18h18M7 14l3-3 3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  "/properties": <path d="M3 21V8l9-5 9 5v13h-6v-6h-6v6H3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  "/tenants": <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
}

const primaryItems = PRIMARY.map((to) => MENU.find((m) => m.to === to))
const moreItems = MENU.filter((m) => !PRIMARY.includes(m.to))

export default function BottomNav() {
  const [open, setOpen] = useState(false)
  const { user, guest, exitGuest } = useAuth()

  async function handleLogout() {
    setOpen(false)
    if (guest) { exitGuest(); return }
    await signOut()
    toast.success("로그아웃되었습니다.")
  }

  const tabCls = ({ isActive }) =>
    "flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-[11px] " +
    (isActive ? "text-blue-600 font-semibold" : "text-gray-400")

  return (
    <>
      {/* 더보기 시트 */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-4 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-2">
              {moreItems.map((m) => (
                <NavLink
                  key={m.to}
                  to={m.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    "text-center py-3 rounded-xl text-sm " +
                    (isActive ? "bg-blue-50 text-blue-600 font-semibold" : "bg-gray-50 text-gray-600")
                  }
                >
                  {m.label}
                </NavLink>
              ))}
            </div>
            <button onClick={handleLogout} className="mt-3 w-full py-3 rounded-xl text-sm text-gray-600 bg-gray-50">
              {guest ? "로그인 화면으로" : "로그아웃"}
            </button>
            {!guest && user?.email && <p className="text-center text-xs text-gray-400 mt-3 truncate">{user.email}</p>}
          </div>
        </div>
      )}

      {/* 하단 탭바 */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {primaryItems.map((m) => (
          <NavLink key={m.to} to={m.to} className={tabCls}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">{ICONS[m.to]}</svg>
            {m.label}
          </NavLink>
        ))}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-[11px] text-gray-400">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          더보기
        </button>
      </nav>
    </>
  )
}
