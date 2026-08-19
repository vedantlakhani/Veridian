import { Suspense, lazy, useEffect, useState } from 'react'
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { supportsWebGL } from '../lib/webgl'

/**
 * HERO
 *
 * No screenshot exists (and none should be faked), so the hero renders the
 * product's core mechanic — data arrives, you confirm — as a single SVG/CSS
 * instrument instead. Two parts: a progress ring (the confirm-the-number
 * moment) and an auto-written feed (four rows that arrive with no input
 * from the reader, which is the whole demonstration). Every figure inside
 * the card is illustrative sample data, explicitly labeled as such in the
 * caption beneath it — never a claim about a real user's real footprint.
 */

const EASE_BASE = [0.2, 0, 0, 1] as const

function useReveal(delay = 0) {
  const reduced = useReducedMotion()
  const variants: Variants = reduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }
  return {
    initial: 'hidden' as const,
    whileInView: 'visible' as const,
    viewport: { once: true, margin: '-10% 0px' },
    variants,
    transition: { duration: 0.28, ease: EASE_BASE, delay },
  }
}

/* ---------------------------------------------------------------------
 * Glyphs — 24px single-weight line art, 1.8px stroke, round caps, fill
 * none, stroke driven entirely by currentColor (never a hardcoded hex).
 * ------------------------------------------------------------------- */

const glyphProps = {
  viewBox: '0 0 24 24',
  className: 'h-6 w-6',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function CarGlyph() {
  return (
    <svg {...glyphProps}>
      <path d="M4 16.5 5.6 10.9C5.9 9.8 6.9 9 8 9h8c1.1 0 2.1.8 2.4 1.9l1.6 5.6" />
      <path d="M3 16.5h18" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="16.5" cy="18" r="1.5" />
    </svg>
  )
}

function CartGlyph() {
  return (
    <svg {...glyphProps}>
      <path d="M4 5h2l2 11h10l2-8H7.5" />
      <circle cx="9" cy="19" r="1.4" />
      <circle cx="17" cy="19" r="1.4" />
    </svg>
  )
}

function PlugGlyph() {
  return (
    <svg {...glyphProps}>
      <path d="M9 3v6M15 3v6" />
      <path d="M7 9h10v3a5 5 0 0 1-10 0z" />
      <path d="M12 17v4" />
    </svg>
  )
}

function ReceiptGlyph() {
  return (
    <svg {...glyphProps}>
      <path d="M6 2h12v20l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  )
}

function GlyphTile({ tint, children }: { tint: string; children: React.ReactNode }) {
  return (
    <div className="relative h-10 w-10 shrink-0" aria-hidden="true">
      <div className={`absolute inset-xxs translate-x-xxs translate-y-xxs rounded-sm ${tint}`} />
      <div className="absolute inset-0 flex items-center justify-center text-ink">{children}</div>
    </div>
  )
}

/* ---------------------------------------------------------------------
 * Part 1 — the ring. One-shot reveal on mount: a 0.6s (timingSlow)
 * ease-out arc fill, paired with the signature damping:30/stiffness:220
 * numeral settle. Both start at the same moment, neither replays.
 *
 * The ring backdrop itself is a genuine, restrained 3D piece — three
 * signal-layer nodes (Movement/Money/Receipts) orbiting and converging
 * toward the confirm ring, @react-three/fiber, dynamically imported so
 * it never blocks first paint or ships in the main bundle (see
 * Hero3DScene.tsx). It degrades to the original flat SVG arc whenever
 * the viewer prefers reduced motion or the browser can't do WebGL —
 * both feature-detected, never assumed from a try/catch on the crash.
 * ------------------------------------------------------------------- */

const RING_R = 82
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R
const RING_FRACTION = 0.62 // illustrative — under budget, room to spare
const RING_TARGET_OFFSET = RING_CIRCUMFERENCE * (1 - RING_FRACTION)
const WEEKLY_KG = 38

const Hero3DScene = lazy(() => import('./Hero3DScene'))

function RingNumeral({ reduced }: { reduced: boolean }) {
  const spring = useSpring(0, { damping: 30, stiffness: 220 })
  const rounded = useTransform(spring, (v) => Math.round(v))
  const [display, setDisplay] = useState(reduced ? WEEKLY_KG : 0)

  useEffect(() => {
    if (reduced) return
    const unsub = rounded.on('change', (v) => setDisplay(v))
    spring.set(WEEKLY_KG)
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  return (
    <span className="text-display font-extrabold tracking-tight tabular-nums text-ink lg:text-mega">
      {display}
    </span>
  )
}

/** The original flat SVG ring — the reduced-motion / no-WebGL fallback. */
function FlatRingArc({ reduced }: { reduced: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img">
      <title>Illustrative weekly carbon ring, shown under budget</title>
      <defs>
        <linearGradient id="veridian-hero-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-ring-calm-from)" />
          <stop offset="100%" stopColor="var(--color-ring-calm-to)" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r={RING_R} fill="none" stroke="var(--color-border)" strokeWidth="10" />
      {reduced ? (
        <circle
          cx="100"
          cy="100"
          r={RING_R}
          fill="none"
          stroke="url(#veridian-hero-ring)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_TARGET_OFFSET}
          transform="rotate(-90 100 100)"
        />
      ) : (
        <motion.circle
          cx="100"
          cy="100"
          r={RING_R}
          fill="none"
          stroke="url(#veridian-hero-ring)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
          animate={{ strokeDashoffset: RING_TARGET_OFFSET }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          transform="rotate(-90 100 100)"
        />
      )}
    </svg>
  )
}

function CarbonRing({ reduced }: { reduced: boolean }) {
  // Feature-detected once per mount rather than assumed: this site is
  // client-rendered only (no SSR, per vite.config.ts), so it's safe to
  // resolve synchronously in the initializer instead of flashing the 3D
  // variant then swapping to the fallback after an effect. WebGL support
  // itself can't change mid-session, but reduced-motion can (the viewer
  // may flip the OS setting while this page is open) — so it stays a
  // plain derived value, re-evaluated every render, rather than baked
  // into the same one-time check.
  const [webglOK] = useState(() => supportsWebGL())
  const use3D = webglOK && !reduced

  return (
    <div className="relative mx-auto aspect-square w-full max-w-card">
      {use3D ? (
        <div className="absolute inset-0">
          <Suspense fallback={<FlatRingArc reduced={reduced} />}>
            <Hero3DScene />
          </Suspense>
        </div>
      ) : (
        <FlatRingArc reduced={reduced} />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-xxs px-md text-center">
        <span className="rounded-full bg-accent-soft px-sm py-xxs text-xs font-bold uppercase tracking-widest text-accent">
          Under budget
        </span>
        <RingNumeral reduced={reduced} />
        <span className="text-xs uppercase tracking-widest text-ink-tertiary">Kg CO2e · this week</span>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------
 * Part 2 — the auto-written feed. Rows arrive with no input from the
 * reader; that arrival is the entire demonstration. Estimates carry a
 * "~" and the desaturated `estimated` token; sensor/receipt-verified
 * values render in full-confidence `ink` — the single detail that says
 * more of the thesis than a paragraph would.
 * ------------------------------------------------------------------- */

type FeedRow = {
  glyph: React.ReactNode
  tint: string
  title: string
  source: string
  status: string
  value: string
  estimated: boolean
}

const FEED_ROWS: FeedRow[] = [
  {
    glyph: <CarGlyph />,
    tint: 'bg-transport/10',
    title: 'Drive · 12 km',
    source: 'MOTION',
    status: 'CONFIRMED',
    value: '1.8 kg',
    estimated: false,
  },
  {
    glyph: <CartGlyph />,
    tint: 'bg-shopping/10',
    title: 'Groceries',
    source: 'PLAID',
    status: 'ESTIMATE',
    value: '3.1 kg',
    estimated: true,
  },
  {
    glyph: <PlugGlyph />,
    tint: 'bg-energy/10',
    title: 'Home electricity',
    source: 'METER',
    status: 'CONFIRMED',
    value: '2.4 kg',
    estimated: false,
  },
  {
    glyph: <ReceiptGlyph />,
    tint: 'bg-accent/10',
    title: 'Receipt · Whole Foods',
    source: 'RECEIPT',
    status: 'UPGRADED ESTIMATE',
    value: '4.36 kg',
    estimated: false,
  },
]

function FeedRowItem({ row, reduced, delay }: { row: FeedRow; reduced: boolean; delay: number }) {
  return (
    <motion.div
      className="grid grid-cols-[auto_1fr_auto] items-center gap-md border-t border-border py-sm first:border-t-0"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE_BASE, delay }}
    >
      <GlyphTile tint={row.tint}>{row.glyph}</GlyphTile>
      <div className="min-w-0">
        <p className="truncate text-md text-ink">{row.title}</p>
        <p className="truncate text-xs text-ink-tertiary">
          {row.source}
          <span className="hidden sm:inline"> · {row.status}</span>
        </p>
      </div>
      <p className={`font-mono text-md tabular-nums ${row.estimated ? 'text-estimated' : 'text-ink'}`}>
        {row.estimated ? '~' : ''}
        {row.value}
      </p>
    </motion.div>
  )
}

export default function Hero() {
  const reduced = useReducedMotion() ?? false
  const typeReveal = useReveal()
  const instrumentReveal = useReveal(0.05)

  return (
    <section id="hero" aria-labelledby="hero-heading" className="py-2xl md:py-huge">
      <div className="mx-auto max-w-wide px-md md:px-lg">
        <div className="grid grid-cols-1 items-center gap-2xl lg:grid-cols-[5fr_6fr]">
          <motion.div {...typeReveal}>
            <p className="text-xs font-mono uppercase tracking-widest text-ink-tertiary">
              Veridian · case study · pre-launch
            </p>
            <h1
              id="hero-heading"
              className="mt-sm max-w-[16ch] text-display font-extrabold leading-tight tracking-tight text-ink lg:text-mega"
            >
              Not a logger you feed. An autopilot that writes your carbon story.
            </h1>
            <p className="mt-lg max-w-prose text-xl leading-relaxed text-ink-secondary">
              Veridian is a carbon-tracking app I&rsquo;ve been building since mid-March 2026 — five
              months, two research-forced reversals four months apart, and this page is the honest
              version of what changed.
            </p>
            <p className="mt-md font-mono text-md tabular-nums text-ink-tertiary">
              Pre-launch · no public users · no App Store listing yet
            </p>
            <a
              href="#summary"
              className="mt-lg inline-block text-md text-accent underline-offset-4 hover:underline"
            >
              Start with the summary
            </a>
          </motion.div>

          <motion.div {...instrumentReveal}>
            <div aria-hidden="true" className="rounded-2xl border border-border bg-surface p-lg shadow-sm">
              <CarbonRing reduced={reduced} />

              <div className="mt-md border-t border-border pt-md">
                {FEED_ROWS.map((row, i) => (
                  <FeedRowItem key={row.title} row={row} reduced={reduced} delay={reduced ? 0 : 0.6 + i * 0.05} />
                ))}
              </div>

              <div className="mt-sm flex items-center justify-between border-t border-border pt-sm">
                <p className="text-md tabular-nums text-ink-secondary">
                  3 things to confirm · about 10 seconds
                </p>
                <span
                  aria-hidden="true"
                  className="rounded-full bg-accent-soft px-sm py-xxs text-xs font-bold uppercase tracking-widest text-accent"
                >
                  Review
                </span>
              </div>
            </div>
            <p className="mt-sm text-sm text-ink-tertiary">
              Illustration, not a screenshot — the product&rsquo;s real interface uses these same
              tokens.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
