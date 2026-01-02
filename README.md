# ArkAgentic - Multi-Agent Virtual World

A real-time multiplayer virtual world where AI agents and human players coexist in a Pokemon-style 2D environment. Chat with specialized AI agents, video call with other players, and collaborate in meeting rooms.

**Live Demo:** [https://agentic.th3ark.com](https://agentic.th3ark.com)

---

## 🎨 Project Showcase

<div align="center">

![ArkAgentic](docs/images/arkagenticdetail.png)
*Multi-agent virtual world where AI agents and human players collaborate in a Pokemon Ruby-style 2D environment*

</div>

---

> **IMPORTANT - PRODUCTION SERVER EXISTS**
> 
> A production server is already running at `46.62.192.79` with auto-deploy from GitHub.
> 
> **DO NOT:**
> - Rebuild or reconfigure the production server
> - Run database migrations without checking existing state
> - Overwrite systemd services or nginx config
> 
> **The server auto-updates every 5 minutes via cron.** Just push to `main` branch.
> 
> SSH: `ssh root@46.62.192.79` | Project: `/opt/agentverse`
> 
> This README is for **local development** and **new server deployments only**.

---

## How We Built This

```
                              ARKAGENTIC ARCHITECTURE
    
    +-----------------------------------------------------------------------------------+
    |                                   BROWSER                                          |
    |  +-----------------------------------------------------------------------------+  |
    |  |                         PHASER 3 GAME ENGINE                                |  |
    |  |                                                                             |  |
    |  |   +----------------+    +----------------+    +------------------+          |  |
    |  |   |   TownScene    |    | MeetingRoom    |    |     Player       |          |  |
    |  |   |                |    |    Scene       |    |    Controls      |          |  |
    |  |   | - Tilemap      |    |                |    |                  |          |  |
    |  |   | - 6 AI Agents  |    | - Jitsi Zones  |    | - WASD Movement  |          |  |
    |  |   | - Buildings    |    | - Video Chat   |    | - C to Chat      |          |  |
    |  |   | - Doors/Portals|    | - Proximity    |    | - E to Enter     |          |  |
    |  |   +-------+--------+    +-------+--------+    +--------+---------+          |  |
    |  |           |                     |                      |                    |  |
    |  +-----------+---------------------+----------------------+--------------------+  |
    |              |                     |                      |                       |
    +--------------|---------------------|----------------------|-----------------------+
                   |                     |                      |
                   v                     v                      v
    +---------------------------+  +-------------+  +---------------------------+
    |      MULTIPLAYER          |  |   JITSI     |  |       BACKEND API         |
    |      (Colyseus)           |  |   MEET      |  |       (FastAPI)           |
    |      Port 2567            |  |             |  |       Port 3001           |
    +---------------------------+  +-------------+  +---------------------------+
    |                           |  |             |  |                           |
    | - Real-time player sync   |  | - Video     |  | - /api/chat/stream (SSE)  |
    | - WebSocket connections   |  |   calling   |  | - /api/route              |
    | - Room-based sessions     |  | - Screen    |  | - /api/agents             |
    | - Chat broadcast          |  |   share     |  | - /api/models             |
    | - Heartbeat keep-alive    |  | - Free      |  | - User settings           |
    |                           |  |   servers   |  |                           |
    +------------+--------------+  +-------------+  +-------------+-------------+
                 |                                                |
                 |         +---------------------------+          |
                 |         |                           |          |
                 +-------->|      PostgreSQL DB        |<---------+
                           |      Port 5432            |
                           +---------------------------+
                           |                           |
                           | - users, user_settings    |
                           | - agents, agent_prompts   |
                           | - rooms, buildings        |
                           | - chat_sessions, messages |
                           | - player_presence         |
                           |                           |
                           +---------------------------+
                                        |
                                        v
                           +---------------------------+
                           |      STRANDS AGENTS       |
                           |      (AI Framework)       |
                           +---------------------------+
                           |                           |
                           | Scout     - Research      |
                           | Sage      - Strategy      |
                           | Chronicle - Writing       |
                           | Trends    - News          |
                           | Maven     - General       |
                           | Gandalfius- Freelancing   |
                           |                           |
                           +-------------+-------------+
                                         |
                                         v
                           +---------------------------+
                           |      OPENROUTER API       |
                           |      (LLM Gateway)        |
                           +---------------------------+
                           |                           |
                           | - Claude 3.5 Haiku        |
                           | - Mistral Nemo            |
                           | - GPT-4.1 Nano            |
                           | - Gemini Flash            |
                           | - User-selectable model   |
                           |                           |
                           +---------------------------+

    DATA FLOW:
    
    1. Player moves in Phaser -> WebSocket -> Colyseus -> Broadcasts to all clients
    2. Player chats with agent -> HTTP POST -> FastAPI -> Strands -> OpenRouter -> SSE Stream back
    3. Player enters meeting room -> Jitsi SDK -> meet.jit.si servers -> Video/Audio
    4. Player settings saved -> HTTP POST -> FastAPI -> PostgreSQL
```

### Tech Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Phaser 3 + TypeScript | 2D game engine, tilemap rendering, player controls |
| **UI** | HTML/CSS + Vite | Sidebar chat, settings modal, agent cards |
| **Multiplayer** | Colyseus 0.16 | Real-time WebSocket sync, room state management |
| **Video Chat** | Jitsi Meet | Proximity-based video calling in meeting rooms |
| **Backend API** | FastAPI (Python) | REST endpoints, SSE streaming for chat |
| **AI Agents** | Strands Agents | Multi-agent orchestration, tool use |
| **LLM** | OpenRouter | Gateway to Claude, GPT, Mistral, Gemini |
| **Database** | PostgreSQL 16 | Users, agents, rooms, chat history |
| **Reverse Proxy** | Nginx | SSL termination, WebSocket upgrade, static files |

---

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/ArkMaster123/arkagentic.git
cd arkagentic

# Run the setup script
npm run setup

# Edit .env.local with your API keys (required)
# Then start all services
npm run dev:all
```

Open http://localhost:5173 in your browser.

### Option 2: Docker (Easiest)

```bash
# Clone and start with Docker
git clone https://github.com/ArkMaster123/arkagentic.git
cd arkagentic

# Set your OpenRouter API key
echo "OPENROUTER_API_KEY=your-key-here" > .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

Open http://localhost:5173 in your browser.

### Option 3: Manual Setup

See [Manual Installation](#manual-installation) below.

---

## Architecture

```
+------------------------------------------------------------------+
|                        ARKAGENTIC SYSTEM                          |
+------------------------------------------------------------------+
|                                                                    |
|  +--------------------+  +------------------+  +----------------+  |
|  |    FRONTEND        |  |    BACKEND       |  |   MULTIPLAYER  |  |
|  |    (Phaser 3)      |  |    (FastAPI)     |  |   (Colyseus)   |  |
|  |    Port 5173       |  |    Port 3001     |  |   Port 2567    |  |
|  +--------------------+  +------------------+  +----------------+  |
|           |                      |                     |           |
|           v                      v                     v           |
|  +--------------------+  +------------------+  +----------------+  |
|  |  - Tilemap/World   |  |  - AI Agents     |  |  - Real-time   |  |
|  |  - Player Controls |  |  - Chat API      |  |    sync        |  |
|  |  - Agent System    |  |  - Streaming     |  |  - Room Chat   |  |
|  |  - Chat UI         |  |  - User Settings |  |  - Presence    |  |
|  +--------------------+  +------------------+  +----------------+  |
|                                  |                                 |
|                                  v                                 |
|                       +------------------+                         |
|                       |   PostgreSQL     |                         |
|                       |   Port 5432      |                         |
|                       +------------------+                         |
|                                                                    |
+------------------------------------------------------------------+
|                        EXTERNAL SERVICES                           |
|  +------------------+  +------------------+  +------------------+  |
|  |   OpenRouter     |  |   Jitsi Meet     |  |   Nginx (prod)   |  |
|  |   (AI Models)    |  |   (Video Chat)   |  |   (SSL/Proxy)    |  |
|  +------------------+  +------------------+  +------------------+  |
+------------------------------------------------------------------+
```

---

## Features

### AI Agent System

Six specialized AI agents, each with unique expertise:

| Agent | Role | Expertise |
|-------|------|-----------|
| **Scout** | Research Specialist | Company research, people finding, prospect identification |
| **Sage** | Strategic Analyst | Data analysis, comparisons, strategic recommendations |
| **Chronicle** | Newsroom Editor | Article writing, news summaries, healthcare content |
| **Trends** | Intelligence Analyst | Trending topics, breaking news, market movements |
| **Maven** | General Assistant | General queries, coordination, friendly help |
| **Gandalfius** | Freelancing Wizard | Pricing strategies, client communication, scope management |

### Multiplayer Features

- **Real-time player sync** via Colyseus 0.16 WebSocket server with `getStateCallbacks` API
- **Live movement synchronization** - see other players walking around in real-time
- **Room Chat** - text chat with other players in the same room
- **Chat bubbles** appear above players when they send messages
- **Player name labels** - green name tags above all remote players
- **Smooth interpolation** - fluid movement rendering for remote players
- **Heartbeat keep-alive** - stable connections with automatic reconnection
- **Video Meeting Rooms** - Jitsi-powered video conferencing

### Controls

| Key | Action |
|-----|--------|
| **WASD** / **Arrow Keys** | Move player |
| **C** | Chat with nearby agent |
| **SPACE** / **E** | Enter buildings/doors |
| **J** | Join/leave Jitsi video call |
| **ESC** | Exit room / re-enable game controls |

---

## Manual Installation

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org)
- **Python 3.10+** - [Download](https://python.org)
- **PostgreSQL 14+** - [Download](https://postgresql.org)

### Step 1: Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/ArkMaster123/arkagentic.git
cd arkagentic

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
deactivate
cd ..

# Install multiplayer server dependencies
cd multiplayer
npm install
cd ..
```

### Step 2: Database Setup

```bash
# Create PostgreSQL database and user
psql -U postgres << EOF
CREATE DATABASE arkagentic;
CREATE USER arkagentic WITH PASSWORD 'arkagentic';
GRANT ALL PRIVILEGES ON DATABASE arkagentic TO arkagentic;
ALTER DATABASE arkagentic OWNER TO arkagentic;
\c arkagentic
GRANT ALL ON SCHEMA public TO arkagentic;
EOF

# Initialize database with schema and seed data
psql -U arkagentic -d arkagentic -f scripts/db-init.sql
```

### Step 3: Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add your API keys
```

**Required environment variables:**

```env
# OpenRouter API (required for AI agents)
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Database connection
DATABASE_URL=postgresql://arkagentic:arkagentic@localhost:5432/arkagentic
```

Get your OpenRouter API key from: https://openrouter.ai/keys

### Step 4: Run the Application

**Option A: All services at once (recommended)**

```bash
npm run dev:all
```

**Option B: Run services separately**

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend API
cd backend && source venv/bin/activate && python server.py

# Terminal 3: Multiplayer server
cd multiplayer && npm run dev
```

### Step 5: Open in Browser

Visit http://localhost:5173

---

## Deployment

### Server Requirements

- 2+ CPU cores, 4GB+ RAM
- Ubuntu 22.04 LTS recommended
- Domain with SSL certificate (for production)

### Production Build

```bash
# Build frontend for production
npm run build

# The built files are in ./dist
# Serve with nginx or any static file server
```

### Docker Production Deployment

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Systemd Services (Linux Server)

Create service files for each component:

**Backend API** (`/etc/systemd/system/arkagentic-backend.service`):

```ini
[Unit]
Description=ArkAgentic Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/arkagentic/backend
Environment=PATH=/opt/arkagentic/backend/venv/bin
ExecStart=/opt/arkagentic/backend/venv/bin/python server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Multiplayer Server** (`/etc/systemd/system/arkagentic-multiplayer.service`):

```ini
[Unit]
Description=ArkAgentic Multiplayer Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/arkagentic/multiplayer
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
sudo systemctl enable arkagentic-backend arkagentic-multiplayer
sudo systemctl start arkagentic-backend arkagentic-multiplayer
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend (static files)
    location / {
        root /opt/arkagentic/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;  # Required for SSE streaming
    }

    # Multiplayer WebSocket
    location /colyseus/ {
        proxy_pass http://127.0.0.1:2567/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run setup` | Run automated setup script |
| `npm run dev` | Start frontend dev server |
| `npm run dev:all` | Start all services (frontend + backend + multiplayer) |
| `npm run build` | Build frontend for production |
| `npm run backend` | Start backend API |
| `npm run multiplayer` | Start multiplayer server |
| `npm run db:init` | Initialize database with schema and seed data |
| `npm run docker:up` | Start all services with Docker |
| `npm run docker:down` | Stop Docker services |
| `npm run docker:logs` | View Docker logs |

---

## API Endpoints

### Chat with Agent (Streaming)

```bash
POST /api/chat/stream
Content-Type: application/json

{
  "message": "How should I price my services?",
  "agent": "gandalfius",
  "user_id": "optional-user-id"
}
```

Returns Server-Sent Events (SSE) stream.

### Route Query to Best Agent

```bash
POST /api/route
Content-Type: application/json

{
  "message": "How do I handle scope creep?"
}
```

### List Available Agents

```bash
GET /api/agents
```

### List Available AI Models

```bash
GET /api/models
```

---

## Project Structure

```
arkagentic/
+-- public/
|   +-- assets/
|       +-- sprites/           # Character spritesheets
|       +-- tilemaps/          # Tilemap JSON and tilesets
+-- src/
|   +-- classes/
|   |   +-- Actor.ts           # Base sprite class
|   |   +-- Agent.ts           # AI agent with pathfinding
|   |   +-- Player.ts          # Player-controlled character
|   |   +-- MultiplayerManager.ts
|   |   +-- JitsiManager.ts
|   +-- scenes/
|   |   +-- LoadingScene.ts
|   |   +-- CharacterSelectScene.ts
|   |   +-- TownScene.ts       # Main game world
|   |   +-- RoomScene.ts
|   |   +-- MeetingRoomScene.ts
|   +-- constants.ts
|   +-- utils.ts
|   +-- index.ts
+-- backend/
|   +-- server.py              # FastAPI server
|   +-- agents.py              # Strands agent definitions
|   +-- database.py            # PostgreSQL connection
|   +-- requirements.txt
|   +-- Dockerfile
+-- multiplayer/
|   +-- src/
|   |   +-- rooms/
|   |   |   +-- GameRoom.ts    # Colyseus room logic
|   |   +-- index.ts           # Server entry point
|   +-- package.json
|   +-- Dockerfile
+-- database/
|   +-- schema.sql
|   +-- seed.sql
|   +-- migrations/
+-- scripts/
|   +-- setup.sh               # Automated setup script
|   +-- db-init.sql            # Combined database init
+-- docker-compose.yml
+-- package.json
+-- .env.example
+-- README.md
```

---

## Troubleshooting

### "Cannot connect to database"

1. Ensure PostgreSQL is running: `pg_isready`
2. Check your DATABASE_URL in `.env.local`
3. Verify the database exists: `psql -l | grep arkagentic`

### "AI agents not responding"

1. Check your OPENROUTER_API_KEY is valid
2. Ensure backend is running: `curl http://localhost:3001/api/agents`
3. Check backend logs for errors

### "Multiplayer not syncing"

1. Ensure multiplayer server is running on port 2567
2. Check browser console for WebSocket errors
3. Verify no firewall blocking port 2567
4. Look for `[Multiplayer] Connected!` and `[Multiplayer] Player joined (onAdd):` in console
5. Ensure both client (colyseus.js) and server (@colyseus/core) are on version 0.16+
6. Check server logs: `journalctl -u agentverse-multiplayer -f`

### "Docker containers won't start"

1. Check Docker is running: `docker info`
2. View logs: `docker-compose logs`
3. Rebuild: `docker-compose up -d --build`

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
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
- Built with Phaser 3, Colyseus, FastAPI, and Strands Agents

---

**Created:** December 2024
**Last Updated:** January 2026
**Status:** Active Development
**Maintainer:** [@ArkMaster123](https://github.com/ArkMaster123)

---

## Changelog

### January 2026
- **Upgraded to Colyseus 0.16** with `@colyseus/schema` v3 for proper real-time state synchronization
- **Fixed multiplayer movement sync** - players now see each other moving in real-time using the new `getStateCallbacks()` API
- **Added smooth interpolation** for remote player positions
- **Added player name labels** (green tags) above all remote players
- **Improved connection stability** with heartbeat keep-alive system
- **Added comprehensive debug logging** for multiplayer troubleshooting

### December 2024
- Initial release with AI agents, multiplayer chat, and video conferencing
- Six specialized AI agents powered by Strands and OpenRouter
- Phaser 3 game engine with tilemap-based world
- PostgreSQL database for persistent user data
