'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Flame, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Basic phone validation
    const phoneDigits = phone.replace(/\D/g, '')
    if (phone && (phoneDigits.length < 7 || phoneDigits.length > 15)) {
      setError('Enter a valid mobile number')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone: phone || undefined, referralCode: referralCode || undefined }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) throw new Error('Login after registration failed')
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Registration failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mb-4">
            <Flame className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-black text-text-primary">Create your account</h1>
          <p className="text-muted mt-1">Get 1,000 ApexCoins free to start betting</p>
        </div>

        <div className="flex items-center gap-3 bg-win/10 border border-win/20 rounded-xl px-4 py-3 mb-6">
          <CheckCircle className="h-5 w-5 text-win shrink-0" />
          <p className="text-sm text-win font-medium">
            New accounts start with <strong>AC 1,000</strong> — no deposit required
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Jon Jones"
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

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

            <div>
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                Mobile Number <span className="text-muted normal-case">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
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
                Referral Code <span className="text-muted normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. JON123"
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors uppercase"
              />
              <p className="text-xs text-muted mt-1">Have a friend's code? They'll earn 500 AC when you join!</p>
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
              {loading ? 'Creating account...' : 'Create Account & Get AC 1,000'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary-glow font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
