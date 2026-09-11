import Hero from './sections/Hero'
import ProductScreens from './sections/ProductScreens'
import CaseStudy from './sections/CaseStudy'
import DeepDive from './sections/DeepDive'
import WaitlistCTA from './sections/WaitlistCTA'
import Footer from './sections/Footer'

/**
 * Veridian marketing page — two-tier information architecture.
 *
 * Tier 1 (always visible, the actual page): Hero, real product screenshots,
 * then the Case Study read as primary content — not an appendix near the
 * bottom — followed by the waitlist ask and the footer.
 *
 * Tier 2 (collapsed by default): the ten sections that carry the full,
 * already-approved narrative (Summary through Risks, sourced from
 * docs/WEBSITE_STRUCTURE.md) — none of their content changed, only how
 * they're mounted. They now live inside DeepDive as a closed-by-default
 * disclosure list between the Case Study and the waitlist ask, so a
 * visitor gets the two things that matter (the product, the case study)
 * without first scrolling through ten more full-height sections, while
 * the full story is still one click away for anyone who wants it.
 *
 * No extra max-width wrapper is added here: every section below already
 * owns its own container off the shared design tokens in src/index.css —
 * `max-w-wide` (1360px) for Hero, `max-w-page` (1120px) for the rest, and
 * `max-w-prose` (~65ch) around the actual paragraph text inside each one.
 */
function App() {
  return (
    <>
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:absolute focus:left-md focus:top-md focus:z-50 focus:rounded-md focus:bg-accent focus:px-md focus:py-sm focus:text-md focus:font-bold focus:text-surface focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        Skip to content
      </a>
      <main id="top">
        <Hero />
        <ProductScreens />
        <CaseStudy />
        <DeepDive />
        <WaitlistCTA variant="section" />
        <Footer />
      </main>
    </>
  )
}

export default App
