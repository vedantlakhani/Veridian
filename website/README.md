# Veridian Website

This is the marketing/content site for Veridian, a carbon-tracking app that started as a manual logging app and, after two rounds of research, rebuilt itself around a different thesis: an autopilot that writes your carbon story from signals your phone and bank already have, with you as an editor who taps to confirm rather than a clerk who types entries. The site is built with React, TypeScript, and Vite, styled with Tailwind CSS, and uses Supabase for its waitlist backend.

## Running locally

```bash
npm install
cp .env.example .env
```

Then open `.env` and fill in your Supabase project's credentials (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).

```bash
npm run dev
```

## Building for production

```bash
npm run build
```

This type-checks the project and outputs a production build to `dist/`.
