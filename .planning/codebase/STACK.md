# Technology Stack

**Analysis Date:** 2026-02-05

## Languages

**Primary:**
- TypeScript 5.3 - Frontend (React, Phaser, Vite), multiplayer server (Colyseus), Cloudflare workers
- Python 3.11 - Backend FastAPI server with Strands Agents framework

**Secondary:**
- JavaScript/Node.js - Build tooling, package management, runtime for TypeScript projects
- SQL - PostgreSQL database schema and queries

## Runtime

**Environment:**
- Node.js 20 (Alpine) - Frontend dev server, multiplayer server, build tooling
- Python 3.11 (slim) - Backend API server in Docker

**Package Manager:**
- npm - Frontend, multiplayer, Cloudflare agents (`package.json`, `package-lock.json`)
- pip - Python dependencies (`requirements.txt`)

## Frameworks

**Core Frontend:**
- React 19.2 - UI rendering with functional components and hooks in `src/App.tsx`
- Phaser 3.80 - 2D game engine for interactive scenes (`src/scenes/`)
- Vite 5.0 - Build tool and dev server (`vite` command in package.json)
- TypeScript 5.3 - Type safety for frontend

**Backend:**
- FastAPI 0.109 - REST API server (`backend/server.py`)
- Uvicorn 0.27 - ASGI server for FastAPI
- Strands Agents - Multi-agent framework using OpenAI models (`from strands import Agent`)

**Multiplayer:**
- Colyseus 0.16 - Real-time multiplayer framework (`@colyseus/core`, `@colyseus/schema`, `@colyseus/ws-transport`)
- Colyseus.js 0.16 - Client library for Colyseus synchronization

**Cloudflare Workers:**
- Cloudflare Workers - Serverless edge computing (`cloudflare-agents/`)
- Wrangler 4.56 - CLI for Cloudflare Workers deployment
- AI SDK (@ai-sdk/openai 3.0) - AI integration for Cloudflare agents

**Build/Dev:**
- TSX 4.7 - TypeScript executor for Node.js scripts
- TailwindCSS 4.1 - Utility-first CSS framework
- PostCSS 8.5 - CSS transformation with Autoprefixer 10.4

## Key Dependencies

**Critical:**
- strands-agents 0.1.0+ - Multi-agent orchestration system with built-in MCP support
- fastapi 0.109.0 - REST API framework for agent backend
- asyncpg 0.29 - Async PostgreSQL driver for database connections
- phaser 3.80.1 - Game engine for visual scenes and interactions
- react 19.2.3 - UI library with React DOM 19.2.3

**Infrastructure:**
- python-dotenv 1.0 - Environment variable management in backend
- pyjwt 2.8 - JWT token generation/validation for sessions
- httpx 0.26 - Async HTTP client for API calls
- dotenv 17.2 - Environment variable management in frontend/Node.js
- mcp 1.0 - Model Context Protocol server integration

**UI/Styling:**
- lucide-react 0.562 - Icon library for React components
- tailwind-merge 3.4 - Utility class merging for TailwindCSS
- clsx 2.1 - Class name utility for conditional styling

**Game/Multiplayer:**
- phaser3-rex-plugins 1.80.4 - Extended Phaser plugins for additional functionality
- replicate 1.4 - Image generation API client (for AI image creation)

## Configuration

**Environment:**
- `.env.example` - Template for required environment variables
- `.env.local` - Local development configuration (not committed)
- `tsconfig.json` - TypeScript compiler options (target ES2020, React JSX, strict mode)
- Path aliases configured: `@/*` maps to `./src/*`

**Build Configuration:**
- `vite.config.ts` - Vite build configuration (implied, standard setup)
- `docker-compose.yml` - Multi-service orchestration (PostgreSQL, backend, multiplayer, frontend)
- `Dockerfile` - Backend Python 3.11 with uvicorn
- `Dockerfile.frontend` - Frontend Node.js 20 with Vite dev server
- `multiplayer/Dockerfile` - Multiplayer server with Node.js 20
- `cloudflare-agents/wrangler.toml` - Cloudflare Worker configuration with Durable Objects

**Package Configuration:**
- `components.json` - Component library configuration (UI framework)
- `opencode.jsonc` - OpenCode/AI orchestration config

## Platform Requirements

**Development:**
- Node.js 20+
- Python 3.11+
- Docker and Docker Compose (for containerized local development)
- PostgreSQL 16 (can run via Docker)

**Production:**
- Docker containers for all services
- PostgreSQL 16 database
- Cloudflare Workers platform (for agent edge deployment)
- Jitsi video server access (public free or self-hosted)

## Service Architecture

**Frontend (Vite + React + Phaser):**
- Dev server: `http://localhost:5173`
- Built with Vite hot module replacement
- Connects to backend API via `API_BASE_URL` (configurable via env)
- WebSocket connection to multiplayer server

**Backend (FastAPI):**
- Port: 3001
- Database: PostgreSQL via asyncpg connection pool
- AI Integration: OpenRouter API with multiple model support
- Endpoints: `/chat`, `/chat/stream`, `/agents`, `/users`, `/rooms`

**Multiplayer (Colyseus):**
- Port: 2567
- Real-time state synchronization for player positions/actions
- Room-based architecture for game sessions

**Cloudflare Agents:**
- Durable Objects with SQLite persistence
- Currently: SageAgent (Strategic Analyst)
- Future: Scout, Chronicle, Trends, Maven agents

---

*Stack analysis: 2026-02-05*
