// Standalone carbon calculator for authenticated users who haven't set baseline_kg yet.
// Reuses the same CalculatorScreen component from (onboarding) — ResultsScreen detects
// user is signed in and calls saveBaseline() directly instead of going to signup.
export { default } from './(onboarding)/calculator';
