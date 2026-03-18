'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Shield, Users, BarChart3, Menu, X, Gamepad, Bell } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/announcements', label: 'Banners', icon: Bell },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated' && session?.user.role !== 'admin') router.push('/')
  }, [status, session, router])

  if (status === 'loading' || !session) return null

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-bold text-text-primary text-sm">Admin Panel</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-text-primary transition-colors">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown nav */}
      {open && (
        <div className="md:hidden border-b border-border bg-surface px-3 pb-3 space-y-1 animate-fade-in">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted hover:text-text-primary hover:bg-surface-2'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-56 border-r border-border bg-surface shrink-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold text-text-primary">Admin Panel</span>
          </div>
          <p className="text-xs text-muted mt-1 truncate">{session.user.email}</p>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted hover:text-text-primary hover:bg-surface-2'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
