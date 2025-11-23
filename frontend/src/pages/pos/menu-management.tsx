import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * POS Menu Management Page
 * TODO: Copy from pos/apps/electron/src/renderer/pages/MenuManagementPage.tsx
 */
export default function POSMenuManagement() {
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
            Menu Management
          </h2>
          <p className="text-slate-600">
            This page will allow managing menu items (add, edit, delete).
          </p>
        </div>
      </div>
    </div>
  );
}
