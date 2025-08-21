"use client"

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

  const login = async (email: string, password: string) => {
    const apiBase = process.env.REACT_APP_API_BASE;
    const res = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Login failed');
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
    if (!res.ok) throw new Error('Signup failed');
    const data = await res.json();
    // No user set yet; waiting for verification
    return data;
  }

  const logout = () => {
    setUser(null);
    const apiBase = process.env.REACT_APP_API_BASE;
    fetch(`${apiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(()=>{});
  }

  return <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
