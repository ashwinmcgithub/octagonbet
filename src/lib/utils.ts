import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.floor(amount))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(date))
}

export function timeUntilFight(date: string | Date): string {
  const now = new Date()
  const fight = new Date(date)
  const diff = fight.getTime() - now.getTime()

  if (diff <= 0) return 'Live / Ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatOdds(odds: number | null): string {
  if (odds === null) return 'N/A'
  return odds > 0 ? `+${odds}` : `${odds}`
}

export function calculatePayout(amount: number, americanOdds: number): number {
  if (americanOdds > 0) {
    return amount * (1 + americanOdds / 100)
  } else {
    return amount * (1 + 100 / Math.abs(americanOdds))
  }
}
