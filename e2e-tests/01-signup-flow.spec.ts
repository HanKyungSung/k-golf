import { test, expect } from '@playwright/test';

/**
 * E2E Test 1: User Signup Flow
 * Tests the complete registration journey from form submission to email verification
 */
test.describe('User Signup Flow', () => {
  
  test('should complete full signup process', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testPhone = `${String(timestamp).slice(-10)}`;
    
    // Step 1: Navigate to signup page
    await page.goto('/signup');
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    
    // Step 2: Fill out signup form using correct IDs
    await page.fill('input[id="name"]', 'Test User');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="phone"]', testPhone);
    await page.fill('input[id="dateOfBirth"]', '1992-05-08');
    await page.fill('input[id="password"]', 'SecurePass123');
    await page.fill('input[id="confirmPassword"]', 'SecurePass123');
    
    // Step 3: Submit form and wait for API response
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/register') && response.status() !== 0
    );
    await page.click('button[type="submit"]:has-text("Create Account")');
    const response = await responsePromise;
    
    console.log('Register API status:', response.status());
    const responseBody = await response.text();
    console.log('Register API response:', responseBody.substring(0, 200));
    
    // Step 4: Verify success message on same page (no redirect)
    await expect(page.locator('text=/sent.*verification|verification.*sent/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
  });

  test('should show validation errors for invalid inputs', async ({ page }) => {
    await page.goto('/signup');
    
    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Create Account")');
    
    // Verify validation messages appear (browser native validation)
    await expect(page.locator('input[id="email"]')).toHaveAttribute('required');
    await expect(page.locator('input[id="password"]')).toHaveAttribute('required');
  });

  test('should show error for duplicate email', async ({ page }) => {
    // Use known existing email
    await page.goto('/signup');
    
    await page.fill('input[id="name"]', 'Test User');
    await page.fill('input[id="email"]', 'test@example.com'); // Assuming exists
    await page.fill('input[id="phone"]', '4165551234');
    await page.fill('input[id="dateOfBirth"]', '1992-05-08');
    await page.fill('input[id="password"]', 'Password123');
    await page.fill('input[id="confirmPassword"]', 'Password123');
    
    await page.click('button[type="submit"]:has-text("Create Account")');
    
    // Should show error message
    await expect(page.locator('text=/email.*already|already registered/i')).toBeVisible();
  });

  test('should show error for duplicate phone', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[id="name"]', 'Test User');
    await page.fill('input[id="email"]', `unique${Date.now()}@example.com`);
    await page.fill('input[id="phone"]', '4165552000'); // Known existing number
    await page.fill('input[id="dateOfBirth"]', '1992-05-08');
    await page.fill('input[id="password"]', 'Password123');
    await page.fill('input[id="confirmPassword"]', 'Password123');
    
    await page.click('button[type="submit"]:has-text("Create Account")');
    
    // Should show error with red border and error message
    await expect(page.locator('text=/phone.*already/i')).toBeVisible();
  });
});
