import type React from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { Mail, CheckCircle2, XCircle } from "lucide-react"
import { FormError } from "@/components/form/form-error"

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const { signup, resendVerification } = useAuth()
  const [sent, setSent] = useState<{ email: string; expiresAt?: string } | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [resendInfo, setResendInfo] = useState<{ message?: string; retryAfterSeconds?: number } | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      setErrorText("Passwords do not match")
      return
    }

    setIsLoading(true)
    setErrorText(null)

    try {
      const result = await signup(formData.name, formData.email, formData.phone, formData.password, formData.dateOfBirth)
      setSent({ email: formData.email, expiresAt: result.expiresAt })
    } catch (error) {
      console.error("Signup failed:", error)
      const msg = error instanceof Error ? error.message : 'Signup failed'
      setErrorText(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrorText(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              K-Golf
            </h1>
            <p className="text-sm text-slate-400 mt-1">Premium Screen Golf</p>
          </Link>
        </div>

        <Card className="shadow-2xl bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-white">Create Account</CardTitle>
            <CardDescription className="text-center text-slate-400">
              Sign up to start booking premium screen golf rooms
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-slate-300">
                <p className="text-sm">We sent a verification link to <span className="font-medium text-white">{sent.email}</span>. Check your inbox (and spam) and click the link within 15 minutes to activate your account.</p>
                <div className="flex flex-col gap-3">
                  <Button type="button" onClick={() => navigate('/')} variant="outline" className="w-full border-slate-600 text-slate-200">Go to Home</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full border-slate-600 text-slate-200"
                    onClick={async () => {
                      const r = await resendVerification(sent.email)
                      setResendInfo({ message: r?.message, retryAfterSeconds: r?.retryAfterSeconds })
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" /> Resend verification email
                  </Button>
                </div>
                {resendInfo?.message && (
                  <p className="text-xs text-slate-500">
                    {resendInfo.message}
                    {typeof resendInfo.retryAfterSeconds === 'number' && resendInfo.retryAfterSeconds > 0 && (
                      <> Please try again in {resendInfo.retryAfterSeconds}s.</>
                    )}
                  </p>
                )}
                <p className="text-xs text-slate-500">After verifying, you'll be signed in automatically and redirected.</p>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-slate-300">
                  Date of Birth
                </Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500"
                />
                {formData.password && (
                  <div className="mt-2 space-y-1 text-xs">
                    <div className={`flex items-center gap-1.5 ${formData.password.length >= 10 ? 'text-green-400' : 'text-slate-400'}`}>
                      {formData.password.length >= 10 ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      <span>At least 10 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[A-Za-z]/.test(formData.password) ? 'text-green-400' : 'text-slate-400'}`}>
                      {/[A-Za-z]/.test(formData.password) ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      <span>Contains a letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/\d/.test(formData.password) ? 'text-green-400' : 'text-slate-400'}`}>
                      {/\d/.test(formData.password) ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      <span>Contains a number</span>
                    </div>
                    {formData.confirmPassword && (
                      <div className={`flex items-center gap-1.5 ${formData.password === formData.confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                        {formData.password === formData.confirmPassword ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        <span>Passwords match</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500"
                />
              </div>
              {errorText && !formData.confirmPassword && <FormError message={errorText} />}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                disabled={
                  isLoading ||
                  (formData.password !== '' &&
                    formData.confirmPassword !== '' &&
                    formData.password !== formData.confirmPassword)
                }
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Already have an account?{" "}
                <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
