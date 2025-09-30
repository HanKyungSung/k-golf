// Global renderer type declarations for the secure preload bridge.
// Ensures TypeScript has strong typing when using window.kgolf in React components.

export interface KgolfAPI {
  ping(): string;
  createBooking(data: { customerName: string; startsAt: string; endsAt: string }): Promise<any>;
  getQueueSize(): Promise<{ queueSize: number }>;
  forceSync(): Promise<{ pushed: number; failures: number; remaining?: number; error?: string }>;
  login(email: string, password: string): Promise<{ ok: boolean; error?: string; user?: { email: string; role: string } }>;
  logout(): Promise<{ ok: boolean }>;
  getAuthStatus(): Promise<{ authenticated: boolean; user?: { email?: string; role?: string } }>;
  onAuthState(cb: (s: { authenticated: boolean; user?: { email?: string; role?: string } }) => void): void;
  onSync(cb: (p: any) => void): void;
  onQueueUpdate(cb: (p: { queueSize: number }) => void): void;
  listRooms(): Promise<{ ok: boolean; rooms: Array<{ id: number; name: string; openMinutes?: number; closeMinutes?: number; status?: string }>; error?: string }>;
  updateRoom(id: number, patch: { openMinutes?: number; closeMinutes?: number; status?: string }): Promise<{ ok: boolean; room?: { id: number; name: string; openMinutes?: number; closeMinutes?: number; status?: string }; error?: string }>;
}

declare global {
  // Keep property as any to avoid conflict with prior ambient any, then provide a type helper.
  interface Window { kgolf: any }
}

export function getKgolf(): KgolfAPI | undefined;

export {};
