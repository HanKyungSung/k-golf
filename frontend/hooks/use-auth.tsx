import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<{ message: string; expiresAt?: string }>
  logout: () => void
  isLoading: boolean
  resendVerification: (email: string) => Promise<{ message: string; expiresAt?: string; retryAfterSeconds?: number }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const apiBase = process.env.REACT_APP_API_BASE;
        const res = await fetch(`${apiBase}/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [])

  // Centralized helper: prefer backend-provided message
  const getErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data: any = await res.json()
      if (typeof data?.message === 'string' && data.message) return data.message
      if (typeof data?.error === 'string' && data.error) return data.error
      const flatForm = data?.error?.formErrors
      if (Array.isArray(flatForm) && flatForm.length) return flatForm.join(' ')
      const fieldErrors = data?.error?.fieldErrors
      if (fieldErrors && typeof fieldErrors === 'object') {
        const messages = Object.values(fieldErrors).flat().filter(Boolean)
        if (messages.length) return messages.join(' ')
      }
    } catch {
      // ignore JSON parse errors
    }
    return res.status === 401 ? 'Unauthorized' : res.statusText || 'Request failed'
  }

  const login = async (email: string, password: string) => {
    const apiBase = process.env.REACT_APP_API_BASE;
    const res = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
  if (!res.ok) throw new Error(await getErrorMessage(res));
    const data = await res.json();
    setUser(data.user);
  }

  const signup = async (name: string, email: string, password: string) => {
    const apiBase = process.env.REACT_APP_API_BASE;
    const res = await fetch(`${apiBase}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password })
    });
  if (!res.ok) throw new Error(await getErrorMessage(res));
    const data = await res.json();
    // No user set yet; waiting for verification
    return data;
  }

  const resendVerification = async (email: string): Promise<{ message: string; expiresAt?: string; retryAfterSeconds?: number }> => {
    const apiBase = process.env.REACT_APP_API_BASE;
    const res = await fetch(`${apiBase}/api/auth/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      // 429 or 400 returns generic message; surface best effort
      const data = await res.json().catch(()=>({message:'Please try again shortly.'}));
      return data;
    }
    const data = await res.json();
    return data;
  }

  const logout = () => {
    setUser(null);
    const apiBase = process.env.REACT_APP_API_BASE;
    fetch(`${apiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(()=>{});
  }

  return <AuthContext.Provider value={{ user, login, signup, logout, isLoading, resendVerification }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
