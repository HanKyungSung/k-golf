# Tasks & Open Questions

## 🤔 Open Questions

### Guest Mode vs Auto-Registration for Walk-ins
**Question:** Should we auto-register all walk-in customers or keep "Guest" mode? Guest mode will create a booking without user.

**Current Behavior:**
- **3 customer modes:** Existing Customer, New Customer, Guest
- **Guest mode:** Creates booking without user account (`userId: null`, stores name/phone/email directly on booking)
- **New Customer mode:** Creates user account + booking (same info: name/phone/email optional)

**Considerations:**
- **Same friction:** Both modes ask for name + phone anyway
- **Pro auto-register:**
  - Builds customer database automatically
  - Returning customers can be found by phone lookup
  - Enables future features: loyalty, booking history, follow-up communications
  - Simpler UX (2 modes instead of 3)
- **Pro keep guest:**
  - Privacy: Some customers may not want an account
  - Data quality: Walk-ins might give temporary/fake info
  - Clear distinction: guest vs registered customer

**Options:**
1. Remove Guest mode → Auto-register all walk-ins with name/phone
2. Keep Guest mode as-is (true anonymous bookings)
3. Middle ground: Keep guest but add "Convert to customer" post-booking

**Decision needed:** Discuss with team/stakeholders

---

## ✅ Completed Tasks

- [x] Simplified authentication to use single admin
  - Updated middleware to use existing admin@kgolf.com instead of creating separate POS admin
- [x] Updated seed script
  - Removed POS-specific admin creation from seed script
- [x] Applied database changes
  - Ran seed successfully (admin user + 4 rooms created)
- [x] Set up Playwright E2E testing framework
  - Created test structure at `pos/tests/`
  - Added database helper with reset/seed functions
  - Created comprehensive booking creation test
  - Added test fixtures (customers.json, bookings.json)
  - Created automated test database setup script
  - Consolidated all documentation into single guide
  - See `pos/tests/E2E_TESTING_GUIDE.md`

## 📋 Pending Tasks

- [ ] Set up test database
  - Run: `cd backend && npm run db:setup-test`
  - This automatically creates k_golf_test database and runs migrations
- [ ] Install Playwright dependencies
  - Run: `cd pos && npm install && npx playwright install`
- [ ] Configure test environment
  - Copy: `cp pos/.env.example pos/.env.test`
  - Update TEST_DATABASE_URL with connection string from setup script
- [ ] Add data-testid attributes to components
  - Add to BookingModal, DashboardPage, and other UI components
  - See examples in `pos/tests/E2E_TESTING_GUIDE.md` (Writing Tests section)
- [ ] Restart backend server
  - Restart backend server to load updated middleware
- [ ] Test booking creation flow
  - Test all three customer modes (existing/new/guest) end-to-end
  - Verify authentication works with API key
  - Verify no foreign key constraint errors
- [ ] Run E2E tests
  - Run: `cd pos && export $(cat .env.test | xargs) && npm run test:e2e:ui`
  - First test verifies booking creation + database records
