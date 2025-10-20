# Tasks & Open Questions

## Specification
- 4번 룸만 left hand & right hand both 가능
- 1 -3번 룸들은 오른쪽만
- 메뉴에 시간을 넣는거. 1h, 4h etc
- add menu not working also split functionality.
- guest -> name / phone 
- 20 분오면 1시간 무료 
- score system on account.
  - manually entering by admin. Total hits etc,
    - golf field plance name, finaly score.
  - 18 hole 72 hits 0
  - under 72: -2 score
- phone number only for now. login/register
  - online login with phone number

- printing bill


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

### E2E Test Failures (Data-testid Issue RESOLVED)

**Status:** 3 out of 5 tests passing ✅

**Resolved:**
- ✅ Fixed Button component to forward `data-testid` prop via `{...rest}` spread operator
- ✅ All `data-testid` attributes now properly appear in rendered DOM
- ✅ Playwright can successfully locate and interact with all elements

**Remaining Failures (Functional Issues):**

1. **Test: "should create walk-in booking with new customer"**
   - **Issue:** Modal doesn't close after successful booking creation
   - **Error:** `expect(locator).not.toBeVisible()` - Modal still visible after clicking "Create Booking"
   - **Root Cause:** Backend API/onSuccess callback not triggering modal close
   - **Location:** `pos/tests/e2e/booking/create-booking.spec.ts:85`
   - **Next Steps:** Investigate BookingModal `handleSubmit` success flow and `onSuccess` callback

2. **Test: "should disable guest mode for phone bookings"**
   - **Issue:** Continue button remains enabled when guest mode is selected for phone bookings
   - **Error:** `expect(continueBtn).toBeDisabled()` - Button is enabled when it should be disabled
   - **Root Cause:** React state update timing or validation logic not applying correctly
   - **Location:** `pos/tests/e2e/booking/create-booking.spec.ts:150`
   - **Implementation:** Added `canProceedFromCustomerMode()` validation but button still enables
   - **Next Steps:** Debug React rendering cycle and button disabled logic on customerMode step

**Note:** These are functional/business logic issues, not test infrastructure problems.

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
