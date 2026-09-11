import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import type { Variants } from 'framer-motion'

/**
 * 11 / CASE STUDY
 *
 * The project, reframed explicitly as documented AI product-management
 * work — the seven-part structure (Problem, User, Solution, PM decisions,
 * Eval results, Outcomes, What I'd do differently) rather than a new set of
 * claims. Every fact here already exists elsewhere on the page or in the
 * repo; this section's job is to name the PM judgment behind it, not to
 * introduce new evidence.
 *
 * Placed after Risks and before the waitlist CTA rather than inserted
 * earlier in the narrative: it's a step back to say "here is what kind of
 * work this was," which only makes sense once the reader has already seen
 * the problem, the users, the solution, the trade-offs, and the open
 * questions it's now summarizing. Nothing above it is renumbered.
 *
 * Honesty note (do not remove): this project is solo, pre-launch, with no
 * outside users — Level 2 on the ladder "a build you can demo," not Level 3
 * "real users." No claim here says "in production," "serving N users,"
 * "managed a team," or "at scale," because none of those are true. The Eval
 * results heading states plainly that the harness is built and frozen but
 * has not produced a number yet — no placeholder numbers are invented.
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

function StatusChip({ tone, children }: { tone: 'accent' | 'neutral' | 'watch'; children: string }) {
  const toneClass =
    tone === 'accent'
      ? 'bg-accent-soft text-accent'
      : tone === 'watch'
        ? 'bg-watch/10 text-watch'
        : 'bg-surface-sunken text-ink-tertiary'
  return (
    <span
      className={`inline-block rounded-full px-sm py-xxs text-xs font-bold uppercase tracking-widest ${toneClass}`}
    >
      {children}
    </span>
  )
}

type PartProps = {
  index: string
  title: string
  children: React.ReactNode
}

function Part({ index, title, children }: PartProps) {
  const reveal = useReveal()
  return (
    <motion.div {...reveal} className="border-t border-border py-xl">
      <div className="mb-md flex flex-wrap items-baseline gap-x-sm gap-y-xxs">
        <span className="font-mono text-xs uppercase tracking-widest tabular-nums text-ink-tertiary">
          {index}
        </span>
        <h3 className="text-xl font-extrabold tracking-tight text-ink">{title}</h3>
      </div>
      <div className="max-w-prose space-y-md text-lg leading-relaxed text-ink-secondary">
        {children}
      </div>
    </motion.div>
  )
}

const GOLDEN_SLICES: Array<{ label: string; count: number }> = [
  { label: 'Happy path', count: 16 },
  { label: 'Hard-but-legitimate', count: 12 },
  { label: 'Confusion pair', count: 8 },
  { label: 'Adversarial', count: 4 },
]

export default function CaseStudy() {
  const headerReveal = useReveal()
  const introReveal = useReveal()
  const evalStripReveal = useReveal()
  const outcomesStripReveal = useReveal()

  return (
    <section id="case-study" className="border-t border-border py-2xl md:py-huge">
      <div className="mx-auto max-w-page px-md md:px-lg">
        <motion.div {...headerReveal}>
          <p className="mb-md text-xs font-mono uppercase tracking-widest tabular-nums text-ink-tertiary">
            11 / CASE STUDY
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">
            This Project, as a Case Study
          </h2>
        </motion.div>

        <motion.p {...introReveal} className="mt-lg max-w-prose text-xl leading-relaxed text-ink">
          Everything above this section is the product. This part is the same five months, told
          as the product-management work it actually was — the decisions, the evals, and what a
          fair reading of the outcome is.
        </motion.p>

        <Part index="01" title="Problem">
          <p>
            Every consumer carbon app fails the same way: a one-time onboarding number, generic
            advice, and a manual log competing with the user&rsquo;s own forgetfulness every day.
            I built into that failure mode myself before I saw it &mdash; the first version of
            this app was a Klima-style logger with streaks and badges, and it shipped and worked.
            The deeper problem underneath, that nobody opens an app to type &ldquo;drove 12
            km,&rdquo; only came into focus after a research pass months later.
          </p>
        </Part>

        <Part index="02" title="User">
          <p>
            The first version targeted a vague &ldquo;environmentally conscious 25&ndash;40 year
            old.&rdquo; Research replaced that with three differentiated personas and one explicit
            anti-persona &mdash; the Quiet Optimizer (primary, already pays for a quiet-autopilot
            app like Copilot Money or Whoop), the Systems Optimizer, the Committed Reducer, and the
            Offset Absolver, who I deliberately do not design for. That anti-persona is the harder
            call: it means turning away the segment most likely to be loud about the product, in
            favor of the one most likely to pay for it.
          </p>
        </Part>

        <Part index="03" title="Solution">
          <p>
            Three signal layers &mdash; phone-sensor movement, linked-bank spend, and forwarded
            receipts &mdash; feed one daily confirm loop instead of a manual form. The receipt
            layer is where the AI product work concentrates: Claude Haiku vision reads a forwarded
            or shared receipt image into structured line items, which then have to resolve through
            the app&rsquo;s real NAICS-factor mapping to produce a defensible emissions estimate,
            not just a plausible-looking one.
          </p>
        </Part>

        <Part index="04" title="PM decisions">
          <p>
            <span className="font-bold text-ink">What I cut, and why:</span> file upload,
            multi-bank writeback, and the food-photo &ldquo;Snap-a-Plate&rdquo; feature all stayed
            out of this phase. Snap-a-Plate specifically exists today only as a written spec
            (`docs/SNAP_A_PLATE_SPEC.md`), deliberately not built, because it re-uses the same
            receipt-parsing pattern and I wanted one AI ingestion pipeline proven before starting a
            second one.
          </p>
          <p>
            <span className="font-bold text-ink">The bigger cut:</span> sensors-only has to be a
            complete, ungated experience on its own, with bank-linking as a pure upgrade layer
            rather than a wall. That decision costs the product every spend-based insight for a
            user who never connects a bank &mdash; a real accuracy trade &mdash; in exchange for
            never forcing the highest-friction step of onboarding before anyone sees the app work.
          </p>
          <p>
            <span className="font-bold text-ink">The reversal I&rsquo;d call the real PM
            decision:</span> a full dark visual direction (&ldquo;Understory&rdquo;), built out
            completely, was reversed fifteen days after it shipped once research showed it was
            calibrated for the persona least likely to ever subscribe. I rejected four weeks of
            finished work rather than defend it, which is the harder version of the same judgment
            call as the cuts above.
          </p>
        </Part>

        <Part index="05" title="Eval results">
          <p>
            <span className="font-bold text-ink">Built, frozen, not yet run.</span> The
            receipt-parsing feature (Claude Haiku vision &rarr; structured line items) now has a
            40-case hand-written golden set at{' '}
            <code className="rounded-xs bg-surface-sunken px-xxs font-mono text-md">
              eval/receipt-parse/golden-v1.jsonl
            </code>
            , graded on exact/structured-field match and then resolved through the app&rsquo;s real
            production NAICS-factor logic &mdash; not a string-similarity stand-in.
          </p>
          <motion.div
            {...evalStripReveal}
            className="!mt-lg grid grid-cols-2 divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-y-0 sm:divide-x"
          >
            {GOLDEN_SLICES.map((slice) => (
              <div key={slice.label} className="py-md sm:px-md sm:py-sm">
                <p className="text-2xl font-extrabold tabular-nums tracking-tight text-ink">
                  <CountUp value={slice.count} />
                </p>
                <p className="mt-xxs text-md text-ink-secondary">{slice.label}</p>
              </div>
            ))}
          </motion.div>
          <p className="!mt-lg">
            The confusion-pair slice is named for a real ambiguity, not a generic category test:
            grocery versus restaurant/prepared-food, which drives the wrong emissions factor if the
            model misjudges it. The regression gate is defined before the first run &mdash;
            confusion-pair recall must never drop below its baseline once one exists.
          </p>
          <p className="flex flex-wrap items-center gap-sm">
            <StatusChip tone="watch">Blocked</StatusChip>
            <span>
              on Anthropic API credits. The harness is real and frozen; there are no eval numbers
              to report yet, and I&rsquo;m not going to invent placeholder ones to fill this
              section.
            </span>
          </p>
        </Part>

        <Part index="06" title="Outcomes">
          <p>
            The honest, Level-2 framing: a live, demo-able build with no outside users yet.{' '}
            What does exist is a real engineering-verification practice &mdash; 46/46 Jest suites
            passing and{' '}
            <code className="rounded-xs bg-surface-sunken px-xxs font-mono text-md">tsc --noEmit</code>{' '}
            clean, checked at every commit, plus a repeated adversarial multi-agent review process
            used on both the app&rsquo;s manual-logging fixes and this website: parallel passes
            checking design-system compliance and content fidelity, with confirmed findings fixed
            and false positives discarded.
          </p>
          <motion.div
            {...outcomesStripReveal}
            className="!mt-lg grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-y-0 sm:divide-x"
          >
            <div className="py-sm sm:py-0 sm:pr-lg">
              <p className="font-mono text-md text-ink-secondary">
                <span className="font-bold tabular-nums text-ink">
                  <CountUp value={46} />/46
                </span>{' '}
                Jest suites passing
              </p>
            </div>
            <div className="py-sm sm:py-0 sm:px-lg">
              <p className="font-mono text-md text-ink-secondary">
                <span className="font-bold tabular-nums text-ink">
                  <CountUp value={69} />/69
                </span>{' '}
                NAICS codes mapped, verified
              </p>
            </div>
            <div className="py-sm sm:py-0 sm:pl-lg">
              <p className="font-mono text-md text-ink-secondary">
                <code className="rounded-xs bg-surface px-xxs font-mono text-md text-ink">
                  tsc --noEmit
                </code>{' '}
                clean at every commit
              </p>
            </div>
          </motion.div>
          <p>
            Real bugs the adversarial review process actually caught, not hypothetical ones: an
            unhandled promise rejection in a notification-scheduling hook that surfaced as a
            persistent UI-blocking dev toast; a Tailwind v4 token-namespace collision where this
            project&rsquo;s own custom spacing tokens silently overrode Tailwind&rsquo;s built-in
            container-width utilities, collapsing a hero component to a few pixels, found via
            direct DOM inspection and fixed with explicitly namespaced tokens; and an initially
            incomplete NAICS mapping that a dedicated verification pass caught before it shipped.
          </p>
          <p>
            What this is not: not in production, not serving any number of users, nothing run at
            scale, and no team to have managed. Zero fabricated production or usage claims &mdash;
            that&rsquo;s the point of writing this section at all.
          </p>
        </Part>

        <Part index="07" title="What I'd do differently">
          <p>
            Ship the eval harness before I ran out of API credit to run it, not after &mdash; the
            harness itself took less time to design well than it will take to wait for the numbers
            it should already have.
          </p>
          <p>
            More broadly, both design reversals documented on this page (Understory, and the
            earlier Klima-clone-to-autopilot pivot) happened after the work was finished, not
            before. A cheaper version of the same research, run before four weeks of visual work
            rather than after it, would have reached the same conclusion for a fraction of the
            sunk cost &mdash; the instinct to act on the evidence was right; the timing of when I
            went looking for it was not.
          </p>
          <p>
            And the one I&rsquo;m not going to resolve here for the sake of a tidy ending: the
            hard-outcome monetization question (see Risks, above) is still open. A more honest
            version of this retrospective says that a subscription-only business model is the one
            major decision in this project I have not yet stress-tested against evidence the way I
            did the persona and the visual direction &mdash; and that it&rsquo;s next.
          </p>
        </Part>
      </div>
    </section>
  )
}
