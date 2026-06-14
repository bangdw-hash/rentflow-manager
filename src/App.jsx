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
  return (
    <BrowserRouter basename="/rentflow-manager">
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
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
