import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import HomePage from './pages/home'
import AdminPage from './pages/admin'
import BookingPage from './pages/booking'
import DashboardPage from './pages/dashboard'
import LoginPage from './pages/login'
import SignUpPage from './pages/signup'
import VerifyPage from './pages/verify'
import POSRoutes from './pages/pos'
import { AuthProvider } from '../hooks/use-auth'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '../components/theme-provider'

function AppRoutes() {
  const navigate = useNavigate();
  // redirect to home on auth-expired
  React.useEffect(() => {
    const onExpired = () => navigate('/', { replace: true });
    window.addEventListener('auth-expired', onExpired as EventListener);
    return () => window.removeEventListener('auth-expired', onExpired as EventListener);
  }, [navigate]);
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pos/*" element={<POSRoutes />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default function App() {
  console.log(process.env.REACT_APP_API_BASE);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
