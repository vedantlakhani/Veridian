import { motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'

/**
 * 07 / DISTRIBUTION
 *
 * The weakest section factually. The design job here is to not compensate —
 * a real zero, rendered at full size and full contrast, is the whole point.
 * No cards, no columns, no icons. Short, quiet, and it stays that way.
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

export default function Distribution() {
  const headerReveal = useReveal()
  const stripReveal = useReveal(0.05)
  const proseReveal = useReveal()
  const quoteReveal = useReveal()
  const closingReveal = useReveal()

  return (
    <section id="distribution" className="border-t border-border py-2xl md:py-huge">
      <div className="mx-auto max-w-page px-md md:px-lg">
        <motion.div {...headerReveal}>
          <p className="mb-md text-xs font-mono uppercase tracking-widest tabular-nums text-ink-tertiary">
            07 / DISTRIBUTION
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Distribution</h2>
        </motion.div>

        {/* Status strip — the zero fades in at full size and full contrast. No count-up.
            "0" carries the section's one type-confidence moment: the honest number is the
            actual headline here, so it's the one figure on the page sized up to text-display
            rather than the text-2xl ceiling used everywhere else on this strip. */}
        <motion.div
          {...stripReveal}
          className="mt-2xl grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-y-0 sm:divide-x"
        >
          <div className="py-md sm:py-lg sm:pr-lg">
            <p className="text-display font-extrabold leading-none tracking-tight tabular-nums text-ink">
              0
            </p>
            <p className="mt-xs text-xs font-mono uppercase tracking-widest text-ink-tertiary">
              Public users
            </p>
          </div>
          <div className="py-md sm:px-lg">
            <p className="text-2xl font-bold text-ink-secondary">NONE</p>
            <p className="mt-xs text-xs font-mono uppercase tracking-widest text-ink-tertiary">
              App Store listing
            </p>
          </div>
          <div className="py-md sm:pl-lg">
            <p className="text-2xl font-bold tabular-nums text-watch">NEXT STEP</p>
            <p className="mt-xs text-xs font-mono uppercase tracking-widest text-ink-tertiary">
              TestFlight
            </p>
            <p className="mt-xs max-w-prose text-md text-ink-secondary">
              gated on an Apple Developer account decision I haven&rsquo;t made yet
            </p>
          </div>
        </motion.div>

        {/* Lede */}
        <motion.p {...proseReveal} className="mt-xl max-w-prose text-lg leading-relaxed text-ink-secondary">
          <span className="text-ink">
            I&rsquo;ll be direct about where this actually is: pre-launch, no public users, no App
            Store listing yet.
          </span>{' '}
          What I do have is real. I&rsquo;ve been running the app on my own phone and putting it
          in front of a small number of real people, watching them use it rather than asking them
          what they think they&rsquo;d use.
        </motion.p>

        {/* Pull-quote — top+bottom hairline, no rail, no quotation glyph */}
        <motion.blockquote
          {...quoteReveal}
          className="my-2xl max-w-prose border-t border-b border-border py-lg text-2xl font-bold leading-tight tracking-tight text-ink"
        >
          Watching them use it rather than asking them what they think they&rsquo;d use.
        </motion.blockquote>

        {/* Closing paragraph */}
        <motion.p {...closingReveal} className="max-w-prose text-lg leading-relaxed text-ink-secondary">
          That informal testing is what drove this week&rsquo;s UX pass, not a survey or a focus
          group. Watching someone squint at a shopping category header showing a raw six-digit
          code, or hesitate on a number with no sense of whether it was big or small, told me more
          in ten minutes than a questionnaire would have. That&rsquo;s the honest state of
          distribution right now: small, informal, and directly connected to what got fixed.
          TestFlight is the next real step, gated on an Apple Developer account decision I
          haven&rsquo;t made yet{' '}
          <a href="#feedback" className="text-accent underline-offset-2 hover:underline">
            (the fixes are in the next section)
          </a>
          .
        </motion.p>
      </div>
    </section>
  )
}
