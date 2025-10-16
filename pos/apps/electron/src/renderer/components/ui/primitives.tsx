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

export const Separator: React.FC<{ className?: string }>=({className=''}) => (
  <div className={`h-px bg-slate-700 ${className}`} />
);

export const Button: React.FC<{ 
  className?: string; 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}>=({className='', children, onClick, disabled=false, size='md', variant='default'}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };
  const variantClasses = {
    default: 'bg-amber-500 text-black hover:bg-amber-600 border border-amber-500',
    outline: 'bg-transparent border border-slate-600 text-slate-300 hover:bg-slate-700',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-700/50'
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`rounded font-medium transition-colors ${sizeClasses[size]} ${variantClasses[variant]} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};

// Dialog components
export const Dialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }> = 
  ({ open, onOpenChange, children }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/80" onClick={() => onOpenChange(false)} />
        <div className="relative z-50 w-full max-w-lg mx-4">{children}</div>
      </div>
    );
  };

export const DialogContent: React.FC<{ className?: string; children: React.ReactNode }> = 
  ({ className = '', children }) => (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg shadow-2xl ${className}`}>
      {children}
    </div>
  );

export const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-6 pb-4 space-y-2">{children}</div>
);

export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-semibold text-white">{children}</h2>
);

export const DialogDescription: React.FC<{ className?: string; children: React.ReactNode }> = 
  ({ className = '', children }) => (
    <p className={`text-sm text-slate-400 ${className}`}>{children}</p>
  );

export const DialogFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-6 pt-4 flex justify-end gap-3">{children}</div>
);

// Tabs components for inline use
export const Tabs: React.FC<{ defaultValue: string; className?: string; children: React.ReactNode }> = 
  ({ defaultValue, className = '', children }) => {
    const [activeValue, setActiveValue] = React.useState(defaultValue);
    return (
      <div className={className}>
        {React.Children.map(children, child => 
          React.isValidElement(child) ? React.cloneElement(child, { activeValue, setActiveValue } as any) : child
        )}
      </div>
    );
  };

export const TabsList: React.FC<{ className?: string; children: React.ReactNode; activeValue?: string; setActiveValue?: (v: string) => void }> = 
  ({ className = '', children, activeValue, setActiveValue }) => (
    <div className={`grid bg-slate-700/50 rounded-md overflow-hidden ${className}`}>
      {React.Children.map(children, child => 
        React.isValidElement(child) ? React.cloneElement(child, { activeValue, onValueChange: setActiveValue } as any) : child
      )}
    </div>
  );

export const TabsTrigger: React.FC<{ 
  value: string; 
  children: React.ReactNode; 
  activeValue?: string; 
  onValueChange?: (v: string) => void;
  className?: string;
}> = ({ value, children, activeValue, onValueChange, className = '' }) => {
  const isActive = value === activeValue;
  return (
    <button
      onClick={() => onValueChange?.(value)}
      className={`px-3 py-2 text-sm font-semibold transition-colors ${
        isActive ? 'bg-amber-500 text-black' : 'bg-slate-800/40 text-slate-300 hover:bg-slate-700/60'
      } ${className}`}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{ 
  value: string; 
  children: React.ReactNode; 
  activeValue?: string;
}> = ({ value: tabValue, children, activeValue }) => {
    if (tabValue !== activeValue) return null;
    return <div className="mt-4">{children}</div>;
  };

// Input component (for forms)
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = '', type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={`flex h-9 w-full rounded-md border border-slate-600 bg-slate-900/50 px-3 py-1 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
});
Input.displayName = 'Input';

// Label component (for forms)
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={`block text-sm font-medium text-slate-300 mb-1 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
});
Label.displayName = 'Label';

// Future extension ideas:
// - Variant prop for Card (e.g., subtle, outline)
// Keep file focused until design system pass.
