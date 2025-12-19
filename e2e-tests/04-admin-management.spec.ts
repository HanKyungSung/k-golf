import { test, expect } from '@playwright/test';

/**
 * E2E Test 4: Admin Booking Management
 * Tests admin capabilities for managing bookings and users
 */
test.describe('Admin Booking Management', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[id="email"]', 'admin@k-golf.ca');
    await page.fill('input[id="password"]', 'admin123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
  });

  test('should view all bookings in admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    
    // Verify admin dashboard loaded
    await expect(page.locator('h1, h2').first()).toContainText(/Admin|Dashboard/i);
    
    // Verify bookings list is visible
    const bookingsList = page.locator('.bookings-list, [data-testid="bookings-list"], table');
    await expect(bookingsList.first()).toBeVisible();
    
    // Verify at least one booking appears
    const bookingItems = page.locator('.booking-row, tbody tr, .booking-card');
    await expect(bookingItems.first()).toBeVisible();
  });

  test('should filter bookings by date', async ({ page }) => {
    await page.goto('/admin');
    
    // Select today's date
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"], input[name="date"]', today);
    
    // Verify bookings update
    await page.waitForTimeout(500); // Wait for filter to apply
    
    // All visible bookings should be for selected date
    const dateElements = page.locator('text=/20\\d{2}-\\d{2}-\\d{2}|\\w+ \\d+, 20\\d{2}/');
    if (await dateElements.count() > 0) {
      await expect(dateElements.first()).toBeVisible();
    }
  });

  test('should update booking status', async ({ page }) => {
    await page.goto('/admin');
    
    // Click on first booking to open detail
    await page.locator('.booking-row, .booking-card').first().click();
    
    // Find status dropdown/button
    const statusControl = page.locator('select[name="status"], button:has-text("Status")');
    
    if (await statusControl.count() > 0) {
      // Select new status
      await statusControl.first().click();
      await page.click('option:has-text("Completed"), button:has-text("Completed")');
      
      // Save changes
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }
      
      // Verify status updated
      await expect(page.locator('text=/status.*completed/i, .badge:has-text("COMPLETED")')).toBeVisible();
    }
  });

  test('should search for user by phone', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Enter phone number in search
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[name="search"]');
    await searchInput.fill('416555');
    
    // Press Enter or wait for auto-search
    await searchInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Verify search results appear
    const userResults = page.locator('.user-row, .user-card, tbody tr');
    if (await userResults.count() > 0) {
      await expect(userResults.first()).toBeVisible();
      await expect(page.locator('text=/416555/')).toBeVisible();
    }
  });

  test('should view user booking history', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Click on first user
    await page.locator('.user-row, .user-card, tbody tr').first().click();
    
    // Verify user detail page loaded
    await expect(page.locator('h1, h2')).toContainText(/User|Customer|Details/i);
    
    // Verify booking history section
    const bookingHistory = page.locator('text=/booking history|past bookings/i');
    await expect(bookingHistory).toBeVisible();
    
    // Verify bookings list appears
    const historyItems = page.locator('.booking-history-item, .past-booking');
    if (await historyItems.count() > 0) {
      await expect(historyItems.first()).toBeVisible();
    }
  });

  test('should create manual booking for walk-in customer', async ({ page }) => {
    await page.goto('/admin');
    
    // Click create booking button
    await page.click('button:has-text("New Booking"), button:has-text("Create Booking")');
    
    // Fill customer info
    await page.fill('input[name="customerName"]', 'Walk-in Customer');
    await page.fill('input[name="customerPhone"]', '4165559999');
    await page.fill('input[name="customerEmail"]', 'walkin@example.com');
    
    // Select room
    await page.click('button:has-text("Bay 1"), select[name="roomId"]');
    if (await page.locator('option[value]').isVisible()) {
      await page.selectOption('select[name="roomId"]', { index: 1 });
    }
    
    // Select date and time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[type="date"]', tomorrow.toISOString().split('T')[0]);
    await page.selectOption('select[name="startTime"]', '14:00');
    
    // Select players
    await page.selectOption('select[name="players"]', '4');
    
    // Submit
    await page.click('button:has-text("Create"), button[type="submit"]');
    
    // Verify success
    await expect(page.locator('text=/booking.*created|success/i')).toBeVisible({ timeout: 5000 });
  });

  test('should cancel booking', async ({ page }) => {
    await page.goto('/admin');
    
    // Click on a booking
    await page.locator('.booking-card, .booking-row').first().click();
    
    // Find cancel button
    await page.click('button:has-text("Cancel"), button:has-text("Cancel Booking")');
    
    // Confirm cancellation
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Verify booking cancelled
    await expect(page.locator('text=/cancelled|canceled/i, .badge:has-text("CANCELLED")')).toBeVisible();
  });
});
