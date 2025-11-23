import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * POS Booking Detail Page
 * TODO: Copy from pos/apps/electron/src/renderer/pages/BookingDetailPage.tsx
 */
export default function POSBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/pos/dashboard')}
          className="mb-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to Dashboard
        </button>
        
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Booking Detail: {id}
          </h2>
          <p className="text-slate-600">
            This page will show booking details, orders, and seat management.
          </p>
        </div>
      </div>
    </div>
  );
}
