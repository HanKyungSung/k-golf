/**
 * Unit Tests: Phone Utilities
 * 
 * Tests for Canadian phone number normalization, formatting, and validation.
 * Phase 1.2 Acceptance Criteria (Canada-focused)
 */

import {
  normalizePhone,
  formatPhoneDisplay,
  validatePhone,
  validateCanadianPhone,
} from '../../../src/utils/phoneUtils';

describe('Phone Utilities - Canada Only', () => {
  describe('normalizePhone', () => {
    describe('Canadian phone numbers (various formats)', () => {
      it('normalizes phone with dashes', () => {
        expect(normalizePhone('416-555-1234')).toBe('+14165551234');
      });

      it('normalizes phone with parentheses and spaces', () => {
        expect(normalizePhone('(416) 555-1234')).toBe('+14165551234');
      });

      it('normalizes phone with just digits (10 digits)', () => {
        expect(normalizePhone('4165551234')).toBe('+14165551234');
      });

      it('normalizes phone with country code 1 and dashes', () => {
        expect(normalizePhone('1-416-555-1234')).toBe('+14165551234');
      });

      it('normalizes phone with spaces', () => {
        expect(normalizePhone('416 555 1234')).toBe('+14165551234');
      });

      it('normalizes phone with dots', () => {
        expect(normalizePhone('416.555.1234')).toBe('+14165551234');
      });

      it('normalizes phone with mixed special characters', () => {
        expect(normalizePhone('(416).555-1234')).toBe('+14165551234');
      });
    });

    describe('Different Canadian area codes', () => {
      it('normalizes Toronto 416 area code', () => {
        expect(normalizePhone('416-555-1234')).toBe('+14165551234');
      });

      it('normalizes Toronto 647 area code', () => {
        expect(normalizePhone('647-555-1234')).toBe('+16475551234');
      });

      it('normalizes Toronto 437 area code', () => {
        expect(normalizePhone('437-555-1234')).toBe('+14375551234');
      });

      it('normalizes GTA 905 area code', () => {
        expect(normalizePhone('905-555-1234')).toBe('+19055551234');
      });

      it('normalizes Vancouver 604 area code', () => {
        expect(normalizePhone('604-555-1234')).toBe('+16045551234');
      });

      it('normalizes Montreal 514 area code', () => {
        expect(normalizePhone('514-555-1234')).toBe('+15145551234');
      });
    });

    describe('Already normalized phone numbers (idempotency)', () => {
      it('returns Canadian E.164 format as-is', () => {
        expect(normalizePhone('+14165551234')).toBe('+14165551234');
      });

      it('returns different area code E.164 format as-is', () => {
        expect(normalizePhone('+16475551234')).toBe('+16475551234');
      });

      it('returns 11-digit format (1XXXXXXXXXX) with + prefix', () => {
        expect(normalizePhone('+14165551234')).toBe('+14165551234');
      });
    });

    describe('Phone numbers with spaces in E.164 format', () => {
      it('normalizes Canadian phone with spaces after +1', () => {
        expect(normalizePhone('+1 416 555 1234')).toBe('+14165551234');
      });

      it('normalizes phone with multiple spaces', () => {
        expect(normalizePhone('+1  416  555  1234')).toBe('+14165551234');
      });
    });

    describe('Edge cases', () => {
      it('throws error for empty string', () => {
        expect(() => normalizePhone('')).toThrow('Phone number is required');
      });

      it('throws error for null/undefined', () => {
        expect(() => normalizePhone(null as any)).toThrow('Phone number is required');
      });

      it('handles phone with only special characters', () => {
        expect(normalizePhone('---')).toBe('+1');
      });

      it('handles 11-digit number starting with 1', () => {
        expect(normalizePhone('14165551234')).toBe('+14165551234');
      });
    });
  });

  describe('formatPhoneDisplay', () => {
    describe('Canadian phone numbers', () => {
      it('formats Canadian E.164 to display format (416)', () => {
        expect(formatPhoneDisplay('+14165551234')).toBe('+1 416-555-1234');
      });

      it('formats Canadian E.164 to display format (647)', () => {
        expect(formatPhoneDisplay('+16475551234')).toBe('+1 647-555-1234');
      });

      it('formats Canadian E.164 to display format (905)', () => {
        expect(formatPhoneDisplay('+19055551234')).toBe('+1 905-555-1234');
      });

      it('formats Vancouver number', () => {
        expect(formatPhoneDisplay('+16045551234')).toBe('+1 604-555-1234');
      });

      it('formats Montreal number', () => {
        expect(formatPhoneDisplay('+15145551234')).toBe('+1 514-555-1234');
      });
    });

    describe('Edge cases', () => {
      it('returns non-E.164 format as-is', () => {
        expect(formatPhoneDisplay('4165551234')).toBe('4165551234');
      });

      it('returns empty string as-is', () => {
        expect(formatPhoneDisplay('')).toBe('');
      });

      it('returns non-Canadian E.164 as-is', () => {
        expect(formatPhoneDisplay('+821012345678')).toBe('+821012345678');
      });

      it('handles Canadian number with wrong digit count gracefully', () => {
        expect(formatPhoneDisplay('+1416555123')).toBe('+1 416555123');
      });
    });
  });

  describe('validatePhone', () => {
    describe('Valid E.164 phone numbers', () => {
      it('validates Canadian phone number', () => {
        expect(validatePhone('+14165551234')).toBe(true);
      });

      it('validates different Canadian area codes', () => {
        expect(validatePhone('+16475551234')).toBe(true);
        expect(validatePhone('+19055551234')).toBe(true);
        expect(validatePhone('+16045551234')).toBe(true);
      });

      it('validates minimum length E.164 (3 digits total)', () => {
        expect(validatePhone('+123')).toBe(true);
      });

      it('validates maximum length E.164 (16 digits total)', () => {
        expect(validatePhone('+123456789012345')).toBe(true);
      });
    });

    describe('Invalid phone numbers', () => {
      it('rejects phone without plus sign', () => {
        expect(validatePhone('14165551234')).toBe(false);
      });

      it('rejects non-numeric phone', () => {
        expect(validatePhone('invalid')).toBe(false);
      });

      it('rejects too short phone (less than 3 digits)', () => {
        expect(validatePhone('1234')).toBe(false);
      });

      it('rejects phone starting with +0', () => {
        expect(validatePhone('+01234567890')).toBe(false);
      });

      it('rejects phone with letters', () => {
        expect(validatePhone('+1416555ABCD')).toBe(false);
      });

      it('rejects empty string', () => {
        expect(validatePhone('')).toBe(false);
      });

      it('rejects null/undefined', () => {
        expect(validatePhone(null as any)).toBe(false);
      });

      it('rejects phone too long (more than 15 digits)', () => {
        expect(validatePhone('+1234567890123456')).toBe(false);
      });

      it('rejects phone with spaces', () => {
        expect(validatePhone('+1 416 555 1234')).toBe(false);
      });

      it('rejects phone with dashes', () => {
        expect(validatePhone('+1-416-555-1234')).toBe(false);
      });
    });
  });

  describe('validateCanadianPhone', () => {
    describe('Valid Canadian phone numbers', () => {
      it('validates Toronto 416 area code', () => {
        expect(validateCanadianPhone('+14165551234')).toBe(true);
      });

      it('validates Toronto 647 area code', () => {
        expect(validateCanadianPhone('+16475551234')).toBe(true);
      });

      it('validates Toronto 437 area code', () => {
        expect(validateCanadianPhone('+14375551234')).toBe(true);
      });

      it('validates GTA 905 area code', () => {
        expect(validateCanadianPhone('+19055551234')).toBe(true);
      });

      it('validates Vancouver 604 area code', () => {
        expect(validateCanadianPhone('+16045551234')).toBe(true);
      });

      it('validates Montreal 514 area code', () => {
        expect(validateCanadianPhone('+15145551234')).toBe(true);
      });

      it('validates any 3-digit area code', () => {
        expect(validateCanadianPhone('+12345551234')).toBe(true);
      });
    });

    describe('Invalid Canadian phone numbers', () => {
      it('rejects non-Canadian country code', () => {
        expect(validateCanadianPhone('+821012345678')).toBe(false);
      });

      it('rejects Canadian phone with 11 digits after +1', () => {
        expect(validateCanadianPhone('+141655512345')).toBe(false);
      });

      it('rejects Canadian phone with 9 digits after +1', () => {
        expect(validateCanadianPhone('+1416555123')).toBe(false);
      });

      it('rejects invalid format (no + sign)', () => {
        expect(validateCanadianPhone('4165551234')).toBe(false);
      });

      it('rejects phone with spaces', () => {
        expect(validateCanadianPhone('+1 416 555 1234')).toBe(false);
      });

      it('rejects phone with dashes', () => {
        expect(validateCanadianPhone('+1-416-555-1234')).toBe(false);
      });

      it('rejects empty string', () => {
        expect(validateCanadianPhone('')).toBe(false);
      });
    });
  });
});
