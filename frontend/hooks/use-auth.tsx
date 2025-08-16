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
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const savedUser = localStorage.getItem("k-golf-user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    // Mock authentication - replace with real API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const mockUser = {
      id: "1",
      name: "John Doe",
      email: email,
    }

    setUser(mockUser)
    localStorage.setItem("k-golf-user", JSON.stringify(mockUser))
  }

  const signup = async (name: string, email: string, password: string) => {
    // Mock signup - replace with real API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const mockUser = {
      id: Date.now().toString(),
      name: name,
      email: email,
    }

    setUser(mockUser)
    localStorage.setItem("k-golf-user", JSON.stringify(mockUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("k-golf-user")
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
