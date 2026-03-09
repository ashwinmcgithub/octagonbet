'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Flame, Wallet, BookOpen, ChevronDown, LogOut, Shield, Menu, X, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function Navbar() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary group-hover:bg-primary-hover transition-colors">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-text-primary">
              APEX<span className="text-primary">WAGER</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-all"
            >
              Fights
            </Link>
            {session && (
              <>
                <Link
                  href="/my-bets"
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-all flex items-center gap-1.5"
                >
                  <BookOpen className="h-4 w-4" />
                  My Bets
                </Link>
                <Link
                  href="/wallet"
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Wallet className="h-4 w-4" />
                  Wallet
                </Link>
                <Link
                  href="/groups"
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Users className="h-4 w-4" />
                  Groups
                </Link>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {session ? (
              <>
                {/* Balance pill */}
                <Link
                  href="/wallet"
                  className="hidden sm:flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-1.5 hover:border-primary transition-colors"
                >
                  <span className="text-xs text-muted">FC</span>
                  <span className="text-sm font-bold text-text-primary">
                    {formatCurrency(session.user.balance)}
                  </span>
                </Link>

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-full bg-surface border border-border px-2 py-1.5 hover:border-border-bright transition-colors"
                  >
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt="Avatar"
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                        {session.user.name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 text-muted" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-surface shadow-card animate-fade-in">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {session.user.name}
                        </p>
                        <p className="text-xs text-muted truncate">{session.user.email}</p>
                      </div>
                      <div className="p-1">
                        {session.user.role === 'admin' && (
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-primary hover:bg-surface-2 rounded-lg transition-colors"
                          >
                            <Shield className="h-4 w-4" />
                            Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={() => signOut()}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-text-secondary hover:text-text-primary"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && session && (
          <div className="md:hidden pb-4 border-t border-border mt-2 pt-4 space-y-1 animate-fade-in">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg"
            >
              Fights
            </Link>
            <Link
              href="/my-bets"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg"
            >
              My Bets
            </Link>
            <Link
              href="/wallet"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg"
            >
              Wallet — FC {formatCurrency(session.user.balance)}
            </Link>
            <Link
              href="/groups"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg"
            >
              Groups
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
