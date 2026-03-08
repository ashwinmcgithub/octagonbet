'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Wallet, TrendingUp, TrendingDown, Zap, ArrowUpRight, ArrowDownLeft, Gift, Clock, Send, Copy, CheckCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  createdAt: string
}

interface UserProfile {
  referralCode: string | null
  referralCount: number
}

export default function WalletPage() {
  const { data: session, update, status } = useSession()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Transfer form state
  const [transferEmail, setTransferEmail] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [transferSuccess, setTransferSuccess] = useState('')

  // Referral copy state
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    Promise.all([
      fetch('/api/wallet').then((r) => r.json()),
      fetch('/api/user').then((r) => r.json()),
    ]).then(([walletData, userData]) => {
      setBalance(walletData.balance)
      setTransactions(walletData.transactions)
      setProfile({
        referralCode: userData.referralCode ?? null,
        referralCount: userData.referralCount ?? 0,
      })
      setLoading(false)
    })
  }, [status])

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    setTransferError('')
    setTransferSuccess('')
    const amount = parseInt(transferAmount)
    if (!amount || amount <= 0) {
      setTransferError('Enter a valid amount')
      return
    }
    if (amount > balance) {
      setTransferError('Insufficient FightCoins')
      return
    }
    setTransferLoading(true)
    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: transferEmail, amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBalance(data.balance)
      await update()
      setTransferSuccess(`Sent FC ${formatCurrency(data.sent)} to ${data.recipient}!`)
      setTransferEmail('')
      setTransferAmount('')
      // Refresh transactions
      const walletRes = await fetch('/api/wallet')
      const walletData = await walletRes.json()
      setTransactions(walletData.transactions)
    } catch (err: any) {
      setTransferError(err.message || 'Transfer failed')
    } finally {
      setTransferLoading(false)
    }
  }

  function copyReferralCode() {
    if (!profile?.referralCode) return
    navigator.clipboard.writeText(profile.referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
    initial: { icon: Zap, color: 'text-win', label: 'Welcome Bonus' },
    bet: { icon: TrendingDown, color: 'text-primary', label: 'Bet Placed' },
    win: { icon: TrendingUp, color: 'text-win', label: 'Win' },
    referral_bonus: { icon: Gift, color: 'text-blue-400', label: 'Referral Bonus' },
    transfer_in: { icon: ArrowDownLeft, color: 'text-win', label: 'Received' },
    transfer_out: { icon: ArrowUpRight, color: 'text-primary', label: 'Sent' },
    refund: { icon: TrendingUp, color: 'text-live', label: 'Refund' },
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text-primary">Wallet</h1>
        <p className="text-muted mt-1">Manage your FightCoins</p>
      </div>

      {/* Balance card */}
      <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface to-surface p-8 mb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-glow opacity-50 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted uppercase tracking-wider">FightCoin Balance</span>
          </div>
          <p className="text-6xl font-black text-text-primary">
            <span className="text-2xl text-muted mr-2">FC</span>
            {formatCurrency(balance)}
          </p>
          <p className="text-muted text-sm mt-2">
            {session?.user.name} · {session?.user.email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Send FC to a Friend */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2 mb-1">
            <Send className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-text-primary">Send FightCoins</h2>
          </div>
          <p className="text-sm text-muted mb-5">Help a friend who's run out of FC.</p>

          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                Friend's Email
              </label>
              <input
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                required
                placeholder="friend@example.com"
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                Amount (FC)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">FC</span>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                  min="1"
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-surface-2 pl-10 pr-4 py-3 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[100, 250, 500].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setTransferAmount(String(q))}
                    className={cn(
                      'flex-1 rounded-lg py-1.5 text-xs font-bold border transition-all',
                      transferAmount === String(q)
                        ? 'bg-primary border-primary text-white'
                        : 'bg-surface-2 border-border text-muted hover:border-primary/50'
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {transferError && (
              <p className="text-sm text-red-400">{transferError}</p>
            )}
            {transferSuccess && (
              <div className="flex items-center gap-2 text-sm text-win">
                <CheckCircle className="h-4 w-4" />
                {transferSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={transferLoading}
              className="w-full rounded-xl bg-primary hover:bg-primary-hover py-3 text-sm font-bold text-white transition-all disabled:opacity-50"
            >
              {transferLoading ? 'Sending...' : 'Send FightCoins'}
            </button>
          </form>
        </div>

        {/* Referral Code */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-bold text-text-primary">Refer Friends</h2>
          </div>
          <p className="text-sm text-muted mb-5">
            Share your code. Earn <strong className="text-win">+500 FC</strong> for every friend who joins!
          </p>

          {profile?.referralCode ? (
            <>
              <div className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-4 py-4 mb-4">
                <span className="flex-1 text-2xl font-black text-text-primary tracking-widest">
                  {profile.referralCode}
                </span>
                <button
                  onClick={copyReferralCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:border-primary text-sm text-muted hover:text-primary transition-all"
                >
                  {copied ? <CheckCircle className="h-4 w-4 text-win" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="rounded-xl bg-blue-400/10 border border-blue-400/20 px-4 py-3">
                <p className="text-sm text-blue-400 font-medium">
                  {profile.referralCount > 0
                    ? `${profile.referralCount} friend${profile.referralCount > 1 ? 's' : ''} joined with your code — that's FC ${formatCurrency(profile.referralCount * 500)} earned!`
                    : 'No referrals yet. Share your code to start earning!'}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Referral code not yet generated.</p>
          )}

          <div className="mt-5 space-y-2 text-sm text-muted">
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span> Share your code with friends
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span> They enter it when registering
            </p>
            <p className="flex items-start gap-2">
              <span className="text-win font-bold">3.</span> You both benefit — they get 1,000 FC, you get 500 FC bonus!
            </p>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-5">Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-border">
            <Clock className="h-12 w-12 text-muted mx-auto mb-3" />
            <p className="text-muted">No transactions yet</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden">
            {transactions.map((tx, i) => {
              const config = typeConfig[tx.type] || { icon: Clock, color: 'text-muted', label: tx.type }
              const Icon = config.icon
              const isPositive = tx.amount > 0

              return (
                <div
                  key={tx.id}
                  className={cn(
                    'flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-2',
                    i < transactions.length - 1 && 'border-b border-border'
                  )}
                >
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2', config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{tx.description}</p>
                    <p className="text-xs text-muted">{formatDate(tx.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('font-bold text-sm', isPositive ? 'text-win' : 'text-primary')}>
                      {isPositive ? '+' : ''}FC {formatCurrency(Math.abs(tx.amount))}
                    </p>
                    <p className="text-xs text-muted capitalize">{config.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
