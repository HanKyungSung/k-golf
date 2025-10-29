/**
 * PhoneInput Component (POS Version)
 * 
 * A phone input with Canadian formatting and E.164 normalization.
 * Simplified Canada-only version.
 * 
 * Features:
 * - Auto-formats as user types: "4165551234" → "(416) 555-1234"
 * - Returns normalized E.164 value: "+14165551234"
 * - Visual validation indicator (✓ / ✗)
 * - Error message display
 * - Disabled/readonly states
 */

import * as React from 'react';
import { Input, Label } from './ui/primitives';

export interface PhoneInputProps {
  value: string;
  onChange: (normalized: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Format phone number as user types: (XXX) XXX-XXXX
 * Limits to 10 digits only
 */
function formatPhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 10); // Limit to 10 digits
  
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
}

/**
 * Convert to E.164 format: +1XXXXXXXXXX
 * Returns partial format for less than 10 digits to preserve state
 */
function toE164(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // Return partial value to maintain state
  return digits.length > 0 ? `+1${digits}` : '';
}

/**
 * Validate phone: must be 10 digits
 */
function isValidPhone(e164: string): boolean {
  return /^\+1\d{10}$/.test(e164);
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      error,
      label = 'Phone Number',
      required = false,
      disabled = false,
      className = '',
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = React.useState('');
    const isUpdatingRef = React.useRef(false);

    // Initialize display value from E.164 format (only on external changes)
    React.useEffect(() => {
      // Skip if we're updating from user input
      if (isUpdatingRef.current) {
        isUpdatingRef.current = false;
        return;
      }
      
      if (value && value.startsWith('+1')) {
        const digits = value.slice(2);
        setDisplayValue(formatPhoneNumber(digits));
      } else if (!value) {
        setDisplayValue('');
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // Extract just the digits
      const digits = input.replace(/\D/g, '').slice(0, 10);
      
      // Format the digits for display
      const formatted = formatPhoneNumber(digits);
      setDisplayValue(formatted);

      // Mark that we're updating from user input
      isUpdatingRef.current = true;

      // Convert to E.164 and pass to parent (empty string if < 10 digits)
      const e164 = toE164(digits);
      onChange(e164);
    };

    const isValid = value && isValidPhone(value);
    const showValidation = value.length > 0;

    return (
      <div className={`space-y-2 ${className}`}>
        <Label htmlFor="phone">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="relative">
          <Input
            id="phone"
            data-testid="customer-phone"
            ref={ref}
            type="tel"
            value={displayValue}
            onChange={handleChange}
            placeholder="(416) 555-1234"
            disabled={disabled}
            maxLength={14}
            className={`pr-10 ${error ? 'border-red-500 focus:ring-red-500/50' : ''}`}
          />
          
          {/* Validation Indicator */}
          {showValidation && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">
              {isValid ? (
                <span className="text-green-500" aria-label="Valid phone number">✓</span>
              ) : (
                <span className="text-red-500" aria-label="Invalid phone number">✗</span>
              )}
            </div>
          )}
        </div>
        
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

