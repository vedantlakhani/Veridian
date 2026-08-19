import { motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'

/**
 * 09 / CHALLENGES & TRADE-OFFS
 *
 * The longest prose on the page. Chunked with a temporal rail (three items,
 * each a grid of [time marker][prose]) so a very long confession stays
 * scannable, and the one genuinely visual moment — the Understory reversal —
 * is converted into a change table rather than described a second time in
 * paragraph form. Styled with exactly the same dignity as Solution: no
 * smaller type, no greyer text, no collapsed accordion. Hiding this content
 * would be the opposite of what it's demonstrating.
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

const UNDERSTORY_CHANGES = [
  { axis: 'Surface', understory: 'Dark', clearing: 'Light' },
  { axis: 'Accent', understory: 'Moss green', clearing: 'Deep, low-chroma evergreen' },
  {
    axis: 'Display face',
    understory: 'Fraunces (literary serif)',
    clearing: 'System grotesque, no serif anywhere',
  },
  { axis: 'Reference product', understory: 'Klima', clearing: 'Copilot Money' },
]

function TimeMarker({ lines }: { lines: [string, string, string] }) {
  return (
    <p className="font-mono text-xs uppercase tracking-widest tabular-nums leading-relaxed text-ink-tertiary">
      {lines[0]}
      <br />
      {lines[1]}
      <br />
      {lines[2]}
    </p>
  )
}

export default function Challenges() {
  const headerReveal = useReveal()
  const item1Reveal = useReveal()
  const item2Reveal = useReveal()
  const item3Reveal = useReveal()

  return (
    <section id="challenges" className="border-t border-border py-2xl md:py-huge">
      <div className="mx-auto max-w-page px-md md:px-lg">
        <motion.div {...headerReveal}>
          <p className="mb-sm text-xs font-mono uppercase tracking-widest tabular-nums text-ink-tertiary">
            09 / CHALLENGES &amp; TRADE-OFFS
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Challenges &amp; Trade-offs</h2>
        </motion.div>

        {/* Item 1 — the eight-week silence */}
        <motion.div
          {...item1Reveal}
          className="mt-xl grid grid-cols-1 gap-x-xl gap-y-md border-t border-border py-xl lg:grid-cols-[16ch_1fr]"
        >
          <TimeMarker lines={['MAY 8 → JUL 2', '8 WEEKS', 'NO COMMITS']} />
          <p className="max-w-prose text-lg leading-relaxed text-ink-secondary">
            <span className="text-ink">
              Between May 8, when I shipped a &ldquo;premium UI overhaul&rdquo; I was reasonably
              happy with, and July 2, when I came back and gutted the light-mode decision,
              there&rsquo;s a gap in the commit log with nothing in it.
            </span>{' '}
            That&rsquo;s not a curated timeline &mdash; that&rsquo;s what actually happened. I
            don&rsquo;t think a gap like that is evidence against the project; it&rsquo;s evidence
            that I didn&rsquo;t force a decision I wasn&rsquo;t sure of just to keep a streak
            going, and that when I came back, I was honest enough with myself to redo work rather
            than defend it.
          </p>
        </motion.div>

        {/* Item 2 — the Understory reversal, shown as a change table, not swatches */}
        <motion.div
          {...item2Reveal}
          className="grid grid-cols-1 gap-x-xl gap-y-md border-t border-border py-xl lg:grid-cols-[16ch_1fr]"
        >
          <TimeMarker lines={['JULY 2026', '15 DAYS', 'FULL REVERSAL']} />
          <div>
            <p className="max-w-prose text-lg leading-relaxed text-ink-secondary">
              <span className="text-ink">
                In July I built out a complete dark visual direction &mdash; &ldquo;Understory&rdquo;:
                dark surfaces, a moss-green accent, a literary serif for hero numbers &mdash; all
                the way through a portfolio screenshot set.
              </span>{' '}
              Fifteen days later, a research pass told me plainly that the aesthetic I&rsquo;d
              just finished was calibrated for the persona least likely to ever subscribe, and
              that the actual reference product should have been Copilot Money, not Klima, from
              the start.
            </p>

            {/* Desktop/tablet: table. Breaks out to max-w-page. */}
            <div className="mt-lg hidden max-w-page overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-xs font-mono uppercase tracking-widest text-ink-tertiary">
                    <th className="w-1/4 pb-sm pr-md font-normal">Axis</th>
                    <th className="w-1/3 pb-sm pr-md font-normal">Understory</th>
                    <th className="pb-sm font-normal">Clearing</th>
                  </tr>
                </thead>
                <tbody>
                  {UNDERSTORY_CHANGES.map((row) => (
                    <tr key={row.axis} className="border-t border-border">
                      <td className="py-sm pr-md text-md text-ink-secondary">{row.axis}</td>
                      <td className="py-sm pr-md text-lg text-ink-secondary">{row.understory}</td>
                      <td className="py-sm text-lg font-bold text-ink">{row.clearing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked three-line groups, axis label then values with a → separator */}
            <div className="mt-lg space-y-md md:hidden">
              {UNDERSTORY_CHANGES.map((row) => (
                <div key={row.axis} className="border-t border-border pt-sm">
                  <p className="text-xs font-mono uppercase tracking-widest text-ink-tertiary">
                    {row.axis}
                  </p>
                  <p className="mt-xxs text-lg">
                    <span className="text-ink-secondary">{row.understory}</span>
                    <span className="mx-sm text-ink-tertiary" aria-hidden="true">
                      →
                    </span>
                    <span className="font-bold text-ink">{row.clearing}</span>
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-lg max-w-prose text-lg leading-relaxed text-ink-secondary">
              Fifteen days after finishing the direction, the research said it was calibrated for
              the persona least likely to subscribe.
            </p>

            <blockquote className="my-huge max-w-prose border-t border-b border-border py-lg text-2xl font-bold leading-tight tracking-tight text-ink">
              Evidence I can act on data against my own sunk cost.
            </blockquote>

            <p className="max-w-prose text-lg leading-relaxed text-ink-secondary">
              That reversal is the same instinct, at a different scale, as the eight-week gap: a
              harder skill than shipping fast in one direction.
            </p>
          </div>
        </motion.div>

        {/* Item 3 — the debugging sagas */}
        <motion.div
          {...item3Reveal}
          className="grid grid-cols-1 gap-x-xl gap-y-md border-t border-border py-xl lg:grid-cols-[16ch_1fr]"
        >
          <TimeMarker lines={['MAR 22', '8 COMMITS', 'ONE DAY']} />
          <div className="max-w-prose">
            <p className="text-lg leading-relaxed text-ink-secondary">
              <span className="text-ink">
                The AI insight layer took eight consecutive commits in a single day (March 22)
                chasing an{' '}
                <code className="rounded-xs bg-surface-sunken px-xxs font-mono text-md">
                  Invalid JWT
                </code>{' '}
                error through a Supabase Edge Function auth path &mdash; decoding the JWT locally
                instead of a network round-trip, fixing base64url decoding, fixing a
                header-override bug, before it actually held.
              </span>{' '}
              Separately, this week&rsquo;s rebuild found that the app&rsquo;s card component had
              a systemic accent-rail pattern rendering as a positioned{' '}
              <code className="rounded-xs bg-surface-sunken px-xxs font-mono text-md">View</code>{' '}
              rather than a{' '}
              <code className="rounded-xs bg-surface-sunken px-xxs font-mono text-md">border</code>{' '}
              property &mdash; invisible to both lint and a plain grep for the property name,
              because it wasn&rsquo;t using the property at all.
            </p>
            <p className="py-md text-xl text-ink">
              Neither of these is a flattering story in isolation. Together they&rsquo;re the more
              accurate picture of what building this actually looked like versus a highlight reel.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
