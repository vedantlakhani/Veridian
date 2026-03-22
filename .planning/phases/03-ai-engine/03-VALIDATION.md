# Phase 3 Validation: AI Engine

**Phase:** 03-ai-engine
**Requirements:** AI-01 through AI-07

## UAT Scenarios

### AI-01: Edge Function security
- [ ] No `ANTHROPIC_API_KEY` appears in client bundle (`npx expo export` and grep)
- [ ] All Claude API calls routed through Supabase Edge Functions only

### AI-02: analyze-emissions Edge Function
- [ ] `supabase/functions/analyze-emissions/index.ts` exists and deploys
- [ ] Uses `claude-sonnet-4-5` model for complex analysis
- [ ] Accepts user_id, returns structured insight + suggestion

### AI-03: generate-suggestions Edge Function
- [ ] `supabase/functions/generate-suggestions/index.ts` exists and deploys
- [ ] Uses `claude-haiku-4-5` model for fast suggestions
- [ ] Response time < 1 second in testing

### AI-04: Home screen AI insight card
- [ ] AI insight card renders on Home screen
- [ ] Card shows loading skeleton while fetching
- [ ] Card shows error state if Edge Function fails
- [ ] Insight updates daily (fresh if > 24 hours old)

### AI-05: Quantified reduction action
- [ ] Insight card includes one specific, quantified reduction action (e.g. "Switch to oat milk: save 0.8 kg CO₂e/week")
- [ ] Action is actionable and specific, not generic

### AI-06: Personalization
- [ ] Insight references user's actual recent emission data (category, items, amounts)
- [ ] Two users with different profiles receive different insights

### AI-07: API key security
- [ ] `ANTHROPIC_API_KEY` stored in Supabase Edge Function secrets
- [ ] Key never appears in any client-side file or `.env`
- [ ] `npx expo export` bundle contains no API key

## Acceptance Criteria

All 7 AI requirements must pass. Edge Function must be deployable via `supabase functions deploy`.
