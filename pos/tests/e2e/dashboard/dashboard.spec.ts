import { test, expect } from '../../helpers/electron';
import { initializeTestDatabase, cleanupDatabase } from '../../helpers/database';

/**
 * E2E tests for Dashboard page
 */
test.describe('Dashboard', () => {
  // Reset database before each test
  test.beforeEach(async () => {
    await initializeTestDatabase();
  });
  
  // Cleanup after all tests
  test.afterAll(async () => {
    await cleanupDatabase();
  });

  test('should load and display dashboard', async ({ page }) => {
    // Wait for dashboard to be visible
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

    // Verify key elements are present
    await expect(page.locator('[data-testid="create-booking-btn"]')).toBeVisible();
    
    // Could verify stats, rooms, etc. are visible
    // await expect(page.locator('[data-testid="stats-container"]')).toBeVisible();
  });

  test('should open booking modal when create button clicked', async ({ page }) => {
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Modal should not be visible initially
    await expect(page.locator('[data-testid="booking-modal"]')).not.toBeVisible();
    
    // Click create booking
    await page.click('[data-testid="create-booking-btn"]');
    
    // Modal should open
    await expect(page.locator('[data-testid="booking-modal"]')).toBeVisible();
    
    // Should be on step 1 (Source selection)
    await expect(page.locator('text=Select Booking Source')).toBeVisible();
  });
});
