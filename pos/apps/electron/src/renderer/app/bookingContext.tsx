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
  bookingSource: string;
  roomName: string;
  roomId: string;
  date: string;
  time: string;
  duration: number;
  players: number;
  price: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  paymentStatus?: 'UNPAID' | 'BILLED' | 'PAID';
  billedAt?: string;
  paidAt?: string;
  paymentMethod?: 'CARD' | 'CASH';
  tipAmount?: number;
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

export interface BookingContextValue {
  rooms: Room[];
  bookings: Booking[]; // All bookings for current date range
  globalTaxRate: number;
  
  // Actions
  updateBookingStatus: (id: string, status: Booking['status']) => void;
  updateRoomStatus: (id: string, status: Room['status']) => void;
  updateGlobalTaxRate: (rate: number) => void;
  getBookingById: (id: string) => Booking | undefined;
  fetchBookings: (options?: { startDate?: string; endDate?: string; roomId?: string }) => Promise<void>;
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
  const [bookings, setBookings] = useState<Booking[]>([]); // All bookings for current date range
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
  const fetchBookings = useCallback(
    async (options?: { startDate?: string; endDate?: string; roomId?: string }) => {
      console.log('[BOOKING_CTX] Fetching bookings from SQLite...', options);

      try {
        const result = await (window as any).kgolf?.listBookings(options);

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

          // Handle both old 'status' and new 'bookingStatus' fields for backward compatibility
          // Prioritize old 'status' field since it has correct data after migration
          const bookingStatus = b.status || b.bookingStatus || 'confirmed';
          const normalizedStatus = bookingStatus === 'CANCELED' || bookingStatus === 'CANCELLED' 
            ? 'cancelled' 
            : bookingStatus.toLowerCase();

          return {
            id: b.id,
            customerName: b.customerName || 'Guest',
            customerEmail: b.customerEmail || '',
            customerPhone: b.customerPhone || '',
            bookingSource: b.bookingSource,
            roomName: room?.name || `Room ${b.roomId}`,
            roomId: b.roomId,
            date: startTime.toISOString().split('T')[0],
            time: startTime.toTimeString().slice(0, 5),
            duration: durationHours,
            players: b.players,
            price: typeof b.price === 'number' ? b.price : parseFloat(b.price || '0'),
            status: normalizedStatus,
            paymentStatus: b.paymentStatus,
            billedAt: b.billedAt,
            paidAt: b.paidAt,
            paymentMethod: b.paymentMethod,
            tipAmount: b.tipAmount,
            notes: b.internalNotes || '',
            createdAt: b.createdAt,
          } as Booking;
        });

        setBookings(mappedBookings);
      } catch (error) {
        console.error('[BOOKING_CTX] ❌ Error fetching bookings:', error);
        setBookings([]);
      }
    },
    [rooms]
  );

  /**
   * Fetch rooms from local SQLite (synced from backend)
   */
  const fetchRooms = useCallback(async () => {
    console.log('[BOOKING_CTX] Fetching rooms from local database...');

    try {
      const result = await (window as any).kgolf.listRooms();

      if (!result.ok) {
        console.warn('[BOOKING_CTX] ❌ Failed to fetch rooms:', result.error);
        return;
      }

      console.log('[BOOKING_CTX] ✅ Loaded rooms from local DB:', result.rooms);

      if (result.rooms && Array.isArray(result.rooms)) {
        const mappedRooms = result.rooms.map((r: any, idx: number) => ({
          id: r.id,
          name: r.name,
          capacity: r.capacity || 4,
          hourlyRate: 50, // TODO: Get from room config
          status: r.status || 'ACTIVE',
          color: ROOM_COLORS[idx % ROOM_COLORS.length],
        }));
        console.log('[BOOKING_CTX] 📍 Setting rooms state:', mappedRooms);
        
        // Only update state if data actually changed (prevent unnecessary re-renders)
        setRooms((prev) => {
          if (prev.length !== mappedRooms.length) return mappedRooms;
          // Check if any room changed
          const changed = mappedRooms.some((newR: Room, idx: number) => {
            const oldR = prev[idx];
            return !oldR || oldR.id !== newR.id || oldR.status !== newR.status || oldR.name !== newR.name;
          });
          return changed ? mappedRooms : prev;
        });
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
      const apiBase = await (window as any).kgolf.getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/settings/global_tax_rate`, {
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
    (window as any).kgolf.getApiBaseUrl().then((apiBase: string) => {
      fetch(`${apiBase}/api/settings/global_tax_rate`, {
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
    });
  }, []);

  const getBookingById = useCallback(
    (id: string) => bookings.find((b) => b.id === id),
    [bookings]
  );

  // No longer needed - components call fetchBookings directly with date ranges

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * On mount: Fetch rooms and tax rate
   * Components will fetch their own bookings with appropriate date ranges
   */
  useEffect(() => {
    const initializeData = async () => {
      await fetchRooms();
      await fetchTaxRate();
    };
    initializeData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Listen for sync events and auto-refresh rooms
   */
  useEffect(() => {
    const kgolf = (window as any).kgolf;
    if (!kgolf?.onSync) {
      console.warn('[BOOKING_CTX] ⚠️ kgolf.onSync not available, auto-refresh disabled');
      return;
    }

    const handleSyncUpdate = async (payload: any) => {
      // Only refresh rooms when sync completes with data changes
      if (payload?.sync && payload.sync.pushed > 0) {
        console.log('[BOOKING_CTX] 🔄 Refreshing rooms after sync');
        await fetchRooms();
        // Note: Bookings will be refreshed by components that need them
      }
    };

    kgolf.onSync(handleSyncUpdate);

    return () => {
      // Cleanup on unmount
    };
  }, [fetchRooms]);

  // ============================================================================
  // Provider
  // ============================================================================

  return (
    <BookingContext.Provider
      value={{
        rooms,
        bookings,
        globalTaxRate,
        updateBookingStatus,
        updateRoomStatus,
        updateGlobalTaxRate,
        getBookingById,
        fetchBookings,
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

