# Codebase Structure

**Analysis Date:** 2026-02-05

## Directory Layout

```
/Users/noahsark/Documents/vibecoding/arkagentic/
├── src/                          # Main application source (Phaser + React frontend)
│   ├── main.tsx                  # React app entry point
│   ├── App.tsx                   # React component with loading screen
│   ├── index.ts                  # Phaser game init, scene registry, routing
│   ├── index.css                 # Global styles
│   ├── constants.ts              # Agent configs, API URLs, Jitsi settings, colors
│   ├── icons.ts                  # SVG icon helpers (replaces emoji)
│   ├── utils.ts                  # Shared utilities (direction constants, HTML escape, routing)
│   ├── utils/
│   │   └── sounds.ts             # Audio playback helpers
│   ├── classes/                  # Game world entities and managers
│   │   ├── Actor.ts              # Base class for game objects (sprite, physics)
│   │   ├── Agent.ts              # AI agent behavior (movement, pathfinding, speech)
│   │   ├── Player.ts             # Player character (keyboard input, synced)
│   │   ├── EventCenter.ts        # Singleton event dispatcher (legacy, replaced by EventBus)
│   │   ├── JitsiManager.ts       # Proximity voice chat via Jitsi iframe
│   │   ├── MultiplayerManager.ts # Colyseus room sync for multiplayer
│   │   ├── MobileControls.ts     # Touch/mobile input handling
│   │   └── MiniMap.ts            # Mini-map overlay display
│   ├── scenes/                   # Phaser Scene subclasses (game screens)
│   │   ├── LoadingScene.ts       # Asset preload, logo display
│   │   ├── CharacterSelectScene.ts  # Avatar/name selection before town
│   │   ├── TownScene.ts          # Main multiplayer space with agents and activities
│   │   ├── RoomScene.ts          # Individual agent conversation rooms
│   │   ├── MeetingRoomScene.ts   # Private team chat area
│   │   ├── ChatbotRuinsScene.ts  # Historical/museum scene
│   │   └── SlimShadyScene.ts     # Secret easter egg scene
│   ├── game/                     # Game logic systems (ECS-like)
│   │   └── systems/
│   │       ├── AgentManager.ts   # Agent creation, positioning, behavior coordination
│   │       ├── ChatSystem.ts     # Chat message handling and routing
│   │       ├── ProximitySystem.ts # Zone detection (door entering, Jitsi zones)
│   │       ├── UIManager.ts      # UI overlay creation (prompts, banners, transitions)
│   │       ├── SceneStateMachine.ts  # Scene transition state management
│   │       └── index.ts          # System exports (barrel)
│   ├── core/                     # Centralized services and infrastructure
│   │   ├── index.ts              # Service exports (barrel)
│   │   ├── events/
│   │   │   └── EventBus.ts       # Pub/sub event system with typed payloads
│   │   ├── services/
│   │   │   ├── ApiService.ts     # HTTP client for backend (chat, users, auth)
│   │   │   ├── GameBridge.ts     # Game-to-UI bridge, global state, callbacks
│   │   │   └── StorageService.ts # localStorage wrapper for settings/credentials
│   │   └── utils/
│   │       └── timing.ts         # Constants for animations, movement speeds
│   ├── components/               # React UI components
│   │   └── ui/
│   │       ├── demo.tsx          # Loading animation component
│   │       └── dot-loader.tsx    # Animated dot loader
│   ├── types/                    # TypeScript type definitions
│   │   ├── index.ts              # Type exports (barrel)
│   │   └── scenes.ts             # IAgentScene, IBoardScene, IMultiplayerScene interfaces
│   ├── lib/                      # Utility libraries
│   │   └── utils.ts              # classname utilities (clsx, tailwind-merge)
│
├── server.ts                     # Node.js HTTP server (port 3001)
│                                 # Handles /api/aisdk endpoint, rate limiting, AI responses
│
├── backend/                      # Python backend (alternative server)
│   ├── server.py                 # Flask/FastAPI server
│   ├── requirements.txt          # Python dependencies
│   └── venv/                     # Python virtual environment
│
├── multiplayer/                  # Colyseus multiplayer server (separate Node.js project)
│   ├── src/                      # Multiplayer room implementation
│   └── package.json              # Colyseus dependencies
│
├── cloudflare-agents/            # Cloudflare Workers for agent logic
│   ├── src/                      # Worker implementations
│   └── wrangler.toml             # Cloudflare configuration
│
├── public/                       # Static assets
│   └── assets/                   # Sprites, maps, sounds
│
├── docs/                         # Documentation
├── database/                     # Database migrations and schemas
├── scripts/                      # Setup and utility scripts
│   └── setup.sh                  # Initialize environment
│
├── index.html                    # HTML entry point
├── package.json                  # Frontend dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── postcss.config.cjs            # PostCSS configuration
├── docker-compose.yml            # Local dev environment (backend, multiplayer, db)
│
└── .env.local                    # Local configuration (API keys, URLs)
```

## Directory Purposes

**src/**
- Purpose: All frontend application code
- Contains: React entry point, Phaser game, game logic, UI components, types, services
- Key files: `index.ts` (game init), `main.tsx` (React), `constants.ts` (config)

**src/classes/**
- Purpose: Game world entities and infrastructure managers
- Contains: Actor (base), Agent (AI), Player (user), JitsiManager (voice), MultiplayerManager (sync), MobileControls, MiniMap, EventCenter (legacy)
- Pattern: Classes extend Phaser GameObjects and handle their own lifecycle

**src/scenes/**
- Purpose: Game screens/states corresponding to URL routes
- Contains: Seven scene classes, each implements Phaser Scene interface
- Pattern: Scene lifecycle → create() initializes objects, update() runs per frame

**src/game/systems/**
- Purpose: Reusable game logic modules that coordinate between entities
- Contains: AgentManager (agent spawning/coordination), ChatSystem (message handling), ProximitySystem (zones), UIManager (overlays), SceneStateMachine
- Pattern: Systems are instantiated in scenes, called via methods or event listeners

**src/core/**
- Purpose: Infrastructure for game-wide concerns
- Contains: EventBus (pub/sub), ApiService (HTTP), GameBridge (game-UI bridge), StorageService (localStorage)
- Pattern: Singletons exported from services/, used across application

**src/types/**
- Purpose: TypeScript interfaces that define contracts
- Contains: IAgentScene, IBoardScene, IMultiplayerScene, scene data types
- Pattern: Used for type guards, dependency injection, and static verification

**src/components/**
- Purpose: React UI components (not game rendering)
- Contains: Demo loading animation, dot loader
- Pattern: Components render during loading screen fade

**server.ts**
- Purpose: Node.js HTTP API for AI chat and user management
- Runs on: Port 3001
- Endpoints: `/api/aisdk` (POST chat), `/health` (GET), `/users/*` (CRUD), `/auth/validate` (POST)
- Features: Rate limiting (10/min), agent personality injection, streaming support

**backend/**
- Purpose: Alternative Python server for production/advanced features
- Contains: Flask/FastAPI server, database models, authentication
- Runs: Separate from frontend, communicates via HTTP

**multiplayer/**
- Purpose: Colyseus server for real-time player position sync
- Runs: Port 3002 or 8080
- Features: Room state broadcasting, player presence

**cloudflare-agents/**
- Purpose: Serverless worker implementations for specific agents
- Targets: Cloudflare Workers (edge deployment)
- Usage: Some agents routed via CF_AGENTS_URL instead of local backend

**public/assets/**
- Purpose: Game assets (sprites, tilesets, audio)
- Contains: Pixel art for agents, tilemap, sound effects

## Key File Locations

**Entry Points:**
- `index.html`: DOM root and script loading
- `src/main.tsx`: React app initialization
- `src/index.ts`: Phaser game instantiation and scene registration
- `server.ts`: Node.js HTTP server (run via `npm run server`)

**Configuration:**
- `src/constants.ts`: AGENTS, API URLs, Jitsi config, spawn positions, colors
- `.env.local`: API keys, Jitsi domain, database URL
- `vite.config.ts`: Build settings, port 5173
- `tsconfig.json`: TypeScript compiler options

**Core Logic:**
- `src/index.ts`: URL routing, scene startup logic
- `src/game/systems/AgentManager.ts`: Agent spawning and coordination
- `src/classes/Agent.ts`: Agent AI behavior, pathfinding, animations
- `src/classes/Player.ts`: Player input handling and movement
- `src/core/services/ApiService.ts`: All backend HTTP calls

**Testing & Quality:**
- No test files detected in codebase (see CONCERNS.md)

**Type Definitions:**
- `src/types/scenes.ts`: IAgentScene, IBoardScene, IMultiplayerScene
- `src/types/index.ts`: Barrel export

## Naming Conventions

**Files:**
- Scene files: PascalCase + "Scene" suffix → `TownScene.ts`, `RoomScene.ts`
- Class files: PascalCase → `Agent.ts`, `Player.ts`, `EventCenter.ts`
- System files: PascalCase + "System" suffix → `AgentManager.ts`, `ChatSystem.ts`
- Service files: PascalCase + "Service" suffix → `ApiService.ts`, `StorageService.ts`
- Component files: kebab-case + `.tsx` → `dot-loader.tsx`, `demo.tsx`
- Utility files: kebab-case + `.ts` → `timing.ts`, `sounds.ts`

**Directories:**
- Feature/domain directories: lowercase plural → `scenes/`, `classes/`, `systems/`, `components/`
- Organizational directories: lowercase → `core/`, `game/`, `utils/`, `lib/`, `types/`

**Type/Interface Names:**
- Interfaces prefixed with `I` → `IAgentScene`, `IBoardScene`, `IMultiplayerScene`
- DTO/payload types: PascalCase + suffix → `CreateUserDto`, `ChatRequest`, `StreamChunk`
- Enum names: PascalCase → `GameEvent`

**Variables & Functions:**
- camelCase for all variables and function names
- Constants (not in UPPERCASE): Exported constants use camelCase → `AGENTS`, `API_BASE_URL` (exceptions are legacy)
- Avoid underscore prefix for private (use `private` keyword)

## Where to Add New Code

**New Game Feature (e.g., minigame, activity):**
- Create new scene: `src/scenes/YourFeatureScene.ts`
- Add systems if needed: `src/game/systems/YourFeatureSystem.ts`
- Register in Phaser config: `src/index.ts` gameConfig.scene array
- Add route handling: `src/index.ts` parseRoute() and ROOM_ROUTES if URL-accessible
- Add types if new data flow: `src/types/scenes.ts`

**New Agent Type:**
- Add definition: `src/constants.ts` AGENTS object
- Add spawn position: `src/game/systems/AgentManager.ts` AGENT_SPAWN_POSITIONS
- Add to Cloudflare Workers list if needed: `src/constants.ts` CF_AGENTS array
- Add backend personality: `server.ts` AGENT_PERSONALITIES object

**New UI Component (React):**
- Create component: `src/components/ui/your-component.tsx`
- Export in barrel if reusable: Create barrel file or import directly
- Use Tailwind classes for styling
- Reference in React components (App.tsx, or via GameBridge callbacks)

**New API Endpoint:**
- Add method: `src/core/services/ApiService.ts` (type-safe wrapper)
- Implement backend: `server.ts` (Node.js) or `backend/` (Python)
- Add types: Define request/response interfaces in ApiService
- Export types from core barrel: `src/core/index.ts`

**New Game System:**
- Create system class: `src/game/systems/YourSystem.ts`
- Implement public methods for scene integration
- Add event listeners/emitters if cross-system communication needed
- Instantiate in relevant scene: `this.yourSystem = new YourSystem(config)`
- Export in barrel: `src/game/systems/index.ts`

**New Event Type:**
- Add to enum: `src/core/events/EventBus.ts` GameEvent
- Add payload type: `EventPayloads` interface in same file
- Emit: `eventBus.emitTyped(GameEvent.YOUR_EVENT, payload)`
- Listen: `eventBus.onTyped(GameEvent.YOUR_EVENT, (payload) => {})`

**New Global Service:**
- Create in `src/core/services/YourService.ts`
- Export singleton + class: `export const YourService = new YourServiceClass()`
- Add to barrel: `src/core/index.ts`
- Import and use: `import { YourService } from '../core'`

**Backend Feature:**
- Node.js: Add endpoint in `server.ts`, implement handler
- Python: Add route in `backend/server.py`, implement with models/controllers
- Update API routes in both if mirroring endpoints
- Update ApiService with new methods

**Utilities/Helpers:**
- Single-concern utilities: `src/utils/` with feature suffix → `sounds.ts`
- Shared helpers (classname, etc.): `src/lib/utils.ts`
- Game-specific constants: `src/constants.ts`

## Special Directories

**src/lib/**
- Purpose: Third-party utility wrappers and helpers
- Generated: No
- Committed: Yes
- Contains: classname helpers, common functions

**public/assets/**
- Purpose: Game assets (sprites, maps, audio)
- Generated: No (manually created/imported)
- Committed: Yes

**.opencode/**
- Purpose: OpenCode SDK for agentic code generation
- Generated: Yes (auto-generated by OpenCode tool)
- Committed: No (in .gitignore)

**.claude/**
- Purpose: Claude assistant state/history
- Generated: Yes
- Committed: No

**database/migrations/**
- Purpose: SQL migration files for schema versioning
- Generated: No
- Committed: Yes

**dist/**
- Purpose: Vite build output
- Generated: Yes (via `npm run build`)
- Committed: No

---

*Structure analysis: 2026-02-05*
