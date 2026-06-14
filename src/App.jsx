import { useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import Sidebar from "./components/common/Sidebar"
import Dashboard from "./pages/Dashboard"
import Properties from "./pages/Properties"
import Tenants from "./pages/Tenants"
import Contracts from "./pages/Contracts"
import Billing from "./pages/Billing"
import Notifications from "./pages/Notifications"
import Reports from "./pages/Reports"

export default function App() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <BrowserRouter basename="/rentflow-manager">
      <div className="min-h-screen bg-gray-50">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

        {/* 모바일 상단 앱바 */}
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-3 bg-white border-b border-gray-200 px-4 h-14">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="메뉴 열기"
            className="text-gray-700 -ml-1 p-1"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-bold text-blue-600 text-lg">rentflow</span>
        </header>

        <main className="md:ml-64 p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
      <Toaster position="top-right" />
    </BrowserRouter>
  )
}
