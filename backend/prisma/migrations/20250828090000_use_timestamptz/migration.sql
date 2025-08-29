-- Convert all timestamp columns to timestamptz (UTC) preserving instants
-- Note: Postgres will interpret naive timestamp as local time when casting directly to timestamptz.
-- To preserve the same absolute instant (treat stored values as UTC), use 'AT TIME ZONE \"UTC\"'.

-- Users
ALTER TABLE "User"
  ALTER COLUMN "emailVerifiedAt" TYPE timestamptz USING (CASE WHEN "emailVerifiedAt" IS NULL THEN NULL ELSE ("emailVerifiedAt" AT TIME ZONE 'UTC') END),
  ALTER COLUMN "passwordUpdatedAt" TYPE timestamptz USING (CASE WHEN "passwordUpdatedAt" IS NULL THEN NULL ELSE ("passwordUpdatedAt" AT TIME ZONE 'UTC') END),
  ALTER COLUMN "createdAt" TYPE timestamptz USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE timestamptz USING ("updatedAt" AT TIME ZONE 'UTC');

-- Rooms
ALTER TABLE "Room"
  ALTER COLUMN "createdAt" TYPE timestamptz USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE timestamptz USING ("updatedAt" AT TIME ZONE 'UTC');

-- Bookings
ALTER TABLE "Booking"
  ALTER COLUMN "startTime" TYPE timestamptz USING ("startTime" AT TIME ZONE 'UTC'),
  ALTER COLUMN "endTime" TYPE timestamptz USING ("endTime" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE timestamptz USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE timestamptz USING ("updatedAt" AT TIME ZONE 'UTC');

-- AuthProvider
ALTER TABLE "AuthProvider"
  ALTER COLUMN "createdAt" TYPE timestamptz USING ("createdAt" AT TIME ZONE 'UTC');

-- Sessions
ALTER TABLE "Session"
  ALTER COLUMN "expiresAt" TYPE timestamptz USING ("expiresAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE timestamptz USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE timestamptz USING ("updatedAt" AT TIME ZONE 'UTC');

-- EmailVerificationToken
ALTER TABLE "EmailVerificationToken"
  ALTER COLUMN "expiresAt" TYPE timestamptz USING ("expiresAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "consumedAt" TYPE timestamptz USING (CASE WHEN "consumedAt" IS NULL THEN NULL ELSE ("consumedAt" AT TIME ZONE 'UTC') END),
  ALTER COLUMN "createdAt" TYPE timestamptz USING ("createdAt" AT TIME ZONE 'UTC');
