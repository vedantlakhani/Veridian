import { motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import type { MouseEvent } from 'react'
import WaitlistCTA from './WaitlistCTA'

/**
 * 13 / FOOTER
 *
 * Closes the document, restates its status honestly, cites its sources,
 * and offers the second, quieter waitlist capture. No logo mark (none
 * exists), no social icon row (an empty one is the clearest possible
 * "template" tell), no claims about cookies or analytics — that would need
 * verifying against the actual backend before it could honestly ship here.
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

export default function Footer() {
  const reduced = useReducedMotion()
  const reveal = useReveal()

  function handleBackToTop(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <footer className="border-t border-border bg-surface-sunken py-2xl">
      <motion.div {...reveal} className="mx-auto max-w-page px-md md:px-lg">
        <div className="grid grid-cols-1 items-start gap-xl md:grid-cols-[1fr_auto]">
          {/* Left column */}
          <div>
            <p className="text-xl font-bold tracking-tight text-ink">Veridian</p>
            <p className="mt-sm font-mono text-md tabular-nums text-ink-secondary">
              Pre-launch · 0 public users · built solo since March 2026
            </p>

            <p className="mt-xl max-w-prose text-md text-ink-secondary">
              Every claim on this page is sourced from the project&rsquo;s own documents.
            </p>
            <p className="mt-xs text-xs font-mono uppercase tracking-widest text-ink-tertiary">
              Sources
            </p>
            <p className="mt-xxs max-w-prose font-mono text-sm text-ink-tertiary">
              docs/NORTH_STAR.md · docs/DESIGN_RESEARCH.md · docs/DESIGN_DIRECTION.md ·
              VERIDIAN_PRD.md
            </p>
          </div>

          {/* Right column — quieter, smaller inline CTA variant */}
          <div className="w-full md:w-72">
            <WaitlistCTA variant="inline" />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-lg flex flex-wrap items-center justify-between gap-sm border-t border-border pt-md text-sm tabular-nums text-ink-tertiary">
          <div className="flex flex-wrap items-center gap-sm">
            <p>© 2026 Veridian</p>
            <span aria-hidden="true">·</span>
            <a
              href="/privacy-policy.html"
              className="underline-offset-2 hover:underline hover:text-ink-secondary"
            >
              Privacy Policy
            </a>
          </div>
          <a
            href="#top"
            onClick={handleBackToTop}
            className="group inline-flex items-center gap-xxs underline-offset-2 hover:underline"
          >
            Back to top
            <svg
              viewBox="0 0 12 12"
              className="h-3 w-3 shrink-0 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:group-hover:-translate-y-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" />
            </svg>
          </a>
        </div>
      </motion.div>
    </footer>
  )
}
