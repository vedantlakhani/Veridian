import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, useInView, useReducedMotion, useSpring } from 'framer-motion';

/**
 * Solution — 06 / SOLUTION
 *
 * Content sourced verbatim from docs/WEBSITE_STRUCTURE.md ("Solution" section).
 * Three signal layers, one entry-anatomy demonstration (before/after a receipt
 * upgrade), the confirm loop, the Clearing token strip, and Carbon Passport.
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

/**
 * Mirrors the shipped Illustration wrapper formula documented in
 * docs/DESIGN_REQUIREMENTS.md §7: background tint shape = 86% of the
 * artboard, offset 7% down-right ("light falling behind the object");
 * the glyph itself renders at 50% of the artboard, centered.
 */
function Glyph({
  size,
  tintClassName,
  children,
}: {
  size: number;
  tintClassName: string;
  children: ReactNode;
}) {
  const shapeSize = size * 0.86;
  const offset = size * 0.07;
  const glyphSize = size * 0.5;
  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className={`absolute rounded-sm ${tintClassName}`}
        style={{ width: shapeSize, height: shapeSize, left: offset, top: offset }}
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute text-ink"
        style={{
          width: glyphSize,
          height: glyphSize,
          left: (size - glyphSize) / 2,
          top: (size - glyphSize) / 2,
        }}
      >
        {children}
      </svg>
    </span>
  );
}

function IconMovement() {
  return <path d="M2 12h3l2-6 3 12 3-9 2 3h6" />;
}

function IconMoney() {
  return (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="5" y1="16" x2="9" y2="16" />
    </>
  );
}

function IconReceipt() {
  return (
    <>
      <path d="M5 2h14v20l-2-1.5L15 22l-2-1.5L11 22l-2-1.5L7 22l-2-1.5V2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="13" y2="15" />
    </>
  );
}

function IconCart() {
  return (
    <>
      <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <path d="M2 3h3l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H6" />
    </>
  );
}

function IconConfirm() {
  return <path d="M5 12.5l4.5 4.5L19 7" />;
}

const layers = [
  {
    title: 'Movement',
    body: "iOS's CMMotionActivityManager pulls up to seven days of walk/run/cycle/drive segments the phone's coprocessor already logged, at effectively zero battery cost and with no location permission needed. Android uses the Activity Recognition Transition API.",
    footer:
      'CMMotionActivityManager · Activity Recognition Transition API · up to 7 days · no GPS · no location permission',
    icon: <IconMovement />,
  },
  {
    title: 'Money',
    body: "A linked bank account (Plaid), run through the EPA's free public USEEIO emission-factor dataset, so spend on groceries, fuel, and shopping shows up automatically, labeled honestly as an estimate.",
    footer: 'Plaid · EPA USEEIO emission factors · labeled as estimate',
    icon: <IconMoney />,
  },
  {
    title: 'Receipts',
    body: 'A forwarding address and a share-sheet extension let a forwarded receipt upgrade a coarse spend-based estimate to line-item precision, parsed by Claude Haiku vision.',
    footer: 'Forwarding address · share-sheet extension · Claude Haiku vision',
    icon: <IconReceipt />,
  },
];

/**
 * The three signal layers as one horizontal sequence, feeding one Confirm
 * node — the mechanic Beat 3 describes in prose, shown here first. One
 * node lights up (accent fill) in turn; the loop settles on Confirm, then
 * repeats. Runs only while in view, and only when motion isn't reduced —
 * reduced motion renders the loop's resting frame (Confirm lit) statically.
 */
const flowNodes: Array<{ key: string; label: string; icon: ReactNode }> = [
  { key: 'movement', label: 'Movement', icon: <IconMovement /> },
  { key: 'money', label: 'Money', icon: <IconMoney /> },
  { key: 'receipts', label: 'Receipts', icon: <IconReceipt /> },
  { key: 'confirm', label: 'Confirm', icon: <IconConfirm /> },
];

function NodeFlow() {
  const prefersReducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, { margin: '-20% 0px' });
  const [active, setActive] = useState(prefersReducedMotion ? 3 : 0);

  useEffect(() => {
    if (prefersReducedMotion || !inView) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % flowNodes.length);
    }, 1250);
    return () => window.clearInterval(id);
  }, [inView, prefersReducedMotion]);

  return (
    <div ref={wrapRef} className="rounded-xl border border-border bg-surface-sunken p-lg">
      <div className="flex flex-col items-center gap-sm sm:flex-row sm:gap-0">
        {flowNodes.map((node, i) => {
          const isActive = active === i;
          const isConfirm = node.key === 'confirm';
          const colors = {
            backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
            borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
            color: isActive ? 'var(--color-canvas)' : 'var(--color-ink-secondary)',
          };
          const transition = prefersReducedMotion
            ? { duration: 0 }
            : {
                backgroundColor: { duration: 0.32, ease: EASE_BASE },
                borderColor: { duration: 0.32, ease: EASE_BASE },
                color: { duration: 0.32, ease: EASE_BASE },
                scale: { type: 'spring' as const, damping: 30, stiffness: 220 },
              };
          return (
            <Fragment key={node.key}>
              <div className={isConfirm ? 'flex shrink-0 flex-col items-center gap-xs' : 'contents'}>
                <motion.div
                  className={
                    isConfirm
                      ? 'flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full border'
                      : 'flex shrink-0 items-center gap-sm rounded-full border px-md py-sm'
                  }
                  initial={false}
                  animate={{ ...colors, scale: isActive && !prefersReducedMotion ? 1.06 : 1 }}
                  transition={transition}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-[18px] w-[18px] shrink-0"
                    aria-hidden="true"
                  >
                    {node.icon}
                  </svg>
                  {!isConfirm && (
                    <span className="whitespace-nowrap font-mono text-xs uppercase tracking-widest">
                      {node.label}
                    </span>
                  )}
                </motion.div>
                {isConfirm && (
                  <span className="font-mono text-xs uppercase tracking-widest text-ink-tertiary">
                    {node.label}
                  </span>
                )}
              </div>
              {i < flowNodes.length - 1 && (
                <span
                  className="h-md w-px bg-border sm:mx-sm sm:h-px sm:w-auto sm:flex-1"
                  aria-hidden="true"
                />
              )}
            </Fragment>
          );
        })}
      </div>
      <span className="sr-only">
        Diagram: three signal layers — Movement, Money, and Receipts — feed into one Confirm
        step, shown as a horizontal sequence where each step lights up in turn before settling
        on Confirm.
      </span>
    </div>
  );
}

const annotations: Array<[string, string, string]> = [
  ['SOURCE', 'PLAID', 'Where this entry came from.'],
  ['CONFIDENCE', '62%', 'How sure the estimate is.'],
  ['STATUS', 'NEEDS CONFIRM', 'Whether it has been reviewed yet.'],
];

const swatches: Array<{ name: string; bg: string }> = [
  { name: 'accent', bg: 'bg-accent' },
  { name: 'accentSecondary', bg: 'bg-accent-secondary' },
  { name: 'calm', bg: 'bg-calm' },
  { name: 'watch', bg: 'bg-watch' },
  { name: 'over', bg: 'bg-over' },
  { name: 'food', bg: 'bg-food' },
  { name: 'transport', bg: 'bg-transport' },
  { name: 'energy', bg: 'bg-energy' },
  { name: 'shopping', bg: 'bg-shopping' },
];

export default function Solution() {
  const prefersReducedMotion = useReducedMotion();
  const upgradeRef = useRef<HTMLDivElement>(null);
  const upgradeInView = useInView(upgradeRef, { once: true, margin: '-10% 0px' });
  const spring = useSpring(4.2, { damping: 30, stiffness: 220 });
  const [displayValue, setDisplayValue] = useState('4.20');

  useEffect(() => {
    if (!upgradeInView || prefersReducedMotion) return;
    spring.set(4.36);
  }, [upgradeInView, prefersReducedMotion, spring]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => setDisplayValue(latest.toFixed(2)));
    return unsubscribe;
  }, [spring]);

  return (
    <section id="solution" className="border-t border-border">
      <div className="mx-auto max-w-page px-md py-2xl md:px-lg md:py-huge">
        <p className="mb-md text-xs font-mono uppercase tracking-widest text-ink-tertiary tabular-nums">
          06 / SOLUTION
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-ink">Solution</h2>
        <Reveal>
          <p className="mt-lg max-w-prose text-xl leading-relaxed text-ink">
            Veridian's mechanic today is three signal layers feeding one confirm loop, instead
            of one manual form.
          </p>
        </Reveal>

        {/* Beat 1 — the three signal layers. */}
        <div className="mt-2xl grid grid-cols-1 gap-lg lg:grid-cols-3">
          {layers.map((layer, i) => (
            <Reveal key={layer.title} delay={i * 0.05}>
              <div className="h-full rounded-xl border border-border bg-surface p-lg">
                <Glyph size={48} tintClassName="bg-accent/10">
                  {layer.icon}
                </Glyph>
                <h3 className="mt-md text-xl font-bold tracking-tight text-ink">
                  {layer.title}
                </h3>
                <p className="mt-sm text-lg text-ink-secondary">{layer.body}</p>
                <p className="mt-sm border-t border-border pt-sm font-mono text-xs text-ink-secondary">
                  {layer.footer}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15}>
          <p className="mt-lg text-center text-lg text-ink">
            Neither platform runs continuous GPS.
          </p>
        </Reveal>

        {/* Beat 1.5 — the node-flow diagram: the same three layers, shown as one mechanic. */}
        <Reveal delay={0.2} className="mt-xl">
          <NodeFlow />
        </Reveal>

        {/* Beat 2 — the entry anatomy: before (estimate) and after (receipt upgrade). */}
        <Reveal delay={0.05} className="mt-2xl">
          <div className="mx-auto max-w-page rounded-xl border border-border bg-surface p-xl">
            {/* Row 1 — spend-based estimate, pre-upgrade. */}
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-md">
              <Glyph size={24} tintClassName="bg-shopping/10">
                <IconCart />
              </Glyph>
              <p className="text-md text-ink">Groceries · Whole Foods</p>
              <p className="font-mono text-md tabular-nums text-estimated">~4.2 kg</p>
            </div>

            {/* Annotations at lg+: leader lines pointing at the row's three parts. */}
            <div className="mt-md hidden grid-cols-3 gap-lg border-t border-border pt-md lg:grid">
              {annotations.map(([label, value, desc]) => (
                <div key={label} className="flex flex-col items-start">
                  <svg viewBox="0 0 2 16" className="h-md w-auto" aria-hidden="true">
                    <line
                      x1="1"
                      y1="0"
                      x2="1"
                      y2="16"
                      stroke="var(--color-border-strong)"
                      strokeWidth="1"
                    />
                  </svg>
                  <p className="mt-xs text-xs font-mono uppercase tracking-widest text-ink-secondary">
                    {label} · <span className="tabular-nums">{value}</span>
                  </p>
                  <p className="text-md text-ink-secondary">{desc}</p>
                </div>
              ))}
            </div>

            {/* Plain stacked legend below lg — same content, no leader lines. */}
            <div className="mt-md space-y-sm border-t border-border pt-md lg:hidden">
              {annotations.map(([label, value, desc]) => (
                <p key={label} className="text-md text-ink-secondary">
                  <span className="font-mono text-xs uppercase tracking-widest text-ink-secondary">
                    {label} · <span className="tabular-nums">{value}</span>
                  </span>{' '}
                  — {desc}
                </p>
              ))}
            </div>

            {/* Row 2 — after a forwarded receipt upgrades the estimate to precision. */}
            <div className="mt-lg border-t border-border pt-lg">
              {prefersReducedMotion ? (
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-md">
                  <Glyph size={24} tintClassName="bg-shopping/10">
                    <IconCart />
                  </Glyph>
                  <div>
                    <p className="text-md text-ink">Groceries · Whole Foods</p>
                    <p className="text-xs text-ink-secondary">
                      RECEIPT · CONFIRMED{' '}
                      <span className="ml-sm rounded-full bg-accent-soft px-sm py-xxs text-xs font-bold uppercase tracking-widest text-accent">
                        UPGRADED
                      </span>
                    </p>
                  </div>
                  <p className="font-mono text-md tabular-nums text-ink">4.36 kg</p>
                </div>
              ) : (
                <div ref={upgradeRef} className="grid grid-cols-[auto_1fr_auto] items-center gap-md">
                  <Glyph size={24} tintClassName="bg-shopping/10">
                    <IconCart />
                  </Glyph>
                  <div>
                    <p className="text-md text-ink">Groceries · Whole Foods</p>
                    <p className="text-xs text-ink-secondary">RECEIPT · CONFIRMED</p>
                  </div>
                  <motion.p
                    className="font-mono text-md tabular-nums"
                    initial={{ color: 'var(--color-estimated)' }}
                    animate={upgradeInView ? { color: 'var(--color-ink)' } : {}}
                    transition={{ duration: 0.28, ease: EASE_BASE }}
                  >
                    {displayValue} kg
                  </motion.p>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* Beat 3 — the confirm loop. */}
        <div className="mx-auto mt-2xl max-w-prose">
          <Reveal>
            <p className="text-xl leading-relaxed text-ink">
              High-confidence events commit silently. Ambiguous ones queue into one batched
              daily review.
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-md text-2xl font-bold tabular-nums text-ink">
              3 things to confirm · 10 seconds
            </p>
            <p className="mt-xs text-md text-ink-tertiary">
              The exact mechanic Copilot Money uses for transactions, ported to carbon.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-md text-lg text-ink-secondary">
              Corrections train a per-user prior, so the app gets quieter every week instead of
              noisier.
            </p>
          </Reveal>
        </div>

        {/* Beat 4 — Clearing, demonstrated rather than described. */}
        <div className="mx-auto mt-2xl max-w-prose">
          <Reveal>
            <p className="text-lg text-ink-secondary">
              Visually, the product ships under a direction I call{' '}
              <span className="font-bold text-ink">Clearing</span> — light, precise, low-chroma
              deep evergreen instead of eco-green, tabular figures on every number, a custom
              line-illustration set instead of emoji, and full-bleed photography reserved only
              for emotional moments (the Passport, the weekly Recap), never as everyday chrome.
            </p>
          </Reveal>
          <Reveal delay={0.05} className="mt-lg grid grid-cols-4 gap-sm md:grid-cols-8">
            {swatches.map((swatch) => (
              <div key={swatch.name}>
                <div className={`h-2xl rounded-sm ${swatch.bg}`} aria-hidden="true" />
                <p className="mt-xs font-mono text-xs tabular-nums text-ink-secondary">
                  {swatch.name}
                </p>
              </div>
            ))}
          </Reveal>
        </div>

        {/* Beat 5 — Carbon Passport. */}
        <Reveal className="mx-auto mt-2xl max-w-prose">
          <p className="text-lg text-ink-secondary">
            The growth artifact is a Carbon Passport — a monthly, automatically generated,
            shareable story of your footprint. It's modeled directly on Flighty's Digital
            Passport. Its founder cites the Digital Passport as one of Flighty's top-three
            organic growth drivers.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
