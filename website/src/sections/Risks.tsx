import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import type { Variants } from 'framer-motion'

/**
 * 10 / RISKS
 *
 * One risk that deserves real weight, plus three smaller ones with an
 * honest status. `over` (clay) appears nowhere here — it's reserved for the
 * Competitors graveyard's SHUT DOWN chips only. This section uses watch for
 * the single open question and neutral ink everywhere else: a risk section
 * rendered in warning colors would be exactly the guilt/alarm register the
 * product rejects.
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

function StatusChip({ tone, children }: { tone: 'accent' | 'neutral'; children: string }) {
  const toneClass =
    tone === 'accent' ? 'bg-accent-soft text-accent' : 'bg-surface-sunken text-ink-tertiary'
  return (
    <span
      className={`inline-block rounded-full px-sm py-xxs text-xs font-bold uppercase tracking-widest ${toneClass}`}
    >
      {children}
    </span>
  )
}

const SMALLER_RISKS = [
  {
    status: 'Mitigated' as const,
    name: 'Bank-link hesitancy',
    body: 'Sensors-only is a complete experience on its own; money is an upgrade, not a gate.',
    note: null as string | null,
  },
  {
    status: 'Mitigated' as const,
    name: 'Spend-estimate accuracy disappointment',
    body: 'A documented churn cause in this category, mitigated by explicit uncertainty labeling and receipts visibly upgrading estimates.',
    note: '(that’s the ~ and the muted values you saw above)',
  },
  {
    status: 'Not started' as const,
    name: 'Plaid’s sales-gated onboarding',
    body: 'Plaid, the service the app uses to securely connect a bank account, gates production access behind a sales conversation I haven’t started yet.',
    note: null as string | null,
  },
]

export default function Risks() {
  const headerReveal = useReveal()
  const leadReveal = useReveal()
  const evidenceReveal = useReveal(0.05)
  const candidatesReveal = useReveal()
  const smallerReveal = useReveal()

  return (
    <section id="risks" className="border-t border-border py-2xl md:py-huge">
      <div className="mx-auto max-w-page px-md md:px-lg">
        <motion.div {...headerReveal}>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">What could still go wrong</h2>
        </motion.div>

        {/* Lead risk */}
        <motion.div {...leadReveal} className="mt-2xl max-w-prose">
          <p className="text-xl font-bold uppercase tracking-widest text-watch">Open question</p>
          <p className="mt-md text-2xl font-extrabold tracking-tight text-ink">
            The hard-outcome monetization hook is still an open question.
          </p>
          <p className="mt-lg text-lg leading-relaxed text-ink-secondary">
            <span className="text-ink">
              The current plan is a flat subscription for the intelligence layer, the
              autopilot itself, priced like Copilot Money. Never an offset transaction cut:
              offset credibility is actively collapsing (2024 research puts 87%+ of many offset
              types at high risk of not delivering real reductions), and I don&rsquo;t want the
              business resting on that.
            </span>{' '}
            But subscription-for-awareness alone has a real precedent for failing. Miles ran
            flawless passive tracking for nine years and still shut down, because soft point
            rewards have a ceiling. Root, the profitable comparison case, shows passive tracking
            only endures when it&rsquo;s tied to a hard outcome the user already values: money
            saved, time saved, an insurance or utility incentive. I have candidates but no
            decision yet, and the Systems Optimizer persona specifically churns without one.
          </p>
        </motion.div>

        {/* Supporting evidence — three figures, neutral ink, no editorializing */}
        <motion.div
          {...evidenceReveal}
          className="mt-xl grid grid-cols-1 divide-y divide-border border-y border-border md:grid-cols-3 md:divide-y-0 md:divide-x"
        >
          <div className="py-lg md:pr-lg">
            <p className="text-display font-extrabold tracking-tight tabular-nums text-ink">
              <CountUp value={9} suffix=" years" />
            </p>
            <p className="mt-sm max-w-prose text-md text-ink-secondary">
              Miles ran flawless passive tracking and still shut down. Soft point rewards have a
              ceiling.
            </p>
          </div>
          <div className="py-lg md:px-lg">
            <p className="text-display font-extrabold tracking-tight tabular-nums text-ink">
              <CountUp value={87} suffix="%+" />
            </p>
            <p className="mt-sm max-w-prose text-md text-ink-secondary">
              Of many offset types are at high risk of not delivering real reductions (2024
              research). Why there will never be an offset transaction cut.
            </p>
          </div>
          <div className="py-lg md:pl-lg">
            <p className="text-display font-extrabold tracking-tight text-ink">Root</p>
            <p className="mt-sm max-w-prose text-md text-ink-secondary">
              The profitable comparison case. Passive tracking endures when it&rsquo;s tied to a
              hard outcome the user already values.
            </p>
          </div>
        </motion.div>

        {/* Candidates — the asymmetry between "exists" and "unexplored" */}
        <motion.p
          {...candidatesReveal}
          className="mt-lg max-w-prose text-lg leading-relaxed text-ink-secondary"
        >
          Candidates: the swap-engine savings math <StatusChip tone="accent">Exists</StatusChip>,
          insurance and utility partnerships{' '}
          <StatusChip tone="neutral">Unexplored</StatusChip>, but no decision yet.
        </motion.p>

        {/* Three smaller, more mitigated risks */}
        <motion.div {...smallerReveal} className="mt-2xl grid max-w-page gap-md">
          {SMALLER_RISKS.map((risk) => (
            <div
              key={risk.name}
              className="grid grid-cols-[auto_1fr] items-start gap-md border-t border-border pt-md"
            >
              <StatusChip tone={risk.status === 'Mitigated' ? 'accent' : 'neutral'}>
                {risk.status}
              </StatusChip>
              <div className="max-w-prose">
                <p className="text-lg font-extrabold text-ink">{risk.name}</p>
                <p className="mt-xxs text-lg text-ink-secondary">{risk.body}</p>
                {risk.note && <p className="mt-xxs text-md text-ink-tertiary">{risk.note}</p>}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
