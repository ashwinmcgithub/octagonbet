'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Gamepad, Shield, TerminalSquare } from 'lucide-react'

type GameCard = {
  title: string
  description: string
  link: string
  cta: string
  metaLeft: string
  metaRight: string
  icon: 'gamepad' | 'shield' | 'terminal'
  image?: { src: string; alt: string }
}

const featuredGames: GameCard[] = [
  {
    title: 'Find the Imposter',
    description: 'Classic 5-round deduction with quick clues, lively chat, and a Last Stand guess.',
    link: '/games/find-the-imposter',
    cta: 'Launch the Imposter',
    metaLeft: '6-digit lobby',
    metaRight: '3-12 players',
    icon: 'gamepad',
    image: { src: '/games/find-imposter.png', alt: 'Find the Imposter cover art' },
  },
  {
    title: 'Phantom Protocol',
    description: 'A slower burn, asymmetric deduction game where one saboteur sees corrupted lore.',
    link: '/games/find-the-imposter?game=phantom',
    cta: 'Enter the Protocol',
    metaLeft: 'vault code',
    metaRight: '4-8 players',
    icon: 'shield',
    image: { src: '/games/phantom-protocol.png', alt: 'Phantom Protocol cover art' },
  },
  {
    title: 'The Outpost Anomaly',
    description: 'Single-player logic deduction through logs, spatial checks, and linguistic tells.',
    link: '/games/outpost-anomaly',
    cta: 'Enter the Terminal',
    metaLeft: 'single-player',
    metaRight: '5 days',
    icon: 'terminal',
    image: { src: '/games/outpost-anomaly.png', alt: 'Outpost Anomaly cover art' },
  },
]

function CardIcon({ kind }: { kind: GameCard['icon'] }) {
  if (kind === 'shield') return <Shield className="h-5 w-5 text-amber-400" />
  if (kind === 'terminal') return <TerminalSquare className="h-5 w-5 text-primary" />
  return <Gamepad className="h-5 w-5 text-primary" />
}

export default function GamesIndexPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'loading') return null
  if (!session) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-background text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="/games/games-section-bg.png"
          alt="Games section background"
          fill
          sizes="100vw"
          className="object-cover opacity-15"
          priority
        />
      </div>
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-10 relative">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.6em] text-amber-400">Games</p>
          <h1 className="text-4xl font-black tracking-tight">
            Apex Wager — Play Smart
          </h1>
          <p className="text-sm text-muted max-w-2xl mx-auto">
            Multiplayer deception or solo logic with a quick jump into the games lobby.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {featuredGames.map(game => (
            <Link key={game.title} href={game.link} className="group rounded-3xl border border-border bg-surface p-6 transition-all hover:border-primary/70 hover:shadow-[0_0_30px_rgba(175,66,234,0.25)]">
              {game.image ? (
                <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-black/30">
                  <Image
                    src={game.image.src}
                    alt={game.image.alt}
                    width={1200}
                    height={675}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 520px"
                    className="h-40 w-full object-cover sm:h-44"
                    priority={game.title === 'Find the Imposter'}
                  />
                </div>
              ) : (
                <div className="mb-4 flex h-40 items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-black/20 via-surface to-black/40 text-xs uppercase tracking-[0.4em] text-muted">
                  No Artwork
                </div>
              )}
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">{game.title}</h2>
                <CardIcon kind={game.icon} />
              </div>
              <p className="text-sm text-muted">{game.description}</p>
              <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted">
                <span>{game.metaLeft}</span>
                <span>{game.metaRight}</span>
              </div>
              <div className="mt-5">
                <span className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-red-500 px-4 py-3 text-xs font-black uppercase tracking-[0.5em] text-white transition-all group-hover:from-white group-hover:text-black">
                  {game.cta}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
