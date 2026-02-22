import type React from "react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { FormError } from "@/components/form/form-error"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const { forgotPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorText(null)

    try {
      const data = await forgotPassword(email)
      setSent(true)
      if (data.retryAfterSeconds) {
        setCooldown(data.retryAfterSeconds)
        const interval = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } catch (error) {
      console.error("Forgot password error:", error)
      setErrorText(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setIsLoading(true)
    try {
      const data = await forgotPassword(email)
      if (data.retryAfterSeconds) {
        setCooldown(data.retryAfterSeconds)
        const interval = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              K one Golf
            </h1>
            <p className="text-sm text-slate-400 mt-1">Premium Screen Golf</p>
          </Link>
        </div>

        <Card className="shadow-2xl bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-white">
              {sent ? "Check Your Email" : "Forgot Password"}
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
              {sent
                ? "We've sent a password reset link to your email"
                : "Enter your email and we'll send you a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-slate-300 text-center text-sm">
                    If an account exists for <span className="text-white font-medium">{email}</span>,
                    you'll receive a password reset link shortly.
                  </p>
                  <p className="text-slate-500 text-xs text-center">
                    The link will expire in 15 minutes. Check your spam folder if you don't see it.
                  </p>
                </div>

                <Button
                  onClick={handleResend}
                  disabled={cooldown > 0 || isLoading}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : isLoading
                      ? "Sending..."
                      : "Resend Reset Link"}
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-amber-400 hover:text-amber-300 text-sm font-medium inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errorText) setErrorText(null)
                    }}
                    required
                    className="w-full bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500"
                  />
                </div>
                <FormError message={errorText} />
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-amber-400 hover:text-amber-300 text-sm font-medium inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
