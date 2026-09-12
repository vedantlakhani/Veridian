import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import type { Variants } from 'framer-motion'

/**
 * 02 / PROBLEM
 *
 * Two moves. Part A: the three surface failures the first version already
 * solved — a numbered rail, no icons (icons would soften an indictment).
 * Part B: the structural failure underneath, which it didn't — staged so
 * the pull-quote feels like a floor giving way, not a fourth bullet.
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

type Failure = { num: string; lead: string; body: string }

const FAILURES: Failure[] = [
  {
    num: '01',
    lead: 'It’s a one-time experience.',
    body: 'You answer eight onboarding questions, get a number, and there’s no reason to open the app again tomorrow.',
  },
  {
    num: '02',
    lead: 'The advice is generic.',
    body: '“Eat less meat” means nothing to someone who’s already mostly vegetarian. Nothing is ranked by actual impact for that specific person.',
  },
  {
    num: '03',
    lead: 'Guilt is the primary emotion.',
    body: 'Every screen quietly tells you how bad you’re doing instead of how much progress you’re making.',
  },
]

type LawApp = { name: string; domain: string }

const LAW_APPS: LawApp[] = [
  { name: 'Flighty', domain: 'Flights' },
  { name: 'Copilot Money', domain: 'Spending' },
  { name: 'Apple Watch', domain: 'Workouts' },
]

export default function Problem() {
  const headerReveal = useReveal()
  const ledeReveal = useReveal()
  const railReveal = useReveal()
  const bridgeReveal = useReveal()
  const quoteReveal = useReveal()
  const lawReveal = useReveal()
  const closingReveal = useReveal()

  // Scroll-linked parallax on the numbered rail: the index digits (a
  // background-ish layer, low-contrast tertiary ink) drift a few px against
  // the body text beside them as the section scrolls through view. Capped
  // well under 40px of total travel; inert under reduced motion.
  const reducedMotion = useReducedMotion()
  const railRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: railProgress } = useScroll({
    target: railRef,
    offset: ['start end', 'end start'],
  })
  const numY = useTransform(railProgress, [0, 1], reducedMotion ? [0, 0] : [-16, 16])

  return (
    <section
      id="problem"
      aria-labelledby="problem-heading"
      className="border-t border-border py-2xl md:py-huge"
    >
      <div className="mx-auto max-w-page px-md md:px-lg">
        <motion.div {...headerReveal}>
          <p className="mb-md text-xs font-mono uppercase tracking-widest tabular-nums text-ink-tertiary">
            02 / PROBLEM
          </p>
          <h2 id="problem-heading" className="text-2xl font-extrabold tracking-tight text-ink">
            Problem
          </h2>
        </motion.div>

        <motion.p {...ledeReveal} className="mt-xl max-w-prose text-xl leading-relaxed text-ink">
          Every consumer carbon app has the same three failures, and I built into all three before
          I saw them clearly.
        </motion.p>

        {/* Part A — the numbered rail. No icons; icons would soften an indictment. */}
        <motion.div {...railReveal} ref={railRef} className="mt-lg">
          {FAILURES.map((f) => (
            <div key={f.num} className="grid grid-cols-[auto_1fr] gap-x-md border-t border-border py-lg">
              <motion.span
                style={{ y: numY }}
                className="font-mono text-md tabular-nums text-ink-tertiary"
              >
                {f.num}
              </motion.span>
              <div className="max-w-prose">
                <p className="text-lg font-bold text-ink">{f.lead}</p>
                <p className="mt-xs text-lg text-ink-secondary">{f.body}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Bridge sentence into the structural failure. */}
        <motion.p {...bridgeReveal} className="mt-lg max-w-prose text-lg leading-relaxed text-ink-secondary">
          I designed my way around all three in the first version: that was the whole PRD. What I
          hadn&rsquo;t yet confronted was a deeper structural problem underneath.
        </motion.p>

        {/* Part B — the structural failure. Same pull-quote spec as Summary, more surrounding air. */}
        <motion.blockquote
          {...quoteReveal}
          className="my-huge max-w-prose border-t border-b border-border py-lg"
        >
          <p className="max-w-[28ch] text-2xl font-bold leading-tight tracking-tight text-ink">
            The manual log itself is the failure.
          </p>
        </motion.blockquote>

        <motion.p {...bridgeReveal} className="max-w-prose text-lg leading-relaxed text-ink-secondary">
          Nobody opens an app to type &ldquo;drove 12 km.&rdquo;
        </motion.p>

        {/* The three-app law. Unboxed, hairline per column at base, single rule at md. */}
        <motion.div {...lawReveal} className="mt-lg md:border-t md:border-border md:pt-md">
          <div className="grid grid-cols-1 gap-lg md:grid-cols-3 md:gap-xl">
            {LAW_APPS.map((app) => (
              <div key={app.name} className="border-t border-border pt-md md:border-t-0 md:pt-0">
                <p className="text-lg font-bold text-ink">{app.name}</p>
                <p className="mt-xxs text-xs font-mono uppercase tracking-widest text-ink-tertiary">
                  {app.domain}
                </p>
              </div>
            ))}
          </div>
          <p className="py-md text-center text-lg text-ink">
            The user never enters data. They correct and enjoy data that already showed up.
          </p>
        </motion.div>

        {/* Closing sentence — the one two-tone punchline in this section:
            setup in secondary ink, the actual verdict in full-weight ink. */}
        <motion.p {...closingReveal} className="max-w-prose text-lg leading-relaxed">
          <span className="text-ink-secondary">
            A carbon app that asks you to log manually is competing with your own forgetfulness
            every single day,{' '}
          </span>
          <span className="font-extrabold text-ink">and forgetfulness wins.</span>
        </motion.p>
      </div>
    </section>
  )
}
