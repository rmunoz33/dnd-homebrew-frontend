# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Fables & Sagas — a solo D&D 5e adventure companion. Next.js 16 app where users create a character, generate a campaign, and play through a story with an AI Dungeon Master that tracks stats, inventory, and progression in real time. Connects directly to MongoDB Atlas (no separate API server).

### Sibling Repos

This repo lives alongside two others in the `Fables and Sagas/` workspace:
- **`dnd-homebrew-database/`** — TypeScript scripts + JSON data files that load D&D content into MongoDB Atlas. This is the upstream data pipeline: JSON files → `db:refresh` → MongoDB collections.
- **`dnd-homebrew-api/`** — Legacy Express/GraphQL API server. Kept for reference only, no longer deployed or required.

The system supports both 2014 and 2024 D&D 5e SRD editions, with custom homebrew content distinguished via the `source` field (`"srd"` for official, `"homebrew-base"` for custom).

## Commands

```bash
npm run dev       # Next.js dev server (requires MONGODB_URI + OPENAI_API_KEY in .env)
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint (flat config: next/core-web-vitals + next/typescript)
```

No test suite exists in this repo. The sibling `dnd-homebrew-database/` repo has tests.

## Tech Stack

Next.js 16, React 19, TypeScript, Tailwind CSS v4, DaisyUI v5, Zustand v5, Vercel AI SDK + OpenAI, Mongoose/TypeGoose. Node.js 20+ (see `.nvmrc`).

## Architecture

### App Flow

`LandingPage.tsx` is the router: login → character creation → game. All three views are client components that read from a single Zustand store (`stores/useStore.ts`) persisted to localStorage.

### Server/Client Boundary (Critical)

Mongoose cannot be bundled into client code. The tool system enforces this with two entry points:
- `src/app/api/tools/index.ts` — client-safe (only `characterTools` — HP, currency, inventory, XP mutations via Zustand)
- `src/app/api/tools/server.ts` — server-only (all 16 tools including 15 DB-backed lookup tools)

Client components must never import from `tools/server.ts` or anything in `src/lib/db/`. Route Handlers, Server Actions, and the chat endpoint are the only places that touch the database.

### AI Integration (Three Server-Side Paths)

1. **`/api/chat` (Route Handler)** — Streaming DM responses via `streamText()` with `gpt-4.1-mini`. System prompt includes character stats, campaign outline, and response length rules (80 words standard, 120 for combat). Has access to 15 DB reference tools.

2. **Server Actions in `src/app/actions/openai.ts`**:
   - `extractStateChanges()` — Analyzes last 3 message exchanges with low-temp (0.1) inference to detect HP/currency/inventory/XP changes implied by the narrative. Anti-duplication logic prevents double-counting.
   - `generateCreativeFields()` — AI fills in character name, backstory, abilities, attributes using `gpt-4.1-nano`.
   - `generateCampaignOutline()` — Creates campaign outline tailored to the character.

3. **State sync flow**: DM response streams in → `extractStateChanges()` runs → returns tool calls → `applyCharacterChanges()` updates Zustand store → toast notifications shown via Sonner.

### DB Tool Factory Pattern

All 15 D&D reference tools are created via `createDbLookupTool()` in `src/lib/db/toolFactory.ts`:
- Each tool does a regex case-insensitive lookup by name (or kebab-case index)
- Results cached in-memory for 1 hour
- Tool files live in `src/app/api/tools/` (e.g., `spellTools.ts`, `monsterTools.ts`)
- Registered via `toolRegistry` singleton in `tools/registry.ts`

### Database Layer (`src/lib/db/`)

- `connection.ts` — MongoDB singleton using `globalThis.mongooseCache` (HMR-safe, pool size 10)
- `modelOptions.ts` — `srdModelOptions()` decorator strips `_id`/`__v`, plus `getOrCreateModel()` helper that checks if model already exists (required for HMR)
- `models/` — 17 TypeGoose models ported from [5e-srd-api](https://github.com/5e-bits/5e-srd-api). Uses `@prop()` decorators only (stripped `@Field()`/`@ObjectType()` from upstream's type-graphql)
- Collections are edition-prefixed: `2014-races`, `2014-spells`, etc. (mapped from JSON files like `5e-SRD-Spells.json` → `2014-spells`)

### Route Handlers (`src/app/api/2014/`)

REST endpoints for character creation dropdowns: races, classes (with subclasses), backgrounds, alignments. All use `.lean()` for performance. Consumed by hooks in `src/hooks/`.

### Zustand Store (`src/stores/useStore.ts`)

Single store with: `character` (full D&D sheet), `messages` (chat history), `campaignOutline`, `filters` (form state), `isLoggedIn`, `isCharacterCreated`. Persisted to localStorage with custom timestamp serialization.

`applyCharacterChanges()` is the method that processes tool call results into character mutations.

### Styling

Custom DaisyUI theme "fables" defined in `src/app/globals.css`. Dark medieval aesthetic with gold primary (`#d4af37`), dark base (`#0a0a0a`). Custom animations: `fadeInUp` with staggered delays, text glow effects.

## Key Patterns

- **TypeScript decorators are enabled** — `experimentalDecorators` and `emitDecoratorMetadata` in tsconfig (required for TypeGoose)
- **Path alias**: `@/*` maps to `./src/*`
- **`mongoose` is externalized** in `next.config.ts` via `serverExternalPackages`
- **Chat uses manual fetch + Zustand** — not the `useChat` hook. Streaming is done via direct fetch to `/api/chat` with SSE parsing and Zustand state updates in `GameChat.tsx`
- **React Virtuoso** for virtualized message list in the chat (performance for long conversations)
- **Multiclass support** — character can have up to 3 classes, each with its own subclass

## Cross-Repo Workflows

### Adding Homebrew Content

1. Add entries to JSON files in `dnd-homebrew-database/src/{2014,2024}/`
2. Set `"source": "homebrew-base"` and use unique kebab-case `index` values
3. Run `db:refresh` in the database repo to load into MongoDB
4. If new AI tool lookups are needed, add tool files here in `src/app/api/tools/` using `createDbLookupTool()`

### Porting Upstream Changes (5e-bits)

When the upstream [5e-srd-api](https://github.com/5e-bits/5e-srd-api) adds or modifies models:
1. Port TypeGoose `@prop()` decorators to `src/lib/db/models/` (strip `@Field()` and `@ObjectType()` from type-graphql)
2. If new endpoints are needed, add Route Handlers in `src/app/api/2014/`

### Database Scripts (in sibling repo)

```bash
cd ../dnd-homebrew-database
npm run db:refresh    # Full reload — drops all collections and reloads from JSON
npm run db:update     # Incremental — only files changed in last commit
```

**Important**: `db:update` only processes the latest commit. For changes spanning multiple commits, use `db:refresh`.

## CLI Connections

```bash
# MongoDB Atlas
mongosh "mongodb+srv://dnd-database.sdzh58t.mongodb.net/5e-database" --username almostheresy

# Netlify
netlify login && netlify link    # Link to dnd-solo site
```

## CI/CD Pipeline

- **Pull Requests**: Lint
- **Push to Main**: Lint, semantic release

The database repo has its own CI that runs `db:update` on push to main (requires `MONGODB_URI` secret).

## Commit Messages

Semantic Release format: `feat(scope):`, `fix(scope):`, `perf(scope):` with `BREAKING CHANGE:` footer for majors. Do NOT include AI attribution in commit messages or PR descriptions.

## Hosting

Netlify (frontend) + MongoDB Atlas (database).
