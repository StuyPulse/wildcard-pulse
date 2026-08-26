# Wildcard Pulse

StuyPulse 694's competition scouting platform. Phase 1 is an online-first Next.js app backed by Supabase; later phases add web offline support and a native QR-relay workflow without changing the submission format.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000/demo](http://localhost:3000/demo) for a safe visual preview, or [http://localhost:3000/auth/login](http://localhost:3000/auth/login) to use Supabase Auth.

Copy `.env.example` to `.env.local` and provide only the publishable browser credentials. `SUPABASE_SECRET_KEY` and `TBA_AUTH_KEY` are server-only values: they never belong in `NEXT_PUBLIC_*` variables or client components.

## Database

Migrations are in [`supabase/migrations`](supabase/migrations). The remote project currently associated with this repo is `wutzpdkmlafwqqgxmqlh` (**Wildcard**). Apply migrations only through the Supabase workflow; do not paste a secret key into source code.

After authenticating the Supabase CLI, apply any new migrations before deploying the web app:

```bash
npx supabase login
npx supabase link --project-ref wutzpdkmlafwqqgxmqlh
npx supabase db push
```

Set `TBA_AUTH_KEY` and `SUPABASE_SECRET_KEY` as server-only environment variables in Vercel as well as in `.env.local`. TBA imports will report a clear setup error if either is missing.

The first person who creates an Auth account must be made an admin through a trusted Supabase SQL session. See [roles and security](docs/roles-and-security.md) for the exact onboarding query.

## Useful checks

```bash
npm run typecheck
npm run build
```

See [`docs/architecture.md`](docs/architecture.md), [`docs/data-model.md`](docs/data-model.md), and [`docs/roles-and-security.md`](docs/roles-and-security.md) before extending the application.
