import { useEffect, useId, useState, useSyncExternalStore } from 'react'
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { motion, useReducedMotion, useSpring } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { submitToWaitlist } from '../lib/waitlist'

/**
 * 12 / WAITLISTCTA
 *
 * One component, two mounts: `variant="section"` immediately after Solution
 * (where reader intent peaks, before the honest disclosure sections), and
 * `variant="inline"` inside the Footer for readers who scrolled the whole
 * way. Never in the Hero — this is a case-study-first page, not a launch
 * page.
 *
 * Submission status lives in a tiny module-level store rather than React
 * context, so both mounts resolve together without any provider wiring:
 * a page that asks twice after someone has already handed over an address
 * would look careless. No social proof, no counters, no confetti — the ask
 * is stated once, plainly, and the page moves on.
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

/**
 * Restrained tilt/magnetic hover for the submit button — pointer-fine devices
 * only (feature-detected via matchMedia, never a touch heuristic) and never
 * under reduced motion. Rotation is capped at a few degrees and settles on
 * the brand's signature spring (damping 30 / stiffness 220 — "settles, never
 * bounces"), the same law that governs every other motion moment in Clearing.
 */
function useMagneticTilt() {
  const reduced = useReducedMotion()
  const [pointerFine, setPointerFine] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia('(pointer: fine)')
    setPointerFine(query.matches)
    const onChange = (e: MediaQueryListEvent) => setPointerFine(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const active = pointerFine && !reduced
  const settle = { damping: 30, stiffness: 220 }
  const rotateX = useSpring(0, settle)
  const rotateY = useSpring(0, settle)
  const translateX = useSpring(0, settle)
  const translateY = useSpring(0, settle)

  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!active) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    rotateY.set(px * 6)
    rotateX.set(py * -6)
    translateX.set(px * 3)
    translateY.set(py * 3)
  }

  function onPointerLeave() {
    rotateX.set(0)
    rotateY.set(0)
    translateX.set(0)
    translateY.set(0)
  }

  return {
    onPointerMove,
    onPointerLeave,
    style: active
      ? { rotateX, rotateY, x: translateX, y: translateY, transformPerspective: 600 }
      : undefined,
  }
}

/* ---- shared submission store — both mounted instances read/write this ---- */

type Status = 'idle' | 'submitting' | 'success' | 'already' | 'error'
type StoreState = { status: Status; message: string | null }

let storeState: StoreState = { status: 'idle', message: null }
const listeners = new Set<() => void>()

function setStoreState(next: StoreState) {
  storeState = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return storeState
}

function useWaitlistState() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

async function submitEmail(email: string) {
  setStoreState({ status: 'submitting', message: null })
  try {
    const result = await submitToWaitlist(email)
    if (result.ok) {
      setStoreState({ status: 'success', message: null })
      return
    }
    if (result.code === 'duplicate') {
      setStoreState({ status: 'already', message: result.error })
      return
    }
    setStoreState({ status: 'error', message: result.error })
  } catch {
    setStoreState({ status: 'error', message: 'Something went wrong. Please try again.' })
  }
}

/* ---- decorative check glyph — line-art, no fill; the message text carries the meaning ---- */

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-5 w-5 shrink-0 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10.5 8 14.5 16 6" />
    </svg>
  )
}

type WaitlistCTAProps = {
  variant: 'section' | 'inline'
}

export default function WaitlistCTA({ variant }: WaitlistCTAProps) {
  const reduced = useReducedMotion()
  const reveal = useReveal()
  const revealLede = useReveal(0.07)
  const revealForm = useReveal(0.14)
  const tilt = useMagneticTilt()
  const state = useWaitlistState()
  const [email, setEmail] = useState('')
  const inputId = useId()
  const errorId = useId()

  const isDone = state.status === 'success' || state.status === 'already'
  const isSubmitting = state.status === 'submitting'

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isSubmitting) return
    await submitEmail(email)
  }

  // Radius bumped from the site-wide rounded-md to rounded-lg for this form
  // only — a deliberate, documented exception (not a second radius system):
  // the form is the one place on the page asking for a personal action, and
  // a slightly softer corner reads friendlier without touching color, type,
  // or the accent hue. Every other rounded-md surface on the page is
  // untouched. Touch targets sized to at least 44px on both variants, not
  // just the primary section CTA, so the footer's inline mount is just as
  // easy to tap.
  const inputClassName =
    variant === 'section'
      ? 'min-h-[48px] flex-1 rounded-lg border border-border bg-surface-sunken px-md py-md text-lg text-ink placeholder:text-ink-tertiary focus:border-border-strong focus:outline focus:outline-2 focus:outline-accent focus:outline-offset-2'
      : 'min-h-[44px] flex-1 rounded-lg border border-border bg-surface px-md py-sm text-md text-ink placeholder:text-ink-tertiary focus:border-border-strong focus:outline focus:outline-2 focus:outline-accent focus:outline-offset-2'

  const buttonClassName =
    variant === 'section'
      ? 'min-h-[48px] w-full shrink-0 rounded-lg bg-accent px-lg py-md text-md font-bold text-surface disabled:opacity-60 sm:w-auto'
      : 'min-h-[44px] w-full shrink-0 rounded-lg bg-accent px-md py-sm text-md font-bold text-surface disabled:opacity-60 sm:w-auto'

  const errorText =
    state.status === 'error' ? (
      <p id={errorId} aria-live="assertive" className="mt-xs text-md text-over">
        {state.message}
      </p>
    ) : null

  const form = (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-sm">
      <div className="flex flex-col gap-xs sm:flex-row sm:items-end sm:gap-sm">
        <div className="flex-1">
          <label htmlFor={inputId} className="mb-xxs block text-sm font-bold text-ink-secondary">
            Email address
          </label>
          <input
            id={inputId}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            aria-invalid={state.status === 'error'}
            aria-describedby={state.status === 'error' ? errorId : undefined}
            className={`${inputClassName} w-full`}
          />
        </div>
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileTap={!reduced && !isSubmitting ? { scale: 0.97 } : undefined}
          transition={{ duration: 0.18 }}
          onPointerMove={tilt.onPointerMove}
          onPointerLeave={tilt.onPointerLeave}
          style={tilt.style}
          className={buttonClassName}
        >
          {isSubmitting ? 'Sending…' : 'Get notified when it ships'}
        </motion.button>
      </div>
    </form>
  )

  const doneMessage =
    state.status === 'already'
      ? 'You’re already on the list. One email, when it ships.'
      : 'You’re on the list. One email, when it ships.'

  const doneBlock = (
    <motion.p
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0.18 } : { type: 'spring', damping: 30, stiffness: 220 }}
      aria-live="polite"
      className="flex items-center gap-sm text-lg text-accent"
    >
      <CheckGlyph />
      {doneMessage}
    </motion.p>
  )

  if (variant === 'inline') {
    return (
      <div>
        <p className="mb-sm text-xs font-mono uppercase tracking-widest text-ink-tertiary">
          Get notified
        </p>
        {isDone ? doneBlock : form}
        {errorText}
      </div>
    )
  }

  return (
    <section
      id="waitlist"
      className="border-t border-b border-border bg-surface py-2xl md:py-huge"
    >
      <motion.div {...reveal} className="mx-auto max-w-narrow px-md text-center md:px-lg">
        <h2 className="text-xl font-bold tracking-tight text-ink md:text-2xl">
          There&rsquo;s nothing to download yet.
        </h2>
        <motion.p {...revealLede} className="mt-md text-lg leading-relaxed text-ink-secondary">
          TestFlight is the next real step. One email when it&rsquo;s actually shippable,
          nothing before that.
        </motion.p>

        <motion.div {...revealForm} className="mt-xl text-left">
          {isDone ? doneBlock : form}
          {errorText}
        </motion.div>

        <p className="mt-md text-sm text-ink-secondary">
          One email. No newsletter, no launch countdown, no sharing your address.
        </p>
      </motion.div>
    </section>
  )
}
