import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface Booking {
  id: string; customerName: string; customerEmail: string; customerPhone?: string; roomName: string; roomId: string; date: string; time: string; duration: number; players: number; price: number; status: 'confirmed' | 'completed' | 'cancelled'; notes?: string; createdAt?: string;
}
export interface Room { id: string; name: string; capacity: number; hourlyRate: number; status: 'ACTIVE' | 'MAINTENANCE' | 'CLOSED'; color: string }

// Initial mock data (shared across dashboard + detail page)
const initialRooms: Room[] = [
  { id: '1', name: 'Room 1', capacity: 4, hourlyRate: 50, status: 'ACTIVE', color: 'bg-blue-500' },
  { id: '2', name: 'Room 2', capacity: 4, hourlyRate: 50, status: 'ACTIVE', color: 'bg-green-500' },
  { id: '3', name: 'Room 3', capacity: 4, hourlyRate: 50, status: 'ACTIVE', color: 'bg-purple-500' },
  { id: '4', name: 'Room 4', capacity: 4, hourlyRate: 50, status: 'ACTIVE', color: 'bg-orange-500' },
];
const initialBookings: Booking[] = [
  { id: '1', customerName: 'John Doe', customerEmail: 'john@example.com', customerPhone: '+1 (555) 123-4567', roomName: 'Room 1', roomId: '1', date: '2024-01-15', time: '10:00', duration: 2, players: 2, price: 100, status: 'confirmed', notes: 'Birthday celebration', createdAt: '2024-01-10T10:30:00Z' },
  { id: '2', customerName: 'Jane Smith', customerEmail: 'jane@example.com', customerPhone: '+1 (555) 234-5678', roomName: 'Room 2', roomId: '2', date: '2024-01-15', time: '10:30', duration: 1.5, players: 3, price: 150, status: 'confirmed', createdAt: '2024-01-11T14:20:00Z' },
  { id: '3', customerName: 'Mike Johnson', customerEmail: 'mike@example.com', customerPhone: '+1 (555) 345-6789', roomName: 'Room 3', roomId: '3', date: '2024-01-15', time: '14:10', duration: 2, players: 4, price: 200, status: 'confirmed', notes: 'Corporate team building', createdAt: '2024-01-08T09:15:00Z' },
  { id: '4', customerName: 'Sarah Williams', customerEmail: 'sarah@example.com', customerPhone: '+1 (555) 456-7890', roomName: 'Room 1', roomId: '1', date: '2024-01-15', time: '14:30', duration: 1, players: 1, price: 50, status: 'confirmed', createdAt: '2024-01-12T16:45:00Z' },
  { id: '5', customerName: 'Tom Brown', customerEmail: 'tom@example.com', customerPhone: '+1 (555) 567-8901', roomName: 'Room 4', roomId: '4', date: '2024-01-15', time: '16:45', duration: 2, players: 2, price: 100, status: 'confirmed', createdAt: '2024-01-13T11:30:00Z' },
  { id: '6', customerName: 'Emily Davis', customerEmail: 'emily@example.com', customerPhone: '+1 (555) 678-9012', roomName: 'Room 2', roomId: '2', date: '2024-01-16', time: '09:15', duration: 3, players: 4, price: 200, status: 'confirmed', createdAt: '2024-01-14T10:30:00Z' },
  { id: '7', customerName: 'David Wilson', customerEmail: 'david@example.com', customerPhone: '+1 (555) 789-0123', roomName: 'Room 1', roomId: '1', date: '2024-01-16', time: '13:00', duration: 2, players: 2, price: 100, status: 'confirmed', createdAt: '2024-01-14T11:30:00Z' },
  { id: '8', customerName: 'Lisa Anderson', customerEmail: 'lisa@example.com', customerPhone: '+1 (555) 890-1234', roomName: 'Room 3', roomId: '3', date: '2024-01-16', time: '15:20', duration: 1.5, players: 3, price: 150, status: 'confirmed', createdAt: '2024-01-14T12:30:00Z' },
  { id: '9', customerName: 'Robert Taylor', customerEmail: 'robert@example.com', customerPhone: '+1 (555) 901-2345', roomName: 'Room 4', roomId: '4', date: '2024-01-16', time: '18:30', duration: 2, players: 2, price: 100, status: 'confirmed', createdAt: '2024-01-14T13:30:00Z' },
];

interface BookingContextValue {
  rooms: Room[];
  bookings: Booking[];
  globalTaxRate: number; // Global default tax rate (0-100)
  updateBookingStatus: (id: string, status: Booking['status']) => void;
  updateRoomStatus: (id: string, status: Room['status']) => void;
  updateGlobalTaxRate: (rate: number) => void;
  getBookingById: (id: string) => Booking | undefined;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  
  // Initialize global tax rate from localStorage or default to 8%
  // This will be overwritten by API value when it loads
  const [globalTaxRate, setGlobalTaxRate] = useState<number>(() => {
    const saved = localStorage.getItem('global-tax-rate');
    return saved ? parseFloat(saved) : 8;
  });

  // Fetch real rooms from API on mount
  useEffect(() => {
    const fetchRooms = async () => {
      console.log('[BOOKING_CTX] Fetching rooms from API...');
      try {
        const response = await fetch('http://localhost:8080/api/bookings/rooms', {
          headers: {
            'x-pos-admin-key': 'pos-dev-key-change-in-production'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('[BOOKING_CTX] ✅ Loaded rooms from API:', data.rooms);
          if (data.rooms && Array.isArray(data.rooms)) {
            // Map backend rooms to POS room format
            const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
            const mappedRooms = data.rooms.map((r: any, idx: number) => ({
              id: r.id,
              name: r.name,
              capacity: r.capacity || 4,
              hourlyRate: 50, // TODO: Get from room config
              status: r.status || 'ACTIVE',
              color: colors[idx % colors.length]
            }));
            setRooms(mappedRooms);
          }
        } else {
          console.warn('[BOOKING_CTX] ❌ Failed to fetch rooms (status:', response.status, ')');
        }
      } catch (error) {
        console.error('[BOOKING_CTX] ❌ Error fetching rooms:', error);
        console.warn('[BOOKING_CTX] Using mock rooms fallback');
      }
    };

    fetchRooms();
  }, []);

  // Fetch global tax rate from API on mount - API value always wins
  useEffect(() => {
    const fetchTaxRate = async () => {
      console.log('[BOOKING_CTX] Fetching tax rate from API...');
      try {
        const response = await fetch('http://localhost:8080/api/settings/global_tax_rate', {
          credentials: 'include', // Include cookies for auth
        });
        
        console.log('[BOOKING_CTX] API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[BOOKING_CTX] API response data:', data);
          const apiTaxRate = data.parsedValue;
          
          if (typeof apiTaxRate === 'number' && apiTaxRate >= 0 && apiTaxRate <= 100) {
            console.log('[BOOKING_CTX] ✅ Loaded tax rate from API:', apiTaxRate);
            setGlobalTaxRate(apiTaxRate);
            // Sync localStorage with authoritative API value
            localStorage.setItem('global-tax-rate', apiTaxRate.toString());
            console.log('[BOOKING_CTX] ✅ Updated localStorage to:', apiTaxRate);
          } else {
            console.warn('[BOOKING_CTX] ❌ Invalid tax rate from API:', apiTaxRate);
          }
        } else if (response.status === 401 || response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          console.warn('[BOOKING_CTX] ⚠️ Not authenticated (status:', response.status, '). Error:', errorData);
          console.warn('[BOOKING_CTX] Will use localStorage value until authenticated');
          // Not authenticated - use localStorage until user logs in
        } else {
          console.warn('[BOOKING_CTX] ❌ Failed to fetch tax rate from API (status:', response.status, ')');
        }
      } catch (error) {
        console.error('[BOOKING_CTX] ❌ Error fetching tax rate from API:', error);
        console.warn('[BOOKING_CTX] Using localStorage fallback');
        // localStorage value is already loaded in initial state
      }
    };

    // Always fetch from API on mount to ensure we have the latest value
    fetchTaxRate();
  }, []);

  const updateBookingStatus = useCallback((id: string, status: Booking['status']) => {
    setBookings(bs => bs.map(b => b.id === id ? { ...b, status } : b));
  }, []);

  const updateRoomStatus = useCallback((id: string, status: Room['status']) => {
    console.log('[BOOKING_CTX] updateRoomStatus called:', { roomId: id, status });
    
    // Optimistically update local state
    setRooms(rs => rs.map(r => r.id === id ? { ...r, status } : r));
    
    // Enqueue mutation for background sync
    if (window.kgolf?.enqueue) {
      console.log('[BOOKING_CTX] Enqueueing room:update mutation');
      window.kgolf.enqueue('room:update', { roomId: id, status })
        .then((result: any) => console.log('[BOOKING_CTX] Enqueue result:', result))
        .catch((err: any) => console.error('[BOOKING_CTX] Failed to enqueue room update:', err));
    } else {
      console.warn('[BOOKING_CTX] window.kgolf.enqueue not available');
    }
  }, []);

  const updateGlobalTaxRate = useCallback((rate: number) => {
    // Validate rate is between 0 and 100
    const validRate = Math.max(0, Math.min(100, rate));
    
    // Optimistically update local state and localStorage
    setGlobalTaxRate(validRate);
    localStorage.setItem('global-tax-rate', validRate.toString());
    console.log('[BOOKING_CTX] Global tax rate updated locally to:', validRate);
    
    // Sync with backend API
    fetch('http://localhost:8080/api/settings/global_tax_rate', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for auth
      body: JSON.stringify({ value: validRate }),
    })
      .then(response => {
        if (response.ok) {
          console.log('[BOOKING_CTX] Tax rate synced to backend successfully');
        } else {
          console.warn('[BOOKING_CTX] Failed to sync tax rate to backend, local change preserved');
        }
      })
      .catch(error => {
        console.warn('[BOOKING_CTX] Error syncing tax rate to backend, local change preserved:', error);
        // Local change is already applied, so offline operation continues to work
      });
  }, []);

  const getBookingById = useCallback((id: string) => bookings.find(b => b.id === id), [bookings]);

  return (
    <BookingContext.Provider value={{ rooms, bookings, globalTaxRate, updateBookingStatus, updateRoomStatus, updateGlobalTaxRate, getBookingById }}>
      {children}
    </BookingContext.Provider>
  );
};

export function useBookingData() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBookingData must be used within BookingProvider');
  return ctx;
}
