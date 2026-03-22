# ScamSniff — Crypto Risk Analyzer

## Overview
ScamSniff is a pnpm monorepo that analyses crypto projects, tokens, URLs, and X handles for risk. It uses Firecrawl to gather web evidence and a weighted scoring engine to produce a verdict (Low Risk → Extreme Risk) with supporting signal explanations and a voice-enabled ElevenLabs agent.

## Monorepo Structure
```
Crypto-Risk-Analyzer/
  artifacts/
    api-server/    — Express + pino backend (port 3000 in prod, 3000 in dev)
    scamsniff/     — Vite + React frontend (cyberpunk UI)
    mockup-sandbox/— Component preview server (canvas prototyping)
  scripts/
    build.sh       — Production build (scamsniff static files + api-server)
    start.sh       — Production start (api-server serves frontend at /)
```

## Architecture
- **Production**: single port 3000. `api-server` serves its own `/api/*` routes AND the compiled Vite frontend static files from `../../scamsniff/dist/public`.
- **Development**: two separate servers — api-server on port 3000, scamsniff on port 5000.
- **Health check**: `GET /health` → `{"status":"ok"}` (required for deployment).

## Key Files
- `artifacts/api-server/src/lib/scorer.ts` — Risk scoring engine (v5)
- `artifacts/api-server/src/lib/firecrawl.ts` — Sequential batched search
- `artifacts/api-server/src/lib/classifier.ts` — Input type detection
- `artifacts/api-server/src/routes/analyze.ts` — POST /api/analyze + per-type query builder
- `artifacts/api-server/src/routes/agent.ts` — ElevenLabs voice agent config
- `artifacts/scamsniff/src/pages/Voice.tsx` — Voice agent UI

## Scoring Model (v5)
Starting baseline per input type (12–16 pts), then:

**Positive adjustments** (reduce risk):
- Structural bonuses: GitHub (−8), official docs (−6), credible coverage (−5), official site (−5), block explorer (−4), security audit (−8)
- Per-source positive signal patterns: open-source (−14), whitepaper (−10), regulated (−14), audit (−18), partnerships (−8)

**Negative adjustments** (increase risk):
- HIGH_SEVERITY patterns checked against title+description+600-char body excerpt (rug pull, exit scam, ponzi, fraud, sentenced, convicted, indicted, arrested)
- GENERAL patterns checked against title+description ONLY (scam, hack, phishing, impersonation, guaranteed returns)
- Self-domain bypass: never score the subject's own website for risk signals

**Score floors** (cannot be cancelled by legitimacy bonuses):
- Criminal conviction (credible source) → min 66 (Extreme Risk)
- 3+ credible negatives or credible arrest → min 50 (High Risk)
- 2 credible negatives → min 41 (High Risk)
- 1 credible negative → min 22 (Caution)

**Community-only cap**: if strong official footprint + 0 credible negatives → score capped at 38 (Caution)

**Verdict thresholds**: ≤15 Low Risk | 16–40 Caution | 41–65 High Risk | >65 Extreme Risk

## Firecrawl Search
Sequential batching: 3 queries per batch, 400ms between batches, early-stop at 12 results. 6 prioritized queries per input type (most signal-dense first).

## Environment Variables
- `FIRECRAWL_API_KEY` — web evidence gathering
- `ELEVENLABS_API_KEY` + `ELEVENLABS_AGENT_ID` — voice agent
- `DATABASE_URL` — PostgreSQL (available but not actively used)

## Deployment Config
- Build: `bash Crypto-Risk-Analyzer/scripts/build.sh`
- Run: `bash Crypto-Risk-Analyzer/scripts/start.sh`
- Port: 3000
