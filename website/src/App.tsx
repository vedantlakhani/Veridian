import Hero from './sections/Hero'
import ProductScreens from './sections/ProductScreens'
import Summary from './sections/Summary'
import Problem from './sections/Problem'
import TargetUser from './sections/TargetUser'
import Competitors from './sections/Competitors'
import Insight from './sections/Insight'
import Solution from './sections/Solution'
import Distribution from './sections/Distribution'
import Feedback from './sections/Feedback'
import Challenges from './sections/Challenges'
import Risks from './sections/Risks'
import WaitlistCTA from './sections/WaitlistCTA'
import Footer from './sections/Footer'

/**
 * Veridian marketing page — a single, continuous scroll assembling every
 * section in narrative order (case study framing → summary → problem →
 * who it's for → competitive landscape → the insight that forced a rebuild
 * → the solution → how it reaches people → what early feedback said → open
 * challenges → risks → an explicit ask → sign-off).
 *
 * No extra max-width wrapper is added here: every section below already
 * owns its own container off the shared design tokens in src/index.css —
 * `max-w-wide` (1360px) for Hero and Competitors, `max-w-page` (1120px) for
 * the rest, and `max-w-prose` (~65ch) around the actual paragraph text
 * inside each one. Layering another constraint on top would fight those
 * choices (e.g. Challenges' comparison table intentionally breaks out to
 * `max-w-page`). Hero is "full-bleed" only in the sense that, unlike every
 * other section, nothing above it narrows the page before its own
 * `max-w-wide` takes over.
 */
function App() {
  return (
    <main id="top">
      <Hero />
      <ProductScreens />
      <Summary />
      <Problem />
      <TargetUser />
      <Competitors />
      <Insight />
      <Solution />
      <Distribution />
      <Feedback />
      <Challenges />
      <Risks />
      <WaitlistCTA variant="section" />
      <Footer />
    </main>
  )
}

export default App
