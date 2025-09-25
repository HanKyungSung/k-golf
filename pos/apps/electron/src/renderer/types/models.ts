export interface User { email?: string; role?: string }
export interface Room { id: number; name: string; openMinutes?: number; closeMinutes?: number; status?: string }
export interface AuthState { authenticated: boolean; user?: User }
