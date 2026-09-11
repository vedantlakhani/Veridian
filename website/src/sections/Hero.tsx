import { motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'

/**
 * HERO
 *
 * Design read: this is a case-study landing page for a technical/PM
 * audience, in the product's own "instrument, not eco-app" register — not
 * a generic SaaS launch page. So the hero's visual is the real product,
 * not a mood piece: the current build's Today screen (public/screenshots/
 * today.png), framed exactly like ProductScreens frames every other real
 * screenshot below it (rounded-2xl, border, shadow-sm — no fake browser
 * chrome, no invented UI). This replaces the previous 3D scene and, before
 * that, a hand-built div-based "confirm loop" mockup — both were reaching
 * for something the app already has: a real screen that shows the same
 * ring/card shapes and tokens as the rest of the page.
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

export default function Hero() {
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
            <figure className="m-0">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                <img
                  src="/screenshots/today.png"
                  alt="Veridian Today tab, current build — the daily confirm loop"
                  className="block h-auto w-full"
                  width={1206}
                  height={2622}
                />
              </div>
              <figcaption className="mt-sm text-sm text-ink-tertiary">
                The actual product, not a mockup — Today tab, current build.
              </figcaption>
            </figure>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
