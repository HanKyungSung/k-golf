import React from 'react';

// Centralized lightweight UI primitives used across dashboard, booking detail, menu management.
// NOTE: Keep intentionally minimal; styling tokens can later be refactored to design system.

export const Card: React.FC<{ className?: string; children: React.ReactNode }>=({ className='', children }) => (
  <div className={`rounded-lg border border-slate-700 bg-slate-800/50 ${className}`}>{children}</div>
);

export const CardHeader: React.FC<{ className?: string; children: React.ReactNode }>=({className='', children}) => (
  <div className={`p-4 border-b border-slate-700/60 ${className}`}>{children}</div>
);

export const CardTitle: React.FC<{ className?: string; children: React.ReactNode }>=({className='', children}) => (
  <h3 className={`font-semibold text-white ${className}`}>{children}</h3>
);

export const CardDescription: React.FC<{ className?: string; children: React.ReactNode }>=({className='', children}) => (
  <p className={`text-sm text-slate-400 ${className}`}>{children}</p>
);

export const CardContent: React.FC<{ className?: string; children: React.ReactNode }>=({className='', children}) => (
  <div className={`p-4 space-y-4 ${className}`}>{children}</div>
);

export const Badge: React.FC<{ className?: string; children: React.ReactNode }>=({className='', children}) => (
  <span className={`px-2 py-0.5 rounded text-[11px] font-medium tracking-wide bg-slate-700 text-slate-200 ${className}`}>{children}</span>
);

// Future extension ideas (not implemented yet):
// - <Separator />
// - <Tabs /> primitives
// - Variant prop for Card (e.g., subtle, outline)
// Keep file focused until design system pass.
