import { motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'

/**
 * PRODUCT SCREENS
 *
 * Real screenshots from the current (Clearing / light-mode) build, captured
 * live from the iOS Simulator — a direct answer to the Hero's own caption
 * ("illustration, not a screenshot"). No cropping tricks, no fabricated data:
 * this is the actual app, on a fresh account, exactly as it renders today.
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

const SCREENS = [
  { src: '/screenshots/onboarding.png', label: 'Baseline', caption: 'Where it starts — a two-minute estimate, not a form.' },
  { src: '/screenshots/today.png', label: 'Today', caption: 'The confirm loop — auto-written, not typed.' },
  { src: '/screenshots/trends.png', label: 'Trends', caption: 'Your carbon, decoded.' },
  { src: '/screenshots/you.png', label: 'You', caption: 'Momentum, not streaks — no guilt copy.' },
  { src: '/screenshots/passport.png', label: 'Passport', caption: 'The monthly artifact — shareable, not a certificate.' },
]

export default function ProductScreens() {
  const reveal = useReveal()

  return (
    <section id="product-screens" aria-labelledby="product-screens-heading" className="py-2xl md:py-huge">
      <div className="mx-auto max-w-page px-md md:px-lg">
        <motion.div {...reveal}>
          <p className="text-xs font-mono uppercase tracking-widest text-ink-tertiary">
            The actual product
          </p>
          <h2 id="product-screens-heading" className="mt-sm text-2xl font-bold tracking-tight text-ink">
            Real screens, not a mockup
          </h2>
          <p className="mt-md max-w-prose text-lg leading-relaxed text-ink-secondary">
            Captured live from the current build — logged the same way any real day would be, no
            crops chosen to flatter it.
          </p>
        </motion.div>

        <div className="mt-xl grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          {SCREENS.map((screen, i) => (
            <motion.figure
              key={screen.label}
              {...useReveal(0.05 + i * 0.05)}
              className="m-0"
            >
              <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                <img
                  src={screen.src}
                  alt={`Veridian ${screen.label} tab, current build`}
                  className="block h-auto w-full"
                  loading="lazy"
                  width={1206}
                  height={2622}
                />
              </div>
              <figcaption className="mt-sm">
                <p className="text-md font-bold text-ink">{screen.label}</p>
                <p className="text-sm text-ink-tertiary">{screen.caption}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
