import { test, expect } from '../../helpers/electron';
import { initializeTestDatabase, cleanupDatabase, getTestPrisma } from '../../helpers/database';
import bookingFixtures from '../../fixtures/bookings.json';

/**
 * E2E tests for booking creation flow
 * 
 * Setup:
 * - Resets database BEFORE EACH test (clean slate)
 * - Seeds admin user and rooms before each test
 * - Cleans up Prisma connection after all tests
 */
test.describe('Booking Creation', () => {
  let adminId: string;
  let roomId: string;
  
  // Reset and seed before EACH test for complete isolation
  test.beforeEach(async () => {
    const { admin, rooms } = await initializeTestDatabase();
    adminId = admin.id;
    roomId = rooms[0].id;
  });
  
  // Cleanup Prisma connection after all tests
  test.afterAll(async () => {
    await cleanupDatabase();
  });

  test('should create walk-in booking with new customer', async ({ page }) => {
    const prisma = getTestPrisma();
    const bookingData = bookingFixtures.bookings[0];
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

    // Click Create Booking button
    await page.click('[data-testid="dashboard-create-booking-btn"]');

    // Modal should open
    await expect(page.locator('[data-testid="booking-modal"]')).toBeVisible();

    // Step 1: Select Walk-in Source
    await page.click('[data-testid="source-walk-in"]');
    await page.waitForSelector('[data-testid="continue-btn"]:not([disabled])', { timeout: 5000 });
    await page.click('[data-testid="continue-btn"]');

    // Step 2: Select New Customer Mode
    await page.click('[data-testid="mode-new-customer"]');
    await page.waitForSelector('[data-testid="continue-btn"]:not([disabled])', { timeout: 5000 });
    await page.click('[data-testid="continue-btn"]');

    // Step 3: Enter Customer Details
    await page.fill('[data-testid="customer-name"]', bookingData.customerName);
    await page.fill('[data-testid="customer-phone"]', bookingData.phone);
    if (bookingData.email) {
      await page.fill('[data-testid="customer-email"]', bookingData.email);
    }
    await page.fill('[data-testid="customer-password"]', 'testpass123'); // Required for new customer
    await page.waitForSelector('[data-testid="continue-btn"]:not([disabled])', { timeout: 5000 });
    await page.click('[data-testid="continue-btn"]');

    // Step 4: Select Room and Enter Booking Details
    // The room dropdown is already on the bookingDetails step, so we select it via the select element
    await expect(page.locator('text=Booking Details')).toBeVisible(); // Wait for step to load
    
    // Select first room from dropdown
    const roomSelect = page.locator('[data-testid="booking-room"]');
    await roomSelect.selectOption({ index: 1 }); // Index 0 is "Select a room", so select index 1
    
    await page.fill('[data-testid="booking-date"]', bookingData.date);
    await page.fill('[data-testid="booking-time"]', bookingData.time);
    await page.fill('[data-testid="booking-hours"]', String(bookingData.hours));
    await page.fill('[data-testid="booking-players"]', String(bookingData.players));
    await page.waitForSelector('[data-testid="continue-btn"]:not([disabled])', { timeout: 5000 });
    await page.click('[data-testid="continue-btn"]');

    // Step 5: Review and Create
    await expect(page.locator('[data-testid="review-customer-name"]')).toContainText(bookingData.customerName);
    // Phone is displayed in E.164 format (+14165551234) on the review screen
    await expect(page.locator('[data-testid="review-phone"]')).toContainText(`+1${bookingData.phone}`);
    
    await page.click('[data-testid="create-booking-btn"]');

    // Wait for success and modal to close
    await expect(page.locator('[data-testid="booking-modal"]')).not.toBeVisible({ timeout: 5000 });
    
    // Verify booking was created in database
    const booking = await prisma.booking.findFirst({
      where: {
        customerName: bookingData.customerName,
        customerPhone: `+1${bookingData.phone}`, // E.164 format
      },
      include: {
        user: true,
      },
    });
    
    expect(booking).not.toBeNull();
    expect(booking!.status).toBe('CONFIRMED');
    expect(booking!.bookingSource).toBe('WALK_IN');
    expect(booking!.isGuestBooking).toBe(false);
    expect(booking!.players).toBe(bookingData.players);
    
    // Verify user was created
    expect(booking!.user).not.toBeNull();
    expect(booking!.user!.name).toBe(bookingData.customerName);
    expect(booking!.user!.role).toBe('CUSTOMER');
    expect(booking!.user!.registrationSource).toBe('WALK_IN');
    
    // Verify createdBy is admin
    expect(booking!.createdBy).toBe(adminId);
  });

  test('should validate phone number is exactly 10 digits', async ({ page }) => {
    await page.waitForSelector('[data-testid="dashboard"]');
    await page.click('[data-testid="dashboard-create-booking-btn"]');
    
    // Navigate to customer details step
    await page.click('[data-testid="source-walk-in"]');
    await page.click('[data-testid="continue-btn"]');
    await page.click('[data-testid="mode-new-customer"]');
    await page.click('[data-testid="continue-btn"]');

    // Try to enter more than 10 digits
    await page.fill('[data-testid="customer-phone"]', '41655512345678');
    
    // Should only accept 10 digits
    const phoneValue = await page.inputValue('[data-testid="customer-phone"]');
    const digitsOnly = phoneValue.replace(/\D/g, '');
    expect(digitsOnly).toHaveLength(10);
  });

  test('should disable guest mode for phone bookings', async ({ page }) => {
    await page.waitForSelector('[data-testid="dashboard"]');
    await page.click('[data-testid="dashboard-create-booking-btn"]');

    // Select PHONE source
    await page.click('[data-testid="source-phone"]');
    await page.click('[data-testid="continue-btn"]');

    // Verify guest mode card is disabled
    const guestCard = page.locator('[data-testid="mode-guest"]');
    
    // Check for disabled styling (opacity-50 class from Tailwind)
    await expect(guestCard).toHaveClass(/opacity-50/);
    
    // Try clicking it - should not proceed
    await guestCard.click();
    const continueBtn = page.locator('[data-testid="continue-btn"]');
    await expect(continueBtn).toBeDisabled();
  });
});
