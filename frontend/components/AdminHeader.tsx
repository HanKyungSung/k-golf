import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { buttonStyles } from '@/styles/buttonStyles';
import { useAuth } from '@/hooks/use-auth';
import { Menu, X } from 'lucide-react';

interface NavItem {
  label: string;
  to?: string;         // For Link-based navigation
  onClick?: () => void; // For callback-based navigation
  show?: boolean;       // Conditional visibility (default: true)
}

interface AdminHeaderProps {
  /** Main title text */
  title: string;
  /** Subtitle text shown next to title on desktop */
  subtitle?: string;
  /** Navigation items shown before logout */
  navItems?: NavItem[];
  /** Visual variant */
  variant?: 'pos' | 'admin';
  /** Whether header is sticky */
  sticky?: boolean;
}

export function AdminHeader({
  title,
  subtitle,
  navItems = [],
  variant = 'pos',
  sticky = false,
}: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const visibleNavItems = navItems.filter(item => item.show !== false);

  const headerBg = variant === 'admin'
    ? 'bg-slate-900/80 backdrop-blur-sm'
    : 'bg-slate-800';

  const containerClass = variant === 'admin'
    ? 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8'
    : 'container mx-auto px-3 sm:px-6';

  return (
    <header className={`border-b border-slate-700 ${headerBg} ${sticky ? 'sticky top-0 z-50' : ''}`}>
      <div className={containerClass}>
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left: Title */}
          <Link to="/" className="flex items-center min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent truncate">
              {title}
            </h1>
            {subtitle && (
              <span className="ml-2 text-sm text-slate-400 hidden md:inline">{subtitle}</span>
            )}
          </Link>

          {/* Right: Desktop nav */}
          <div className="hidden sm:flex items-center gap-3 sm:gap-4">
            {visibleNavItems.map((item, i) => (
              item.to ? (
                <Link key={i} to={item.to}>
                  <Button variant="outline" size="sm" className={buttonStyles.headerNav}>
                    {item.label}
                  </Button>
                </Link>
              ) : (
                <Button key={i} variant="outline" size="sm" className={buttonStyles.headerNav} onClick={item.onClick}>
                  {item.label}
                </Button>
              )
            ))}
            <span className="text-sm text-slate-300 truncate max-w-[160px]">
              {variant === 'admin' ? `Admin: ${user?.name}` : user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className={buttonStyles.headerLogout}
            >
              {variant === 'admin' ? 'Sign Out' : 'Logout'}
            </Button>
          </div>

          {/* Right: Mobile hamburger */}
          <button
            className="sm:hidden p-2 text-slate-300 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-700 bg-slate-800/95 backdrop-blur-sm">
          <div className="px-4 py-3 space-y-2">
            <div className="text-sm text-slate-400 pb-1 border-b border-slate-700 mb-2">
              {variant === 'admin' ? user?.name : user?.email}
            </div>
            {visibleNavItems.map((item, i) => (
              item.to ? (
                <Link key={i} to={item.to} onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700">
                    {item.label}
                  </Button>
                </Link>
              ) : (
                <Button key={i} variant="ghost" size="sm" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700" onClick={() => { item.onClick?.(); setMobileMenuOpen(false); }}>
                  {item.label}
                </Button>
              )
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-slate-700"
            >
              {variant === 'admin' ? 'Sign Out' : 'Logout'}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}