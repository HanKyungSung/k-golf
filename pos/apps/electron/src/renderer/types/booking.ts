// Booking-related types for POS system

// Customer
export interface Customer {
  id: string;
  name: string;
  phone: string; // E.164 format: +1XXXXXXXXXX
  email?: string;
  totalVisits: number;
  lastVisit?: string;
  createdAt: string;
}

export interface NewCustomerData {
  name: string;
  phone: string; // E.164 format
  email?: string;
  password: string;
}

export interface GuestCustomerData {
  name: string;
  phone: string; // E.164 format
  email?: string;
}

export type CustomerMode = "existing" | "new" | "guest";

export type BookingSource = "WALK_IN" | "PHONE";

// Booking form data
export interface BookingFormData {
  // Customer info
  customerMode: CustomerMode;
  selectedCustomer?: Customer;
  newCustomer?: NewCustomerData;
  guestCustomer?: GuestCustomerData;
  
  // Booking details
  bookingSource: BookingSource;
  roomId: string;
  date: string;
  time: string;
  hours: number;
  players: number;
  
  // Optional
  customPrice?: number;
  customTaxRate?: number;
  internalNotes?: string;
}
