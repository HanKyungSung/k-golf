/**
 * Unified Button Styles for K-Golf Admin Pages
 * 
 * Use these constants to ensure consistent button styling across all admin pages.
 * Import and apply to className props alongside shadcn Button component.
 * 
 * Usage:
 *   import { buttonStyles } from '@/styles/buttonStyles';
 *   <Button variant="outline" className={buttonStyles.secondary}>Cancel</Button>
 */

export const buttonStyles = {
  // ===== PRIMARY ACTIONS =====
  // Use for main CTAs: Create, Save, Submit, Close (positive actions)
  primary: 'bg-amber-500 hover:bg-amber-600 text-black font-medium',
  primarySemibold: 'bg-amber-500 hover:bg-amber-600 text-black font-semibold',

  // ===== SECONDARY ACTIONS =====
  // Use for: Cancel, Edit, secondary options (use with variant="outline")
  secondary: 'border-slate-600 text-slate-300 hover:bg-slate-700',

  // ===== HEADER BUTTONS =====
  // Navigation link in header (use with variant="outline")
  headerNav: 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10 bg-transparent',
  // Logout/Sign out in header (use with variant="outline")
  headerLogout: 'border-slate-500/50 text-slate-400 hover:bg-slate-500/10 bg-transparent',

  // ===== GHOST/ICON BUTTONS =====
  // Use for icon-only buttons, subtle actions (use with variant="ghost")
  ghost: 'text-slate-400 hover:text-white hover:bg-slate-700',

  // ===== PAGINATION =====
  // Use for prev/next buttons (use with variant="outline" size="sm")
  pagination: 'border-slate-600 text-slate-300 hover:bg-slate-700',

  // ===== SEMANTIC ACTIONS =====
  // Keep distinct colors for clear user feedback

  // Destructive - for delete confirmations, irreversible actions
  destructive: 'bg-red-500 text-white hover:bg-red-600',
  // Destructive outline - for cancel booking, remove (use with variant="outline")
  destructiveOutline: 'border-red-400/50 text-red-400 hover:bg-red-500/10 bg-transparent',

  // Success - for complete, save operations
  success: 'bg-green-500 text-white hover:bg-green-600',
  // Success outline - for complete booking actions (use with variant="outline")
  successOutline: 'border-green-400/50 text-green-400 hover:bg-green-500/10 bg-transparent',

  // Info/View - for view details, info actions (use with variant="outline")
  info: 'border-purple-500/50 text-purple-400 hover:bg-purple-500/10 bg-transparent',

  // Warning - for actions needing attention
  warning: 'bg-yellow-500 text-black hover:bg-yellow-600',
  warningOutline: 'border-yellow-400/50 text-yellow-400 hover:bg-yellow-500/10 bg-transparent',
} as const;

// Type for button style keys
export type ButtonStyleKey = keyof typeof buttonStyles;

// Helper to combine styles (if needed)
export const combineStyles = (...styles: string[]) => styles.filter(Boolean).join(' ');

export default buttonStyles;
