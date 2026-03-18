'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const CREW = [
  { id: 1, name: 'Crew-1', color: '#82B1FF' },
  { id: 2, name: 'Crew-2', color: '#FFC107' },
  { id: 3, name: 'Crew-3', color: '#7C4DFF' },
  { id: 4, name: 'Crew-4', color: '#26A69A' },
]

const SUBSYSTEMS = [
  { id: 'reactor', name: 'Reactor', center: { x: 2, y: 2 } },
  { id: 'hydroponics', name: 'Hydroponics', center: { x: 8, y: 2 } },
  { id: 'comms', name: 'Comms', center: { x: 2, y: 8 } },
  { id: 'habitat', name: 'Habitat', center: { x: 8, y: 8 } },
  { id: 'dock', name: 'Dock', center: { x: 5, y: 1 } },
  { id: 'medbay', name: 'MedBay', center: { x: 5, y: 9 } },
]

const LEGIT_VOCAB = [
  'recalibrated the thermal subroutine of the coolant manifold',
  'validated harmonic drift on the gravitic stabilizers',
  'normalized the delta flux in the reactor inverter banks',
  'rethreaded the signal lattice on the comms uplink',
  'stabilized nutrient circulation across the hydroponics array',
  'aligned the docking clamp servos to spec',
  'performed a full diagnostic sweep of medbay biofilters',
  'patched the habitat pressure regulator with verified tolerances',
  'reindexed the phase alignment on the reactor field coils',
  'balanced the hydroponic nutrient ratios via osmotic backflush',
  'tuned the comms parabolic array for subspace resonance',
  'recalibrated the medbay sterilization emitters for UV phase drift',
  'stabilized the habitat pressure valves against microleak oscillation',
  'corrected docking clamp torque skew on the primary servo ring',
]

const IMPOSTER_VOCAB = [
  'adjusted the thermal settings on the coolant units',
  'checked the reactor output balance',
  'repaired the comms signal noise',
  'stabilized the plant nutrient levels',
  'sanitized the medbay filtration system',
  'tightened the docking clamp controls',
  'verified habitat pressure stability',
  'ran standard diagnostics on core systems',
  'aligned the reactor coils for better power flow',
  'tuned the comms array for clearer transmission',
  'optimized hydroponic flow rates',
  'rebalanced medbay sterilizer output',
]

const SYSTEM_FAILURES = [
  'Cooling lattice instability detected.',
  'Signal noise spiking on external comms.',
  'Hydroponics nutrient balance drifted off spec.',
  'Docking clamp feedback loop jittering.',
  'Habitat pressure differential trending down.',
]

type CrewLog = {
  crewId: number
  subsystem: string
  text: string
  position: { x: number; y: number }
  isConsistent: boolean
}

type DayLog = {
  day: number
  failure: string
  logs: CrewLog[]
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 18 }, (_, i) => i)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 7) % 100}%`,
            animationDelay: `${(i % 6) * 0.12}s`,
            backgroundColor: i % 3 === 0 ? '#FFC107' : i % 3 === 1 ? '#82B1FF' : '#26A69A',
          }}
        />
      ))}
    </div>
  )
}


function pickOne<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function generateDay(day: number, imposterId: number): DayLog {
  const failure = SYSTEM_FAILURES[day - 1] ?? pickOne(SYSTEM_FAILURES)

  const logs = CREW.map((crew) => {
    const subsystem = pickOne(SUBSYSTEMS)
    const vocab = crew.id === imposterId ? pickOne(IMPOSTER_VOCAB) : pickOne(LEGIT_VOCAB)
    const intended = subsystem.center

    const mismatchChance = crew.id === imposterId ? 0.45 : 0.25
    const shouldMismatch = Math.random() < mismatchChance

    const position = shouldMismatch
      ? pickOne(SUBSYSTEMS.filter(s => s.id !== subsystem.id)).center
      : {
          x: intended.x + (Math.random() * 1.4 - 0.7),
          y: intended.y + (Math.random() * 1.4 - 0.7),
        }

    const isConsistent = distance(position, intended) < 1.6

    return {
      crewId: crew.id,
      subsystem: subsystem.name,
      text: `${crew.name} reported: ${vocab} in ${subsystem.name}.`,
      position,
      isConsistent,
    }
  })

  return { day, failure, logs }
}

export default function OutpostAnomalyPage() {
  const router = useRouter()
  const [imposterId, setImposterId] = useState(() => 1 + Math.floor(Math.random() * 4))
  const [currentDay, setCurrentDay] = useState(1)
  const [history, setHistory] = useState<DayLog[]>(() => [generateDay(1, imposterId)])
  const [finalChoice, setFinalChoice] = useState<number | null>(null)
  const [showIntro, setShowIntro] = useState(true)
  const [confirmExit, setConfirmExit] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const activeDay = history[currentDay - 1] ?? history[history.length - 1]
  const day5 = currentDay === 5
  const canAdvance = currentDay < 5 && finalChoice === null

  const verdict = useMemo(() => {
    if (finalChoice === null) return null
    return finalChoice === imposterId ? 'correct' : 'wrong'
  }, [finalChoice, imposterId])

  useEffect(() => {
    if (!verdict) return
    const timer = setTimeout(() => {
      router.push('/games')
    }, 2600)
    return () => clearTimeout(timer)
  }, [verdict, router])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || showIntro) return
    audio.volume = 0.15
    audio.loop = true
    audio.play().catch(() => {})
    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [showIntro])

  const advanceDay = () => {
    if (!canAdvance) return
    const nextDay = currentDay + 1
    setCurrentDay(nextDay)
    setHistory((prev) => {
      if (prev[nextDay - 1]) return prev
      return [...prev, generateDay(nextDay, imposterId)]
    })
  }

  const goBackDay = () => {
    if (currentDay <= 1) return
    setCurrentDay((prev) => Math.max(1, prev - 1))
  }

  const resetGame = () => {
    const nextImposter = 1 + Math.floor(Math.random() * 4)
    setImposterId(nextImposter)
    setCurrentDay(1)
    setFinalChoice(null)
    setHistory([generateDay(1, nextImposter)])
  }

  const chooseCrew = (crewId: number) => {
    if (!day5 || finalChoice !== null) return
    setFinalChoice(crewId)
  }

  const requestExit = () => setConfirmExit(true)
  const cancelExit = () => setConfirmExit(false)
  const confirmExitNow = () => router.push('/games')

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const handlePopState = () => {
      setConfirmExit(true)
      window.history.pushState(null, '', window.location.href)
    }

    window.history.pushState(null, '', window.location.href)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-[#E0E0E0] font-mono">
      <audio ref={audioRef} src="/audio/outpost-anomaly-bgm.m4a" />
      {showIntro && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl rounded-2xl border border-[#2A2A2A] bg-[#0B0B0B] p-6 space-y-4">
            <p className="text-xs uppercase tracking-[0.5em] text-[#FFC107]">Briefing</p>
            <h2 className="text-2xl font-bold text-[#E0E0E0]">Identify the Anomaly</h2>
            <p className="text-sm text-[#AFAFAF]">
              Read each crew log and compare it against the spatial grid. Legitimate crew use precise technical
              language and appear near their stated subsystem. The imposter uses vague terms and often appears in the wrong location.
              You can only eject one crew member on Day 5.
            </p>
            <button
              onClick={() => setShowIntro(false)}
              className="w-full rounded-xl border border-[#FFC107] bg-[#FFC107] px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-black"
            >
              Begin Analysis
            </button>
          </div>
        </div>
      )}

      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl border border-[#2A2A2A] bg-[#0B0B0B] p-5 space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-[#FFC107]">Leave Game?</p>
            <p className="text-sm text-[#AFAFAF]">Are you sure you want to leave the Outpost Anomaly?</p>
            <div className="flex gap-3">
              <button
                onClick={confirmExitNow}
                className="flex-1 rounded-xl border border-[#FFC107] bg-[#FFC107] px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-black"
              >
                Yes
              </button>
              <button
                onClick={cancelExit}
                className="flex-1 rounded-xl border border-[#2A2A2A] px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-[#E0E0E0]"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {verdict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className={verdict === 'correct'
              ? 'relative w-full max-w-sm rounded-2xl border border-[#FFC107] bg-[#1B1402] p-6 text-center winner-pop'
              : 'relative w-full max-w-sm rounded-2xl border border-[#FF5252] bg-[#1A0A0A] p-6 text-center loser-shake'}
          >
            {verdict === 'correct' && <ConfettiBurst />}
            <p className="text-xs uppercase tracking-[0.4em] text-[#FFC107]">Status</p>
            <h2 className="text-2xl font-bold text-[#E0E0E0] mt-1">
              {verdict === 'correct' ? 'Winner' : 'Mission Failed'}
            </h2>
            <p className="text-sm text-[#AFAFAF] mt-2">
              {verdict === 'correct' ? 'Rogue isolated. Returning to Game Zone…' : 'The anomaly persists. Returning to Game Zone…'}
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.6em] text-[#FFC107]">The Outpost Anomaly</p>
          <h1 className="text-3xl md:text-4xl font-bold">Station Oversight Terminal</h1>
          <p className="text-sm text-[#AFAFAF] max-w-2xl">
            Monitor crew logs and spatial telemetry. The airlock stays locked until Day 5. One decision. No undo.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[3fr,2fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#AFAFAF]">
                <span>COMMS LOG</span>
                <span>DAY {activeDay.day}/5</span>
              </div>
              <div className="space-y-4">
                {history.map((day) => (
                  <div key={day.day} className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.3em] text-[#FFC107]">Day {day.day}</div>
                    <p className="text-xs text-[#AFAFAF]">System failure: {day.failure}</p>
                    <div className="space-y-2">
                      {day.logs.map((log) => {
                        const crew = CREW.find(c => c.id === log.crewId)
                        return (
                        <div key={`${day.day}-${log.crewId}`} className="text-sm flex items-start gap-3">
                          <span
                            className="mt-0.5 h-3 w-3 rounded-full"
                            style={{ backgroundColor: crew?.color ?? '#82B1FF' }}
                          />
                          <span className="text-[#E0E0E0]">{log.text}</span>{' '}
                          {!log.isConsistent && (
                            <span className="text-[#FFC107]">[INCONSISTENT]</span>
                          )}
                        </div>
                      )})}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-[#AFAFAF]">
              <span>SPATIAL GRID</span>
              <span>TELEMETRY</span>
            </div>
            <div className="relative aspect-square w-full rounded-2xl border border-[#1F1F1F] bg-gradient-to-br from-[#060606] via-black to-[#0A0A0A] shadow-[0_0_30px_rgba(255,193,7,0.08)]">
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
                  backgroundSize: '10% 10%',
                }}
              />
              <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(255,193,7,0.08),transparent_55%)]" />
              {SUBSYSTEMS.map((sub) => (
                <div
                  key={sub.id}
                  className="absolute text-[10px] text-[#6A6A6A] uppercase tracking-[0.2em]"
                  style={{ left: `${sub.center.x * 10}%`, top: `${sub.center.y * 10}%` }}
                >
                  {sub.name}
                </div>
              ))}
              {activeDay.logs.map((log) => {
                const crew = CREW.find(c => c.id === log.crewId)
                return (
                  <div
                    key={`dot-${log.crewId}`}
                    className="absolute h-3 w-3 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                    style={{
                      backgroundColor: crew?.color ?? '#82B1FF',
                      left: `${log.position.x * 10}%`,
                      top: `${log.position.y * 10}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                )
              })}
            </div>

            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.3em] text-[#AFAFAF]">Airlock Control</div>
              <div className="flex flex-wrap gap-2">
                {CREW.map((crew) => (
                  <button
                    key={crew.id}
                    onClick={() => chooseCrew(crew.id)}
                    disabled={!day5 || finalChoice !== null}
                    className="px-3 py-2 text-xs uppercase tracking-[0.3em] border border-[#2A2A2A] text-[#E0E0E0] disabled:opacity-40"
                    style={{ borderColor: crew.color }}
                  >
                    {crew.name}
                  </button>
                ))}
              </div>
              {verdict && (
                <div className="space-y-3">
                  {verdict === 'correct' && (
                    <div className="relative overflow-hidden rounded-2xl border border-[#FFC107] bg-[#1B1402] px-4 py-3">
                      <ConfettiBurst />
                      <p className="text-xs uppercase tracking-[0.4em] text-[#FFC107]">Winner</p>
                      <p className="text-sm text-[#E0E0E0]">Verdict confirmed. Rogue isolated.</p>
                    </div>
                  )}
                  {verdict === 'wrong' && (
                    <p className="text-sm text-[#FFC107]">Incorrect. The anomaly persists.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#1A1A1A] pt-4 text-xs text-[#AFAFAF]">
          <span>DAY: {currentDay}/5</span>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={goBackDay}
              disabled={currentDay <= 1}
              className="px-4 py-2 uppercase tracking-[0.3em] border border-[#2A2A2A] text-[#E0E0E0] disabled:opacity-40"
            >
              Previous Day
            </button>
            <button
              onClick={advanceDay}
              disabled={!canAdvance}
              className="px-4 py-2 uppercase tracking-[0.3em] border border-[#2A2A2A] text-[#E0E0E0] disabled:opacity-40"
            >
              {currentDay < 5 ? 'Next Day' : 'Cycle Complete'}
            </button>
            <button
              onClick={requestExit}
              className="px-4 py-2 uppercase tracking-[0.3em] border border-[#2A2A2A] text-[#E0E0E0]"
            >
              Back to Games
            </button>
          </div>
        </footer>
      </div>
      <style jsx>{`
        .confetti-piece {
          position: absolute;
          top: -10px;
          width: 8px;
          height: 14px;
          border-radius: 2px;
          opacity: 0.9;
          animation: confetti-fall 1.6s ease-in infinite;
        }

        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(140px) rotate(240deg); opacity: 0; }
        }

        .winner-pop {
          animation: winner-pop 0.35s ease-out;
        }

        @keyframes winner-pop {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .loser-shake {
          animation: loser-shake 0.45s ease-in-out;
        }

        @keyframes loser-shake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
