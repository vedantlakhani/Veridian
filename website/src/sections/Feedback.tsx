import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import type { Variants } from 'framer-motion'

/**
 * 08 / FEEDBACK — "Adapting to User Feedback"
 *
 * Four concrete fixes, each a literal before/after built from type and
 * tokens only. No fabricated screenshots — these are the same honest
 * abstraction the Hero and Solution sections use. The pattern repeats
 * four times on purpose: the reader should recognize the shape by fix 02.
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

/** Numeral settle — damping:30/stiffness:220, the product's signature spring. Never re-runs. */
function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const reduced = useReducedMotion()
  const spring = useSpring(0, { damping: 30, stiffness: 220 })
  const rounded = useTransform(spring, (v) => Math.round(v))
  const [display, setDisplay] = useState(reduced ? value : 0)
  const started = useRef(false)

  useEffect(() => {
    if (reduced) return
    const unsub = rounded.on('change', (v) => setDisplay(v))
    return () => unsub()
  }, [rounded, reduced])

  return (
    <motion.span
      className="tabular-nums"
      viewport={{ once: true, margin: '-10% 0px' }}
      onViewportEnter={() => {
        if (started.current) return
        started.current = true
        if (reduced) {
          setDisplay(value)
        } else {
          spring.set(value)
        }
      }}
    >
      {display}
      {suffix}
    </motion.span>
  )
}

/** Ghost placeholder rows — schematic line items, identical before and after; only the header changes. */
function GhostRows() {
  return (
    <div className="mt-sm space-y-xs">
      <div className="h-md w-3/4 rounded-xs bg-border-strong" />
      <div className="h-md w-1/2 rounded-xs bg-border-strong" />
    </div>
  )
}

type FixBlockProps = {
  index: string
  title: string
  before: React.ReactNode
  after: React.ReactNode
  prose: React.ReactNode
  evidence: string
}

function FixBlock({ index, title, before, after, prose, evidence }: FixBlockProps) {
  const reveal = useReveal()
  return (
    <motion.div {...reveal} className="border-t border-border py-xl">
      <div className="mb-lg flex flex-wrap items-baseline gap-x-sm gap-y-xxs">
        <span className="text-xs font-mono uppercase tracking-widest tabular-nums text-ink-tertiary">
          FIX {index}
        </span>
        <h3 className="text-xl font-extrabold tracking-tight text-ink">{title}</h3>
      </div>

      <div className="grid max-w-page grid-cols-1 gap-md md:grid-cols-2">
        <div>
          <p className="mb-sm text-xs font-mono uppercase tracking-widest text-ink-tertiary">
            What testers hit
          </p>
          <div className="rounded-lg bg-surface-sunken p-md">{before}</div>
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-accent md:hidden">Fixed:</p>

        <div>
          <p className="mb-sm text-xs font-mono uppercase tracking-widest text-ink-tertiary">
            What shipped
          </p>
          <div className="rounded-lg border border-border bg-surface p-md">{after}</div>
        </div>
      </div>

      <p className="mt-lg max-w-prose text-lg leading-relaxed text-ink-secondary">{prose}</p>
      <p className="mt-sm font-mono text-xs text-ink-tertiary">{evidence}</p>
    </motion.div>
  )
}

export default function Feedback() {
  const headerReveal = useReveal()
  const introReveal = useReveal()
  const closerReveal = useReveal()

  return (
    <section id="feedback" className="border-t border-border py-2xl md:py-huge">
      <div className="mx-auto max-w-page px-md md:px-lg">
        <motion.div {...headerReveal}>
          <p className="mb-md text-xs font-mono uppercase tracking-widest tabular-nums text-ink-tertiary">
            08 / FEEDBACK
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">Adapting to User Feedback</h2>
        </motion.div>

        <motion.p {...introReveal} className="mt-lg max-w-prose text-xl leading-relaxed text-ink">
          This week&rsquo;s testing surfaced four concrete problems, and I want to show the actual
          fix for each rather than just claim I &ldquo;iterate fast.&rdquo;
        </motion.p>

        {/* FIX 01 — raw NAICS codes as section headers */}
        <FixBlock
          index="01"
          title="Raw NAICS codes as section headers"
          before={
            <div>
              <p className="font-mono text-lg text-ink">443142</p>
              <GhostRows />
            </div>
          }
          after={
            <div>
              <p className="text-lg font-bold text-ink">Home, Electronics &amp; Hardware</p>
              <GhostRows />
            </div>
          }
          prose={
            <>
              The Shopping category&rsquo;s emission factors are seeded from EPA sector data, which
              comes labeled with codes like <code className="rounded-xs bg-surface-sunken px-xxs font-mono text-md">443142</code>.
              Nobody testing the app knew what that meant, so they skipped the section entirely.
            </>
          }
          evidence="lib/naicsGroups.ts · 69 NAICS codes → 12 groups"
        />

        {/* FIX 02 — zero carbon literacy */}
        <FixBlock
          index="02"
          title="Zero carbon literacy anywhere in the app"
          before={
            <div className="flex min-h-[7rem] flex-col justify-start">
              <p className="font-mono text-2xl tabular-nums text-ink">0.9 kg CO2e</p>
            </div>
          }
          after={
            <div className="flex min-h-[7rem] flex-col justify-between">
              <div>
                <p className="font-mono text-2xl tabular-nums text-ink">0.9 kg CO2e</p>
                <p className="mt-xs text-md text-ink-secondary">About a 6 km drive</p>
              </div>
              <p className="mt-sm text-md text-ink-secondary">14% below the global average</p>
            </div>
          }
          prose={
            <>
              The app would show &ldquo;0.9 kg CO2e&rdquo; with no sense of whether that&rsquo;s a
              lot.
            </>
          }
          evidence="lib/impactCopy.ts · __tests__/lib/impactCopy.test.ts"
        />

        {/* FIX 03 — shopping's confusing mental model */}
        <FixBlock
          index="03"
          title="Shopping’s confusing mental model"
          before={
            <div>
              <p className="text-lg text-ink">
                How many? <span className="font-mono">[ 1 ]</span>
              </p>
              <p className="mt-xs text-md text-ink-tertiary">Shirt</p>
            </div>
          }
          after={
            <div>
              <p className="text-lg font-bold text-ink">How much did you spend?</p>
              <div className="mt-sm flex flex-wrap gap-sm" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-xxs rounded-full border border-border px-sm py-xxs font-mono text-md text-ink-secondary"
                  >
                    <span>$</span>
                    <span className="h-[0.9em] w-8 rounded-xs bg-border-strong" />
                  </span>
                ))}
              </div>
              <p className="mt-sm flex items-center gap-xxs font-mono text-lg tabular-nums text-estimated">
                <span aria-hidden="true">~</span>
                <span aria-hidden="true" className="h-[1em] w-14 rounded-xs bg-border-strong" />
                <span>kg CO2e</span>
              </p>
              <p className="mt-xxs text-xs text-ink-secondary">Estimated from spend category — receipts upgrade this.</p>
            </div>
          }
          prose={
            <>
              Every other category logs a physical quantity — kilometers driven, kilograms of
              beef. Shopping is spend-based by necessity (that&rsquo;s how EPA sector factors
              work), but the UI didn&rsquo;t say so, so people tried to log &ldquo;one
              shirt&rdquo; and got confused by a dollar-amount prompt.
            </>
          }
          evidence="spend-based reframe · estimate disclaimer"
        />

        {/* FIX 04 — chips that wrapped, clipped, or truncated */}
        <FixBlock
          index="04"
          title="Chips that wrapped, clipped, or truncated"
          before={
            <div className="w-40 overflow-hidden">
              <div className="flex flex-nowrap gap-xs">
                {['Transport', 'Groceries', 'Energy', 'Shopping', 'Receipts'].map((label) => (
                  <span
                    key={label}
                    className="shrink-0 whitespace-nowrap rounded-full border border-border px-sm py-xxs text-xs text-ink-secondary"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          }
          after={
            <div className="flex flex-wrap gap-sm">
              {['Transport', 'Groceries', 'Energy', 'Shopping', 'Receipts'].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-border px-sm py-xxs text-xs text-ink-secondary"
                >
                  {label}
                </span>
              ))}
            </div>
          }
          prose={
            <>
              A cosmetic bug, but the kind that reads as unfinished to exactly the persona (the
              Quiet Optimizer) who churns on a broken-trust moment. Fixed at the component level in
              the shared <code className="rounded-xs bg-surface-sunken px-xxs font-mono text-md">VChip</code>, not patched per-screen.
            </>
          }
          evidence="components/ui/VChip.tsx · fixed at the component level, not per-screen"
        />

        {/* Verification strip — proof-of-rigor, belongs at the end */}
        <motion.div
          {...closerReveal}
          className="mt-2xl rounded-lg bg-surface-sunken p-lg"
        >
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
            <div className="py-sm font-mono text-md text-ink-secondary sm:py-0 sm:pr-lg">
              <span className="font-bold tabular-nums text-ink">
                <CountUp value={46} />/46
              </span>{' '}
              Jest suites passing
            </div>
            <div className="py-sm font-mono text-md text-ink-secondary sm:py-0 sm:px-lg">
              <code className="rounded-xs bg-surface px-xxs font-mono text-md text-ink">tsc --noEmit</code>{' '}
              clean
            </div>
            <div className="py-sm font-mono text-md text-ink-secondary sm:py-0 sm:pl-lg">
              <span className="font-bold tabular-nums text-ink">4/4</span> shipped the same day
              found
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
