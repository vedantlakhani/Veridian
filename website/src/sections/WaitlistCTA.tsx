import { useId, useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
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
  const result = await submitToWaitlist(email)
  if (result.ok) {
    setStoreState({ status: 'success', message: null })
    return
  }
  if (result.error === "You're already on the list!") {
    setStoreState({ status: 'already', message: result.error })
    return
  }
  setStoreState({ status: 'error', message: result.error })
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

  const inputClassName =
    variant === 'section'
      ? 'min-h-[44px] flex-1 rounded-md border border-border bg-surface-sunken px-md py-md text-lg text-ink placeholder:text-ink-tertiary focus:border-border-strong focus:outline focus:outline-2 focus:outline-accent focus:outline-offset-2'
      : 'flex-1 rounded-md border border-border bg-surface px-md py-sm text-md text-ink placeholder:text-ink-tertiary focus:border-border-strong focus:outline focus:outline-2 focus:outline-accent focus:outline-offset-2'

  const buttonClassName =
    variant === 'section'
      ? 'min-h-[44px] w-full shrink-0 rounded-md bg-accent px-lg py-md text-md font-bold text-surface disabled:opacity-60 sm:w-auto'
      : 'w-full shrink-0 rounded-md bg-accent px-md py-sm text-md font-bold text-surface disabled:opacity-60 sm:w-auto'

  const errorText =
    state.status === 'error' ? (
      <p id={errorId} aria-live="assertive" className="mt-xs text-md text-over">
        {state.message}
      </p>
    ) : null

  const form = (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-sm sm:flex-row">
      <label htmlFor={inputId} className="sr-only">
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
        aria-invalid={state.status === 'error'}
        aria-describedby={state.status === 'error' ? errorId : undefined}
        className={inputClassName}
      />
      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileTap={!reduced && !isSubmitting ? { scale: 0.97 } : undefined}
        transition={{ duration: 0.18 }}
        className={buttonClassName}
      >
        {isSubmitting ? 'Sending…' : 'Get notified when it ships'}
      </motion.button>
    </form>
  )

  const doneMessage =
    state.status === 'already'
      ? 'You’re already on the list. One email, when it ships.'
      : 'You’re on the list. One email, when it ships.'

  const doneBlock = (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
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
        <p className="mt-sm text-lg leading-relaxed text-ink-secondary">
          TestFlight is the next real step. One email when it&rsquo;s actually shippable &mdash;
          nothing before that.
        </p>

        <div className="mt-lg text-left">
          {isDone ? doneBlock : form}
          {errorText}
        </div>

        <p className="mt-md text-sm text-ink-tertiary">
          One email. No newsletter, no launch countdown, no sharing your address.
        </p>
      </motion.div>
    </section>
  )
}
