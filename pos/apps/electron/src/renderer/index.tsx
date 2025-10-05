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

// Forward main process logs to DevTools console
const kgolf = getKgolf();
if (kgolf?.onMainLog) {
  kgolf.onMainLog((log) => {
    const prefix = `[MAIN]`;
    const style = 'color: #888; font-weight: bold';
    switch (log.level) {
      case 'error':
        console.error(prefix, ...log.message);
        break;
      case 'warn':
        console.warn(prefix, ...log.message);
        break;
      case 'info':
        console.info(prefix, ...log.message);
        break;
      case 'debug':
        console.debug(prefix, ...log.message);
        break;
      default:
        console.log(`%c${prefix}`, style, ...log.message);
    }
  });
}
