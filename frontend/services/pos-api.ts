/**
 * POS API Service
 * Direct REST API calls to backend (no IPC, no local database)
 */

const API_BASE = process.env.REACT_APP_API_BASE !== undefined ? process.env.REACT_APP_API_BASE : 'http://localhost:8080';

// Logged once on module load
if (typeof window !== 'undefined') {
  console.log('[POS API] API_BASE:', API_BASE);
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ============= Bookings API =============

export interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // hours
  players: number;
  price: number;
  status: string; // 'confirmed' | 'completed' | 'cancelled'
  bookingStatus?: string; // CONFIRMED | COMPLETED | CANCELLED
  paymentStatus?: string; // UNPAID | BILLED | PAID
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingFilters {
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  roomId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function listBookings(filters?: BookingFilters): Promise<Booking[]> {
  const params = new URLSearchParams();
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.roomId) params.append('roomId', filters.roomId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const url = `${API_BASE}/api/bookings?${params.toString()}`;

  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'x-pos-admin-key': 'pos-dev-key-change-in-production' }
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[POS API] Bookings error:', errorText);
    throw new Error(`Failed to fetch bookings: ${res.status} ${errorText}`);
  }
  
  const json = await res.json();
  // Only log on first successful load
  if (json.bookings && json.bookings.length > 0) {
    console.log('[POS API] Loaded', json.bookings.length, 'bookings');
  }
  return json.bookings || [];
}

export async function getBooking(id: string): Promise<Booking> {
  const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
    credentials: 'include',
    headers: { 'x-pos-admin-key': 'pos-dev-key-change-in-production' }
  });

  if (!res.ok) throw new Error('Failed to fetch booking');
  
  const json = await res.json();
  return json.booking;
}

export async function createBooking(data: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  roomId: string;
  startTime: string; // ISO datetime string
  players: number;
  duration: number;
  bookingSource: 'WALK_IN' | 'PHONE' | 'ONLINE';
}): Promise<Booking> {
  const res = await fetch(`${API_BASE}/api/bookings/simple/create`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-pos-admin-key': 'pos-dev-key-change-in-production'
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create booking');
  }
  
  const json = await res.json();
  return json.booking;
}

export async function updateBookingStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/bookings/${id}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-pos-admin-key': 'pos-dev-key-change-in-production'
    },
    body: JSON.stringify({ status })
  });

  if (!res.ok) throw new Error('Failed to update booking status');
}

export async function cancelBooking(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/bookings/${id}/cancel`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'x-pos-admin-key': 'pos-dev-key-change-in-production' }
  });

  if (!res.ok) throw new Error('Failed to cancel booking');
}

// ============= Rooms API =============

export interface Room {
  id: string;
  name: string;
  capacity: number;
  hourlyRate: number;
  status: string; // 'ACTIVE' | 'MAINTENANCE' | 'CLOSED'
  openMinutes?: number;
  closeMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export async function listRooms(): Promise<Room[]> {
  const url = `${API_BASE}/api/bookings/rooms`;

  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'x-pos-admin-key': 'pos-dev-key-change-in-production' }
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[POS API] Rooms error:', errorText);
    throw new Error(`Failed to fetch rooms: ${res.status} ${errorText}`);
  }
  
  const json = await res.json();
  if (json.rooms && json.rooms.length > 0) {
    console.log('[POS API] Loaded', json.rooms.length, 'rooms');
  }
  return json.rooms || [];
}

export async function updateRoomStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/bookings/rooms/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-pos-admin-key': 'pos-dev-key-change-in-production'
    },
    body: JSON.stringify({ status })
  });

  if (!res.ok) throw new Error('Failed to update room status');
}

// ============= Menu API =============

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export async function listMenuItems(): Promise<MenuItem[]> {
  const res = await fetch(`${API_BASE}/api/menu/items`, {
    credentials: 'include',
    headers: { 'x-pos-admin-key': 'pos-dev-key-change-in-production' }
  });

  if (!res.ok) throw new Error('Failed to fetch menu items');
  
  const json = await res.json();
  return json.items || [];
}

export async function createMenuItem(data: {
  name: string;
  category: string;
  price: number;
  description?: string;
  available?: boolean;
}): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/api/menu/items`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-pos-admin-key': 'pos-dev-key-change-in-production'
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) throw new Error('Failed to create menu item');
  
  const json = await res.json();
  return json.item;
}

export async function updateMenuItem(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/api/menu/items/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-pos-admin-key': 'pos-dev-key-change-in-production'
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) throw new Error('Failed to update menu item');
  
  const json = await res.json();
  return json.item;
}

export async function deleteMenuItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/menu/items/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'x-pos-admin-key': 'pos-dev-key-change-in-production' }
  });

  if (!res.ok) throw new Error('Failed to delete menu item');
}

// ============= Settings API =============

export async function getGlobalTaxRate(): Promise<number> {
  const res = await fetch(`${API_BASE}/api/settings/global_tax_rate`, {
    credentials: 'include',
    headers: { 'x-pos-admin-key': 'pos-dev-key-change-in-production' }
  });

  if (!res.ok) return 8; // default fallback
  
  const json = await res.json();
  // Backend returns { taxRate: number, key: string, updatedAt?: string }
  return json.taxRate || 8;
}

export async function updateGlobalTaxRate(rate: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/settings/global_tax_rate`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-pos-admin-key': 'pos-dev-key-change-in-production'
    },
    // Backend expects { taxRate: number }
    body: JSON.stringify({ taxRate: rate })
  });

  if (!res.ok) throw new Error('Failed to update tax rate');
}
