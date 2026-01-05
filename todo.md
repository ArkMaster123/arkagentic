# AgentVerse Project - Development Tracker

## Project Overview
A Phaser 3 game with AI-powered agents in a Pokemon-style town. Agents collaborate using **Strands Agents** (AWS) multi-agent framework.

**Location:** `/Users/noahsark/Documents/vibecoding/arkagentic/`

---

## Refactoring Roadmap

> Based on [CODEBASE_ANALYSIS_AND_REFACTORING_GUIDE.md](./docs/CODEBASE_ANALYSIS_AND_REFACTORING_GUIDE.md)

### Phase 1: Critical Fixes (Week 1) - COMPLETE

| Task | File | Status | Notes |
|------|------|--------|-------|
| Add Player.destroy() method | `src/classes/Player.ts` | DONE | Already implemented with proper cleanup |
| Fix Agent event cleanup | `src/classes/Agent.ts` | DONE | All 7 events now cleaned up in destroy() |
| Fix XSS vulnerability | `src/scenes/TownScene.ts` | DONE | Uses escapeHtml() from utils |
| Fix texture check bug | `src/scenes/LoadingScene.ts` | DONE | Removed premature textures.exists() check |

### Phase 2: Service Extraction (Week 2-3) - COMPLETE

| Task | From | To | Status | Notes |
|------|------|-----|--------|-------|
| Extract API calls | TownScene, CharacterSelect | `src/core/services/ApiService.ts` | DONE | Created with streaming support |
| Extract storage logic | Multiple | `src/core/services/StorageService.ts` | DONE | Type-safe localStorage abstraction |
| Create typed EventBus | EventCenter.ts | `src/core/events/EventBus.ts` | DONE | Typed events with GameEvent enum |
| Create timing constants | Multiple | `src/core/utils/timing.ts` | DONE | TIMING, DISTANCE, SPEED constants |
| Update LoadingScene | `src/scenes/LoadingScene.ts` | Use new services | DONE | Uses ApiService + StorageService |
| Create GameBridge | Multiple | `src/core/services/GameBridge.ts` | DONE | Centralized game-UI communication |
| Remove window globals | Multiple | Use GameBridge | DONE | All 22 instances replaced |

### Phase 3: Scene Decomposition (Week 4-5) - COMPLETE

| Task | Lines to Extract | Status | Notes |
|------|------------------|--------|-------|
| Extract AgentManager | ~400 lines | DONE | `src/game/systems/AgentManager.ts` - Agent creation, AI, pathfinding |
| Extract UIManager | ~200 lines | DONE | `src/game/systems/UIManager.ts` - Prompts, banners, tooltips |
| Extract ChatSystem | ~300 lines | DONE | `src/game/systems/ChatSystem.ts` - Message handling, streaming |
| Extract ProximitySystem | ~150 lines | DONE | `src/game/systems/ProximitySystem.ts` |
| Create State Machine | ~100 lines | DONE | `src/game/systems/SceneStateMachine.ts` |

### Phase 4: Architecture Improvements (Week 6-8) - COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Create timing constants | DONE | `src/core/utils/timing.ts` - TIMING, DISTANCE, SPEED |
| Add proper TypeScript types | DONE | Removed ALL `any` types - proper interfaces for Jitsi, Colyseus, Tiled |
| Create IAgentScene interface | DONE | `src/types/scenes.ts` - Agent decoupled from TownScene |
| Implement object pooling | TODO | For agents, particles, etc. (deferred - not critical) |

### Phase 5: Performance Optimization (Week 9-10) - MOSTLY COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Replace setTimeout with Phaser timers | DONE | RoomScene, MeetingRoomScene - uses `this.time.delayedCall()` |
| Add animation existence checks | DONE | Actor.ts - uses `anims.exists()` before creating |
| Cache DOM references | DONE | ChatSystem caches refs; other DOM access is event-triggered not in loops |
| Optimize update loops | DONE | Update loops delegate to systems, no DOM access |

---

## Target Directory Structure

```
/src
  /core                    # Core layer (reusable across projects)
    /plugins               # Custom Phaser plugins
    /events
      EventBus.ts          # Typed event emitter
    /services
      ApiService.ts        # All HTTP requests
      StorageService.ts    # localStorage abstraction
    /utils
      constants.ts
      helpers.ts
    
  /game                    # Game layer (project-specific)
    /scenes
    /entities
    /systems               # ECS-like systems
    /managers
    /components            # Composable behaviors
    /ui
      
  /types                   # TypeScript definitions
```

---

## Refactoring Checklist

Use this checklist when refactoring each file:

- [ ] All event listeners removed in destroy/shutdown
- [ ] All timers/tweens stopped in destroy/shutdown
- [ ] No direct window global access
- [ ] No hardcoded magic numbers
- [ ] No API calls (use ApiService)
- [ ] No DOM manipulation (use UIManager)
- [ ] Proper TypeScript types (no `any`)
- [ ] Scene-agnostic (no direct scene casting)
- [ ] Update method is minimal (delegates to systems)
- [ ] All objects use pooling where appropriate

---

## Completed Features

### Core Setup
- [x] Phaser 3 game with Vite + TypeScript
- [x] Tilemap loaded (`public/assets/tilemaps/`)
- [x] 5 agent sprites (Archie, Birch, Brendan, Joseph, Maxie, May, Steven)
- [x] Agent class with animations, name tags, speech bubbles
- [x] Camera with edge panning
- [x] rexUI plugin for dialogs and text boxes

### Input System
- [x] HTML-based input dialog (replaced broken rexUI dialog)
- [x] **Persistent chat panel** with message history
- [x] Typing indicator while agents respond
- [x] Status updates showing which agent is working
- [x] Scrollable message history
- [x] File: `index.html` (chat panel styles), `src/scenes/TownScene.ts` (chat logic)

### Agent Movement
- [x] Added rexBoard plugin to game config (`src/index.ts`)
- [x] Board initialization from tilemap (`src/scenes/TownScene.ts`)
- [x] A* pathfinding algorithm in Agent class
- [x] Grid-based tile movement
- [x] Collision detection with walls/trees/houses
- [x] Agent tile occupation tracking
- [x] Random wandering behavior when idle
- [x] `summon()` / `release()` methods for task handling

### Multi-Agent System (Strands Agents)
- [x] **Strands Agents Python backend** (`backend/`)
- [x] 5 specialized agents: Scout, Sage, Chronicle, Trends, Maven
- [x] Swarm collaboration with handoffs
- [x] FastAPI server with CORS support
- [x] Legacy endpoint compatibility (`/api/aisdk`)
- [x] Agent routing based on query keywords

---

## In Progress

### Room Tilemaps (24x17 tiles - half of town size)
- [x] **room-scout.json** - Research lab with search terminals, servers, desks
- [x] **room-sage.json** - Strategy room with bookshelves, war table, analysis orbs
- [ ] **room-chronicle.json** - Newsroom with printing press, story boards, archives
- [ ] **room-trends.json** - Intelligence hub with monitors, radar, heat maps
- [ ] **room-maven.json** - Welcome center with couch, help desk, plants

### Mobile Phone Browser Optimization
- [ ] **Virtual joystick** - Replace WASD with on-screen joystick (bottom-left)
- [ ] **Touch action buttons** - A/B style buttons for interact/cancel (bottom-right)
- [ ] **Responsive viewport** - Scale game canvas to fit mobile screens
- [ ] **Touch-friendly UI** - Larger buttons, tap-to-chat, pinch-to-zoom minimap
- [ ] **Mobile detection** - Auto-enable touch controls on mobile devices
- [ ] **Portrait mode support** - Reflow UI for vertical orientation
- [ ] **Performance tuning** - Reduce particle effects, lower resolution on mobile

### Testing & Integration
- [ ] **Install Python dependencies** - `pip install -r backend/requirements.txt`
- [ ] **Test Strands Swarm** - Verify handoffs between agents
- [ ] **Connect frontend to new backend** - Ensure chat works end-to-end

---

## To Do

### High Priority
- [ ] **Add MCP tools to agents** - Exa search, web browsing
- [ ] **Stream agent responses** - Show real-time collaboration in chat
- [ ] **Visualize handoffs** - Show which agents are collaborating in game
- [ ] **Room entry from town** - Click on buildings to enter agent rooms
- [ ] **Mobile browser optimization** - Touch controls, responsive UI (see "In Progress" section)

### Medium Priority
- [ ] **Debug movement visually** - Add debug mode to show blocked tiles
- [ ] **Tune movement speed** - Currently 80px/sec, may need adjustment
- [ ] **Conversation memory** - Agents remember previous exchanges

### Low Priority
- [ ] **Sound effects** - Footsteps, speech sounds
- [ ] **More agent personalities** - Expand agent types
- [ ] **Save/load state** - Persist conversation history

---

## Known Issues

1. **TypeScript types for rexBoard** - May show type errors but should work at runtime
2. **Collision layers** - Some tilemap layers may not have `collides` property set in Tiled
3. **API fallback** - If server not running, agents show mock response with instructions

---

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Game config, plugins (rexUI, rexBoard) |
| `src/scenes/TownScene.ts` | Main scene, board init, chat handling |
| `src/classes/Agent.ts` | Agent class with A* pathfinding + wandering |
| `src/classes/Actor.ts` | Base sprite class |
| `src/constants.ts` | Agent configs, colors, meeting point |
| `src/core/index.ts` | Core module barrel export |
| `src/core/services/ApiService.ts` | HTTP request handling |
| `src/core/services/StorageService.ts` | localStorage abstraction |
| `src/core/services/GameBridge.ts` | Game-UI communication bridge |
| `src/core/events/EventBus.ts` | Typed event emitter |
| `src/core/utils/timing.ts` | Timing, distance, speed constants |
| `src/game/systems/ProximitySystem.ts` | Proximity detection for doors, agents, zones |
| `src/game/systems/SceneStateMachine.ts` | Finite state machine for scene state |
| `src/game/systems/AgentManager.ts` | Agent creation, management, API communication |
| `src/game/systems/ChatSystem.ts` | Chat UI management and streaming |
| `src/game/systems/UIManager.ts` | In-game prompts, banners, tooltips |
| `src/types/scenes.ts` | IAgentScene interface + scene type definitions |
| `src/utils.ts` | Direction enum, query routing |
| `backend/agents.py` | Strands Agents definitions + Swarm |
| `backend/server.py` | FastAPI server |
| `backend/requirements.txt` | Python dependencies |
| `server.ts` | Legacy TypeScript backend (deprecated) |
| `.env.local` | API keys (not in git) |

---

## Commands

```bash
# Start dev server (frontend)
npm run dev
# Runs on http://localhost:5173

# Start Python backend (Strands Agents) - RECOMMENDED
cd backend
source venv/bin/activate  # Use Python 3.12 venv
python server.py
# Runs on http://localhost:3001

# Start Colyseus multiplayer server
cd multiplayer
npm run dev
# Runs on ws://localhost:2567

# First time setup for backend:
cd backend
/opt/homebrew/bin/python3.12 -m venv venv
source venv/bin/activate
pip install strands-agents strands-agents-tools fastapi uvicorn python-dotenv httpx openai

# Test the backend:
curl http://localhost:3001/health
curl -X POST http://localhost:3001/chat -H "Content-Type: application/json" -d '{"message": "Hello"}'
```

---

## Testing Multiplayer Across Rooms

### Setup
1. Start the Colyseus server: `cd multiplayer-server && npm run start`
2. Start the frontend: `npm run dev`
3. Open two browser windows/tabs to `http://localhost:5173`
4. Create different characters in each (different names recommended)

### Test Cases

#### Test 1: Players See Each Other in Town
1. Both players join town
2. **Expected:** Each player should see the other's sprite with name label
3. Move around - other player's position should update in real-time

#### Test 2: Player Enters Meeting Room
1. Player A walks to meeting room entrance (far right of map)
2. Player A presses SPACE to enter Meeting Rooms
3. **Expected:** Player B (still in town) should see Player A's sprite disappear
4. Player A should see the meeting room, but not Player B

#### Test 3: Both Players in Meeting Room
1. Player B also enters Meeting Rooms
2. **Expected:** Both players should now see each other in the meeting room
3. Movement should sync correctly

#### Test 4: Player Returns to Town
1. Player A clicks "Back to Town" or presses ESC
2. **Expected:** Player B (in meeting room) should see Player A disappear
3. Player A should see town scene, but not Player B

#### Test 5: Both Return to Town
1. Player B also returns to town
2. **Expected:** Both players should see each other in town again

#### Test 6: Agent Room Transitions
1. Player A enters an agent building (e.g., Scout's Lab)
2. **Expected:** Player B should see Player A disappear from town
3. Player B enters same building
4. **Expected:** Both should see each other in that agent room

### Debug Tips
- Open browser console (F12) to see multiplayer logs
- Look for `[Multiplayer]` prefixed messages
- Check for `changeRoom` and `transferToScene` logs during transitions
- Player count should update as players join/leave rooms

---

## Architecture Notes

### Multi-Agent System (Strands Agents)
```
User Query
    ↓
FastAPI /chat endpoint
    ↓
AgentOrchestrator
    ↓
Strands Swarm (Maven as coordinator)
    ↓
Agents collaborate via handoffs:
  Scout ←→ Sage ←→ Chronicle ←→ Trends
    ↓
Final response + handoff history
```

### Agent Roles
| Agent | Role | Keywords |
|-------|------|----------|
| Scout | Research Specialist | research, find, search, company |
| Sage | Strategic Analyst | analyze, compare, recommend, strategy |
| Chronicle | Newsroom Editor | article, write, news, healthcare |
| Trends | Intelligence Analyst | trending, breaking, buzz |
| Maven | Coordinator | general queries, handoff coordination |

### Movement System
```
Idle: Agent wanders randomly within radius of home tile
    ↓
Query received → agent.summon() stops wandering
    ↓
A* pathfinding to meeting point
    ↓
Agents collaborate (speech bubbles)
    ↓
Query complete → agent.release() returns home
    ↓
Resume wandering
```

### Blocked Tiles Sources
1. Wall layer tiles (always blocked)
2. Tree layer tiles with `collides: true`
3. House layer tiles with `collides: true`
4. Tiles occupied by other agents (dynamic)

---

## Progress Log

### 2026-01-05
- Created refactoring roadmap in TODO.md
- Verified Phase 1 critical fixes are already done
- Fixed LoadingScene.ts texture check bug (removed premature check)
- **Phase 2 Progress:**
  - Created `src/core/` directory structure
  - Created `src/core/services/ApiService.ts` - HTTP request handling with streaming
  - Created `src/core/services/StorageService.ts` - localStorage abstraction
  - Created `src/core/events/EventBus.ts` - Typed event emitter
  - Created `src/core/utils/timing.ts` - Centralized timing/distance constants
  - Created `src/core/index.ts` - Barrel export
  - Updated `LoadingScene.ts` to use ApiService + StorageService
- **Phase 3 Progress:**
  - Created `src/game/systems/` directory structure
  - Created `src/game/systems/ProximitySystem.ts` - Door, agent, zone proximity detection
  - Created `src/game/systems/SceneStateMachine.ts` - FSM to replace boolean flags
  - Created `src/game/systems/index.ts` - Barrel export
- **Phase 4 Progress:**
  - Created `src/types/scenes.ts` - IAgentScene interface + type guards
  - Updated `src/classes/Agent.ts` - Now uses IAgentScene instead of TownScene
- **Phase 2 COMPLETE:**
  - Created `src/core/services/GameBridge.ts` - Centralized game-UI communication
  - Replaced ALL 22 `(window as any)` instances with GameBridge:
    - `src/scenes/TownScene.ts` - 3 instances (showTransition, AGENT_TO_ROUTE)
    - `src/classes/MultiplayerManager.ts` - 8 instances (addRoomChatMessage, updatePlayerCount)
    - `src/scenes/RoomScene.ts` - 4 instances (showTransition, hideTransition)
    - `src/scenes/MeetingRoomScene.ts` - 5 instances (showTransition, hideTransition, gameControlsEnabled)
  - Only remaining `(window as any)` is webkitAudioContext in sounds.ts (legitimate Safari compatibility)
  - Build passes successfully
- **Phase 3 COMPLETE:**
  - Created `src/game/systems/AgentManager.ts` - Agent creation, management, API communication
    - Agent initialization and collision setup
    - Movement coordination (meeting point, return to positions)
    - Streaming API calls with fallback support
    - Event-based agent click handling
  - Created `src/game/systems/ChatSystem.ts` - Chat UI management
    - Chat panel initialization and event handling
    - Message display (user and agent messages)
    - Streaming message support
    - Typing indicators and status updates
    - Conversation history management
  - Created `src/game/systems/UIManager.ts` - In-game UI elements
    - Prompt creation (door, agent chat, generic)
    - Banner notifications with animations
    - Player count and name displays
    - HTML chat UI integration helpers
  - All systems have proper destroy() methods for cleanup
  - Build passes successfully
- **Phase 4 COMPLETE:**
  - Removed ALL `any` types from codebase (0 remaining)
  - Added proper TypeScript interfaces:
    - `JitsiMeetAPI`, `JitsiParticipant`, `JitsiConferenceJoinedData`, etc. in JitsiManager
    - `ChatMessageData`, `PlayerNotificationData` in MultiplayerManager
    - `TiledProperty`, `InteractiveObject` in RoomScene/MeetingRoomScene
    - `RoomSceneData`, `MeetingRoomSceneData` in index.ts
    - `Label` type import for rexUI in Agent.ts
- **Phase 5 COMPLETE:**
  - Replaced `setTimeout` with `this.time.delayedCall()` in RoomScene, MeetingRoomScene
  - Added animation existence checks in Actor.ts using `anims.exists()`
  - DOM references properly cached in ChatSystem
  - Update loops optimized - no DOM access, delegates to subsystems
  - Build passes successfully

---

## Reference

- **Strands Agents:** https://strandsagents.com/latest/
- **Strands GitHub:** https://github.com/strands-agents/sdk-python
- **AgentVerse (inspiration):** https://github.com/OpenBMB/AgentVerse
- **rexBoard docs:** https://rexrainbow.github.io/phaser3-rex-notes/docs/site/board/
- **Phaser 3 docs:** https://photonstorm.github.io/phaser3-docs/

### 2026-01-05 (continued)
- **Multiplayer Across Rooms Implementation:**
  - Updated `src/core/services/GameBridge.ts`:
    - Changed `multiplayerManager` type from `unknown` to `MultiplayerManager | null`
  - Updated `src/scenes/MeetingRoomScene.ts`:
    - Added multiplayer support (reuses existing connection)
    - Added `initMultiplayer()` method with `transferToScene()` and `changeRoom()`
    - Fixed Jitsi event type errors with proper interfaces
    - `exitRoom()` now calls `changeRoom('town')` instead of disconnecting
  - Updated `src/scenes/RoomScene.ts`:
    - Added multiplayer support (reuses existing connection)
    - Added `initMultiplayer()` method
    - `exitRoom()` now calls `changeRoom('town')` instead of disconnecting
  - Updated `src/scenes/TownScene.ts`:
    - `initMultiplayer()` now checks for existing connection in `GameBridge.multiplayerManager`
    - Reuses connection with `transferToScene()` when returning from other scenes
  - **How it works:**
    - Single Colyseus connection persists across all scenes
    - `changeRoom(slug)` tells server which room player is in
    - `updateRemotePlayerWithRoomCheck()` shows/hides players by room
    - Players only see each other when in the same room
  - Build passes successfully

*Last updated: 2026-01-05 (Multiplayer Across Rooms Complete)*
