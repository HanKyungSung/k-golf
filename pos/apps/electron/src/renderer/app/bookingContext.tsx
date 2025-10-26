/**
 * BookingContext.tsx
 * ==================
 * React context for managing booking and room state in the POS application.
 * 
 * Data Flow:
 * - Bookings: Read from local SQLite cache (synced from backend every 15s)
 * - Rooms: Fetched from backend API on mount
 * - Tax Rate: Fetched from backend API, cached in localStorage
 * 
 * Auto-refresh: Listens to sync events and refreshes bookings automatically
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  roomName: string;
  roomId: string;
  date: string;
  time: string;
  duration: number;
  players: number;
  price: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  hourlyRate: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'CLOSED';
  color: string;
}

interface BookingsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface BookingContextValue {
  // State
  rooms: Room[];
  bookings: Booking[];
  bookingsPagination: BookingsPagination | null;
  globalTaxRate: number;
  
  // Actions
  updateBookingStatus: (id: string, status: Booking['status']) => void;
  updateRoomStatus: (id: string, status: Room['status']) => void;
  updateGlobalTaxRate: (rate: number) => void;
  getBookingById: (id: string) => Booking | undefined;
  refreshBookings: () => Promise<void>;
  fetchBookingsPage: (
    page: number,
    limit?: number,
    sortBy?: 'startTime' | 'createdAt',
    order?: 'asc' | 'desc'
  ) => Promise<void>;
}

// ============================================================================
// Context Creation
// ============================================================================

const BookingContext = createContext<BookingContextValue | null>(null);

// ============================================================================
// Constants
// ============================================================================

const ROOM_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
const DEFAULT_TAX_RATE = 8;
const SYNC_REFRESH_THROTTLE_MS = 2000;

// ============================================================================
// Provider Component
// ============================================================================

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsPagination, setBookingsPagination] = useState<BookingsPagination | null>(null);
  const [globalTaxRate, setGlobalTaxRate] = useState<number>(() => {
    const saved = localStorage.getItem('global-tax-rate');
    return saved ? parseFloat(saved) : DEFAULT_TAX_RATE;
  });

  // ============================================================================
  // Fetch Functions
  // ============================================================================

  /**
   * Fetch bookings from local SQLite cache via IPC
   * Supports pagination, sorting, and filtering
   */
  const fetchBookingsPage = useCallback(
    async (
      page: number = 1,
      limit: number = 10,
      sortBy: 'startTime' | 'createdAt' = 'startTime',
      order: 'asc' | 'desc' = 'desc'
    ) => {
      console.log('[BOOKING_CTX] Fetching bookings from SQLite...', { page, limit, sortBy, order });

      try {
        const result = await (window as any).kgolf?.listBookings();

        if (!result?.ok || !Array.isArray(result.bookings)) {
          console.warn('[BOOKING_CTX] ❌ Failed to fetch bookings from SQLite');
          setBookings([]);
          return;
        }

        console.log('[BOOKING_CTX] ✅ Loaded', result.bookings.length, 'bookings from SQLite');

        // Map SQLite bookings to UI format
        const mappedBookings = result.bookings.map((b: any) => {
          const room = rooms.find((r) => r.id === b.roomId);
          const startTime = new Date(b.startTime);
          const endTime = new Date(b.endTime);
          const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

          return {
            id: b.id,
            customerName: b.customerName || 'Guest',
            customerEmail: b.customerEmail || '',
            customerPhone: b.customerPhone || '',
            roomName: room?.name || `Room ${b.roomId}`,
            roomId: b.roomId,
            date: startTime.toISOString().split('T')[0],
            time: startTime.toTimeString().slice(0, 5),
            duration: durationHours,
            players: b.players,
            price: typeof b.price === 'number' ? b.price : parseFloat(b.price || '0'),
            status: b.status === 'CANCELED' ? 'cancelled' : (b.status || 'confirmed').toLowerCase(),
            notes: b.internalNotes || '',
            createdAt: b.createdAt,
          } as Booking;
        });

        // Apply sorting
        const sorted = [...mappedBookings].sort((a, b) => {
          const aVal =
            sortBy === 'startTime'
              ? new Date(a.date + 'T' + a.time).getTime()
              : new Date(a.createdAt || 0).getTime();
          const bVal =
            sortBy === 'startTime'
              ? new Date(b.date + 'T' + b.time).getTime()
              : new Date(b.createdAt || 0).getTime();
          return order === 'asc' ? aVal - bVal : bVal - aVal;
        });

        // Apply pagination
        const startIdx = (page - 1) * limit;
        const endIdx = startIdx + limit;
        const paginated = sorted.slice(startIdx, endIdx);

        setBookings(paginated);
        setBookingsPagination({
          total: sorted.length,
          page,
          limit,
          totalPages: Math.ceil(sorted.length / limit),
        });

        console.log(
          '[BOOKING_CTX] Showing',
          paginated.length,
          'bookings (page',
          page,
          'of',
          Math.ceil(sorted.length / limit),
          ')'
        );
      } catch (error) {
        console.error('[BOOKING_CTX] ❌ Error fetching bookings:', error);
        setBookings([]);
      }
    },
    [rooms]
  );

  /**
   * Fetch rooms from backend API
   */
  const fetchRooms = useCallback(async () => {
    console.log('[BOOKING_CTX] Fetching rooms from API...');

    try {
      const response = await fetch('http://localhost:8080/api/bookings/rooms', {
        headers: { 'x-pos-admin-key': 'pos-dev-key-change-in-production' },
      });

      if (!response.ok) {
        console.warn('[BOOKING_CTX] ❌ Failed to fetch rooms (status:', response.status, ')');
        return;
      }

      const data = await response.json();
      console.log('[BOOKING_CTX] ✅ Loaded rooms from API:', data.rooms);

      if (data.rooms && Array.isArray(data.rooms)) {
        const mappedRooms = data.rooms.map((r: any, idx: number) => ({
          id: r.id,
          name: r.name,
          capacity: r.capacity || 4,
          hourlyRate: 50, // TODO: Get from room config
          status: r.status || 'ACTIVE',
          color: ROOM_COLORS[idx % ROOM_COLORS.length],
        }));
        setRooms(mappedRooms);
      }
    } catch (error) {
      console.error('[BOOKING_CTX] ❌ Error fetching rooms:', error);
    }
  }, []);

  /**
   * Fetch global tax rate from backend API
   */
  const fetchTaxRate = useCallback(async () => {
    console.log('[BOOKING_CTX] Fetching tax rate from API...');

    try {
      const response = await fetch('http://localhost:8080/api/settings/global_tax_rate', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const apiTaxRate = data.parsedValue;

        if (typeof apiTaxRate === 'number' && apiTaxRate >= 0 && apiTaxRate <= 100) {
          console.log('[BOOKING_CTX] ✅ Loaded tax rate from API:', apiTaxRate);
          setGlobalTaxRate(apiTaxRate);
          localStorage.setItem('global-tax-rate', apiTaxRate.toString());
        } else {
          console.warn('[BOOKING_CTX] ❌ Invalid tax rate from API:', apiTaxRate);
        }
      } else if (response.status === 401 || response.status === 403) {
        console.warn('[BOOKING_CTX] ⚠️ Not authenticated. Using localStorage value.');
      } else {
        console.warn('[BOOKING_CTX] ❌ Failed to fetch tax rate (status:', response.status, ')');
      }
    } catch (error) {
      console.error('[BOOKING_CTX] ❌ Error fetching tax rate:', error);
    }
  }, []);

  // ============================================================================
  // Action Functions
  // ============================================================================

  const updateBookingStatus = useCallback((id: string, status: Booking['status']) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  }, []);

  const updateRoomStatus = useCallback((id: string, status: Room['status']) => {
    console.log('[BOOKING_CTX] Updating room status:', { roomId: id, status });

    // Optimistic update
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

    // Enqueue mutation for background sync
    if ((window as any).kgolf?.enqueue) {
      (window as any).kgolf
        .enqueue('room:update', { roomId: id, status })
        .then((result: any) => console.log('[BOOKING_CTX] ✅ Room update enqueued:', result))
        .catch((err: any) => console.error('[BOOKING_CTX] ❌ Failed to enqueue room update:', err));
    } else {
      console.warn('[BOOKING_CTX] ⚠️ window.kgolf.enqueue not available');
    }
  }, []);

  const updateGlobalTaxRate = useCallback((rate: number) => {
    const validRate = Math.max(0, Math.min(100, rate));

    // Optimistic update
    setGlobalTaxRate(validRate);
    localStorage.setItem('global-tax-rate', validRate.toString());
    console.log('[BOOKING_CTX] Tax rate updated locally to:', validRate);

    // Sync with backend
    fetch('http://localhost:8080/api/settings/global_tax_rate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ value: validRate }),
    })
      .then((response) => {
        if (response.ok) {
          console.log('[BOOKING_CTX] ✅ Tax rate synced to backend');
        } else {
          console.warn('[BOOKING_CTX] ⚠️ Failed to sync tax rate to backend');
        }
      })
      .catch((error) => {
        console.warn('[BOOKING_CTX] ⚠️ Error syncing tax rate:', error);
      });
  }, []);

  const getBookingById = useCallback(
    (id: string) => bookings.find((b) => b.id === id),
    [bookings]
  );

  const refreshBookings = useCallback(async () => {
    await fetchBookingsPage(1, 10, 'startTime', 'desc');
  }, [fetchBookingsPage]);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * On mount: Fetch rooms, tax rate, and initial bookings
   */
  useEffect(() => {
    fetchRooms();
    fetchTaxRate();
    refreshBookings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Listen for sync events and auto-refresh bookings
   */
  useEffect(() => {
    const kgolf = (window as any).kgolf;
    if (!kgolf?.onSync) {
      console.warn('[BOOKING_CTX] ⚠️ kgolf.onSync not available, auto-refresh disabled');
      return;
    }

    let lastRefresh = 0;

    const handleSyncUpdate = (payload: any) => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefresh;

      // Throttle to avoid excessive refreshes
      if (timeSinceLastRefresh < SYNC_REFRESH_THROTTLE_MS) {
        return;
      }

      // Refresh when sync completes successfully
      if (payload?.sync?.pushed > 0 || payload?.queueSize === 0) {
        console.log('[BOOKING_CTX] 🔄 Sync completed, refreshing bookings...');
        lastRefresh = now;
        refreshBookings();
      }
    };

    kgolf.onSync(handleSyncUpdate);
    console.log('[BOOKING_CTX] ✅ Listening for sync events');

    return () => {
      console.log('[BOOKING_CTX] Cleanup sync listener');
    };
  }, [refreshBookings]);

  // ============================================================================
  // Provider
  // ============================================================================

  return (
    <BookingContext.Provider
      value={{
        rooms,
        bookings,
        bookingsPagination,
        globalTaxRate,
        updateBookingStatus,
        updateRoomStatus,
        updateGlobalTaxRate,
        getBookingById,
        refreshBookings,
        fetchBookingsPage,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export function useBookingData() {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error('useBookingData must be used within BookingProvider');
  }
  return ctx;
}

