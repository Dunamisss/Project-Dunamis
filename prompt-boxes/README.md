# Prompt -> Boxes -> JSON

A beginner-friendly prompt builder with two modes:
- Guided Mode: users fill simple "boxes" (Goal, Audience, Constraints, etc.)
- Paste Mode: users paste a messy prompt and the app auto-generates the boxes + JSON

## Features
- Live JSON preview with copy button
- Live "Clean Prompt" preview with copy button
- Paste Mode heuristic parser (no AI keys required)
- Simple Express API with 2 endpoints

---

## Requirements
- Node.js 18+ recommended
- npm

---

## Repo layout

prompt-boxes/
  server/  (Express 5 API)
  web/     (React 19 + Vite 7 + Tailwind 4)

---

## 1) Run the server

```bash
cd server
npm i
npm run dev
```

Server runs at:

`http://localhost:8787`

Health check:

`GET http://localhost:8787/health`

API endpoints:

`POST /api/parse`  
body: `{ "source_prompt": "..." }`  
returns: `{ data, missing_questions, field_confidence }`

`POST /api/render-clean-prompt`  
body: `{ "doc": { ...PromptDoc } }`  
returns: `{ clean_prompt }`

## 2) Run the frontend

```bash
cd web
npm i
```

Then:

```bash
npm run dev
```

Frontend runs at:

`http://localhost:5173`

By default, Vite proxies `/api/*` to `http://localhost:8787`, so `.env` is optional for local dev.

If you need a custom API host, create `web/.env`:

```env
VITE_API_BASE=http://localhost:8787
```

## Expected behavior

### Guided Mode
- Clicking template buttons pre-fills some box values.
- Editing boxes updates:
  - JSON tab (structured export)
  - Clean Prompt tab (human readable prompt)

### Paste Mode
When a user pastes a messy prompt:
- the server extracts likely Goal/Audience/Constraints/Style/Output
- boxes populate automatically
- confidence badges show (Confident / Review / Missing)
- "Quick questions" appear if key fields are missing

## Notes / future upgrade

The `/api/parse` endpoint uses a heuristic parser.  
You can later replace the logic in `server/src/parse/heuristic.ts` with an LLM call,
as long as it returns the same response shape:

```ts
{
  data: PromptDoc,
  missing_questions: string[],
  field_confidence: Record<string, number>
}
```

The frontend will not need changes.

---
