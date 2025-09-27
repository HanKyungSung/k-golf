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

// DevTools diagnostics
setTimeout(() => {
  const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  // eslint-disable-next-line no-console
  console.log('[DEVTOOLS DIAG] Hook present?', !!hook, 'React version:', (React as any).version);
  if (hook && hook.renderers) {
    // eslint-disable-next-line no-console
    console.log('[DEVTOOLS DIAG] Registered renderers:', Array.from(hook.renderers.values()).map((r: any) => r?.version || '?'));
  }
}, 1500);

// Typed bridge helper
function getKgolf() { return (window as any).kgolf as import('./types/global').KgolfAPI | undefined; }
