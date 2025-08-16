import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Link from './shims/next-link'
import HomePage from '../app/page'
import AdminPage from '../app/admin/page'
import BookingPage from '../app/booking/page'
import DashboardPage from '../app/dashboard/page'
import LoginPage from '../app/login/page'
import SignUpPage from '../app/signup/page'
import { AuthProvider } from '../hooks/use-auth'
import { ThemeProvider } from '../components/theme-provider'

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
