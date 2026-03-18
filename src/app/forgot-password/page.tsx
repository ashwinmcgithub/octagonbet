'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetUrl, setResetUrl] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      return
    }

    // Show reset link directly (no email service configured)
    if (data.resetUrl) {
      setResetUrl(data.resetUrl)
    }
  }

  if (resetUrl) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/20 mb-4">
              <CheckCircle2 className="h-7 w-7 text-green-400" />
            </div>
            <h1 className="text-3xl font-black text-text-primary">Reset Link Ready</h1>
            <p className="text-muted mt-1">Use the link below to set a new password</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-8 space-y-4">
            <p className="text-sm text-text-secondary">
              Click the button below to reset your password. This link expires in <span className="text-text-primary font-medium">1 hour</span>.
            </p>
            <Link
              href={resetUrl}
              className="block w-full text-center rounded-xl bg-primary hover:bg-primary-hover py-3.5 text-sm font-bold text-white shadow-red-glow hover:shadow-none transition-all"
            >
              Reset My Password
            </Link>
          </div>

          <p className="text-center text-sm text-muted mt-6">
            <Link href="/login" className="text-primary hover:text-primary-glow font-medium transition-colors flex items-center justify-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mb-4">
            <Flame className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-black text-text-primary">Forgot Password</h1>
          <p className="text-muted mt-1">Enter your email to get a reset link</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary hover:bg-primary-hover py-3.5 text-sm font-bold text-white shadow-red-glow hover:shadow-none transition-all disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Get Reset Link'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          <Link href="/login" className="text-primary hover:text-primary-glow font-medium transition-colors flex items-center justify-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
