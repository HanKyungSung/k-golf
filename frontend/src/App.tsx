import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/home'
import AdminPage from './pages/admin'
import BookingPage from './pages/booking'
import DashboardPage from './pages/dashboard'
import LoginPage from './pages/login'
import SignUpPage from './pages/signup'
import VerifyPage from './pages/verify'
import { AuthProvider } from '../hooks/use-auth'
import { ThemeProvider } from '../components/theme-provider'

export default function App() {
  console.log(process.env.REACT_APP_API_BASE);
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
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
