/**
 * Phone Number Configuration
 * 
 * Canada-focused phone number handling.
 * Business is based in Canada (Toronto area).
 * 
 * All phone numbers are stored in E.164 format: +1XXXXXXXXXX (10 digits after +1)
 * Users can freely enter any Canadian area code.
 */

/**
 * Default country code (Canada)
 * Used when no country code is provided in phone input
 */
export const DEFAULT_COUNTRY_CODE = '+1';

/**
 * Expected number of digits after country code for Canadian numbers
 */
export const CANADIAN_PHONE_DIGITS = 10;

/**
 * Display format for Canadian phone numbers
 * Example: +1 416-555-1234
 */
export const CANADIAN_PHONE_FORMAT = '+1 ###-###-####';
