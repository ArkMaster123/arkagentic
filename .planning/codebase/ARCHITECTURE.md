# Architecture

**Analysis Date:** 2026-02-05

## Pattern Overview

**Overall:** Three-tier layered architecture with event-driven messaging. Combines a Phaser 3 game engine (frontend) with a Node.js HTTP backend for AI agent communication and optional Cloudflare Workers for specific agent implementations.

**Key Characteristics:**
- Separation of concerns between UI (Phaser scenes), game logic (systems), and backend communication (services)
- Event bus pattern for decoupled component communication within the game
- Scene-based routing matching URL navigation to game scene states
- Service layer abstracts external API calls (chat, user management, session validation)
- Type-safe interfaces define contracts between major layers

## Layers

**Presentation / UI Layer:**
- Purpose: Render visual game world, handle player input, display chat interfaces
- Location: `src/scenes/`, `src/components/`
- Contains: Phaser Scene subclasses (TownScene, RoomScene, MeetingRoomScene, etc.), React UI components
- Depends on: Game systems, core services, constants, types
- Used by: Player interactions drive scene logic

**Game Logic / Systems Layer:**
- Purpose: Encapsulate specific game mechanics and state management
- Location: `src/game/systems/`
- Contains: AgentManager, ChatSystem, UIManager, ProximitySystem, SceneStateMachine
- Depends on: Classes, events, core services, API service
- Used by: Scenes instantiate and call systems for coordinated behavior

**Entity/Class Layer:**
- Purpose: Model game world objects (actors, agents, players)
- Location: `src/classes/`
- Contains: Agent, Player, Actor, EventCenter, JitsiManager, MultiplayerManager, MobileControls, MiniMap
- Depends on: Types, constants, core utilities
- Used by: Scenes and systems manage collections of entities

**Core Services Layer:**
- Purpose: Provide centralized, reusable functionality across the application
- Location: `src/core/`
- Contains: EventBus (pub/sub messaging), ApiService (HTTP requests), GameBridge (game-to-UI communication), StorageService (local storage)
- Depends on: Types, constants
- Used by: Scenes, systems, entities subscribe/publish events or call API/storage

**Configuration Layer:**
- Purpose: Centralize constants, agent definitions, color schemes, endpoints
- Location: `src/constants.ts`
- Contains: AGENTS object (5 main agents + gandalfius), API/Cloudflare URLs, Jitsi config, colors, spawn positions
- Used by: All other layers reference constants

**Backend / API Layer:**
- Purpose: Handle AI agent responses, user management, streaming chat
- Location: `server.ts` (Node.js HTTP server), `/backend/` (Python)
- Contains: Request routing, rate limiting, personality-based responses, session management
- Depends on: OpenRouter AI API or Anthropic API
- Used by: Frontend via ApiService.chat() and ApiService.chatStream()

## Data Flow

**User Input → Game State Update:**

1. Player presses arrow key (Phaser input handler in scene)
2. Scene updates Player position, emits `PLAYER_MOVED` event via eventBus
3. Multiple subscribers (proximity system, multiplayer manager, jitsi manager) react
4. Scene updates sprite position/velocity
5. Event bubbles to any UI listeners via GameBridge

**Chat Interaction → Agent Response:**

1. Player selects agent and types message in chat UI
2. UI calls `ApiService.chat()` or `ApiService.chatStream()`
3. ApiService fetches to backend `/api/aisdk` endpoint (for local) or `/chat` (for Python backend)
4. Request includes: message, agent type, conversation history, model_id
5. Backend routes to OpenRouter or Cloudflare Worker depending on CF_AGENTS list
6. Streaming response yields chunks that UI processes incrementally
7. Scene receives final response, agent speaks via text bubble and animation
8. EventBus emits `CHAT_MESSAGE_RECEIVED` for UI updates

**Scene Navigation:**

1. Window.navigateTo('/town/researchlab') called or history back/forward
2. URL parsing in `src/index.ts` determines target scene (room-scene with agentType, or town-scene)
3. Active scenes are stopped, new scene starts with route data
4. Scene initializes: loads map, creates entities, sets up systems
5. EventBus emits `SCENE_READY` when fully initialized

**State Management:**

- Player position/direction: Stored in Player object, synced via multiplayer manager
- Agent positions/behavior: Managed by Agent instances + AgentManager
- Conversation history: Stored in ConversationMessage[] arrays in scenes
- Global game state: GameBridge holds selected agent, preferred model, controls enabled flag
- Persistent settings: StorageService reads/writes to localStorage

## Key Abstractions

**IAgentScene Interface:**
- Purpose: Define contract for any scene that manages agents (movement, blocking, tile conversion)
- Location: `src/types/scenes.ts`
- Examples: `TownScene` implements tile-to-world conversion, walkability checks, tile occupation
- Pattern: Agents call `scene.worldToTile()`, `scene.isTileWalkable()` without knowing scene details

**EventBus (Pub/Sub):**
- Purpose: Decouple producers and consumers of game events
- Location: `src/core/events/EventBus.ts`
- Pattern: `eventBus.emitTyped(GameEvent.PLAYER_MOVED, payload)` and `eventBus.onTyped(GameEvent.PLAYER_MOVED, handler)`
- Type-safe via `GameEvent` enum and `EventPayloads` interface

**GameBridge:**
- Purpose: Single point for game-to-UI communication and global state
- Location: `src/core/services/GameBridge.ts`
- Pattern: Scenes/systems call `GameBridge.showTransition()`, `GameBridge.selectAgentForChat()` instead of manipulating window
- Also installed on `window` as properties for backward compatibility

**ApiService:**
- Purpose: Centralize all backend HTTP requests
- Location: `src/core/services/ApiService.ts`
- Pattern: Type-safe methods like `chat(request)`, `chatStream(request)` with structured payloads
- Supports both regular polling and streaming responses via AsyncGenerator

**Agent Class:**
- Purpose: Model a game agent with movement, AI communication, animations
- Location: `src/classes/Agent.ts`
- Pattern: Extends Actor, manages own animations (speak, think, working), A* pathfinding, wandering behavior
- Decoupled from scene via `IAgentScene` interface

## Entry Points

**Game Initialization:**
- Location: `src/main.tsx`
- Triggers: Page load via Vite dev server or build output
- Responsibilities: Creates React root, renders App component, imports Phaser game

**Phaser Game Config & Scene Registry:**
- Location: `src/index.ts`
- Triggers: Module import in main.tsx, Phaser Game constructor runs immediately
- Responsibilities: Defines gameConfig with all scenes, handles URL routing, installs navigation on window, initializes GameBridge

**Main Scenes:**
- `LoadingScene`: Asset loading and initialization
- `CharacterSelectScene`: Player avatar/name selection
- `TownScene`: Main collaborative space with agents, multiplayer, proximity zones
- `RoomScene`: Agent-specific conversation space (one per agent type)
- `MeetingRoomScene`: Private chat area for team collaboration
- `ChatbotRuinsScene`: Historical/easter egg scene
- `SlimShadyScene`: Secret easter egg scene

**Backend Server:**
- Location: `server.ts` (Node.js at port 3001)
- Triggers: `npm run server`
- Responsibilities: HTTP API for chat (`/api/aisdk`), health check, rate limiting, agent personality injection

## Error Handling

**Strategy:** Try-catch in async operations, graceful fallbacks to mock responses, event emission for UI feedback.

**Patterns:**

- **API Calls:** `ApiService.chat()` throws on non-200 status; callers wrap in try-catch or use fallback
  - Example in AgentManager: If backend unavailable, return mock response via `ApiService.getMockResponse()`

- **Streaming:** `chatStream()` yields `StreamChunk` with `type: 'error'`; consumer checks type and handles

- **Scene Initialization:** Scenes check for required data before using; `IAgentScene` type guard `isAgentScene()` validates capability

- **Event Errors:** EventBus handlers should not throw; logged to console for debugging

- **Multiplayer Disconnect:** Caught by MultiplayerManager, emits `MULTIPLAYER_DISCONNECTED` event

- **Jitsi Failures:** JitsiManager catches iframe errors, falls back to text-only chat

## Cross-Cutting Concerns

**Logging:**
- Approach: `console.log()` / `console.warn()` / `console.error()` scattered throughout
- No centralized logger; team can view browser console or server logs via docker-compose

**Validation:**
- Approach: TypeScript interfaces ensure shape correctness at compile-time
- Runtime checks use optional chaining (`?.`) and type guards (`isAgentScene()`)
- API responses validated via instanceof checks or null-coalescing

**Authentication:**
- Approach: Session tokens stored in StorageService, passed to backend in createUser or chat requests
- No JWT verification on frontend; backend validates token with `/auth/validate` endpoint

**Rate Limiting:**
- Backend: IP-based rate limit (10 requests/minute) in `server.ts`
- Frontend: No client-side throttling; relies on server rejection

---

*Architecture analysis: 2026-02-05*
