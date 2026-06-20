import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import { AuthProvider, useAuth } from "./lib/AuthContext"
import { PlanProvider } from "./lib/PlanContext"
import { SettingsProvider } from "./lib/SettingsContext"
import Sidebar from "./components/common/Sidebar"
import BottomNav from "./components/common/BottomNav"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Properties from "./pages/Properties"
import Tenants from "./pages/Tenants"
import Contracts from "./pages/Contracts"
import Billing from "./pages/Billing"
import Notifications from "./pages/Notifications"
import Reports from "./pages/Reports"
import Insights from "./pages/Insights"
import Payments from "./pages/Payments"
import Invoices from "./pages/Invoices"
import Settings from "./pages/Settings"

function Shell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <BottomNav />

      {/* 모바일 상단 앱바 (브랜드) */}
      <header className="md:hidden sticky top-0 z-20 flex items-center gap-2 bg-white border-b border-gray-200 px-4 h-14">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-blue-600 text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l9-7 9 7" />
            <path d="M5 10v10h14V10" />
          </svg>
        </span>
        <span className="font-bold text-gray-900 text-lg tracking-tight">rentflow</span>
      </header>

      <main className="md:ml-60 px-4 md:px-8 py-4 md:py-7 pb-24 md:pb-7 max-w-[1600px]">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

function Gate() {
  const { session, loading, guest } = useAuth()
  if (loading) {
    return <div className="min-h-screen grid place-items-center text-gray-400 text-sm">불러오는 중…</div>
  }
  return session || guest ? <Shell /> : <Login />
}

export default function App() {
  return (
    <BrowserRouter basename="/rentflow-manager">
      <AuthProvider>
        <PlanProvider>
          <SettingsProvider>
            <Gate />
          </SettingsProvider>
        </PlanProvider>
      </AuthProvider>
      <Toaster position="top-right" />
    </BrowserRouter>
  )
}
