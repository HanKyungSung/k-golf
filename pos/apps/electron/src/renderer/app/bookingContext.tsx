import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Booking {
  id: string; customerName: string; customerEmail: string; customerPhone?: string; roomName: string; roomId: string; date: string; time: string; duration: number; players: number; price: number; status: 'confirmed' | 'completed' | 'cancelled'; notes?: string; createdAt?: string;
}
export interface Room { id: string; name: string; capacity: number; hourlyRate: number; status: 'available' | 'maintenance' | 'occupied'; color: string }

// Initial mock data (shared across dashboard + detail page)
const initialRooms: Room[] = [
  { id: '1', name: 'Room 1', capacity: 4, hourlyRate: 50, status: 'available', color: 'bg-blue-500' },
  { id: '2', name: 'Room 2', capacity: 4, hourlyRate: 50, status: 'available', color: 'bg-green-500' },
  { id: '3', name: 'Room 3', capacity: 4, hourlyRate: 50, status: 'available', color: 'bg-purple-500' },
  { id: '4', name: 'Room 4', capacity: 4, hourlyRate: 50, status: 'available', color: 'bg-orange-500' },
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
  updateBookingStatus: (id: string, status: Booking['status']) => void;
  updateRoomStatus: (id: string, status: Room['status']) => void;
  getBookingById: (id: string) => Booking | undefined;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);

  const updateBookingStatus = useCallback((id: string, status: Booking['status']) => {
    setBookings(bs => bs.map(b => b.id === id ? { ...b, status } : b));
  }, []);

  const updateRoomStatus = useCallback((id: string, status: Room['status']) => {
    setRooms(rs => rs.map(r => r.id === id ? { ...r, status } : r));
  }, []);

  const getBookingById = useCallback((id: string) => bookings.find(b => b.id === id), [bookings]);

  return (
    <BookingContext.Provider value={{ rooms, bookings, updateBookingStatus, updateRoomStatus, getBookingById }}>
      {children}
    </BookingContext.Provider>
  );
};

export function useBookingData() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBookingData must be used within BookingProvider');
  return ctx;
}
