# Keys and Servers (Simple View)

## Where keys are used
- Client/public config (`VITE_*`) is read in `src/lib/firebase.ts` and some UI components.
- Secret backend keys (`XAI_API_KEY`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) are only used in `server/index.js`.

## Important
- `VITE_*` values are exposed to the browser by design.
- Do not put secret API keys in `VITE_*`.

## Minimal setup (least moving parts)
- One frontend (Vite build, static hosting)
- One backend API server (`server/index.js`)
- One AI provider key (`XAI_API_KEY` OR `GROQ_API_KEY`)

You can leave these empty to simplify:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- contact/turnstile/indexnow keys

## Current scripts
- `npm run dev` = frontend only
- `npm run dev:api` = backend only
- `npm run dev:all` = both together

## If keys were exposed
- Rotate/regenerate them immediately in provider dashboards.
- Replace values in your local `.env`.

