import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import type { Variants } from 'framer-motion'

/**
 * 01 / SUMMARY
 *
 * The thesis and the frame — this page is the honest version of five
 * months, two research-forced reversals, four months apart. Three beats:
 * the lede (confession, run-on, not bulleted), the pull-quote (the actual
 * thesis sentence), the stat strip (5 / 2 / 4, unboxed), then the closing
 * line that sets up the rest of the page.
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
function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
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
          return
        }
        window.setTimeout(() => spring.set(value), delay * 1000)
      }}
    >
      {display}
    </motion.span>
  )
}

type StatCellProps = { value: number; label: string; clarify: string; delay: number }

function StatCell({ value, label, clarify, delay }: StatCellProps) {
  return (
    <div className="py-md md:px-lg">
      <p className="text-2xl font-extrabold tracking-tight tabular-nums text-ink md:text-display">
        <CountUp value={value} delay={delay} />
      </p>
      <p className="mt-xxs text-xs font-mono uppercase tracking-widest text-ink-tertiary">{label}</p>
      <p className="mt-xs text-md text-ink-secondary">{clarify}</p>
    </div>
  )
}

export default function Summary() {
  const headerReveal = useReveal()
  const ledeReveal = useReveal()
  const quoteReveal = useReveal()
  const statReveal = useReveal()
  const closingReveal = useReveal()

  return (
    <section
      id="summary"
      aria-labelledby="summary-heading"
      className="border-t border-border py-2xl md:py-huge"
    >
      <div className="mx-auto max-w-page px-md md:px-lg">
        <motion.div {...headerReveal}>
          <h2 id="summary-heading" className="text-2xl font-extrabold tracking-tight text-ink">
            Five months, told straight
          </h2>
        </motion.div>

        {/* Beat 1 — the lede. Run-on confession, not bullets. */}
        <motion.div {...ledeReveal} className="mt-xl max-w-prose">
          <p className="text-xl leading-relaxed text-ink">
            I started building Veridian in mid-March 2026. The first idea was simple: log your
            commute, log what you eat, watch a ring fill up, earn a badge for showing up. That app
            got built, all of it, and it worked.
          </p>
          <p className="mt-md text-lg leading-relaxed text-ink-secondary">
            Then I did the thing most people skip once something is &ldquo;done&rdquo;: I kept
            asking whether it was actually good. Twice, four months apart, the answer came back no,
            and both times it meant tearing up real work, not tweaking it. What I have now is a
            different app than the one I set out to build: instead of a logger you have to feed, it
            is more like an autopilot that notices your day and writes your carbon story for you.
            You just tap to confirm it got things right.
          </p>
        </motion.div>

        {/* Beat 2 — the pull-quote. Top+bottom hairline, no rail, no glyph.
            Two-tone emphasis: setup in a lighter secondary weight, the actual
            thesis in full-weight ink — same device as the hero's headline. */}
        <motion.blockquote
          {...quoteReveal}
          className="my-2xl max-w-prose border-t border-b border-border py-lg"
        >
          <p className="max-w-[28ch] text-2xl leading-tight tracking-tight">
            <span className="font-medium text-ink-secondary">Not a logger you feed, </span>
            <span className="font-extrabold text-ink">
              but an autopilot that writes your carbon story.
            </span>
          </p>
        </motion.blockquote>

        {/* Beat 3 — the stat strip. Unboxed, hairline-divided, count up together. */}
        <motion.div
          {...statReveal}
          className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-y-0 md:divide-x"
        >
          <StatCell value={5} label="Months building" clarify="since mid-March 2026" delay={0} />
          <StatCell value={2} label="Full reversals" clarify="not tweaks" delay={0.05} />
          <StatCell value={4} label="Months apart" clarify="two research passes" delay={0.1} />
        </motion.div>

        {/* Closing paragraph — back to running prose. */}
        <motion.p
          {...closingReveal}
          className="mt-lg max-w-prose text-lg leading-relaxed text-ink-secondary"
        >
          This page is the honest version of that five months: what I believed at first, what the
          evidence changed my mind about, and what&rsquo;s still genuinely unresolved.
        </motion.p>
      </div>
    </section>
  )
}
