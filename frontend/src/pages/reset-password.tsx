import type React from "react"
import { useState, useMemo } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { FormError } from "@/components/form/form-error"
import { CheckCircle, XCircle, ArrowLeft, Eye, EyeOff } from "lucide-react"

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get("email") || ""
  const token = searchParams.get("token") || ""
  const navigate = useNavigate()
  const { resetPassword } = useAuth()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Password validation
  const passwordChecks = useMemo(() => ({
    length: password.length >= 10,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    match: password.length > 0 && password === confirmPassword,
  }), [password, confirmPassword])

  const canSubmit = passwordChecks.length && passwordChecks.letter && passwordChecks.number && passwordChecks.match

  // Missing params
  if (!email || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="pt-8 pb-6">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Invalid Reset Link</h2>
                <p className="text-slate-400 text-center text-sm">
                  This password reset link is invalid or incomplete. Please request a new one.
                </p>
                <Link
                  to="/forgot-password"
                  className="mt-2 text-amber-400 hover:text-amber-300 font-medium text-sm"
                >
                  Request New Reset Link
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setIsLoading(true)
    setErrorText(null)

    try {
      await resetPassword(email, token, password)
      setSuccess(true)
      // Redirect to login after 2 seconds
      setTimeout(() => navigate("/login"), 2000)
    } catch (error) {
      console.error("Reset password error:", error)
      setErrorText(error instanceof Error ? error.message : "Failed to reset password")
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
              {success ? "Password Reset!" : "Set New Password"}
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
              {success
                ? "Your password has been updated successfully"
                : "Create a strong new password for your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-slate-300 text-center text-sm">
                    Redirecting you to login...
                  </p>
                </div>
                <Link to="/login">
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold">
                    Go to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (errorText) setErrorText(null)
                      }}
                      required
                      className="w-full bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (errorText) setErrorText(null)
                      }}
                      required
                      className="w-full bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password requirements */}
                {password.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <PasswordCheck ok={passwordChecks.length} label="At least 10 characters" />
                    <PasswordCheck ok={passwordChecks.letter} label="Contains a letter" />
                    <PasswordCheck ok={passwordChecks.number} label="Contains a number" />
                    {confirmPassword.length > 0 && (
                      <PasswordCheck ok={passwordChecks.match} label="Passwords match" />
                    )}
                  </div>
                )}

                <FormError message={errorText} />

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                  disabled={isLoading || !canSubmit}
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
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

function PasswordCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-slate-500" />
      )}
      <span className={ok ? "text-emerald-400" : "text-slate-500"}>{label}</span>
    </div>
  )
}
