import { test as base, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

/**
 * Electron test fixtures
 * Provides electronApp and page instances for all tests
 */
type ElectronFixtures = {
  electronApp: ElectronApplication;
  page: Page;
};

/**
 * Helper function to login to the application
 */
async function loginToApp(page: Page) {
  // Wait for login page to load
  await page.waitForSelector('#loginEmail', { timeout: 10000 });
  
  // Fill in credentials (admin user created by test database seed)
  await page.fill('#loginEmail', 'admin@kgolf.com');
  await page.fill('#loginPassword', 'admin123');
  
  // Click sign in button
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard (login success)
  // We'll wait for the login form to disappear
  await page.waitForSelector('#loginEmail', { state: 'hidden', timeout: 10000 });
  
  // Give the app a moment to fully load the dashboard
  await page.waitForTimeout(1000);
}

/**
 * Extended test with Electron fixtures
 * Usage in tests:
 *   import { test, expect } from '../helpers/electron';
 *   test('my test', async ({ page }) => { ... });
 */
export const test = base.extend<ElectronFixtures>({
  electronApp: async ({}, use) => {
    // Path to your Electron main process file (built version)
    const mainPath = path.join(__dirname, '../../apps/electron/dist/main.js');
    
    // Launch Electron app
    const app = await electron.launch({
      args: [mainPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        // Hardcoded backend URL for E2E tests
        BACKEND_URL: 'http://localhost:8080',
      },
    });

    // Wait for the app to be ready
    await app.evaluate(async ({ app }) => {
      return app.whenReady();
    });

    await use(app);
    
    // Cleanup: close app after test
    await app.close();
  },

  page: async ({ electronApp }, use) => {
    // Get the first window that opened
    const page = await electronApp.firstWindow();
    
    // Set default timeout for this page
    page.setDefaultTimeout(10000);
    
    // Auto-login for all tests
    await loginToApp(page);
    
    await use(page);
  },
});

export { expect, loginToApp };
