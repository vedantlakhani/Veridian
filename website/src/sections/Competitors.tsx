import type { MouseEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, useSpring } from 'framer-motion';

/**
 * 04 / COMPETITORS
 *
 * Content sourced verbatim from docs/WEBSITE_STRUCTURE.md ("Competitors").
 * A two-panel argument: a graveyard, and against it, the set that actually
 * converts. Real <table> markup at md+, stacked definition blocks below md
 * (no horizontal-scrolling four-column table on a phone).
 *
 * Micro-interaction note: the brief asks for a restrained tilt/magnetic hover
 * on either the comparison rows or a stat callout. Tilting the actual <tr>
 * rows was tried in review and rejected — a perspective transform on a real
 * data row fights the table's own alignment and readability, which the brief
 * explicitly permits skipping. The two pulled-out stat callouts below the
 * tables are the better fit: they're standalone numeral moments, not dense
 * tabular data, and are named directly in the brief as a valid target.
 */

// ---------------------------------------------------------------------------
// Local helpers (self-contained per file, per build brief).
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

/**
 * Restrained pointer-tilt for the stat callouts (technique: tilt/magnetic
 * micro-interaction). Feature-detects a fine pointer so touch devices never
 * see it, respects prefers-reduced-motion, and springs back to flat with the
 * product's signature damping:30/stiffness:220 curve — settles, never
 * overshoots. Capped at a few degrees of rotation, never more.
 */
const TILT_MAX_DEG = 5;

function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  const [pointerFine, setPointerFine] = useState(false);
  const rotateX = useSpring(0, { damping: 30, stiffness: 220 });
  const rotateY = useSpring(0, { damping: 30, stiffness: 220 });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    setPointerFine(window.matchMedia('(pointer: fine)').matches);
  }, []);

  const enabled = pointerFine && !reduceMotion;

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!enabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * TILT_MAX_DEG * 2);
    rotateX.set(-py * TILT_MAX_DEG * 2);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}

function useCountUp(target: number, active: boolean, skipAnimation: boolean) {
  const spring = useSpring(skipAnimation ? target : 0, { damping: 30, stiffness: 220 });
  const [display, setDisplay] = useState(skipAnimation ? target : 0);

  useEffect(() => {
    if (skipAnimation) return;
    if (active) spring.set(target);
  }, [active, target, skipAnimation, spring]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (v) => setDisplay(v));
    return unsubscribe;
  }, [spring]);

  return skipAnimation ? target : display;
}

/** Numeral that settles via the 30/220 spring once it scrolls into view. */
function StatNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const display = useCountUp(value, inView, !!reduceMotion);
  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}

type Tone = 'over' | 'watch' | 'neutral';

function outcomeChipClass(tone: Tone) {
  switch (tone) {
    case 'over':
      return 'inline-flex items-center rounded-full bg-over/10 px-sm py-xxs text-xs font-bold uppercase tracking-widest text-over';
    case 'watch':
      return 'inline-flex items-center rounded-full bg-watch/10 px-sm py-xxs text-xs font-bold uppercase tracking-widest text-watch';
    case 'neutral':
    default:
      return 'inline-flex items-center rounded-full bg-surface-sunken px-sm py-xxs text-xs font-bold uppercase tracking-widest text-ink-secondary';
  }
}

const mutedChipClass =
  'inline-flex items-center rounded-full bg-surface-sunken px-sm py-xxs text-xs font-bold uppercase tracking-widest text-ink-tertiary';

// ---------------------------------------------------------------------------
// Data — every figure below is lifted directly from WEBSITE_STRUCTURE.md.
// ---------------------------------------------------------------------------
type GraveyardRow = {
  app: string;
  scale: string;
  outcome: { label: string; tone: Tone };
  proves: string;
};

const graveyard: GraveyardRow[] = [
  {
    app: 'Miles',
    scale: '9 yrs running · $20M raised',
    outcome: { label: 'SHUT DOWN', tone: 'over' },
    proves: 'The tech worked; the incentive did not.',
  },
  {
    app: 'Greenly (consumer)',
    scale: '20+ bank integrations · 100,000 users',
    outcome: { label: 'PIVOTED B2B', tone: 'neutral' },
    proves: 'Same tech, different buyer.',
  },
  {
    app: 'Aspiration',
    scale: '~35M trees claimed vs. ~12M actually planted',
    outcome: { label: 'BANKRUPT · GUILTY PLEA', tone: 'over' },
    proves: 'The cautionary tale for overclaiming impact.',
  },
  {
    app: 'Commons (Joro)',
    scale: '$13.9M raised · ~30 staff · $3.7M rev (2023)',
    outcome: { label: 'LIVE', tone: 'neutral' },
    proves: '350,000 Instagram followers is not the same population as paying users.',
  },
  {
    app: 'Earth Hero',
    scale: '120,000+ users · 4.9 across 392 reviews',
    outcome: { label: 'FREE, VOLUNTEER-RUN', tone: 'neutral' },
    proves: 'Best engagement in the category. Charges nothing.',
  },
  {
    app: 'Klima',
    scale: '$13–26/mo, scaled to footprint',
    outcome: { label: 'LIVE · PRICE RESISTANCE', tone: 'watch' },
    proves: 'Price resistance from people who had already downloaded a carbon app.',
  },
];

type ConverterRow = {
  app: string;
  price: string;
  scale: string;
  signal: string;
  ceiling?: boolean;
};

const converters: ConverterRow[] = [
  {
    app: 'Copilot Money',
    price: '$13/mo',
    scale: '1M+ downloads',
    signal: "~71K stable weekly actives, Apple Editor's Choice",
  },
  {
    app: 'Flighty',
    price: '$49/yr',
    scale: '—',
    signal: '~$500K/month revenue on a three-person team',
  },
  {
    app: 'Whoop',
    price: '$199–359/yr',
    scale: '—',
    signal: '—',
  },
  {
    app: 'Oura',
    price: '—',
    scale: '5.5M rings sold',
    signal: '2M paying subscribers',
  },
  {
    app: 'Strava',
    price: '—',
    scale: '180M registered users',
    signal: '~2% premium penetration',
    ceiling: true,
  },
  {
    app: 'Gentler Streak',
    price: '—',
    scale: '5,000–50,000+ subscribers',
    signal: '$1M revenue / $400K profit in two years, tiny team, 2024 ADA winner',
  },
];

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------
function GraveyardPanel() {
  return (
    <div>
      <div className="mb-md">
        <p className="mb-xxs text-xs font-mono uppercase tracking-widest text-ink-tertiary">
          The Graveyard
        </p>
        <p className="text-lg font-bold text-ink tabular-nums">6 apps</p>
        <p className="text-md text-ink-secondary">Shut down, abandoned, prosecuted, or free.</p>
      </div>

      {/* md+ : real table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-xs font-mono uppercase tracking-widest text-ink-tertiary">
              <th scope="col" className="pb-sm pr-md text-left font-mono font-normal">
                App
              </th>
              <th scope="col" className="pb-sm pr-md text-left font-mono font-normal">
                Scale
              </th>
              <th scope="col" className="pb-sm pr-md text-left font-mono font-normal">
                Outcome
              </th>
              <th scope="col" className="pb-sm text-left font-mono font-normal">
                What it proves
              </th>
            </tr>
          </thead>
          <tbody>
            {graveyard.map((row) => (
              <tr key={row.app} className="border-t border-border hover:bg-surface-sunken">
                <td className="py-md pr-md align-top text-lg font-bold text-ink">{row.app}</td>
                <td className="py-md pr-md align-top font-mono text-md tabular-nums text-ink-secondary">
                  {row.scale}
                </td>
                <td className="py-md pr-md align-top">
                  <span className={outcomeChipClass(row.outcome.tone)}>{row.outcome.label}</span>
                </td>
                <td className="py-md align-top text-md text-ink-secondary">{row.proves}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* below md : stacked definition blocks */}
      <div className="divide-y divide-border md:hidden">
        {graveyard.map((row) => (
          <div key={row.app} className="py-md">
            <div className="mb-xs flex items-center justify-between gap-sm">
              <p className="text-lg font-bold text-ink">{row.app}</p>
              <span className={outcomeChipClass(row.outcome.tone)}>{row.outcome.label}</span>
            </div>
            <dl className="grid grid-cols-[9ch_1fr] gap-x-sm gap-y-xs text-md">
              <dt className="pt-xxs font-mono text-xs uppercase tracking-widest text-ink-tertiary">
                Scale
              </dt>
              <dd className="font-mono tabular-nums text-ink-secondary">{row.scale}</dd>
              <dt className="pt-xxs font-mono text-xs uppercase tracking-widest text-ink-tertiary">
                Proves
              </dt>
              <dd className="text-ink-secondary">{row.proves}</dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConvertersPanel() {
  return (
    <div>
      <div className="mb-md">
        <p className="mb-xxs text-xs font-mono uppercase tracking-widest text-ink-tertiary">
          The Converters
        </p>
        <p className="text-lg font-bold text-ink tabular-nums">6 apps</p>
        <p className="text-md text-ink-secondary">Adjacent categories, paying subscribers.</p>
      </div>

      {/* md+ : real table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-xs font-mono uppercase tracking-widest text-ink-tertiary">
              <th scope="col" className="pb-sm pr-md text-left font-mono font-normal">
                App
              </th>
              <th scope="col" className="pb-sm pr-md text-left font-mono font-normal">
                Price
              </th>
              <th scope="col" className="pb-sm pr-md text-left font-mono font-normal">
                Scale
              </th>
              <th scope="col" className="pb-sm text-left font-mono font-normal">
                Signal
              </th>
            </tr>
          </thead>
          <tbody>
            {converters.map((row) => (
              <tr key={row.app} className="border-t border-border hover:bg-surface-sunken">
                <td className="py-md pr-md align-top text-lg font-bold text-ink">{row.app}</td>
                <td className="py-md pr-md align-top font-mono text-md tabular-nums text-ink-secondary">
                  {row.price}
                </td>
                <td className="py-md pr-md align-top font-mono text-md tabular-nums text-ink-secondary">
                  {row.scale}
                </td>
                <td className="py-md align-top text-md text-ink-secondary">
                  {row.signal}
                  {row.ceiling && (
                    <span className={`${mutedChipClass} ml-sm align-middle`}>Ceiling Case</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* below md : stacked definition blocks */}
      <div className="divide-y divide-border md:hidden">
        {converters.map((row) => (
          <div key={row.app} className="py-md">
            <div className="mb-xs flex items-center justify-between gap-sm">
              <p className="text-lg font-bold text-ink">{row.app}</p>
              <span className="font-mono text-md tabular-nums text-ink-secondary">
                {row.price}
              </span>
            </div>
            {row.ceiling && <span className={`${mutedChipClass} mb-xs inline-flex`}>Ceiling Case</span>}
            <dl className="grid grid-cols-[9ch_1fr] gap-x-sm gap-y-xs text-md">
              <dt className="pt-xxs font-mono text-xs uppercase tracking-widest text-ink-tertiary">
                Scale
              </dt>
              <dd className="font-mono tabular-nums text-ink-secondary">{row.scale}</dd>
              <dt className="pt-xxs font-mono text-xs uppercase tracking-widest text-ink-tertiary">
                Signal
              </dt>
              <dd className="text-ink-secondary">{row.signal}</dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Competitors() {
  return (
    <section
      id="competitors"
      aria-labelledby="competitors-heading"
      className="border-t border-border px-md py-2xl md:px-lg md:py-huge"
    >
      <div className="mx-auto max-w-wide">
        <Reveal>
          <p className="mb-md text-xs font-mono uppercase tracking-widest text-ink-tertiary tabular-nums">
            04 / COMPETITORS
          </p>
          <h2
            id="competitors-heading"
            className="mb-lg text-2xl font-extrabold tracking-tight text-ink"
          >
            Competitors
          </h2>
        </Reveal>

        <Reveal className="mb-2xl max-w-prose">
          <p className="mt-xs text-lg leading-relaxed text-ink-secondary">
            <span className="text-ink">
              I didn't do a casual "here are some other carbon apps" pass.
            </span>{' '}
            I ran an actual graveyard audit, because the failure pattern across this category is
            consistent enough to be a law.
          </p>
        </Reveal>

        <Reveal>
          <div className="xl:grid xl:grid-cols-2 xl:gap-xl xl:divide-x xl:divide-border">
            <div className="xl:pr-xl">
              <GraveyardPanel />
            </div>
            <p className="py-lg text-xl font-bold text-ink xl:hidden">Against that graveyard:</p>
            <div className="xl:pl-xl">
              <ConvertersPanel />
            </div>
          </div>
        </Reveal>

        {/* Stat callouts pulled out of the tables — the two elements carrying
            the restrained pointer-tilt micro-interaction (see note above). */}
        <div className="my-2xl grid grid-cols-1 gap-xl md:grid-cols-2">
          <Reveal>
            <TiltCard className="rounded-lg p-md -m-md">
              <p className="mb-sm text-display font-extrabold tracking-tight tabular-nums text-ink">
                <StatNumber value={2} format={(n) => `~${Math.round(n)}%`} />
              </p>
              <p className="max-w-prose text-lg text-ink-secondary">
                Strava's premium penetration across 180M registered users. The ceiling case.
              </p>
            </TiltCard>
          </Reveal>
          <Reveal delay={0.05}>
            <TiltCard className="rounded-lg p-md -m-md">
              <p className="mb-sm text-display font-extrabold tracking-tight tabular-nums text-ink">
                #1
              </p>
              <p className="max-w-prose text-lg text-ink-secondary">
                Where "good design" ranked in Flighty's own{' '}
                <StatNumber
                  value={1400}
                  format={(n) => Math.round(n).toLocaleString('en-US')}
                  className="font-bold tabular-nums text-ink"
                />
                -user survey.
              </p>
            </TiltCard>
          </Reveal>
        </div>

        {/* The Klima correction */}
        <Reveal>
          <div className="max-w-prose rounded-md bg-surface-sunken p-md">
            <p className="mb-xxs text-xs font-mono uppercase tracking-widest text-ink-tertiary">
              Correction
            </p>
            <p className="text-md text-ink-secondary">
              Klima was a 2021 Apple Design Award finalist, not a winner — a correction to an
              earlier assumption made earlier in this project's own research.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
