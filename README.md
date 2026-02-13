# Fables & Sagas

A solo D&D 5th Edition adventure companion powered by AI. Create a character, generate a campaign, and play through an immersive story with an AI Dungeon Master that tracks your stats, inventory, and progression in real time.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS, DaisyUI (custom dark medieval theme)
- **State:** Zustand with localStorage persistence
- **AI:** Vercel AI SDK + OpenAI (server-side only)
- **Database:** Mongoose / TypeGoose → MongoDB Atlas (server-side only)
- **UI:** Lucide icons, MDI icons (dice), React Virtuoso (virtual scrolling), Sonner (toasts), React Markdown

## Getting Started

### Prerequisites

- Node.js 22.x (see `.nvmrc`)
- An OpenAI API key
- A MongoDB Atlas connection string (same database used by [dnd-homebrew-database](https://github.com/rmunoz33/dnd-homebrew-database))

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```bash
OPENAI_API_KEY="sk-proj-..."          # OpenAI API key (server-side only)
MONGODB_URI="mongodb+srv://..."       # MongoDB Atlas connection string (server-side only)
```

### Running

```bash
npm run dev       # Development server at http://localhost:3000
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint
```

## Project Structure

```
src/
├── app/
│   ├── actions/          # Server actions (AI text generation, character/campaign generation)
│   ├── api/
│   │   ├── 2014/         # REST Route Handlers (races, classes, backgrounds, alignments)
│   │   ├── chat/         # Streaming chat endpoint
│   │   └── tools/        # D&D data tools (15 DB-backed + 1 client-safe)
│   ├── components/
│   │   ├── Login/        # Landing page & login
│   │   ├── Character/    # Character creation form
│   │   ├── Game/         # Chat, dice roller, stats drawer
│   │   └── Settings/     # Settings drawer
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Entry point
├── hooks/                # Custom React hooks
├── lib/
│   └── db/
│       ├── connection.ts     # MongoDB singleton (globalThis cache, HMR-safe)
│       ├── modelOptions.ts   # TypeGoose decorators and getOrCreateModel()
│       ├── toolFactory.ts    # createDbLookupTool() factory for AI tools
│       ├── utils.ts          # ResourceList, escapeRegExp
│       └── models/           # 17 TypeGoose models + 5 common types
├── services/             # API service layer
└── stores/               # Zustand store (character, messages, UI state)
```

## Features

### Character Creation
- Full D&D 5e character builder: species, class (multiclass up to 3), subclass, background, alignment, abilities, equipment, currency
- "Roll Me a Character" button for AI-powered random generation with canonical D&D data
- Auto-calculated ability bonuses, HP, AC, initiative, and starting equipment

### AI Dungeon Master
- Streaming chat with an AI DM that knows your character's stats, equipment, and campaign
- Automatic state extraction: damage, healing, loot, and currency changes sync to your character sheet in real time
- Campaign outline generation tailored to your character's background and abilities
- Response length constraints for good pacing (80-120 words)

### Dice Roller
- Full set: d4, d6, d8, d10, d12, d20, d100
- Roll multiple dice with totals
- Send results directly to chat

### D&D Data Integration
- 15 AI tool definitions that query MongoDB directly for spells, monsters, equipment, classes, races, feats, backgrounds, and more
- Tools are used during gameplay for canonical D&D reference lookups
- 1-hour in-memory cache on tool results to reduce database load

## Architecture

The app connects directly to MongoDB Atlas — no separate API server needed. All database access is server-side only.

- **Route Handlers** (`/api/2014/*`) serve character creation data (races, classes, backgrounds, alignments)
- **`/api/chat`** streams DM responses via the Vercel AI SDK's `streamText` with 15 D&D reference tools
- **Server Actions** in `src/app/actions/openai.ts` handle non-streaming AI calls (state extraction, character generation, campaign outlines)
- **Zustand** is the single source of truth for messages, character data, and UI state, persisted to localStorage
- **Tool system** is split into client-safe (`tools/index.ts` — character mutations only) and server-side (`tools/server.ts` — all DB-backed tools) to respect the Next.js server/client boundary

### Server/Client Boundary

Mongoose cannot be bundled into client components. The tool registry has two entry points:
- `tools/index.ts` — imported by client components (only registers `characterTools`)
- `tools/server.ts` — imported by Server Actions and Route Handlers (registers all 16 tools)

## Upstream References

The TypeGoose models and data schemas are derived from the [5e-bits](https://github.com/5e-bits) open-source ecosystem:

| Repo | What We Use | URL |
|------|-------------|-----|
| 5e-srd-api | TypeGoose models, controller patterns | https://github.com/5e-bits/5e-srd-api |
| 5e-database | JSON game data, collection schemas | https://github.com/5e-bits/5e-database |

When porting upstream model changes, strip `@Field()` and `@ObjectType()` decorators (type-graphql) and keep only `@prop()` decorators (TypeGoose).

## Hosting

Deployed on [Netlify](https://app.netlify.com). Database hosted on [MongoDB Atlas](https://cloud.mongodb.com).
