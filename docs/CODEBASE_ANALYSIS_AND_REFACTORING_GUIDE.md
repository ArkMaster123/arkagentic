# ArkAgentic Codebase Analysis & Refactoring Guide

> **Purpose**: A brutal, honest assessment of the codebase with actionable recommendations for a clean refactor. This document identifies architectural issues, anti-patterns, violations of Phaser best practices, and provides a prioritized roadmap for improvement.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Critical Issues (Must Fix)](#critical-issues-must-fix)
4. [High Priority Issues](#high-priority-issues)
5. [Medium Priority Issues](#medium-priority-issues)
6. [Best Practices Analysis](#best-practices-analysis)
7. [Phaser 3 Best Practices Comparison](#phaser-3-best-practices-comparison)
8. [Recommended Architecture](#recommended-architecture)
9. [Refactoring Roadmap](#refactoring-roadmap)
10. [References](#references)

---

## Executive Summary

### The Good
- Working multiplayer integration with Colyseus
- Functional AI agent system with streaming responses
- Clean separation of backend (Python/FastAPI) from frontend
- Proper use of Phaser's scene system for different game states
- Tilemap integration with Tiled

### The Bad
- **God Object anti-pattern**: `TownScene.ts` at 1,956 lines handles too many responsibilities
- **Memory leaks**: Missing cleanup in `Player.ts`, partial cleanup in `Agent.ts`
- **Tight coupling**: Agent class casts to `TownScene` in 12+ locations
- **Window global abuse**: 15+ instances of `(window as any).xxx`
- **No dependency injection**: Heavy reliance on global state and direct imports
- **Inconsistent patterns**: Mix of ECS-like composition and inheritance
- **Magic numbers**: Hardcoded timeouts scattered throughout (5000, 3000, 800ms)

### The Ugly
- XSS vulnerability in `TownScene.ts:956-961` via innerHTML manipulation
- Potential security issue with exposed game internals via window globals
- `textures.exists()` check in `LoadingScene.ts:96-104` happens before textures are loaded (bug)
- Event listeners registered but never removed (memory leaks)

---

## Architecture Overview

### Current Structure
```
/src
  /classes          # Game entities (Actor, Player, Agent, Managers)
  /scenes           # Phaser scenes (Loading, CharacterSelect, Town, Room, MeetingRoom)
  /components/ui    # React UI components
  /utils            # Helpers (sounds.ts)
  constants.ts      # Configuration and agent definitions
  utils.ts          # General utilities (routing, distance)
  index.ts          # Phaser game entry point
  main.tsx          # React entry point
```

### Problems with Current Structure

| Issue | Location | Severity |
|-------|----------|----------|
| No separation of concerns | `/src/classes/` mixes entities, managers, and singletons | High |
| Missing service layer | API calls embedded in scenes | High |
| No state management | Data scattered across localStorage, scenes, window globals | High |
| Inconsistent file organization | Some logic in utils, some in classes, some inline in scenes | Medium |

---

## Critical Issues (Must Fix)

### 1. Missing `destroy()` Method in Player.ts

**File**: `src/classes/Player.ts`

**Problem**: Player class has no destroy method, causing memory leaks.

```typescript
// CURRENT: No cleanup
export class Player extends Actor {
  private nameLabel!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  // ... no destroy() method
}
```

**Impact**: 
- `nameLabel` persists after player is destroyed
- Keyboard listeners remain active
- `onPositionChange` callback never cleaned up

**Fix**:
```typescript
destroy(fromScene?: boolean): void {
  this.nameLabel?.destroy();
  this.scene.input.keyboard?.removeAllKeys();
  this.onPositionChange = undefined;
  super.destroy(fromScene);
}
```

**Reference**: [Phaser Docs - Scene Lifecycle](https://docs.phaser.io/phaser/concepts/scenes) states "Free-up any resources that may be in use by this scene" during shutdown.

---

### 2. Incomplete Event Listener Cleanup in Agent.ts

**File**: `src/classes/Agent.ts:636-638`

**Problem**: Only 3 of 7 event listeners are removed in `destroy()`.

```typescript
// CURRENT: Incomplete cleanup
destroy(fromScene?: boolean): void {
  eventsCenter.off(`${this.id}-moveTo`);
  eventsCenter.off(`${this.id}-speak`);
  eventsCenter.off(`${this.id}-think`);
  // MISSING: ${this.id}-up, ${this.id}-down, ${this.id}-left, ${this.id}-right
  super.destroy(fromScene);
}
```

**Impact**: Memory leak - orphaned event listeners can cause errors when events fire for destroyed agents.

**Fix**:
```typescript
destroy(fromScene?: boolean): void {
  const events = ['moveTo', 'speak', 'think', 'up', 'down', 'left', 'right'];
  events.forEach(event => eventsCenter.off(`${this.id}-${event}`));
  super.destroy(fromScene);
}
```

---

### 3. XSS Vulnerability in TownScene.ts

**File**: `src/scenes/TownScene.ts:956-961`

**Problem**: Direct innerHTML manipulation with potentially unsafe content.

```typescript
// VULNERABLE CODE
if (chatContainer) {
  chatContainer.innerHTML += `<div class="message">${agentName}: ${message}</div>`;
}
```

**Impact**: Malicious agent names or messages could inject scripts.

**Fix**: Use the existing `escapeHtml()` method (which exists at line 1237-1253 but isn't used here):
```typescript
if (chatContainer) {
  const safeMessage = this.escapeHtml(message);
  const safeName = this.escapeHtml(agentName);
  chatContainer.innerHTML += `<div class="message">${safeName}: ${safeMessage}</div>`;
}
```

---

### 4. Bug: Texture Check Before Load in LoadingScene.ts

**File**: `src/scenes/LoadingScene.ts:96-104`

**Problem**: `textures.exists()` is checked in `preload()` before textures are actually loaded.

```typescript
// BUG: This check happens BEFORE loading completes
preload() {
  // ...loading code...
  
  // This will always be false during preload!
  if (this.textures.exists('someTex')) {
    // Never reached
  }
}
```

**Fix**: Move texture existence checks to `create()` or use load complete events.

---

### 5. God Object: TownScene.ts (1,956 Lines)

**File**: `src/scenes/TownScene.ts`

**Problem**: Single file handles:
- Map loading and collision setup
- Player creation and movement
- Agent creation, AI, and pathfinding
- Multiplayer synchronization
- Jitsi video chat integration
- Chat UI and messaging
- Door/building interaction
- Meeting room transitions
- Mini-map
- Keyboard input

**Phaser Best Practice Violation**: 
> "Keep the Scene's update method as empty as possible. Have plugins that listen for the update event and run code there. This gives you a way to separate out your logic nicely."
> -- [Phaser Discord Best Practices](https://phaser.discourse.group/t/what-are-phaser-3-bad-best-practices/5088)

**Current Update Method**:
```typescript
update() {
  // 40+ lines of collision checks, proximity detection, agent updates
  // Multiple loops every frame
  // Direct DOM manipulation
}
```

---

## High Priority Issues

### 6. Window Global Abuse (15+ Instances)

**Files**: Multiple scenes and managers

**Examples**:
```typescript
// TownScene.ts
(window as any).multiplayerManager = this.multiplayer;  // Line 588
(window as any).addRoomChatMessage(...)                 // MultiplayerManager.ts:247

// Player.ts
(window as any).gameControlsEnabled !== false           // Line 149-160
```

**Impact**:
- Security risk (game internals exposed)
- Tight coupling between components
- Difficult to test
- Race conditions possible

**Best Practice**: Use Phaser's built-in event emitter or a proper state management solution.

---

### 7. Tight Coupling: Agent to TownScene

**File**: `src/classes/Agent.ts`

**Problem**: Agent directly casts `this.scene as TownScene` in 12 locations:
- Lines 63, 148, 210, 279, 285, 323, 470, 520, 557, 620

```typescript
// PROBLEM: Agent cannot work in any other scene
const townScene = this.scene as TownScene;
if (townScene && typeof townScene.freeTile === 'function') {
  townScene.freeTile(this.tileX, this.tileY);
}
```

**Best Practice**: Use interfaces or events instead of direct coupling.

**Fix**: Define an interface that any scene using agents must implement:
```typescript
interface IAgentScene extends Phaser.Scene {
  freeTile(x: number, y: number): void;
  occupyTile(x: number, y: number, agent: Agent): void;
  getTileAt(x: number, y: number): boolean;
}
```

---

### 8. API Calls in Scenes

**Files**: `TownScene.ts:1474-1625`, `CharacterSelectScene.ts:384-461`

**Problem**: HTTP requests embedded directly in scene code.

```typescript
// TownScene.ts - 150 lines of API logic inside scene
async callAgentAPI(agentId: string, message: string) {
  const response = await fetch(`${API_BASE_URL}/chat`, {...});
  // streaming logic, error handling, etc.
}
```

**Best Practice**: Extract to a dedicated service class.

---

### 9. Duplicate Code Across Scenes

**Problem**: Same code duplicated in multiple files:

| Code | Files | Lines |
|------|-------|-------|
| `areControlsDisabled()` | TownScene, RoomScene, MeetingRoomScene | 3 copies |
| Sprite size definitions | LoadingScene (66-74 and 86-94) | Duplicated in same file |
| Session token generation | LoadingScene, CharacterSelectScene | 2 copies |
| Jitsi UI handlers | TownScene, MeetingRoomScene | 2 copies |

---

### 10. No State Machine for Complex State

**File**: `TownScene.ts`

**Problem**: 20+ boolean flags manage state instead of a proper state machine:
```typescript
nearbyDoor: boolean
nearMeetingRoomEntrance: boolean  
nearbyAgent: Agent | null
isLoading: boolean
currentJitsiZone: string | null
// ... and more
```

**Best Practice**: 
> "Use finite state machines rather than a state variable with a big if/else statement. It's hard to navigate your code when you're dealing with a giant if/else statement."
> -- [Phaser Best Practices](https://phaser.discourse.group/t/what-are-phaser-3-bad-best-practices/5088)

---

## Medium Priority Issues

### 11. Magic Numbers Throughout Codebase

**Examples**:
```typescript
// TownScene.ts
this.time.delayedCall(5000, () => {...});  // Why 5000?
this.time.delayedCall(3000, () => {...});  // Why 3000?

// Agent.ts
this.scene.time.delayedCall(800, () => {...});  // Why 800?
```

**Fix**: Define constants:
```typescript
// constants.ts
export const TIMING = {
  AGENT_RETURN_DELAY: 5000,
  SPEECH_BUBBLE_AUTO_HIDE: 3000,
  MOVEMENT_STEP_DELAY: 800,
};
```

---

### 12. Using `setTimeout` Instead of Phaser Timers

**Files**: `RoomScene.ts:94-98`, `MeetingRoomScene.ts:68-72`

**Problem**:
```typescript
// BAD: Uses window.setTimeout
(window as any).setTimeout(() => {
  this.setupRoom();
}, 100);
```

**Best Practice**: Use Phaser's timer system which respects scene lifecycle:
```typescript
// GOOD: Uses Phaser timer
this.time.delayedCall(100, () => {
  this.setupRoom();
});
```

---

### 13. Missing Animation Existence Checks

**File**: `src/classes/Actor.ts:21-70`

**Problem**: Animation creation doesn't check if animations already exist.

```typescript
// Will throw error if called twice with same name
initAnimations() {
  this.scene.anims.create({
    key: this.name + '-walk-down',
    // ...
  });
}
```

**Fix**:
```typescript
initAnimations() {
  const key = `${this.name}-walk-down`;
  if (!this.scene.anims.exists(key)) {
    this.scene.anims.create({ key, ... });
  }
}
```

---

### 14. Hardcoded Location Data in MiniMap

**File**: `src/classes/MiniMap.ts:28-39`

**Problem**: World locations hardcoded in component file.

```typescript
const WORLD_LOCATIONS: LocationMarker[] = [
  { id: 'ark-central', name: 'Ark Central Village', x: 38, y: 42, ... },
  // ...
];
```

**Fix**: Move to constants or load from tilemap properties.

---

### 15. Any Type Abuse

**Files**: Multiple

**Examples**:
```typescript
// Agent.ts
textBox: any = undefined;
thoughtBubble: any = undefined;

// JitsiManager.ts
api: any = null;

// Throughout codebase
(import.meta as any).env
(window as any).gameControlsEnabled
```

**Fix**: Define proper types or interfaces:
```typescript
import type RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';

textBox: RexUIPlugin.TextBox | null = null;
```

---

## Best Practices Analysis

### What We Did Right

| Practice | Implementation | Reference |
|----------|----------------|-----------|
| TypeScript over JavaScript | Full TypeScript codebase | [Phaser Best Practices](https://phaser.discourse.group/t/what-are-phaser-3-bad-best-practices/5088) |
| Extend Phaser.Scene | All scenes properly extend | [Phaser Docs](https://docs.phaser.io/phaser/concepts/scenes) |
| One file per scene | Yes, 5 scene files | Community standard |
| Constants file | Yes, `constants.ts` | [Phaser Best Practices](https://phaser.discourse.group/t/what-are-phaser-3-bad-best-practices/5088) |
| Separate loading scene | Yes, `LoadingScene.ts` | [Game Flow Best Practice](https://phaser.discourse.group/t/what-are-phaser-3-bad-best-practices/5088) |
| Event emitter singleton | Yes, `EventCenter.ts` | Phaser pattern |

### What We Did Wrong

| Practice | Our Violation | Best Practice | Reference |
|----------|--------------|---------------|-----------|
| Object pooling | Not used anywhere | Pre-create reusable objects | [Phaser Performance](https://franzeus.medium.com/how-i-optimized-my-phaser-3-action-game-in-2025-5a648753f62b) |
| Keep update() empty | 40+ lines, multiple loops | Use events/systems | [Phaser Discord](https://phaser.discourse.group/t/what-are-phaser-3-bad-best-practices/5088) |
| Scene cleanup | Incomplete destroy methods | Always cleanup in shutdown | [Phaser Docs](https://docs.phaser.io/phaser/concepts/scenes) |
| Dependency injection | Window globals everywhere | Use DI container or events | [SOLID in Phaser](https://dev.to/belka/the-power-of-dependency-injection-in-phaser-3-building-a-modular-game-with-solid-principles-5251) |
| State machines | Boolean flags | Proper FSM | [State Pattern](https://blog.ourcade.co/posts/2020/state-pattern-ai-player-control-phaser-3/) |
| ECS architecture | Mixed inheritance + ad-hoc | Consistent ECS | [ECS in Phaser](https://blog.ourcade.co/posts/2023/building-phaser-3-ecs-game-with-reactjs/) |
| Cached references | `document.getElementById` in loops | Cache DOM refs | [Performance Guide](https://franzeus.medium.com/how-i-optimized-my-phaser-3-action-game-in-2025-5a648753f62b) |

---

## Phaser 3 Best Practices Comparison

### Scene Lifecycle Management

**Best Practice** (from [Phaser Docs](https://docs.phaser.io/phaser/concepts/scenes)):
> "Listen to the shutdown event to free-up any resources that may be in use by this scene"

**Our Implementation**: Partial compliance

| Scene | Has shutdown() | Cleans timers | Cleans events | Cleans objects |
|-------|---------------|---------------|---------------|----------------|
| TownScene | Yes | Partial | No | Partial |
| RoomScene | No | No | No | Yes (exitRoom) |
| MeetingRoomScene | No | No | No | Yes (exitRoom) |
| CharacterSelectScene | No | No | No | No |
| LoadingScene | N/A | N/A | N/A | N/A |

---

### Memory Management

**Best Practice** (from [Performance Guide](https://franzeus.medium.com/how-i-optimized-my-phaser-3-action-game-in-2025-5a648753f62b)):
> "If your sprite is not on the screen then set it to visible = false. If your sprite is not used anymore, deactivate it. Make sure to stop everything attached to it such as tweens or particle emitters."

**Our Implementation**: Non-compliant

| Issue | Location | Fix |
|-------|----------|-----|
| Tweens not stopped | MiniMap pulse animation | Stop in destroy() |
| Event listeners orphaned | Agent direction events | Remove all in destroy() |
| DOM elements not cleaned | Chat containers | Remove in shutdown() |

---

### Performance Optimization

**Best Practice** (from [Phaser Performance](https://franzeus.medium.com/how-i-optimized-my-phaser-3-action-game-in-2025-5a648753f62b)):
> "Use object pools. Cache references. Only loop through what you need."

**Our Implementation**: Non-compliant

| Recommendation | Our Status | Impact |
|----------------|------------|--------|
| Object pools | Not used | GC pauses when spawning |
| Cached references | Partial | DOM queries in update() |
| Minimal update loops | 2 loops per frame | CPU overhead |
| Texture packer | Not used | More HTTP requests |

---

### Code Architecture

**Best Practice** (from [SOLID in Phaser](https://dev.to/belka/the-power-of-dependency-injection-in-phaser-3-building-a-modular-game-with-solid-principles-5251)):
> "By default, Phaser tends to be very iterative and requires a heavily procedural approach. This can become cumbersome and lead to messy codebases."

**Our Implementation**: Exhibits classic Phaser anti-patterns

| Pattern | Best Practice | Our Implementation |
|---------|--------------|-------------------|
| Core vs Game Layer | Separate concerns | Mixed together |
| Kernel/DI Container | Centralized dependencies | Window globals |
| Component-based | Small, focused components | God objects |
| Service abstraction | Services for external APIs | Inline in scenes |

---

## Recommended Architecture

### Proposed Directory Structure

```
/src
  /core                    # Core layer (reusable across projects)
    /plugins               # Custom Phaser plugins
      InputManager.ts
      UIManager.ts
      PathfindingService.ts
    /events
      EventBus.ts          # Replace EventCenter with typed events
    /services
      ApiService.ts        # All HTTP requests
      StorageService.ts    # localStorage abstraction
    /utils
      constants.ts
      helpers.ts
    Kernel.ts              # DI container
    
  /game                    # Game layer (project-specific)
    /scenes
      BootScene.ts         # Asset loading only
      MenuScene.ts         # Main menu
      TownScene.ts         # Simplified - delegates to managers
      RoomScene.ts
      MeetingRoomScene.ts
    /entities
      Actor.ts             # Base class
      Player.ts
      Agent.ts
      RemotePlayer.ts
    /systems               # ECS-like systems
      MovementSystem.ts
      PathfindingSystem.ts
      ProximitySystem.ts
      ChatSystem.ts
    /managers
      AgentManager.ts
      MultiplayerManager.ts
      JitsiManager.ts
      UIManager.ts
    /components            # Composable behaviors
      SpeechBubble.ts
      NameLabel.ts
      WanderBehavior.ts
    /ui
      MiniMap.ts
      ChatPanel.ts
      
  /types                   # TypeScript definitions
    index.d.ts
    phaser.d.ts
    rexui.d.ts
```

### Key Architectural Changes

#### 1. Event Bus with Typed Events

```typescript
// core/events/EventBus.ts
export enum GameEvent {
  PLAYER_MOVED = 'player:moved',
  AGENT_CLICKED = 'agent:clicked',
  CHAT_MESSAGE = 'chat:message',
  SCENE_READY = 'scene:ready',
}

interface EventPayloads {
  [GameEvent.PLAYER_MOVED]: { x: number; y: number };
  [GameEvent.AGENT_CLICKED]: { agentId: string };
  [GameEvent.CHAT_MESSAGE]: { from: string; message: string };
}

class TypedEventBus extends Phaser.Events.EventEmitter {
  emit<K extends GameEvent>(event: K, payload: EventPayloads[K]): boolean {
    return super.emit(event, payload);
  }
  
  on<K extends GameEvent>(event: K, fn: (payload: EventPayloads[K]) => void): this {
    return super.on(event, fn);
  }
}
```

#### 2. API Service Layer

```typescript
// core/services/ApiService.ts
export class ApiService {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async createUser(data: CreateUserDto): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }
  
  async* streamChat(agentId: string, message: string): AsyncGenerator<string> {
    // Streaming logic extracted from TownScene
  }
}
```

#### 3. State Machine for Scene State

```typescript
// game/systems/SceneStateMachine.ts
enum TownState {
  EXPLORING,
  CHATTING,
  IN_MENU,
  TRANSITIONING,
  IN_JITSI,
}

class TownStateMachine {
  private state: TownState = TownState.EXPLORING;
  
  canInteract(): boolean {
    return this.state === TownState.EXPLORING;
  }
  
  transition(newState: TownState): void {
    // Validate transition
    // Emit events
    this.state = newState;
  }
}
```

#### 4. Simplified TownScene

```typescript
// game/scenes/TownScene.ts (target: ~300 lines)
export class TownScene extends Phaser.Scene {
  private agentManager!: AgentManager;
  private uiManager!: UIManager;
  private multiplayerManager!: MultiplayerManager;
  private stateMachine!: TownStateMachine;
  
  create() {
    this.setupMap();
    this.agentManager = new AgentManager(this);
    this.uiManager = new UIManager(this);
    this.multiplayerManager = new MultiplayerManager(this);
    this.stateMachine = new TownStateMachine();
    
    this.setupEventListeners();
  }
  
  update(time: number, delta: number) {
    // Delegate to systems
    this.agentManager.update(delta);
  }
  
  shutdown() {
    this.agentManager.destroy();
    this.uiManager.destroy();
    this.multiplayerManager.destroy();
  }
}
```

---

## Refactoring Roadmap

### Phase 1: Critical Fixes (Week 1)

| Task | File | Effort | Risk |
|------|------|--------|------|
| Add Player.destroy() | Player.ts | 1h | Low |
| Fix Agent event cleanup | Agent.ts | 1h | Low |
| Fix XSS vulnerability | TownScene.ts | 30m | Low |
| Fix texture check bug | LoadingScene.ts | 30m | Low |

### Phase 2: Service Extraction (Week 2-3)

| Task | From | To | Effort |
|------|------|-----|--------|
| Extract API calls | TownScene, CharacterSelect | ApiService.ts | 4h |
| Extract storage logic | Multiple | StorageService.ts | 2h |
| Create typed EventBus | EventCenter.ts | EventBus.ts | 3h |
| Remove window globals | Multiple | Use EventBus/DI | 6h |

### Phase 3: Scene Decomposition (Week 4-5)

| Task | Lines Removed from TownScene | Effort |
|------|------------------------------|--------|
| Extract AgentManager | ~400 lines | 8h |
| Extract UIManager | ~200 lines | 4h |
| Extract ChatSystem | ~300 lines | 6h |
| Extract ProximitySystem | ~150 lines | 3h |
| Create State Machine | ~100 lines (if/else) | 4h |

### Phase 4: Architecture Improvements (Week 6-8)

| Task | Impact | Effort |
|------|--------|--------|
| Implement object pooling | Performance | 4h |
| Add proper TypeScript types | Type safety | 8h |
| Create component system | Maintainability | 12h |
| Add unit tests | Reliability | 16h |

### Phase 5: Performance Optimization (Week 9-10)

| Task | Expected Improvement | Effort |
|------|---------------------|--------|
| Texture packing | Faster load | 2h |
| Lazy load assets | Smaller initial bundle | 4h |
| Cache DOM references | Fewer DOM queries | 2h |
| Optimize update loops | Lower CPU | 4h |

---

## References

### Official Documentation
- [Phaser 3 Scene Lifecycle](https://docs.phaser.io/phaser/concepts/scenes) - Official scene management guide
- [Phaser 3 API Documentation](https://newdocs.phaser.io/docs/latest/) - Complete API reference

### Best Practices Articles
- [Phaser Game Development Best Practices](https://genieee.com/phaser-game-development-best-practices/) - Comprehensive guide covering project setup, asset management, performance
- [SOLID Principles in Phaser 3](https://dev.to/belka/the-power-of-dependency-injection-in-phaser-3-building-a-modular-game-with-solid-principles-5251) - Dependency injection and modular architecture
- [State Pattern for AI in Phaser 3](https://blog.ourcade.co/posts/2020/state-pattern-ai-player-control-phaser-3/) - Using state machines for cleaner code
- [Phaser 3 Performance Optimization 2025](https://franzeus.medium.com/how-i-optimized-my-phaser-3-action-game-in-2025-5a648753f62b) - Object pools, caching, canvas vs WebGL

### Community Discussions
- [What are Phaser 3 bad/best practices?](https://phaser.discourse.group/t/what-are-phaser-3-bad-best-practices/5088) - Community-compiled best practices list
- [Phaser 3 Memory Leak Discussion](https://phaser.discourse.group/t/scene-start-stop-memory-leak/15496) - Scene lifecycle and cleanup

### Architecture Patterns
- [ECS in Phaser 3 with bitECS](https://blog.ourcade.co/posts/2023/building-phaser-3-ecs-game-with-reactjs/) - Entity Component System implementation
- [Clean Architecture for Games](https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164) - Robert C. Martin's principles applied to games

---

## Checklist for Refactoring

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

*Document created: January 2026*
*Last updated: January 2026*
*Authors: AI Analysis*
