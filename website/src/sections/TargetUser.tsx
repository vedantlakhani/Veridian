import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * 03 / TARGET USER
 *
 * Content sourced verbatim from docs/WEBSITE_STRUCTURE.md ("Target User").
 * Hierarchy is the whole design here: the primary persona gets the section's
 * only container, the secondary/amplifier personas get an unboxed two-column
 * row, and the anti-persona is deliberately recessed (bg-surface-sunken,
 * lower-contrast heading, no border). No icons, no accent rails.
 */

// ---------------------------------------------------------------------------
// Local reveal primitive (self-contained per file, per build brief).
// One-shot fade+8px on inView, opacity-only under reduced motion.
// ---------------------------------------------------------------------------
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.28, ease: [0.2, 0, 0, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

const chipBase =
  'inline-flex items-center rounded-full px-sm py-xxs text-xs font-bold uppercase tracking-widest';

function Chip({ tone, children }: { tone: 'primary' | 'secondary' | 'amplifier' | 'excluded'; children: ReactNode }) {
  const tones: Record<typeof tone, string> = {
    primary: 'bg-accent-soft text-accent',
    secondary: 'bg-accent-secondary-soft text-accent-secondary',
    amplifier: 'bg-surface-sunken text-ink-secondary',
    excluded: 'bg-surface-sunken text-ink-tertiary',
  };
  return <span className={`${chipBase} ${tones[tone]}`}>{children}</span>;
}

type PersonaRow = { label: string; value: ReactNode };

const quietOptimizerRows: PersonaRow[] = [
  {
    label: 'AGE',
    value: <span className="text-ink tabular-nums">30–45</span>,
  },
  {
    label: 'ROLE',
    value: (
      <>
        <span className="text-ink">Senior IC or manager</span> — engineer, PM, physician, attorney
      </>
    ),
  },
  {
    label: 'HOUSEHOLD',
    value: <span className="text-ink tabular-nums">$100K–250K+</span>,
  },
  {
    label: 'ALREADY PAYS FOR',
    value: (
      <>
        <span className="text-ink">Copilot Money or YNAB</span>, plus one of Whoop / Oura / Strava
      </>
    ),
  },
  {
    label: 'MOTIVATED BY',
    value: (
      <>
        <span className="text-ink">Mastery over their own data</span>; the pleasure of a well-made
        tool
      </>
    ),
  },
  {
    label: 'CHURNS ON',
    value: (
      <>
        <span className="text-ink">A broken-trust moment</span> — a miscategorized transaction, a
        wrong trip mode — far faster than on price
      </>
    ),
  },
  {
    label: 'REPELLED BY',
    value: 'Leaf icons, saturated green, gamified badges, copy that moralizes',
  },
];

export default function TargetUser() {
  return (
    <section id="targetuser" aria-labelledby="targetuser-heading">
      {/* Organic divider — the one deliberate curve on the page, replacing the
          plain hairline at this one high-impact pivot (Problem → Target User).
          Single border-tone stroke, restrained amplitude; not repeated
          elsewhere in the build. */}
      <div aria-hidden="true" className="w-full overflow-hidden leading-[0] text-border-strong">
        <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="block h-6 w-full md:h-10">
          <path
            d="M0,32 C 240,58 480,6 720,32 C 960,58 1200,6 1440,32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="px-md py-2xl md:px-lg md:py-huge">
      <div className="mx-auto max-w-page">
        <Reveal>
          <p className="mb-md text-xs font-mono uppercase tracking-widest text-ink-tertiary tabular-nums">
            03 / TARGET USER
          </p>
          <h2
            id="targetuser-heading"
            className="mb-xl text-2xl font-extrabold tracking-tight text-ink"
          >
            Target User
          </h2>
        </Reveal>

        {/* Two-tone emphasis: the vague, superseded persona sits muted; the
            actual research finding — what replaced it — carries full weight. */}
        <Reveal className="mb-2xl max-w-prose">
          <p className="text-lg leading-relaxed">
            <span className="text-ink-tertiary">
              I built the first version for a vague "environmentally conscious 25–40 year old in
              an urban market."
            </span>{' '}
            <span className="font-extrabold text-ink">
              Research this summer replaced that with three real, differentiated personas
            </span>
            <span className="text-ink-secondary">, plus a persona I deliberately do not build for:</span>
          </p>
        </Reveal>

        {/* The Quiet Optimizer — primary, the section's only container */}
        <Reveal className="mb-2xl">
          <div className="rounded-xl border border-border bg-surface p-lg md:p-xl">
            <div className="mb-md flex flex-wrap items-center gap-sm">
              <Chip tone="primary">Primary</Chip>
              <h3 className="text-xl font-extrabold tracking-tight text-ink">The Quiet Optimizer</h3>
            </div>

            <dl className="grid grid-cols-1 gap-x-lg gap-y-sm md:grid-cols-[14ch_1fr]">
              {quietOptimizerRows.map((row, i) => (
                <div key={row.label} className="contents">
                  <dt
                    className={`text-xs font-mono uppercase tracking-widest text-ink-tertiary${
                      i > 0 ? ' md:border-t md:border-border md:pt-sm' : ''
                    }`}
                  >
                    {row.label}
                  </dt>
                  <dd
                    className={`text-lg text-ink-secondary${
                      i > 0 ? ' md:border-t md:border-border md:pt-sm' : ''
                    } pb-xs md:pb-0`}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-md border-t border-border pt-md">
              <p className="text-lg font-bold text-ink">
                They already pay for at least one quiet autopilot app in an adjacent domain.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Systems Optimizer + Committed Reducer — unboxed two-up */}
        <Reveal className="mb-2xl">
          <div className="grid gap-lg md:grid-cols-2 md:gap-xl">
            <div className="border-t border-border pt-md">
              <Chip tone="secondary">Secondary</Chip>
              <h3 className="mt-sm mb-xs text-lg font-bold text-ink">The Systems Optimizer</h3>
              <p className="text-lg text-ink-secondary">
                28–50, engineer or tech-adjacent, often has an EV or home solar, runs a personal
                budgeting spreadsheet for fun. Motivated by optimization and by money, not virtue
                — this is the person the still-unbuilt "hard outcome" hook (
                <a href="#risks" className="text-accent underline-offset-2 hover:underline">
                  see Risks
                </a>
                ) is actually for.
              </p>
            </div>
            <div className="border-t border-border pt-md">
              <Chip tone="amplifier">Amplifier</Chip>
              <h3 className="mt-sm mb-xs text-lg font-bold text-ink">The Committed Reducer</h3>
              <p className="text-lg text-ink-secondary">
                22–35, climate-identity-forward, highest guilt fatigue, fastest to fact-check a
                number and hardest to win back after a trust violation. Valuable for word of
                mouth. Not who pays.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Offset Absolver — recessed anti-persona */}
        <Reveal>
          <div className="mt-xl rounded-lg bg-surface-sunken p-lg">
            <Chip tone="excluded">Not Building For</Chip>
            <h3 className="mt-sm mb-xs text-lg font-bold text-ink-tertiary">
              The Offset Absolver
            </h3>
            <p className="max-w-prose text-md text-ink-secondary">
              Wants to pay for a clean conscience with minimal engagement — expects the app to
              declare them "carbon neutral" via purchased offsets. This is explicitly who I am{' '}
              <em className="not-italic text-ink">not</em> designing for, because it's also, not
              coincidentally, Klima's actual target user (
              <a href="#insight" className="text-accent underline-offset-2 hover:underline">
                see Insight
              </a>
              ).
            </p>
          </div>
        </Reveal>
      </div>
      </div>
    </section>
  );
}
