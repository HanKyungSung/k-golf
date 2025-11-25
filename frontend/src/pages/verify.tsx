import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function VerifyPage() {
  const { resendVerification } = useAuth()
  const [state, setState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [resendMsg, setResendMsg] = useState<string>('')
  const [retryAfter, setRetryAfter] = useState<number | undefined>(undefined)
  const [resending, setResending] = useState(false)
  const search = useMemo(() => new URLSearchParams(window.location.search), [])
  const email = search.get('email')
  const token = search.get('token')

  const verify = useCallback(async () => {
    if (!email || !token) {
      setState('error')
      setMessage('Missing email or token in URL.')
      return
    }
    setState('verifying')
    try {
      const apiBase = process.env.REACT_APP_API_BASE !== undefined ? process.env.REACT_APP_API_BASE : 'http://localhost:8080';
      const res = await fetch(`${apiBase}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, token }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Verification failed' }))
        throw new Error(data.error || 'Verification failed')
      }
      setState('success')
      setMessage('Email verified. Signing you in...')
      setTimeout(() => {
        window.location.href = '/'
      }, 1200)
    } catch (e: any) {
      setState('error')
      setMessage(e?.message || 'Unexpected error')
    }
  }, [email, token])

  useEffect(() => {
    verify()
  }, [verify])

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
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-white">Verify your email</CardTitle>
            <CardDescription className="text-slate-400">
              We’re confirming your sign-in link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state === 'verifying' && (
              <div className="flex flex-col items-center gap-4 py-6 text-slate-200">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                <p className="text-sm">Verifying your email...</p>
                <p className="text-xs text-slate-500">This may take a moment.</p>
              </div>
            )}

            {state === 'success' && (
              <div className="flex flex-col items-center gap-4 py-6 text-slate-200">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <p className="text-sm text-center">{message}</p>
                <p className="text-xs text-slate-500">Redirecting to home...</p>
                <Button
                  type="button"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                  onClick={() => (window.location.href = '/')}
                >
                  Go to Home
                </Button>
              </div>
            )}

            {state === 'error' && (
              <div className="flex flex-col items-center gap-4 py-6 text-slate-200">
                <XCircle className="h-10 w-10 text-red-400" />
                <p className="text-sm text-center">{message}</p>
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full border-slate-600 text-slate-200"
                    onClick={() => verify()}
                  >
                    Try Again
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-slate-600 text-slate-200"
                    onClick={() => (window.location.href = '/login')}
                  >
                    Go to Login
                  </Button>
                </div>
                {email && (
                  <div className="w-full space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={resending}
                      className="w-full border-slate-600 text-slate-200"
                      onClick={async () => {
                        setResendMsg('')
                          setRetryAfter(undefined)
                        setResending(true)
                        try {
                            const r = await resendVerification(email)
                            setResendMsg(r?.message || 'If the account exists, a new link will be sent.')
                            if (typeof r?.retryAfterSeconds === 'number') setRetryAfter(r.retryAfterSeconds)
                        } finally {
                          setResending(false)
                        }
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" /> {resending ? 'Sending…' : 'Resend Verification Email'}
                    </Button>
                      {resendMsg && (
                        <p className="text-xs text-slate-500 text-center">
                          {resendMsg}
                          {typeof retryAfter === 'number' && retryAfter > 0 && (
                            <> Please try again in {retryAfter}s.</>
                          )}
                        </p>
                      )}
                  </div>
                )}
                <div className="w-full">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-slate-300 hover:text-white"
                    onClick={() => (window.location.href = '/')}
                  >
                    Back to Home
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
