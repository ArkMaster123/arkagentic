# AgentVerse - Multi-Agent Visual Collaboration

A Phaser 3-based visual simulation where AI agents walk around a Pokemon-style 2D world, meet up to discuss questions, and collaborate to provide answers.

## Vision

Inspired by [OpenBMB/AgentVerse](https://github.com/OpenBMB/AgentVerse), this project creates an engaging visual interface for multi-agent AI systems. Instead of text-only chat, users watch their AI team come together in a virtual town to solve problems.

## Features

- **5 Specialized AI Agents** with distinct personalities and sprites
- **2D Pokemon-style world** using Phaser 3 game engine
- **Real-time agent movement** with pathfinding
- **Speech bubbles** for agent communication
- **Meeting point collaboration** - agents walk together when needed
- **Smart routing** - queries go to the right specialist(s)

## The Agent Team

| Agent | Emoji | Sprite | Role | Triggers |
|-------|-------|--------|------|----------|
| Scout | 🔍 | archie | Research Specialist | research, find, search, company, people |
| Sage | 🧙 | steven | Strategic Analyst | analyze, compare, strategy, recommend |
| Chronicle | ✍️ | birch | Newsroom Editor | article, write, news, CQC, care home |
| Trends | 📈 | maxie | Intelligence Analyst | trending, this week, breaking, keywords |
| Maven | 👋 | may | General Assistant | hello, help, weather (fallback) |

## Tech Stack

- **Phaser 3** - 2D game engine
- **phaser3-rex-plugins** - UI components (dialogs, text boxes, input)
- **TypeScript** - Type safety
- **Vite** - Fast dev server and bundler

## Project Structure

```
agentverse/
├── public/
│   └── assets/
│       ├── sprites/          # Character spritesheets (Pokemon-style)
│       │   ├── archie.png    # Scout
│       │   ├── steven.png    # Sage
│       │   ├── birch.png     # Chronicle
│       │   ├── maxie.png     # Trends
│       │   ├── may.png       # Maven
│       │   └── brendan.png   # Player (future)
│       └── tilemaps/
│           ├── json/town.json    # Tilemap data
│           └── tiles/tileset.png # Tile graphics
├── src/
│   ├── classes/
│   │   ├── Actor.ts          # Base sprite class with animations
│   │   ├── Agent.ts          # AI agent with movement, speech, thinking
│   │   └── EventCenter.ts    # Global event bus
│   ├── scenes/
│   │   ├── LoadingScene.ts   # Asset preloader with progress bar
│   │   └── TownScene.ts      # Main game scene
│   ├── constants.ts          # Agent configs, colors, API URLs
│   ├── utils.ts              # Helpers (routing, direction enum)
│   └── index.ts              # Game entry point
├── index.html                # Game container with UI overlays
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## How It Works

### Query Flow

1. **User presses ENTER** → Input dialog appears
2. **Query routing** → System determines which agents should respond
3. **Agents think** → Thought bubbles appear (💭)
4. **Agents walk to meeting point** → Pathfinding movement
5. **Agents discuss** → Speech bubbles while API processes
6. **Response arrives** → Main agent speaks, full dialog shown
7. **Agents return** → Walk back to original positions

### Agent Routing Logic

```typescript
// From utils.ts
function routeQuery(query: string): string[] {
  if (/research|find|search/.test(query)) agents.push('scout');
  if (/analyze|compare|strategy/.test(query)) agents.push('sage');
  if (/article|care|CQC/.test(query)) agents.push('chronicle');
  if (/trending|news|this week/.test(query)) agents.push('trends');
  if (agents.length === 0) agents.push('maven'); // fallback
  return agents;
}
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd prototypes/agentverse
npm install
```

### Development

```bash
npm run dev
# Opens http://localhost:5174
```

### Backend (for real AI responses)

The game connects to `http://localhost:3001/api/aisdk` for AI responses.
Run the arena backend:

```bash
cd ../arena
npm run server
```

## Assets Attribution

Character sprites and tilemap assets are from [OpenBMB/AgentVerse](https://github.com/OpenBMB/AgentVerse) (MIT License), which uses Pokemon-style assets.

## Future Enhancements

- [ ] Player avatar that can walk around and approach agents
- [ ] Agent-to-agent conversations before responding
- [ ] Multiple meeting locations for different query types
- [ ] Animated speech bubbles with typing effect
- [ ] Sound effects and background music
- [ ] Save/load conversation history
- [ ] Multi-agent deliberation visualization
- [ ] Custom agent sprites/avatars

## Architecture Notes

### Event-Driven Communication

Agents communicate via `EventCenter` (Phaser EventEmitter):

```typescript
// Move agent to position
eventsCenter.emit('scout-moveTo', x, y);

// Agent speaks
eventsCenter.emit('scout-speak', 'Hello!');

// Agent thinks
eventsCenter.emit('scout-think', 'Hmm...');

// Listen for arrival
eventsCenter.on('scout-arrived', () => { ... });
```

### Rex UI Plugin

Using `phaser3-rex-plugins` for:
- Input dialogs with text areas
- Rounded rectangle backgrounds
- Label buttons
- Text wrapping
- Pop-up animations

## Related Projects

- **Arena** (`../arena/`) - Side-by-side framework comparison UI
- **AI SDK Prototype** (`../aisdk/`) - TypeScript agent implementation
- **Strands Prototype** (`../strands/`) - Python agent implementation

---

**Created**: December 2024
**Status**: In Development
**License**: MIT
