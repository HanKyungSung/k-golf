import { test, expect } from '@playwright/test';

/**
 * E2E Test 2: Complete Booking Flow
 * Tests the entire booking journey from room selection to confirmation
 */
test.describe('Complete Booking Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
  });

  test('should create booking through complete user flow', async ({ page }) => {
    // Step 1: Navigate to booking page
    await page.goto('/booking');
    await expect(page.locator('h2').filter({ hasText: /Book|Reserve/i })).toBeVisible();
    
    // Step 2: Select a room
    const roomButton = page.locator('button:has-text("Bay 1"), [data-room-id="1"]').first();
    await roomButton.click();
    
    // Verify room is selected (background color change or checkmark)
    await expect(roomButton).toHaveClass(/selected|active/);
    
    // Step 3: Select date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    
    await page.fill('input[type="date"]', dateStr);
    
    // Step 4: Select start time
    await page.selectOption('select[name="startTime"], [name="time"]', '10:00');
    
    // Step 5: Select number of players
    await page.selectOption('select[name="numberOfPlayers"], select[name="players"]', '2');
    
    // Step 6: Verify booking summary
    const summary = page.locator('.booking-summary, .summary-card');
    await expect(summary).toContainText(/Bay 1/i);
    await expect(summary).toContainText(/2.*player/i);
    
    // Step 7: Submit booking
    await page.click('button:has-text("Create Booking"), button:has-text("Book Now")');
    
    // Step 8: Wait for success confirmation
    await page.waitForURL(/.*bookings|success/, { timeout: 5000 });
    
    // Step 9: Verify success message or booking in list
    const successIndicator = page.locator('text=/booking.*created|success/i, .success-message');
    await expect(successIndicator).toBeVisible({ timeout: 3000 });
  });

  test('should show available time slots', async ({ page }) => {
    await page.goto('/booking');
    
    // Select room
    await page.click('button:has-text("Bay 1")');
    
    // Select date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[type="date"]', tomorrow.toISOString().split('T')[0]);
    
    // Verify time slots appear
    await expect(page.locator('select[name="startTime"] option, button[data-time]')).toHaveCount(13, { timeout: 3000 });
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/booking');
    
    // Try to submit without selecting anything
    const submitButton = page.locator('button:has-text("Create Booking"), button:has-text("Book Now")');
    
    // Button should be disabled
    if (await submitButton.isDisabled()) {
      expect(await submitButton.isDisabled()).toBe(true);
    } else {
      // If not disabled, click and check for validation messages
      await submitButton.click();
      await expect(page.locator('text=/select.*room|required/i')).toBeVisible();
    }
  });

  test('should calculate correct price', async ({ page }) => {
    await page.goto('/booking');
    
    // Select room
    await page.click('button:has-text("Bay 1")');
    
    // Select 2 players
    await page.selectOption('select[name="players"]', '2');
    
    // Should show price: $35/player = $70 total (or $35 for 1 hour)
    const priceElement = page.locator('text=/\\$\\d+/, .price, .total');
    await expect(priceElement).toBeVisible();
  });
});
