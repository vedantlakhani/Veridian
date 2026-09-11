import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import Summary from './Summary'
import Problem from './Problem'
import TargetUser from './TargetUser'
import Competitors from './Competitors'
import Insight from './Insight'
import Solution from './Solution'
import Distribution from './Distribution'
import Feedback from './Feedback'
import Challenges from './Challenges'
import Risks from './Risks'

/**
 * DEEP DIVE
 *
 * Tier 2 of the page's information architecture. Hero, ProductScreens,
 * CaseStudy, and the waitlist ask are the page a visitor actually sees;
 * these ten sections carry the same real, already-approved content they
 * always did (sourced from docs/WEBSITE_STRUCTURE.md), but as a compact,
 * closed-by-default disclosure list rather than ten more full-height
 * scroll sections after the reader has already gotten the point.
 *
 * Accordion, not independent toggles: with ten items, letting several
 * stay open at once just rebuilds the old wall of scroll one click at a
 * time. One open panel at a time keeps this readable as a list you're
 * choosing from, not a page you're re-expanding.
 *
 * Each inner component (Summary, Problem, ...) already carries its own
 * "0N / NAME" eyebrow — that numbering is left in place (see each file),
 * so the row label here uses the same number and a plain title case
 * rather than a second, shouting all-caps eyebrow of its own. Nothing
 * conflicts: the number you see collapsed is the same number you see
 * once the panel opens.
 *
 * Motion: height/opacity cross-fade via framer-motion's AnimatePresence,
 * eased to match every other reveal on the page (EASE_BASE), collapsing
 * to an instant show/hide under prefers-reduced-motion — the same
 * convention as every sibling section's `useReveal`.
 */

const EASE_BASE = [0.2, 0, 0, 1] as const

type Entry = {
  n: string
  title: string
  Component: React.ComponentType
}

const ENTRIES: Entry[] = [
  { n: '01', title: 'Summary', Component: Summary },
  { n: '02', title: 'Problem', Component: Problem },
  { n: '03', title: 'Target user', Component: TargetUser },
  { n: '04', title: 'Competitors', Component: Competitors },
  { n: '05', title: 'Insight', Component: Insight },
  { n: '06', title: 'Solution', Component: Solution },
  { n: '07', title: 'Distribution', Component: Distribution },
  { n: '08', title: 'Adapting to user feedback', Component: Feedback },
  { n: '09', title: 'Challenges & trade-offs', Component: Challenges },
  { n: '10', title: 'Risks', Component: Risks },
]

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

function ChevronGlyph({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 text-ink-tertiary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 7.5 10 13l5-5.5" />
    </svg>
  )
}

function DeepDiveRow({ entry, isOpen, onToggle }: { entry: Entry; isOpen: boolean; onToggle: () => void }) {
  const reduced = useReducedMotion()
  const panelId = useId()
  const buttonId = useId()
  const { Component } = entry

  return (
    <div className="border-t border-border last:border-b">
      <h3 className="m-0">
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-md py-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <span className="flex items-baseline gap-sm">
            <span className="font-mono text-xs tabular-nums text-ink-tertiary">{entry.n}</span>
            <span className="text-lg font-bold tracking-tight text-ink">{entry.title}</span>
          </span>
          <ChevronGlyph open={isOpen} />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            key="panel"
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0.15 : 0.32, ease: EASE_BASE }}
            className="overflow-hidden"
          >
            <div className="pb-lg">
              <Component />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function DeepDive() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const headerReveal = useReveal()
  const listReveal = useReveal(0.05)

  return (
    <section id="deep-dive" aria-labelledby="deep-dive-heading" className="border-t border-border py-2xl md:py-huge">
      <div className="mx-auto max-w-page px-md md:px-lg">
        <motion.div {...headerReveal}>
          <h2 id="deep-dive-heading" className="text-2xl font-extrabold tracking-tight text-ink">
            Deep Dive
          </h2>
          <p className="mt-md max-w-prose text-lg leading-relaxed text-ink-secondary">
            The full five-month story, if you want it. Same content as always, just closed by
            default — open any section below to read it.
          </p>
        </motion.div>

        <motion.div {...listReveal} className="mt-xl">
          {ENTRIES.map((entry, i) => (
            <DeepDiveRow
              key={entry.n}
              entry={entry}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex((current) => (current === i ? null : i))}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
