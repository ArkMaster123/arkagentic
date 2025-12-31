# AgentVerse Project - Development Tracker

## Project Overview
A Phaser 3 game with AI-powered agents in a Pokemon-style town. Agents collaborate using **Strands Agents** (AWS) multi-agent framework.

**Location:** `/Users/noahsark/Documents/vibecoding/arkagentic/`

---

## Completed

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

## Reference

- **Strands Agents:** https://strandsagents.com/latest/
- **Strands GitHub:** https://github.com/strands-agents/sdk-python
- **AgentVerse (inspiration):** https://github.com/OpenBMB/AgentVerse
- **rexBoard docs:** https://rexrainbow.github.io/phaser3-rex-notes/docs/site/board/
- **Phaser 3 docs:** https://photonstorm.github.io/phaser3-docs/
