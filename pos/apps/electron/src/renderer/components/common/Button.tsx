import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none disabled:opacity-60 disabled:pointer-events-none h-8 px-3';
const variants: Record<Variant,string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700'
};

function cx(...parts: (string|undefined|false|null)[]) { return parts.filter(Boolean).join(' '); }

export const Button: React.FC<Props> = ({ variant='primary', loading, children, className, ...rest }) => (
  <button className={cx(base, variants[variant], className)} {...rest}>
    {loading ? '...' : children}
  </button>
);
