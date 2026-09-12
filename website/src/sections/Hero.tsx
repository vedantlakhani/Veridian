import { useEffect, useState } from 'react'
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import type { Variants } from 'framer-motion'

/**
 * HERO
 *
 * The hero visual is a single focused instrument, not a phone screenshot:
 * a colored ring chart showing a week's carbon footprint split by category,
 * the same category tokens (food/transport/energy/shopping) the real app
 * uses on its own Trends screen. Explicitly labeled illustrative sample
 * data in the caption below it, never a claim about a real user's real
 * footprint. Kept small and self-contained on purpose, so it reads as one
 * clean chart next to the headline rather than competing with it.
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
 * The ring — four colored arcs (food, transport, energy, shopping),
 * drawn on scroll-in with a one-shot stroke animation, plus the
 * signature damping:30/stiffness:220 numeral settle for the center
 * total. Illustrative sample split: 38 kg this week, food-heaviest.
 * ------------------------------------------------------------------- */

const RING_R = 78
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R
const WEEKLY_KG = 38

const SEGMENTS = [
  { key: 'food', label: 'Food', kg: 14, color: 'var(--color-food)' },
  { key: 'transport', label: 'Transport', kg: 11, color: 'var(--color-transport)' },
  { key: 'energy', label: 'Energy', kg: 8, color: 'var(--color-energy)' },
  { key: 'shopping', label: 'Shopping', kg: 5, color: 'var(--color-shopping)' },
] as const

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
    <span className="text-mega font-extrabold tracking-tight tabular-nums text-ink">
      {display}
    </span>
  )
}

function CategoryRing({ reduced }: { reduced: boolean }) {
  let cursor = 0
  const gapDeg = 3

  return (
    <div className="relative mx-auto aspect-square w-full max-w-card">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" role="img">
        <title>Illustrative weekly footprint by category: food, transport, energy, shopping</title>
        <circle cx="100" cy="100" r={RING_R} fill="none" stroke="var(--color-border)" strokeWidth="16" />
        {SEGMENTS.map((seg, i) => {
          const fraction = seg.kg / WEEKLY_KG
          const arcLen = RING_CIRCUMFERENCE * fraction - gapDeg
          const offset = RING_CIRCUMFERENCE * cursor
          cursor += fraction
          const dash = `${Math.max(arcLen, 0)} ${RING_CIRCUMFERENCE}`
          return reduced ? (
            <circle
              key={seg.key}
              cx="100"
              cy="100"
              r={RING_R}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
            />
          ) : (
            <motion.circle
              key={seg.key}
              cx="100"
              cy="100"
              r={RING_R}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={dash}
              initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
              whileInView={{ strokeDashoffset: -offset }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.7, delay: 0.15 + i * 0.1, ease: 'easeOut' }}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-xxs px-md text-center">
        <span className="rounded-full bg-accent-soft px-sm py-xxs text-xs font-bold uppercase tracking-widest text-accent">
          This week
        </span>
        <RingNumeral reduced={reduced} />
        <span className="text-xs uppercase tracking-widest text-ink-tertiary">Kg CO2e</span>
      </div>
    </div>
  )
}

function Legend() {
  return (
    <ul className="mt-lg flex flex-wrap justify-center gap-md">
      {SEGMENTS.map((seg) => (
        <li key={seg.key} className="flex items-center gap-xs text-sm text-ink-secondary">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: seg.color }}
            aria-hidden="true"
          />
          {seg.label}
          <span className="tabular-nums text-ink-tertiary">{seg.kg}kg</span>
        </li>
      ))}
    </ul>
  )
}

export default function Hero() {
  const reduced = useReducedMotion() ?? false
  const typeReveal = useReveal()
  const instrumentReveal = useReveal(0.05)

  return (
    <section id="hero" aria-labelledby="hero-heading" className="py-2xl md:py-huge">
      <div className="mx-auto max-w-wide px-md md:px-lg">
        <div className="grid grid-cols-1 items-center gap-2xl lg:grid-cols-[6fr_5fr]">
          <motion.div {...typeReveal}>
            <p className="text-xs font-mono uppercase tracking-widest text-ink-tertiary">
              Veridian · case study · pre-launch
            </p>
            <h1
              id="hero-heading"
              className="mt-md text-mega font-extrabold leading-[0.98] tracking-tight text-ink"
            >
              Not a logger you feed.
              <br />
              An autopilot that <span className="text-accent">writes your carbon story.</span>
            </h1>
            <p className="mt-lg max-w-prose text-xl leading-relaxed text-ink-secondary">
              Veridian is a carbon tracking app I have been building since mid-March 2026. Five
              months, two research-forced reversals four months apart, and this page is the honest
              version of what changed.
            </p>
            <p className="mt-md font-mono text-md tabular-nums text-ink-tertiary">
              Pre-launch · no public users · no App Store listing yet
            </p>
            <a
              href="#summary"
              className="mt-lg inline-flex items-center gap-xs rounded-lg bg-accent px-lg py-md text-md font-bold text-surface transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
            >
              Start with the summary
              <span aria-hidden="true">→</span>
            </a>
          </motion.div>

          <motion.div {...instrumentReveal}>
            <CategoryRing reduced={reduced} />
            <Legend />
            <p className="mt-md text-center text-sm text-ink-tertiary">
              Illustration, not a screenshot: a sample week, split by category.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
