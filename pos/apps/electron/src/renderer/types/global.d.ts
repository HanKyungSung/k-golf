// Global renderer type declarations for the secure preload bridge.
// Ensures TypeScript has strong typing when using window.kgolf in React components.

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'hours' | 'food' | 'drinks' | 'appetizers' | 'desserts';
  hours?: number;
  available: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface KgolfAPI {
  ping(): string;
  createBooking(data: { customerName: string; startsAt: string; endsAt: string }): Promise<any>;
  getQueueSize(): Promise<{ queueSize: number }>;
  enqueue(type: string, payload: any): Promise<{ ok: boolean; outboxId?: string; error?: string }>;
  forceSync(): Promise<{ pushed: number; failures: number; remaining?: number; error?: string }>;
  login(email: string, password: string): Promise<{ ok: boolean; error?: string; user?: { email: string; role: string } }>;
  logout(): Promise<{ ok: boolean }>;
  getAuthStatus(): Promise<{ authenticated: boolean; user?: { email?: string; role?: string } }>;
  onAuthState(cb: (s: { authenticated: boolean; user?: { email?: string; role?: string } }) => void): void;
  onSync(cb: (p: any) => void): void;
  onQueueUpdate(cb: (p: { queueSize: number }) => void): void;
  onMainLog(cb: (log: { level: string; message: any[] }) => void): void;
  listRooms(): Promise<{ ok: boolean; rooms: Array<{ id: number; name: string; openMinutes?: number; closeMinutes?: number; status?: string }>; error?: string }>;
  updateRoom(id: number, patch: { openMinutes?: number; closeMinutes?: number; status?: string }): Promise<{ ok: boolean; room?: { id: number; name: string; openMinutes?: number; closeMinutes?: number; status?: string }; error?: string }>;
  // Menu operations
  menuGetAll(): Promise<{ success: boolean; data?: MenuItem[]; error?: string }>;
  menuGetByCategory(category: string): Promise<{ success: boolean; data?: MenuItem[]; error?: string }>;
  menuGetById(id: string): Promise<{ success: boolean; data?: MenuItem | null; error?: string }>;
  menuCreate(item: Omit<MenuItem, 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: MenuItem; error?: string }>;
  menuUpdate(id: string, updates: Partial<Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{ success: boolean; data?: MenuItem | null; error?: string }>;
  menuDelete(id: string): Promise<{ success: boolean; data?: boolean; error?: string }>;
  menuToggleAvailability(id: string): Promise<{ success: boolean; data?: MenuItem | null; error?: string }>;
  printBill(printData: {
    seatName: string;
    customerName?: string;
    roomName?: string;
    date: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    subtotal: number;
    tax: number;
    total: number;
  }): Promise<{ success: boolean; error?: string }>;
}

declare global {
  // Keep property as any to avoid conflict with prior ambient any, then provide a type helper.
  interface Window { kgolf: any }
}

export function getKgolf(): KgolfAPI | undefined;

export {};
