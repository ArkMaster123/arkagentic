# Coding Conventions

**Analysis Date:** 2026-02-05

## Naming Patterns

**Files:**
- PascalCase for class files: `Agent.ts`, `Player.ts`, `MultiplayerManager.ts`
- camelCase for utility/service files: `utils.ts`, `constants.ts`, `server.py`
- kebab-case for scene files (convention inconsistent): `TownScene.ts`, `ChatbotRuinsScene.ts`, `CharacterSelectScene.ts`
- PascalCase.tsx for React components: `App.tsx`, `DotLoader.tsx`, `Demo.tsx`

**Functions:**
- camelCase for all function names: `shuffle()`, `routeQuery()`, `distance()`, `escapeHtml()`
- Private methods prefixed with underscore: `_pool`, `_handlePlayerUpdate()`
- Async functions use camelCase: `createUser()`, `getConnection()`

**Variables:**
- camelCase for local variables and properties: `displayName`, `avatarSprite`, `isSpeaking`, `targetWorldX`
- UPPER_SNAKE_CASE for module constants: `DATABASE_URL`, `HEARTBEAT_INTERVAL_MS`, `API_BASE_URL`
- Type aliases and enums: `PascalCase` for enum names: `DIRECTION`, `GameEvent`, `RoomSceneData`
- Boolean variables prefixed with `is`, `has`, or `can`: `isLoading`, `isFading`, `isMoving`, `hasConnection`, `canJump`
- Private fields prefixed with underscore for class properties: `private _pool`, `private displayName`

**Types and Interfaces:**
- PascalCase for interface names: `PlayerState`, `GameRoomState`, `EventPayloads`, `RemotePlayerSprite`
- Interface names often use `I` prefix pattern (optional): Used selectively in `IAgentScene`, `IBoardScene`
- Type names in PascalCase: `type AgentType = keyof typeof AGENTS`
- Interface properties use camelCase: `displayName`, `sessionId`, `isMoving`

**Classes:**
- PascalCase for all class names: `Agent`, `Player`, `Actor`, `MultiplayerManager`, `MobileControlsManager`
- Constructor parameters use camelCase: `displayName`, `avatarSprite`, `sessionId`

## Code Style

**Formatting:**
- TypeScript with strict mode enabled (see `tsconfig.json`)
- No explicit formatter configuration found (Prettier/ESLint not configured in root)
- Indentation: 2 spaces (standard in TypeScript files)
- Line length: No strict limit enforced, but generally kept under 100 chars

**Linting:**
- tsconfig.json strict mode: `"strict": true`
- noUnusedLocals: disabled (`"noUnusedLocals": false`)
- noUnusedParameters: disabled (`"noUnusedParameters": false`)
- noFallthroughCasesInSwitch: enabled (`"noFallthroughCasesInSwitch": true`)
- No explicit ESLint/Biome configuration in root directory
- Type checking strict: No implicit any, must declare all types

**Spacing:**
- Single blank line between method definitions
- Double blank line between major sections (marked with comments)
- No extra blank lines within method bodies unless separating logical blocks

## Import Organization

**Order:**
1. External framework imports (Phaser, React, FastAPI, etc.)
2. External library imports (colyseus, lucide-react, dotenv)
3. Relative imports from `/src/` paths
4. Local relative imports using `@/` alias or `./`

**Examples:**
```typescript
// From Agent.ts
import { Actor } from './Actor';
import { DIRECTION } from '../utils';
import { COLOR_PRIMARY, AGENT_COLORS, AGENTS } from '../constants';
import { getIconSpan } from '../icons';
import eventsCenter from './EventCenter';
import { IAgentScene, isAgentScene } from '../types/scenes';
import type RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';
import type Label from 'phaser3-rex-plugins/templates/ui/label/Label';
```

**Path Aliases:**
- `@/*` resolves to `./src/*` (defined in tsconfig.json)
- Used in component imports: `import { Demo } from "@/components/ui/demo"`

## Error Handling

**Patterns:**
- Try-catch blocks for async operations and critical paths
- File: `src/scenes/TownScene.ts` uses try-catch extensively for API calls and layer operations
- Silent catch blocks for non-critical operations: `catch (e) { /* Layer doesn't exist */ }`
- Throwing errors from critical paths: `throw new Error('Root element not found')` in `src/main.tsx`
- Throwing errors from async operations: `throw new Error(\`API returned ${response.status}\`)`
- Response status checking before processing: `if (!response.ok)` pattern
- 404 handling returns null rather than throwing: `if (response.status === 404) { return null; }`

**HTTP Response Handling:**
- Check response status first, then parse JSON
- File: `src/core/services/ApiService.ts` uses consistent pattern:
```typescript
if (!response.ok) {
  throw new Error(`Failed to create user: ${response.status}`);
}
return response.json();
```

**Event Error Handling:**
- Parse errors from streaming responses caught separately
- Errors streamed as data objects with `type: 'error'` field

## Logging

**Framework:** console logging (no centralized logging library)

**Patterns:**
- Console.log used throughout for debug info (especially in game scenes)
- Prefixed with scope/context: `console.log('[TownScene] Agent clicked: ...')`
- Debug logs in critical paths: `console.log('[Swarm Stream] Started with agent: ...')`
- File: `src/scenes/TownScene.ts` uses prefix pattern extensively
- Python backend uses logging module with logger instance: `logger = logging.getLogger(__name__)`
- Logging levels configured: `logging.basicConfig(level=logging.INFO)`

**When to Log:**
- Scene lifecycle events (init, create, shutdown)
- Multiplayer connection state changes
- Agent actions (click, movement, work states)
- API call start/completion
- Stream processing milestones

## Comments

**When to Comment:**
- Complex algorithms explained before implementation (e.g., A* pathfinder in `Agent.ts`)
- Configuration sections marked with separator comments: `// ============================================`
- Functionality notes before methods: `// Simple A* pathfinder`
- Direction mapping documentation: `// Frames 0-2: DOWN (front facing)` etc.
- Setup steps documented inline: `// Start fading out after 2.5 seconds...`

**JSDoc/TSDoc:**
- Used for public methods and exported functions
- File: `src/core/services/ApiService.ts` uses JSDoc for method documentation:
```typescript
/**
 * Create a new user
 */
async createUser(data: CreateUserDto): Promise<User> {
```

- File: `src/classes/MultiplayerManager.ts` documents parameters:
```typescript
/**
 * Connect to the multiplayer server
 * @param roomSlug - The room to join (e.g., 'town')
 * @param playerInfo - Optional player info (name, avatar)
 */
```

- File: `src/utils.ts` includes function documentation:
```typescript
/**
 * Escape HTML special characters to prevent XSS attacks
 * Use this when rendering user-provided content in innerHTML
 */
export function escapeHtml(text: string): string {
```

- Deprecation notes used for legacy code:
```typescript
/**
 * @deprecated Use emitTyped with AGENT_* events instead
 */
```

## Function Design

**Size:**
- Methods generally 30-100 lines, with some larger scene methods (200+ lines for complex initialization)
- Most utility functions under 30 lines
- Initialization methods can be larger but segmented

**Parameters:**
- Use destructured objects for multiple related parameters
- File: `ApiService.ts` uses Dto objects: `async createUser(data: CreateUserDto)`
- Keep parameters <= 3; use options object for more

**Return Values:**
- Explicit return types required (TypeScript strict mode)
- Null returns for "not found" cases (404 responses)
- Promise<T> for async operations
- Union types for multiple return possibilities: `{ scene: string; data?: SceneData }`

## Module Design

**Exports:**
- Named exports for classes and interfaces
- File: `src/core/services/ApiService.ts` exports both interfaces and class:
```typescript
export interface User { ... }
export interface ChatRequest { ... }
export class ApiServiceClass { ... }
```

- File: `src/core/events/EventBus.ts` exports enum, interfaces, and instance:
```typescript
export enum GameEvent { ... }
export interface EventPayloads { ... }
export const eventBus = new TypedEventBus();
export default eventBus;  // Legacy
```

**Barrel Files:**
- Used for organized exports in `src/core/index.ts`:
```typescript
export type { EventPayloads } from './events/EventBus';
export type { GameBridgeCallbacks } from './services/GameBridge';
export { eventBus, GameEvent } from './events/EventBus';
```

- Keep barrel files focused on related exports
- File: `src/types/index.ts` re-exports from `./scenes` for centralized type access

**Module Organization:**
- Services in `src/core/services/` (ApiService, GameBridge, StorageService)
- Events/State management in `src/core/events/`
- Utility functions in utils files at appropriate levels
- Game scenes in `src/scenes/`
- Game logic classes in `src/classes/`
- UI components in `src/components/`

## Type Patterns

**Generic Types:**
- Used for flexible event handling in EventBus:
```typescript
emitTyped<K extends GameEvent>(event: K, payload: EventPayloads[K]): boolean
```

**Intersection Types:**
- File: `src/classes/MultiplayerManager.ts` uses interface extension for remote players

**Type Guards:**
- File: `src/types/scenes.ts` implements type guard functions:
```typescript
export function isAgentScene(scene: Phaser.Scene): scene is IAgentScene {
```

**Utility Types:**
- `Record<string, T>` for object type maps
- `Map<K, V>` for internal state collections
- `Optional<T>` patterns using `T | null` or `T | undefined`

---

*Convention analysis: 2026-02-05*
