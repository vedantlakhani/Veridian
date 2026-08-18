import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, useInView, useReducedMotion, useSpring } from 'framer-motion';

/**
 * Insight — 05 / INSIGHT
 *
 * The hinge of the page. Content sourced verbatim from docs/WEBSITE_STRUCTURE.md
 * ("Insight" section). The one true diagram on the page (a Venn-style overlap)
 * plus two count-up survey stats live here.
 */

const EASE_BASE: [number, number, number, number] = [0.2, 0, 0, 1];

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.28, ease: EASE_BASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Counts up 0 → value with the product's signature "numbers settle, never bounce" spring. */
function StatCountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const spring = useSpring(0, { damping: 30, stiffness: 220 });
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion) {
      setDisplay(format(value));
      return;
    }
    spring.set(value);
  }, [inView, prefersReducedMotion, value, spring, format]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => setDisplay(format(latest)));
    return unsubscribe;
  }, [spring, format]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

const percentFormat = (n: number) => `${Math.round(n)}%`;

export default function Insight() {
  const prefersReducedMotion = useReducedMotion();
  const diagramWrapRef = useRef<HTMLDivElement>(null);
  const diagramInView = useInView(diagramWrapRef, { once: true, margin: '-10% 0px' });

  // Diagram geometry, in viewBox units. Two equal circles, deliberately far
  // enough apart that the overlap reads as a small sliver, not a near-union.
  const R = 140;
  const C1X = 260;
  const C2X = 460;
  const CY = 190;
  const SLIDE_OFFSET = 10;

  return (
    <section id="insight" className="border-t border-b border-border bg-surface-sunken">
      <div className="h-2xl" aria-hidden="true" />
      <div className="mx-auto max-w-page px-md py-2xl md:px-lg md:py-huge">
        <div className="mx-auto max-w-prose">
          <p className="mb-sm text-xs font-mono uppercase tracking-widest text-ink-tertiary tabular-nums">
            05 / INSIGHT
          </p>

          {/* Beat 1 — the finding, as a display statement (also this section's h2). */}
          <Reveal>
            <h2 className="max-w-[24ch] text-2xl font-extrabold leading-tight tracking-tight text-ink md:text-display">
              Climate-motivated and pays-for-subscriptions are two different populations.
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-md text-xl leading-relaxed text-ink-secondary">
              The overlap is a narrow intersection, not their union.
            </p>
          </Reveal>
        </div>

        {/* Beat 2 — the intersection diagram, the page's one true diagram. */}
        <Reveal delay={0.1} className="mt-2xl">
          <div ref={diagramWrapRef} className="mx-auto max-w-page">
            <svg
              viewBox="0 0 720 380"
              className="h-auto w-full"
              role="img"
              aria-labelledby="insight-diagram-title"
            >
              <title id="insight-diagram-title">
                Two overlapping circles: one labeled climate-motivated, one labeled pays for
                subscriptions. The small shaded overlap between them is labeled the actual
                market.
              </title>

              <motion.circle
                cy={CY}
                r={R}
                fill="none"
                stroke="var(--color-border-strong)"
                strokeWidth={1.8}
                initial={{ cx: prefersReducedMotion ? C1X : C1X - SLIDE_OFFSET }}
                animate={diagramInView ? { cx: C1X } : {}}
                transition={{ duration: 0.28, ease: EASE_BASE }}
              />
              <motion.circle
                cy={CY}
                r={R}
                fill="none"
                stroke="var(--color-border-strong)"
                strokeWidth={1.8}
                initial={{ cx: prefersReducedMotion ? C2X : C2X + SLIDE_OFFSET }}
                animate={diagramInView ? { cx: C2X } : {}}
                transition={{ duration: 0.28, ease: EASE_BASE }}
              />

              <motion.g
                initial={{ opacity: 0 }}
                animate={diagramInView ? { opacity: 1 } : {}}
                transition={{
                  duration: 0.18,
                  delay: prefersReducedMotion ? 0 : 0.28,
                }}
              >
                <path
                  d={`M ${(C1X + C2X) / 2} 92 A ${R} ${R} 0 0 1 ${(C1X + C2X) / 2} 288 A ${R} ${R} 0 0 1 ${(C1X + C2X) / 2} 92 Z`}
                  fill="var(--color-accent-soft)"
                  stroke="var(--color-accent)"
                  strokeWidth={1.2}
                />
                <line
                  x1={(C1X + C2X) / 2}
                  y1={150}
                  x2={560}
                  y2={64}
                  stroke="var(--color-border-strong)"
                  strokeWidth={1}
                />
                <text
                  x={566}
                  y={60}
                  className="fill-accent text-xs font-mono uppercase tracking-widest"
                >
                  THE ACTUAL MARKET
                </text>
              </motion.g>

              <text
                x={C1X}
                y={344}
                textAnchor="middle"
                className="fill-ink-secondary text-xs font-mono uppercase tracking-widest"
              >
                CLIMATE-MOTIVATED
              </text>
              <text
                x={C2X}
                y={344}
                textAnchor="middle"
                className="fill-ink-secondary text-xs font-mono uppercase tracking-widest"
              >
                PAYS FOR SUBSCRIPTIONS
              </text>
            </svg>
            <span className="sr-only">
              Two overlapping circles: one labeled climate-motivated, one labeled pays for
              subscriptions. The small shaded overlap between them is labeled the actual market.
            </span>
          </div>
        </Reveal>

        {/* Beat 3 — the two survey numbers, and their debunk. */}
        <div className="mx-auto mt-2xl max-w-prose">
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <Reveal className="py-md sm:pr-lg">
              <p className="text-2xl font-bold tracking-tight tabular-nums text-ink">
                <StatCountUp value={71} format={percentFormat} />
              </p>
              <p className="mt-xs text-lg text-ink-secondary">
                of Gen Z report being extremely worried about climate
              </p>
            </Reveal>
            <Reveal delay={0.05} className="py-md sm:pl-lg">
              <p className="text-2xl font-bold tracking-tight tabular-nums text-ink">
                <StatCountUp value={77} format={percentFormat} />
              </p>
              <p className="mt-xs text-lg text-ink-secondary">
                of Gen Z say they'd pay a sustainability premium
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="mt-md">
            <p className="text-lg text-ink">
              Both measure a one-time markup on a purchase already happening — a different
              decision than adding a permanent $10/month line item competing with Netflix,
              Spotify, Whoop, and Copilot for the same wallet.
            </p>
          </Reveal>
        </div>

        {/* Beat 4 — the natural experiment, as prose. */}
        <Reveal className="mx-auto mt-2xl max-w-prose">
          <p className="text-lg text-ink-secondary">
            The natural experiment is right there in the graveyard. The free, values-driven
            app — Earth Hero — has the best engagement of anything studied; the paid ones show
            price friction or stalled growth.
          </p>
        </Reveal>

        {/* Beat 5 — the second insight, closing the band. */}
        <div className="mx-auto mt-2xl max-w-prose">
          <Reveal>
            <blockquote className="mx-0 my-2xl border-t border-b border-border py-lg">
              <p className="max-w-[28ch] text-2xl font-bold leading-tight tracking-tight text-ink">
                The aesthetic that attracts climate-identity users is the aesthetic that repels
                the users who'd actually pay.
              </p>
            </blockquote>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="text-lg text-ink-secondary">
              Copilot and Flighty — the apps that already converted the Quiet Optimizer — are
              light, quiet, and precise; they sell craft, not conscience.
            </p>
          </Reveal>
        </div>
      </div>
      <div className="h-2xl" aria-hidden="true" />
    </section>
  );
}
