import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import BookingDetailPage from '../pages/BookingDetailPage';
import { useAuth } from './authState';
import { BookingProvider } from './bookingContext';

function Protected({ children }: { children: React.ReactElement }) {
  const { state } = useAuth();
  if (!state.authenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <HashRouter>
      <BookingProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/booking/:id" element={<Protected><BookingDetailPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BookingProvider>
    </HashRouter>
  );
}
