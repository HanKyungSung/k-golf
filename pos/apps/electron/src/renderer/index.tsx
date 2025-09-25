import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { AuthProvider } from './app/authState';
// Entry now uses HashRouter inside App for simple internal navigation.

const container = document.getElementById('app');
if (container) createRoot(container).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);

// Typed bridge helper
function getKgolf() { return (window as any).kgolf as import('./types/global').KgolfAPI | undefined; }
