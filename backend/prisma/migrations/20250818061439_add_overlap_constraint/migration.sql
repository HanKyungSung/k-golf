-- Enable required extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- NOTE: Planned exclusion constraint (roomId + time range) failed due to IMMUTABLE requirement
-- in shadow DB during Prisma validation when using tstzrange on timestamptz. For now we enforce
-- a simpler invariant: no two bookings for same room with identical startTime.
-- Future migration: add generated column booking_range (tsrange) with immutable expression and
-- add real EXCLUDE constraint to guard partial overlaps.

CREATE UNIQUE INDEX IF NOT EXISTS booking_room_start_unique ON "Booking"("roomId", "startTime");