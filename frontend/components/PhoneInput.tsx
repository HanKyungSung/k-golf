/**
 * PhoneInput Component
 * 
 * A phone input with Canadian formatting and E.164 normalization.
 * Simplified Canada-only version (based on Phase 1.2 backend decision).
 * 
 * Features:
 * - Auto-formats as user types: "4165551234" → "(416) 555-1234"
 * - Returns normalized E.164 value: "+14165551234"
 * - Visual validation indicator (checkmark/X)
 * - Optional search button
 * - Error message display
 * - Disabled/readonly states
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Search } from 'lucide-react';

export interface PhoneInputProps {
  value: string;
  onChange: (normalized: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  className?: string;
  showValidation?: boolean;
  showSearchButton?: boolean;
}

/**
 * Format Canadian phone number for display
 * "4165551234" → "(416) 555-1234"
 * "+14165551234" → "(416) 555-1234"
 */
function formatPhoneDisplay(input: string): string {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');
  
  // Handle different digit lengths
  if (digits.length === 0) return '';
  
  // Remove leading 1 if present (11 digits total)
  const phoneDigits = digits.length === 11 && digits.startsWith('1') 
    ? digits.slice(1) 
    : digits;
  
  // Format as (XXX) XXX-XXXX
  if (phoneDigits.length <= 3) {
    return `(${phoneDigits}`;
  } else if (phoneDigits.length <= 6) {
    return `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3)}`;
  } else {
    return `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6, 10)}`;
  }
}

/**
 * Normalize phone to E.164 format
 * "4165551234" → "+14165551234"
 * "(416) 555-1234" → "+14165551234"
 */
function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  // If starts with 1 and has 11 digits, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If has 10 digits, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Return as-is if already starts with +
  if (input.startsWith('+')) {
    return input;
  }
  
  // Otherwise, add +1 and return
  return `+1${digits}`;
}

/**
 * Validate Canadian phone number
 * Must be exactly 10 digits after country code +1
 */
function validateCanadianPhone(phone: string): boolean {
  const e164Regex = /^\+1\d{10}$/;
  return e164Regex.test(phone);
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      onSearch,
      placeholder = '(416) 555-1234',
      disabled = false,
      readOnly = false,
      error,
      className,
      showValidation = true,
      showSearchButton = false,
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);

    // Update display value when value prop changes
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(value ? formatPhoneDisplay(value) : '');
      }
    }, [value, isFocused]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // Format for display
      const formatted = formatPhoneDisplay(input);
      setDisplayValue(formatted);
      
      // Normalize and send to parent
      const normalized = normalizePhone(input);
      onChange(normalized);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
      // Re-format on blur
      setDisplayValue(value ? formatPhoneDisplay(value) : '');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        e.preventDefault();
        onSearch();
      }
    };

    // Determine validation state
    const isValid = value && validateCanadianPhone(value);
    const isInvalid = value && !isValid;

    return (
      <div className={cn('space-y-2', className)}>
        <div className="relative flex items-center gap-2">
          {/* Country Code Display */}
          <div className="flex items-center gap-1 rounded-md border border-input bg-background px-3 h-9 text-sm text-muted-foreground">
            <span className="text-base">🇨🇦</span>
            <span>+1</span>
          </div>

          {/* Phone Input */}
          <div className="relative flex-1">
            <Input
              ref={ref}
              type="tel"
              value={displayValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              aria-invalid={(!!error || isInvalid) ? 'true' : 'false'}
              aria-label="Phone number"
              className={cn(
                'pr-10',
                error && 'border-destructive focus-visible:ring-destructive/20'
              )}
            />

            {/* Validation Indicator */}
            {showValidation && value && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValid && (
                  <Check className="h-4 w-4 text-green-500" aria-label="Valid phone number" />
                )}
                {isInvalid && (
                  <X className="h-4 w-4 text-destructive" aria-label="Invalid phone number" />
                )}
              </div>
            )}
          </div>

          {/* Optional Search Button */}
          {showSearchButton && onSearch && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={onSearch}
              disabled={disabled || !isValid}
              aria-label="Search customer"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* Validation Helper Text */}
        {!error && isInvalid && showValidation && (
          <p className="text-sm text-muted-foreground">
            Please enter a valid 10-digit Canadian phone number
          </p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
