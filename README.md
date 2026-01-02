# ArkAgentic - Multi-Agent Virtual World

A real-time multiplayer virtual world where AI agents and human players coexist in a Pokemon-style 2D environment. Chat with specialized AI agents, video call with other players, and collaborate in meeting rooms.

**Live Demo:** [https://agentic.th3ark.com](https://agentic.th3ark.com)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ARKAGENTIC SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           FRONTEND (Phaser 3 + TypeScript)               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │   TownScene  │  │MeetingRoom   │  │    Player    │  │    Agent    │  │    │
│  │  │              │  │   Scene      │  │   Controls   │  │   System    │  │    │
│  │  │  - Tilemap   │  │              │  │              │  │             │  │    │
│  │  │  - Agents    │  │  - Jitsi     │  │  - WASD/     │  │  - 6 AI     │  │    │
│  │  │  - Buildings │  │    Zones     │  │    Arrows    │  │    Agents   │  │    │
│  │  │  - Doors     │  │  - Video     │  │  - C to Chat │  │  - Routing  │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                         │
│                    ┌───────────────────┼───────────────────┐                    │
│                    │                   │                   │                    │
│                    ▼                   ▼                   ▼                    │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │   SIDEBAR - LEFT    │  │   GAME CANVAS       │  │  SIDEBAR - RIGHT    │      │
│  │                     │  │                     │  │                     │      │
│  │  - Agent Cards      │  │   800 x 600 px      │  │  - Chat Tabs        │      │
│  │  - Click to Select  │  │   Pokemon-style     │  │    - Agent Chat     │      │
│  │  - Settings         │  │   2D World          │  │    - Room Chat      │      │
│  │  - Zoom Controls    │  │                     │  │  - Real-time Msgs   │      │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘      │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                   BACKEND                                        │
│                                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │   Python FastAPI    │  │   Colyseus Server   │  │   PostgreSQL DB     │      │
│  │   (Port 3001)       │  │   (Port 2567)       │  │   (Port 5432)       │      │
│  │                     │  │                     │  │                     │      │
│  │  - /chat endpoint   │  │  - GameRoom         │  │  - agents           │      │
│  │  - /route endpoint  │  │  - Player sync      │  │  - agent_prompts    │      │
│  │  - /agents list     │  │  - Chat broadcast   │  │  - rooms            │      │
│  │  - Strands Agents   │  │  - WebSocket        │  │  - buildings        │      │
│  │  - OpenRouter LLM   │  │                     │  │  - spawn_points     │      │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘      │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              EXTERNAL SERVICES                                   │
│                                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │   OpenRouter API    │  │   Jitsi Meet        │  │   Nginx Reverse     │      │
│  │                     │  │   (Free Servers)    │  │   Proxy + SSL       │      │
│  │  - Claude 3 Haiku   │  │                     │  │                     │      │
│  │  - AI Responses     │  │  - Video Calls      │  │  - HTTPS            │      │
│  │                     │  │  - Screen Share     │  │  - WebSocket        │      │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Features

### AI Agent System

Six specialized AI agents, each with unique expertise:

| Agent | Emoji | Role | Expertise |
|-------|-------|------|-----------|
| **Scout** | 🔍 | Research Specialist | Company research, people finding, prospect identification |
| **Sage** | 🧙 | Strategic Analyst | Data analysis, comparisons, strategic recommendations |
| **Chronicle** | ✍️ | Newsroom Editor | Article writing, news summaries, healthcare content |
| **Trends** | 📈 | Intelligence Analyst | Trending topics, breaking news, market movements |
| **Maven** | 👋 | General Assistant | General queries, coordination, friendly help |
| **Gandalfius** | 🧙‍♂️ | Freelancing Wizard | Pricing strategies, client communication, scope management |

### Interaction Methods

1. **Walk up to an agent** and press **C** to start chatting
2. **Click on an agent** directly to initiate conversation  
3. **Select from sidebar** - single click to select, double click for info modal
4. **Type in chat** - automatically routes to selected or best-fit agent

### Multiplayer Features

- **Real-time player sync** via Colyseus WebSocket server
- **Room Chat** - text chat with other players in the same room
- **Chat bubbles** appear above players when they send messages
- **Player presence** - see who's online and where they are
- **Video Meeting Rooms** - Jitsi-powered video conferencing

### Meeting Rooms

Walk to the Meeting Rooms area (right side of town) and enter dedicated video chat zones:

| Room | Status | Description |
|------|--------|-------------|
| Meeting Room Alpha | ✅ Active | Small meeting room |
| Meeting Room Beta | ✅ Active | Small meeting room |
| Main Conference | ✅ Active | Large conference room |
| Gamma & Delta | 🚧 Maintenance | Under construction |

### Chat System

**Tabbed Interface:**
- **Agents Tab** - Chat with AI agents
- **Room Chat Tab** - Chat with other players

**Smart Routing:**
- Queries automatically route to the most relevant agent
- Or select a specific agent for direct conversation

### Controls

| Key | Action |
|-----|--------|
| **WASD** / **Arrow Keys** | Move player |
| **C** | Chat with nearby agent |
| **SPACE** / **E** | Enter buildings/doors |
| **J** | Join/leave Jitsi video call |
| **ESC** | Exit room / re-enable game controls |

**Focus System:**
- Click on **chat input** → Game controls disabled (for typing)
- Click on **game canvas** → Game controls re-enabled
- Visual indicator shows when game controls are disabled

---

## Tech Stack

### Frontend
- **Phaser 3** - 2D game engine
- **TypeScript** - Type safety
- **Vite** - Fast dev server and bundler
- **Colyseus.js** - Multiplayer client
- **phaser3-rex-plugins** - UI components

### Backend
- **Python FastAPI** - REST API for AI agents
- **Strands Agents** - Multi-agent framework
- **Colyseus** - Real-time multiplayer server
- **PostgreSQL** - Database
- **Nginx** - Reverse proxy with SSL

### External Services
- **OpenRouter** - LLM API (Claude 3 Haiku)
- **Jitsi Meet** - Free video conferencing
- **Let's Encrypt** - SSL certificates

---

## Project Structure

```
arkagentic/
├── public/
│   └── assets/
│       ├── sprites/              # Character spritesheets
│       │   ├── archie.png        # Scout
│       │   ├── steven.png        # Sage
│       │   ├── birch.png         # Chronicle
│       │   ├── maxie.png         # Trends
│       │   ├── may.png           # Maven
│       │   ├── joseph.png        # Gandalfius
│       │   └── brendan.png       # Default player
│       └── tilemaps/
│           ├── json/             # Tilemap JSON files
│           └── tiles/            # Tileset images
├── src/
│   ├── classes/
│   │   ├── Actor.ts              # Base sprite class
│   │   ├── Agent.ts              # AI agent with pathfinding
│   │   ├── Player.ts             # Player-controlled character
│   │   ├── MultiplayerManager.ts # Colyseus client
│   │   ├── JitsiManager.ts       # Video chat integration
│   │   └── EventCenter.ts        # Global event bus
│   ├── scenes/
│   │   ├── LoadingScene.ts       # Asset preloader
│   │   ├── CharacterSelectScene.ts # Avatar selection
│   │   ├── TownScene.ts          # Main game world
│   │   ├── RoomScene.ts          # Agent rooms
│   │   └── MeetingRoomScene.ts   # Video meeting rooms
│   ├── constants.ts              # Agent configs, API URLs
│   ├── utils.ts                  # Routing logic, helpers
│   └── index.ts                  # Game entry point
├── backend/
│   ├── server.py                 # FastAPI server
│   ├── agents.py                 # Strands agent definitions
│   ├── database.py               # PostgreSQL connection
│   └── requirements.txt          # Python dependencies
├── multiplayer/
│   ├── src/
│   │   ├── rooms/
│   │   │   ├── GameRoom.ts       # Colyseus room logic
│   │   │   └── schema/
│   │   │       └── PlayerState.ts # Player state schema
│   │   └── index.ts              # Colyseus server entry
│   └── package.json
├── database/
│   ├── schema.sql                # Database schema
│   ├── seed.sql                  # Initial data
│   └── migrations/               # Database migrations
│       ├── 001_add_gandalfius.sql
│       └── 002_add_meeting_rooms.sql
├── gandalfius/                   # Gandalfius persona research
│   ├── JAMIE_BRINDLE_LEARNINGS.md
│   └── transcripts/
├── index.html                    # Main HTML with sidebars
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 16
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/ArkMaster123/arkagentic.git
cd arkagentic

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Install multiplayer server dependencies
cd multiplayer
npm install
cd ..
```

### Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE arkagentic;"
psql -U postgres -c "CREATE USER arkagentic WITH PASSWORD 'your_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE arkagentic TO arkagentic;"

# Run schema and seed
psql -U arkagentic -d arkagentic -f database/schema.sql
psql -U arkagentic -d arkagentic -f database/seed.sql

# Run migrations
psql -U arkagentic -d arkagentic -f database/migrations/001_add_gandalfius.sql
psql -U arkagentic -d arkagentic -f database/migrations/002_add_meeting_rooms.sql
```

### Environment Variables

Create `.env.local`:

```env
OPENROUTER_API_KEY=your_openrouter_key
DATABASE_URL=postgresql://arkagentic:password@localhost:5432/arkagentic
```

### Running Locally

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend API
cd backend
source venv/bin/activate
python server.py

# Terminal 3: Multiplayer server
cd multiplayer
npm run dev
```

Visit `http://localhost:5173`

---

## Deployment

### Server Requirements

- 4 CPU cores, 8GB RAM minimum
- Ubuntu 22.04 LTS recommended
- Domain with SSL certificate

### Production Setup

```bash
# Build frontend
npm run build

# Start services with systemd
sudo systemctl start agentverse-backend
sudo systemctl start agentverse-multiplayer

# Nginx handles static files and reverse proxy
```

### Auto-Deploy

The Finnish server (`46.62.192.79`) runs auto-deploy every 5 minutes via cron:

```bash
*/5 * * * * /opt/agentverse/auto-update.sh
```

---

## API Endpoints

### Chat with Agent
```bash
POST /api/chat
{
  "message": "How should I price my services?",
  "agent": "gandalfius"  # Optional - auto-routes if not specified
}
```

### Route Query
```bash
POST /api/route
{
  "message": "How do I handle scope creep?"
}
# Returns: { "agent": "gandalfius", "agent_name": "Gandalfius", "agent_emoji": "🧙‍♂️" }
```

### List Agents
```bash
GET /api/agents
# Returns array of all agents with id, name, emoji, role
```

---

## Gandalfius - The Freelancing Wizard

Gandalfius is a specialized agent trained on Jamie Brindle's freelancing teachings:

### Core Philosophy
> "Transform freelancers (trading time for money) into ENTRELANCERS (owners of predictable, scalable businesses)"

### Key Teachings

**Pricing Strategies:**
- "Your rate is your floor, not your headline"
- "Price for value, not effort"
- "You're selling outcomes, not hours"

**Client Communication:**
- "Speak Client" - talk outcomes, not deliverables
- The "Magical First Five Minutes" technique

**Scope Management:**
- "Scope creep is confusion, not entitlement"
- "Shrink the deliverable, not your fee"

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to verify
5. Submit a pull request

---

## License

MIT License - See LICENSE file

---

## Credits

- Character sprites inspired by Pokemon-style assets
- Tileset from Modern Interiors pack
- Jamie Brindle's freelancing wisdom for Gandalfius persona
- Built with Phaser 3, Colyseus, and Strands Agents

---

**Created:** December 2024  
**Status:** Active Development  
**Maintainer:** [@ArkMaster123](https://github.com/ArkMaster123)
