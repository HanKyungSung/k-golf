import { test, expect } from '@playwright/test';

/**
 * E2E Test 3: POS Order Entry Flow
 * Tests adding items, splitting bills, and processing payments in POS
 */
test.describe('POS Order Entry Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as admin/POS user
    await page.goto('/login');
    await page.fill('input[id="email"]', 'admin@k-golf.ca');
    await page.fill('input[id="password"]', 'admin123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
  });

  test('should add orders to booking and process payment', async ({ page }) => {
    // Step 1: Go to dashboard and find a booking
    await page.goto('/pos/dashboard');
    
    // Click on first booking in timeline/list
    const firstBooking = page.locator('[data-booking-id], .booking-card, .timeline-booking').first();
    await firstBooking.click();
    
    // Step 2: Verify booking detail page loaded
    await expect(page.locator('h1, h2').first()).toContainText(/Booking|Detail/i);
    
    // Step 3: Add menu item to seat 1
    const addItemButton = page.locator('button:has-text("Add Item"), button:has-text("+")').first();
    await addItemButton.click();
    
    // Step 4: Select menu item from modal/dropdown
    await page.click('button:has-text("Club Sandwich"), [data-item="club-sandwich"]');
    
    // Step 5: Confirm quantity and seat
    const confirmButton = page.locator('button:has-text("Add"), button:has-text("Confirm")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Step 6: Verify item appears in order list
    await expect(page.locator('text=Club Sandwich')).toBeVisible();
    await expect(page.locator('text=/\\$12\\.99|12.99/')).toBeVisible();
    
    // Step 7: Open payment section
    const payButton = page.locator('button:has-text("Pay"), button:has-text("Process Payment")');
    await payButton.click();
    
    // Step 8: Select payment method
    await page.click('input[value="CARD"], button:has-text("Card")');
    
    // Step 9: Add tip (optional)
    const tipInput = page.locator('input[name="tip"], input[placeholder*="tip"]');
    if (await tipInput.isVisible()) {
      await tipInput.fill('5.00');
    }
    
    // Step 10: Submit payment
    await page.click('button:has-text("Process Payment"), button:has-text("Complete")');
    
    // Step 11: Verify payment success
    await expect(page.locator('text=/payment.*success|paid/i, .badge:has-text("PAID")')).toBeVisible({ timeout: 5000 });
  });

  test('should split bill across seats', async ({ page }) => {
    await page.goto('/pos/dashboard');
    
    // Click first booking
    await page.locator('.booking-card').first().click();
    
    // Add items to different seats
    await page.click('button:has-text("Add Item")');
    await page.click('[data-item="beer"]');
    await page.selectOption('select[name="seat"]', '1');
    await page.click('button:has-text("Add")');
    
    await page.click('button:has-text("Add Item")');
    await page.click('[data-item="club-sandwich"]');
    await page.selectOption('select[name="seat"]', '2');
    await page.click('button:has-text("Add")');
    
    // Verify items split correctly
    const seat1Section = page.locator('[data-seat="1"], .seat-1');
    await expect(seat1Section.locator('text=Beer')).toBeVisible();
    
    const seat2Section = page.locator('[data-seat="2"], .seat-2');
    await expect(seat2Section.locator('text=Club Sandwich')).toBeVisible();
  });

  test('should calculate totals with tax', async ({ page }) => {
    await page.goto('/pos/dashboard');
    await page.locator('.booking-card').first().click();
    
    // Add item
    await page.click('button:has-text("Add Item")');
    await page.click('[data-item="club-sandwich"]'); // $12.99
    await page.click('button:has-text("Add")');
    
    // Verify calculations
    await expect(page.locator('text=/subtotal.*12\\.99/i')).toBeVisible();
    await expect(page.locator('text=/tax.*1\\./i')).toBeVisible(); // ~$1.30 tax
    await expect(page.locator('text=/total.*14\\./i')).toBeVisible(); // ~$14.29 total
  });

  test('should remove order item', async ({ page }) => {
    await page.goto('/pos/dashboard');
    await page.locator('.booking-card').first().click();
    
    // Add item
    await page.click('button:has-text("Add Item")');
    await page.click('[data-item="beer"]');
    await page.click('button:has-text("Add")');
    
    // Verify item added
    await expect(page.locator('text=Beer')).toBeVisible();
    
    // Remove item
    await page.locator('button[aria-label*="Remove"], button:has-text("Remove")').first().click();
    
    // Confirm removal
    const confirmDelete = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
    if (await confirmDelete.isVisible()) {
      await confirmDelete.click();
    }
    
    // Verify item removed
    await expect(page.locator('text=Beer')).not.toBeVisible({ timeout: 2000 });
  });
});
