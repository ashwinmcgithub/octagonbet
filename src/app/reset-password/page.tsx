'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flame, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-400">Invalid reset link. Please request a new one.</p>
        <Link href="/forgot-password" className="text-primary hover:text-primary-glow font-medium mt-4 inline-block">
          Request Reset Link
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/20 mb-2">
          <CheckCircle2 className="h-7 w-7 text-green-400" />
        </div>
        <p className="text-xl font-bold text-text-primary">Password Updated!</p>
        <p className="text-sm text-muted">Redirecting you to sign in...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
          New Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
            className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 pr-11 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-secondary"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
          Confirm Password
        </label>
        <input
          type={showPassword ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder="••••••••"
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
        {loading ? 'Updating...' : 'Set New Password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mb-4">
            <Flame className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-black text-text-primary">Reset Password</h1>
          <p className="text-muted mt-1">Choose a new password for your account</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8">
          <Suspense fallback={<div className="text-muted text-sm">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Remember it?{' '}
          <Link href="/login" className="text-primary hover:text-primary-glow font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
