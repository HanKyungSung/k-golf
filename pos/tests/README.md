# E2E Tests

End-to-end tests for the K-Golf POS Electron application using Playwright.

## 📖 Full Documentation

**See [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)** for complete setup and usage instructions.

## ⚡ Quick Start

```bash
# 1. Setup test database (run from backend directory)
cd ../../backend
npm run db:setup-test

# 2. Install Playwright
cd ../pos
npm install
npx playwright install

# 3. Run tests
npm run test:e2e:ui
```

**No environment configuration needed** - everything is hardcoded!

## 📁 Structure

```
tests/
├── E2E_TESTING_GUIDE.md     # Complete documentation (READ THIS)
├── e2e/                      # Test specifications
│   ├── booking/
│   │   └── create-booking.spec.ts
│   └── dashboard/
│       └── dashboard.spec.ts
├── fixtures/                 # Test data (JSON)
│   ├── customers.json
│   └── bookings.json
├── helpers/
│   ├── electron.ts          # Electron test fixture
│   └── database.ts          # Database helper functions
└── tsconfig.json
```

## 🎯 What Gets Tested

✅ Full booking creation flow (5-step wizard)  
✅ Database persistence verification  
✅ User account creation  
✅ Form validation (phone numbers, etc.)  
✅ Business logic (guest mode restrictions)

## 📚 Resources

- Main Guide: [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)
- Playwright Docs: https://playwright.dev
- Electron Testing: https://playwright.dev/docs/api/class-electron
