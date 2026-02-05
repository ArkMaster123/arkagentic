# Testing Patterns

**Analysis Date:** 2026-02-05

## Test Framework

**Runner:**
- Not detected - No test framework configuration found (no Jest, Vitest, or pytest config)
- No test runner scripts in `package.json`
- No test files in main codebase (tests exist only in node_modules dependencies)

**Assertion Library:**
- Not detected - No assertion library configured
- Codebase relies on manual testing through the application

**Run Commands:**
- None configured for automated testing
- Manual testing via dev server: `npm run dev`
- Backend can be run: `npm run backend`
- All services together: `npm run dev:all`

## Test File Organization

**Location:**
- Not applicable - No test files in main codebase
- Some dependencies include tests in `node_modules/` (Zod, etc.)

**Naming:**
- Not established - No test naming convention in codebase
- Standard would be: `*.test.ts`, `*.spec.ts` or co-located files

**Structure:**
- Not applicable - No test files found
- Potential location would be: `src/**/*.test.ts` or `tests/` directory

## Test Structure

**Not Applicable**

No existing test structure in codebase. Tests would follow these patterns based on codebase organization:

**Potential Setup for Phaser Scenes:**
- Mock Phaser.Scene and physics engine
- Test initialization in `create()` methods
- Mock event emitter for event subscriptions
- Mock API calls in service layer

**Potential Setup for Services:**
- Mock fetch requests for ApiService
- Mock localStorage for StorageService
- Mock Colyseus client for MultiplayerManager
- Use DI pattern or static test doubles

## Mocking

**Framework:**
- Not currently used - No mocking library detected
- Would recommend: Vitest with vi.mock() or Jest with jest.mock()

**Patterns:**
- Not established in codebase
- Could follow async mocking pattern:
```typescript
// For API calls in ApiService
vi.mock('fetch', () => ({
  fetch: vi.fn()
}));

// For Phaser physics
class MockScene extends Phaser.Scene {
  physics = { add: { existing: vi.fn() } };
}
```

**What to Mock:**
- Fetch API calls (external API service)
- Phaser scene lifecycle (create, update, shutdown)
- WebSocket connections (Colyseus, Jitsi)
- Browser APIs (localStorage, window, location)
- Game event emitters (EventBus)

**What NOT to Mock:**
- Core game logic (pathfinding, movement calculations)
- Business logic in agents (query routing, state)
- Utility functions (shuffle, distance calculations)
- Type definitions and interfaces

## Fixtures and Factories

**Test Data:**
- Not established - No fixture or factory pattern in codebase
- Could implement factories for:
  - Agent creation with default properties
  - Player/User objects with test data
  - Scene state initialization
  - Chat messages with agent responses

**Potential Location:**
- Would be in `tests/fixtures/` or `tests/factories/`
- Or co-located in test files

**Example Pattern (Not Implemented):**
```typescript
// Could create factories like:
function createTestAgent(overrides?: Partial<Agent>) {
  return {
    id: 'test-agent-1',
    agentType: 'scout',
    x: 100,
    y: 100,
    ...overrides
  };
}

function createTestUser(overrides?: Partial<User>) {
  return {
    id: 'test-user-1',
    display_name: 'Test Player',
    avatar_sprite: 'brendan',
    ...overrides
  };
}
```

## Coverage

**Requirements:**
- Not enforced - No coverage thresholds configured
- No CI/CD pipeline enforcing coverage checks

**View Coverage:**
- Not applicable - No coverage tool configured
- Would use: `npm test -- --coverage` (if Jest/Vitest configured)

## Test Types

**Unit Tests:**
- Not present - No unit tests in codebase
- **Scope:** Utility functions (shuffle, routeQuery, distance, escapeHtml)
- **Approach:** Test with various inputs, validate outputs
- **File:** `src/utils.ts` and `src/lib/utils.ts` would be primary candidates

**Integration Tests:**
- Not present - No integration tests
- **Scope:** API service interactions with backend endpoints
- **Approach:** Test full request/response cycle with mock backend
- **File:** `src/core/services/ApiService.ts` - test all CRUD operations
- **File:** `src/classes/MultiplayerManager.ts` - test Colyseus client connection lifecycle

**E2E Tests:**
- Not used - No E2E framework detected
- **Framework:** Would use Playwright or Cypress
- **Scope:** Full game scenes, player interactions, AI agent responses
- **Approach:** Test complete user journeys:
  - Character selection → Town exploration → Agent interaction → Chat
  - Multiplayer connection → Player spawning → Movement sync

## Testing Gaps

**Critical Untested Areas:**

1. **API Service (`src/core/services/ApiService.ts`)**
   - No tests for HTTP error handling
   - No tests for stream parsing (chat responses)
   - No tests for session validation
   - Risk: Silent failures in production API calls

2. **Game Scenes (`src/scenes/TownScene.ts` and others)**
   - Complex scene initialization not tested
   - Event emission and handling untested
   - No tests for agent movement pathfinding (A* algorithm)
   - Risk: Scene crashes, visual bugs not caught

3. **Event Bus (`src/core/events/EventBus.ts`)**
   - Type safety of emitTyped/onTyped not validated
   - Event payload types not enforced at runtime
   - Risk: Type mismatches cause runtime errors

4. **Multiplayer Manager (`src/classes/MultiplayerManager.ts`)**
   - Colyseus connection lifecycle not tested
   - Remote player state sync not validated
   - Interpolation calculations not tested
   - Risk: Multiplayer desync, connection drops unhandled

5. **Authentication/Storage (`src/core/services/StorageService.ts`)**
   - No tests for session token handling
   - localStorage fallback logic untested
   - Risk: Session security issues, offline mode failures

6. **Agent Behavior (`src/classes/Agent.ts`)**
   - Pathfinding algorithm not tested
   - Animation state transitions not validated
   - Speaking/working indicators untested
   - Risk: Agents behave unexpectedly, visual feedback broken

## Python Backend Testing

**Status:** Not configured

**Backend Files:** `backend/server.py`, `backend/agents.py`, `backend/database.py`

**Potential Test Areas:**
- FastAPI endpoints (create user, chat, stream)
- Agent routing logic (query → agent selection)
- Streaming response parsing
- Database operations (user CRUD)
- Swarm mode collaboration
- Model selection and cost calculation

**Recommendation:**
- Use pytest for Python backend tests
- Mock OpenAI/Anthropic API calls
- Test streaming response format
- Test database queries with fixtures

## Common Testing Scenarios Not Covered

1. **Error Recovery:**
   - Network timeouts during API calls
   - Malformed JSON responses
   - WebSocket disconnection and reconnection

2. **Edge Cases:**
   - Empty user input handling
   - Very large agent lists
   - Rapid scene transitions
   - Concurrent multiplayer events

3. **Mobile/Touch:**
   - Mobile controls interaction (`src/classes/MobileControls.ts`)
   - Touch event handling
   - Orientation changes

4. **Performance:**
   - Large number of remote players
   - Streaming response performance
   - Memory leaks in scene transitions

5. **Accessibility:**
   - Keyboard navigation
   - Screen reader compatibility
   - ARIA labels

## Recommended Testing Setup

**Frontend (TypeScript):**
1. Install Vitest: `npm install -D vitest`
2. Create `tests/` directory
3. Start with API service unit tests
4. Add integration tests for scenes
5. Mock Phaser and Colyseus

**Backend (Python):**
1. Install pytest: `pip install pytest pytest-asyncio`
2. Create `backend/tests/` directory
3. Test endpoints with `TestClient`
4. Mock external API calls

**Build Configuration:**
- Add test scripts to `package.json`
- CI/CD integration (when available)
- Coverage reporting

---

*Testing analysis: 2026-02-05*
