#!/bin/bash

echo "🧪 Testing Full Sync Implementation"
echo "===================================="
echo ""

# Step 1: Check current state
echo "📊 Current SQLite state:"
echo "  Bookings count: $(sqlite3 data/pos.sqlite 'SELECT COUNT(*) FROM Booking;' 2>/dev/null || echo 'N/A')"
echo "  Last sync: $(sqlite3 data/pos.sqlite "SELECT value FROM Metadata WHERE key = 'bookings_lastSyncedAt';" 2>/dev/null || echo 'Never')"
echo ""

# Step 2: Delete database
echo "🗑️  Deleting SQLite database..."
rm -f data/pos.sqlite*
echo "  ✅ Database deleted"
echo ""

# Step 3: Instructions
echo "📝 Next steps:"
echo "  1. Restart the POS app (npm run dev)"
echo "  2. Login with your credentials"
echo "  3. Watch for these log messages:"
echo ""
echo "     [AUTH][LOGIN] Triggering FULL bookings pull (all history)"
echo "     [AUTH][LOGIN] bookings:pull (FULL) enqueued, syncQueueId: ..."
echo "     [SYNC][BOOKING][PULL] Processing bookings:pull"
echo "     [SYNC][BOOKINGS] GET http://localhost:8080/api/bookings (FULL SYNC - all bookings)"
echo "     [SYNC][BOOKINGS] Received N bookings from backend (full)"
echo "     [SYNC][BOOKINGS] Successfully synced N bookings to local SQLite (FULL)"
echo "     [SYNC][BOOKINGS] Updated lastSyncedAt to: 2025-10-26T..."
echo ""
echo "  4. After sync completes, run this script again with 'check' to verify:"
echo "     ./test-full-sync.sh check"
echo ""

if [ "$1" == "check" ]; then
  echo "🔍 Verifying sync results:"
  echo ""
  
  BOOKING_COUNT=$(sqlite3 data/pos.sqlite 'SELECT COUNT(*) FROM Booking;' 2>/dev/null)
  LAST_SYNC=$(sqlite3 data/pos.sqlite "SELECT value FROM Metadata WHERE key = 'bookings_lastSyncedAt';" 2>/dev/null)
  
  if [ -n "$BOOKING_COUNT" ]; then
    echo "  ✅ Bookings synced: $BOOKING_COUNT"
  else
    echo "  ❌ No bookings found"
  fi
  
  if [ -n "$LAST_SYNC" ]; then
    echo "  ✅ Last sync timestamp: $LAST_SYNC"
  else
    echo "  ❌ No lastSyncedAt timestamp"
  fi
  
  echo ""
  
  # Show sample bookings
  echo "📋 Sample bookings (first 3):"
  sqlite3 data/pos.sqlite "SELECT id, customerName, status, startTime FROM Booking LIMIT 3;" 2>/dev/null | while read line; do
    echo "  - $line"
  done
fi
