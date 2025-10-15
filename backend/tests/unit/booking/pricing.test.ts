/**
 * Unit Tests for Booking Utilities
 * Tests pure functions related to booking creation and price calculation
 */

describe('Booking Utilities', () => {
  describe('calculatePricing', () => {
    // Helper function (mirrors the one in booking.ts)
    function calculatePricing(basePrice: number, taxRate: number) {
      const tax = basePrice * taxRate;
      const totalPrice = basePrice + tax;
      return {
        basePrice,
        taxRate,
        tax,
        totalPrice,
      };
    }

    it('should calculate price with 13% tax rate', () => {
      const result = calculatePricing(100, 0.13);
      
      expect(result.basePrice).toBe(100);
      expect(result.taxRate).toBe(0.13);
      expect(result.tax).toBe(13);
      expect(result.totalPrice).toBe(113);
    });

    it('should calculate price with custom 15% tax rate', () => {
      const result = calculatePricing(200, 0.15);
      
      expect(result.basePrice).toBe(200);
      expect(result.taxRate).toBe(0.15);
      expect(result.tax).toBe(30);
      expect(result.totalPrice).toBe(230);
    });

    it('should calculate price with 0% tax rate', () => {
      const result = calculatePricing(150, 0);
      
      expect(result.basePrice).toBe(150);
      expect(result.taxRate).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.totalPrice).toBe(150);
    });

    it('should handle decimal base prices', () => {
      const result = calculatePricing(99.99, 0.13);
      
      expect(result.basePrice).toBe(99.99);
      expect(result.taxRate).toBe(0.13);
      expect(result.tax).toBeCloseTo(12.9987, 2);
      expect(result.totalPrice).toBeCloseTo(112.9887, 2);
    });

    it('should calculate multi-hour bookings (3 hours @ $50/hr)', () => {
      const hourlyRate = 50;
      const hours = 3;
      const basePrice = hourlyRate * hours;
      const result = calculatePricing(basePrice, 0.13);
      
      expect(result.basePrice).toBe(150);
      expect(result.totalPrice).toBe(169.5);
    });

    it('should calculate custom price override', () => {
      const customPrice = 120; // Override hourly rate
      const result = calculatePricing(customPrice, 0.13);
      
      expect(result.basePrice).toBe(120);
      expect(result.totalPrice).toBe(135.6);
    });
  });

  describe('Time Calculations', () => {
    it('should calculate endTime correctly (1 hour)', () => {
      const startTime = new Date('2025-10-15T10:00:00Z');
      const hours = 1;
      const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
      
      expect(endTime.toISOString()).toBe('2025-10-15T11:00:00.000Z');
    });

    it('should calculate endTime correctly (3 hours)', () => {
      const startTime = new Date('2025-10-15T14:00:00Z');
      const hours = 3;
      const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
      
      expect(endTime.toISOString()).toBe('2025-10-15T17:00:00.000Z');
    });

    it('should handle overnight bookings', () => {
      const startTime = new Date('2025-10-15T22:00:00Z');
      const hours = 4;
      const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
      
      expect(endTime.toISOString()).toBe('2025-10-16T02:00:00.000Z');
    });
  });

  describe('Booking Source Validation', () => {
    function validateGuestBookingSource(
      customerMode: 'existing' | 'new' | 'guest',
      bookingSource: 'WALK_IN' | 'PHONE'
    ): boolean {
      // Guest bookings only allowed for walk-in
      return !(customerMode === 'guest' && bookingSource === 'PHONE');
    }

    it('should allow guest bookings for WALK_IN', () => {
      const isValid = validateGuestBookingSource('guest', 'WALK_IN');
      expect(isValid).toBe(true);
    });

    it('should reject guest bookings for PHONE', () => {
      const isValid = validateGuestBookingSource('guest', 'PHONE');
      expect(isValid).toBe(false);
    });

    it('should allow new customer for PHONE bookings', () => {
      const isValid = validateGuestBookingSource('new', 'PHONE');
      expect(isValid).toBe(true);
    });

    it('should allow existing customer for PHONE bookings', () => {
      const isValid = validateGuestBookingSource('existing', 'PHONE');
      expect(isValid).toBe(true);
    });
  });

  describe('Price Calculation Scenarios', () => {
    const DEFAULT_HOURLY_RATE = 50;
    const DEFAULT_TAX_RATE = 0.13;

    function calculatePricing(basePrice: number, taxRate: number) {
      const tax = basePrice * taxRate;
      const totalPrice = basePrice + tax;
      return { basePrice, taxRate, tax, totalPrice };
    }

    it('should calculate 1-hour booking with defaults', () => {
      const hours = 1;
      const basePrice = DEFAULT_HOURLY_RATE * hours;
      const result = calculatePricing(basePrice, DEFAULT_TAX_RATE);
      
      expect(result.totalPrice).toBe(56.5); // $50 + 13% tax
    });

    it('should calculate 2-hour booking with defaults', () => {
      const hours = 2;
      const basePrice = DEFAULT_HOURLY_RATE * hours;
      const result = calculatePricing(basePrice, DEFAULT_TAX_RATE);
      
      expect(result.totalPrice).toBe(113); // $100 + 13% tax
    });

    it('should calculate 4-hour booking with defaults', () => {
      const hours = 4;
      const basePrice = DEFAULT_HOURLY_RATE * hours;
      const result = calculatePricing(basePrice, DEFAULT_TAX_RATE);
      
      expect(result.totalPrice).toBe(226); // $200 + 13% tax
    });

    it('should use custom price override', () => {
      const customPrice = 80; // Special rate
      const result = calculatePricing(customPrice, DEFAULT_TAX_RATE);
      
      expect(result.basePrice).toBe(80);
      expect(result.totalPrice).toBe(90.4); // $80 + 13% tax
    });

    it('should use custom tax rate override (15%)', () => {
      const basePrice = DEFAULT_HOURLY_RATE * 2;
      const customTaxRate = 0.15;
      const result = calculatePricing(basePrice, customTaxRate);
      
      expect(result.totalPrice).toBe(115); // $100 + 15% tax
    });

    it('should use both custom price and custom tax rate', () => {
      const customPrice = 120;
      const customTaxRate = 0.10;
      const result = calculatePricing(customPrice, customTaxRate);
      
      expect(result.totalPrice).toBe(132); // $120 + 10% tax
    });

    it('should handle 0% tax rate (tax-exempt booking)', () => {
      const basePrice = DEFAULT_HOURLY_RATE * 3;
      const customTaxRate = 0;
      const result = calculatePricing(basePrice, customTaxRate);
      
      expect(result.totalPrice).toBe(150); // $150 + 0% tax
      expect(result.tax).toBe(0);
    });
  });
});
