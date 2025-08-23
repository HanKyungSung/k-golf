import type React from "react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/use-auth"

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // In a real app, check if user has admin role
    if (!user) {
      navigate("/login")
    }
  }, [user, navigate])

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
