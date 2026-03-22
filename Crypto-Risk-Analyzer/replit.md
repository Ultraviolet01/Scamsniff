# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/scamsniff` (`@workspace/scamsniff`)

React + Vite frontend for ScamSniff — a crypto risk analysis tool.

- `src/pages/Home.tsx` — main page with input form, verdict card, signal panels, evidence list
- `src/components/ScoreGauge.tsx` — animated SVG risk score ring
- `src/components/SignalList.tsx` — displays risk / trust / missing signals
- `src/lib/utils.ts` — `cn()`, `getRiskColor()` helpers

### API route — `/api/analyze` (POST)

Implemented in `artifacts/api-server/src/routes/analyze.ts`. Calls:

- `lib/firecrawl.ts` — Firecrawl SDK wrapper, runs 8 parallel search queries
- `lib/scorer.ts` — Source-classified evidence scoring engine (v2)

**Scorer design (v2):**
- Classifies each result as `official | credible_third_party | user_generated | suspicious_or_low_quality | unknown`
- Applies source-type multipliers to risk/positive signal weights (credible sources count more)
- Only raises score when multiple independent credible sources confirm risk
- Tracks `missing_signals` (expected legitimacy footprint items not found)
- Returns structured `evidence[]` with per-source reason annotations

**Scoring thresholds:** 0–15 = Low Risk, 16–40 = Caution, 41–65 = High Risk, 66+ = Extreme Risk

**To tune thresholds:** edit `toVerdict()` in `artifacts/api-server/src/lib/scorer.ts`
**To tune source multipliers:** edit `RISK_MULTIPLIER` / `POSITIVE_MULTIPLIER` constants
**To add signal patterns:** edit `RISK_SIGNAL_PATTERNS` / `POSITIVE_SIGNAL_PATTERNS` arrays

### Voice Agent (ElevenLabs Conversational AI)

ScamSniff has a voice investigation mode powered by ElevenLabs Conversational AI.

**Architecture:**
- Frontend: `artifacts/scamsniff/src/pages/Voice.tsx` — voice UI using `@11labs/react` `useConversation` hook
- Backend: `artifacts/api-server/src/routes/agent.ts` — `GET /api/agent/signed-url` generates a signed conversation URL
- Tool: `analyze_project_risk` is a **client-side tool** — ElevenLabs SDK fires it locally; frontend calls `/api/analyze` and returns spoken summary to the agent

**Required secrets (set in Replit Secrets panel):**
- `ELEVENLABS_API_KEY` — from elevenlabs.io/app/settings/api-keys
- `ELEVENLABS_AGENT_ID` — from elevenlabs.io/app/conversational-ai (agent settings page)

NOTE: Replit ElevenLabs integration was dismissed by the user — secrets are managed manually. Do NOT use the integration connector.

**ElevenLabs agent setup (dashboard):**
1. Create agent at elevenlabs.io/app/conversational-ai
2. Set a minimal placeholder system prompt in the dashboard (e.g., "You are ScamSniff.") — the real prompt is injected at runtime via code override (see below).
3. Add tool `analyze_project_risk` with parameter `input: string`
4. Mark tool as client-side (handled by SDK, no webhook URL needed)
5. Copy Agent ID → set as `ELEVENLABS_AGENT_ID` secret

**System prompt location:** The authoritative system prompt lives in `artifacts/scamsniff/src/pages/Voice.tsx` as the `AGENT_SYSTEM_PROMPT` constant. It is injected as an `overrides.agent.prompt.prompt` value in `startSession()` at the start of every conversation. This means the dashboard prompt is a fallback only — always edit the constant in code.

**ElevenLabs system prompt (canonical — from AGENT_SYSTEM_PROMPT in Voice.tsx):**
```
You are ScamSniff, a calm, sharp on-chain security analyst. Your job is to help users assess
whether a crypto project, token, URL, or X handle is suspicious.

RESPONSE STRUCTURE — always follow this exact order:
1. State the risk level immediately in the first sentence.
2. Weave the top 1-2 strongest signals into the next 1-2 sentences naturally — do NOT list them.
3. End with one clear, practical next step.

RESPONSE LENGTH: 2 to 4 sentences maximum. Front-load the most critical information so users
can interrupt early and still get full value.

PHRASING RULES:
- Never say "this is safe" or "this is definitely a scam".
- Use hedged language: "this looks low risk from the public evidence I found" /
  "this looks suspicious based on the evidence available" /
  "I couldn't verify enough trustworthy signals to feel confident either way".
- Don't repeat the project or token name more than once per response.
- Never verbally list more than 2 sources or signals — summarize them naturally.
- Sound like a trusted security friend, not a compliance report.

FOLLOW-UP HANDLING:
- "why?" → explain top 1-2 risk signals in plain language, 1-2 sentences max.
- "sources?" → describe source types first (e.g., "major crypto outlets and an audit report"), detail only if asked again.
- "how confident are you?" → official/audits/major media = high confidence; community posts only = low confidence, say so.
- For any other follow-up about the same target, answer directly without re-running the tool.

TOOL USAGE:
When user mentions any project, token, URL, or X handle → call analyze_project_risk immediately.
Do NOT re-run the tool for follow-up questions about the same target.

DATA INTERPRETATION:
- VERDICT + CONFIDENCE → first sentence
- TOP_RISKS / TOP_TRUST → evidence sentences (top 1-2, lead with risks if both exist)
- MISSING → cautionary next step
- EVIDENCE_NOTE "limited data" → qualify: "based on limited public evidence"
- EVIDENCE_NOTE "multiple credible sources" → more confidence, still hedged

NEXT STEP BY VERDICT:
- Extreme Risk → "Don't connect your wallet or send funds to this — treat it as unverified."
- High Risk → "Cross-check the official site, team, and docs independently before considering anything."
- Caution → "Verify the official site and GitHub yourself before taking any action."
- Low Risk → "Looks clean from what I found, but always verify links yourself before connecting a wallet."
```

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
