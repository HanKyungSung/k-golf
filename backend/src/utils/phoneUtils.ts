/**
 * Phone Number Utilities
 * 
 * Canada-focused phone number utilities.
 * All phone numbers are stored in E.164 format: +1XXXXXXXXXX (10 digits)
 * 
 * Business Context:
 * - Based in Canada (Toronto area)
 * - Primary customers are local Canadians
 * - Users can freely enter any Canadian area code (416, 647, 437, 905, etc.)
 */

import { DEFAULT_COUNTRY_CODE, CANADIAN_PHONE_DIGITS } from '../config/phone';

/**
 * Normalize phone number to E.164 format (Canadian)
 * 
 * @param input - Raw phone number input (can include spaces, dashes, parentheses)
 * @returns Normalized phone number in E.164 format (e.g., "+14165551234")
 * 
 * @example
 * normalizePhone("416-555-1234") // "+14165551234"
 * normalizePhone("(416) 555-1234") // "+14165551234"
 * normalizePhone("4165551234") // "+14165551234"
 * normalizePhone("1-416-555-1234") // "+14165551234"
 * normalizePhone("+14165551234") // "+14165551234" (idempotent)
 */
export function normalizePhone(input: string): string {
  if (!input) {
    throw new Error('Phone number is required');
  }

  // Remove all non-digit and non-plus characters
  const cleaned = input.replace(/[^\d+]/g, '');

  // If already starts with +, return as-is (already in E.164 format)
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If starts with country code "1", add + prefix
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return '+' + cleaned;
  }

  // Otherwise, assume it's a 10-digit Canadian number and prepend +1
  return DEFAULT_COUNTRY_CODE + cleaned;
}

/**
 * Format phone number for display (Canadian format)
 * 
 * @param phone - Phone number in E.164 format (e.g., "+14165551234")
 * @returns Formatted phone number for display (e.g., "+1 416-555-1234")
 * 
 * @example
 * formatPhoneDisplay("+14165551234") // "+1 416-555-1234"
 * formatPhoneDisplay("+16475551234") // "+1 647-555-1234"
 * formatPhoneDisplay("+19055551234") // "+1 905-555-1234"
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone || !phone.startsWith('+1')) {
    return phone; // Return as-is if not Canadian E.164 format
  }

  const number = phone.substring(2); // Remove "+1"

  // Canadian format: +1 XXX-XXX-XXXX
  if (number.length === CANADIAN_PHONE_DIGITS) {
    return `+1 ${number.substring(0, 3)}-${number.substring(3, 6)}-${number.substring(6)}`;
  }

  // Fallback: just add space after country code
  return `+1 ${number}`;
}

/**
 * Validate phone number (E.164 format)
 * 
 * @param phone - Phone number to validate
 * @returns true if valid E.164 format, false otherwise
 * 
 * E.164 format: + followed by 1-15 digits
 * 
 * @example
 * validatePhone("+14165551234") // true
 * validatePhone("invalid") // false
 * validatePhone("1234") // false (too short)
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;

  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Validate Canadian phone number
 * 
 * @param phone - Phone number in E.164 format
 * @returns true if valid Canadian number (+1 followed by 10 digits)
 * 
 * @example
 * validateCanadianPhone("+14165551234") // true (Toronto)
 * validateCanadianPhone("+16475551234") // true (Toronto)
 * validateCanadianPhone("+19055551234") // true (GTA)
 * validateCanadianPhone("+1234567890") // true (any area code)
 */
export function validateCanadianPhone(phone: string): boolean {
  if (!validatePhone(phone)) return false;
  
  // Canadian format: +1 followed by exactly 10 digits
  const canadianRegex = /^\+1\d{10}$/;
  return canadianRegex.test(phone);
}
