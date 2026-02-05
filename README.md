# Fables & Sagas

A solo D&D 5th Edition adventure companion powered by AI. Create a character, generate a campaign, and play through an immersive story with an AI Dungeon Master that tracks your stats, inventory, and progression in real time.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS, DaisyUI (custom dark medieval theme)
- **State:** Zustand with localStorage persistence
- **AI:** Vercel AI SDK + OpenAI (server-side only)
- **UI:** Lucide icons, MDI icons (dice), React Virtuoso (virtual scrolling), Sonner (toasts), React Markdown

## Getting Started

### Prerequisites

- Node.js 22.x (see `.nvmrc`)
- An OpenAI API key
- The [D&D Homebrew API](https://github.com/rmunoz33/dnd-homebrew-api) running (for character options, equipment data, etc.)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```bash
OPENAI_API_KEY="sk-proj-..."                         # OpenAI API key (server-side only)
NEXT_PUBLIC_CONTENT_DB_URL="https://...railway.app"  # D&D Homebrew API URL
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
│   ├── actions/          # Server actions (AI text generation)
│   ├── api/
│   │   ├── chat/         # Streaming chat endpoint
│   │   └── tools/        # D&D data tools (20+ tool definitions)
│   ├── components/
│   │   ├── Login/        # Landing page & login
│   │   ├── Character/    # Character creation form
│   │   ├── Game/         # Chat, dice roller, stats drawer
│   │   └── Settings/     # Settings drawer
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Entry point
├── hooks/                # Custom React hooks
├── services/             # API service layer (D&D data fetching)
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
- 20+ tool definitions for querying spells, monsters, equipment, classes, races, feats, backgrounds, and more from the Homebrew API
- Tools are used during character creation and campaign generation for canonical accuracy

## Architecture

The app is a single-page application using client-side routing via Zustand state (`isLoggedIn` -> `isCharacterCreated` -> game). All AI calls are server-side:

- **`/api/chat`** streams DM responses via the Vercel AI SDK's `streamText`
- **Server actions** in `src/app/actions/openai.ts` handle non-streaming AI calls (state extraction, character generation, campaign outlines)
- **Zustand** is the single source of truth for messages, character data, and UI state, persisted to localStorage

## Hosting

Deployed on [Netlify](https://app.netlify.com). The companion API is hosted on [Railway](https://railway.app).
