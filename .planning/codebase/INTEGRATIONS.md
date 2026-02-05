# External Integrations

**Analysis Date:** 2026-02-05

## APIs & External Services

**AI/LLM Services:**
- OpenRouter (primary)
  - Used for: Multi-model LLM access through Strands Agents framework
  - SDK/Client: strands-agents library communicates via OpenAI-compatible API
  - Auth: `OPENROUTER_API_KEY` environment variable
  - Models supported: Mistral Nemo, Gemini 2.0 Flash, Claude 3.5 Haiku, GPT-4.1 Nano, Qwen Turbo (see `backend/agents.py` for full list)
  - Base URL: `https://openrouter.ai/api` (set via `ANTHROPIC_BASE_URL` env var)

**Data & Search APIs (via Strands Tools/MCP):**
- Exa AI
  - Used by: Scout agent, Sage agent, Chronicle agent
  - Tools: `web_search`, `company_research`, `linkedin_search`, crawling, code context retrieval
  - Auth: `EXA_API_KEY` environment variable
  - Base URL: `https://api.exa.ai`

- BrightData
  - Used by: Trends agent for search engine data
  - Tools: `search_engine` (Google SERP with rankings), `search_engine_batch`
  - Auth: `BRIGHTDATA_API_KEY` environment variable
  - Optional zone config: `BRIGHTDATA_ZONE` (defaults to "web_unlocker1")

- Firecrawl API
  - Used by: Chronicle agent for content extraction
  - Tools: `scrape`, `crawl`, `extract`
  - Auth: `FIRECRAWL_API_KEY` environment variable

**Image Generation:**
- Replicate API
  - Package: `replicate` 1.4.0
  - Used for: AI-powered image generation (integrated via client)
  - Auth: Likely requires API key (check for `REPLICATE_API_KEY` env var usage)

**Video Chat:**
- Jitsi Meet
  - Used for: Proximity-based video chat between players
  - Configuration: `VITE_JITSI_DOMAIN` environment variable
  - Default: `meet.jit.si` (public free server)
  - Self-hosting option available (documented in `/docs/JITSI_MEET_INTEGRATION_RESEARCH.md`)
  - Authentication: Optional JWT secret for self-hosted (`JITSI_JWT_SECRET`)
  - Integration location: `src/classes/JitsiManager.ts`

**CareScope (Optional):**
- Preview API
  - Used for: Article QA functionality
  - Auth: `PREVIEW_API_SECRET` environment variable

## Data Storage

**Databases:**
- PostgreSQL 16 (Docker image: `postgres:16-alpine`)
  - Connection: `DATABASE_URL` environment variable (format: `postgresql://user:password@host:port/database`)
  - Default local: `postgresql://arkagentic:arkagentic@127.0.0.1:5432/arkagentic`
  - Container host (Docker): `postgresql://arkagentic:arkagentic@postgres:5432/arkagentic`
  - Client: asyncpg 0.29 (async Python driver) in `backend/database.py`
  - Persistence: Named volume `postgres_data`
  - Schema: Initialized via `scripts/db-init.sql`

**Cloudflare Durable Objects (Edge):**
- SQLite embedded storage
  - Used by: Agent Durable Objects for persistent state
  - Purpose: Agent memory and conversation history across requests
  - Located in: `cloudflare-agents/src/agents/`

**File Storage:**
- Local filesystem (implied)
- No external object storage (S3, etc.) detected
- Game assets served locally

**Caching:**
- None detected as external service
- Likely in-memory caching in application layers

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based session system
  - Implementation: `pyjwt` 2.8 in backend
  - Session token: Generated and returned on user creation in `POST /users`
  - Session storage: Client-side (browser storage/cookies)
  - Expiry: Configurable via `SESSION_EXPIRY_DAYS` env var (default: 30 days)
  - Location: `backend/server.py` (CreateUserRequest, UpdateUserRequest models)

**User Management:**
- Anonymous users supported with `is_anonymous` flag
- Display name and avatar sprite customization
- User creation endpoint: `POST /users`

## Monitoring & Observability

**Error Tracking:**
- Not detected
- None configured in codebase

**Logs:**
- Standard Python logging (`logging` module)
- Logger setup in `backend/server.py`, `backend/database.py`, `backend/agents.py`
- Log level: INFO for Strands and FastAPI
- Frontend: Browser console logs only (no external logging)

**Debugging:**
- `DEBUG` environment variable (boolean flag in `.env.example`)

## CI/CD & Deployment

**Hosting:**
- Docker containers (local development via docker-compose)
- Cloudflare Workers (for edge agent deployment)
- No detected cloud provider lock-in (AWS, GCP, Azure not found)

**CI Pipeline:**
- Not detected
- No GitHub Actions, GitLab CI, or similar found

**Container Orchestration:**
- docker-compose.yml with 4 services:
  - PostgreSQL (port 5432)
  - Backend FastAPI (port 3001)
  - Multiplayer Colyseus (port 2567)
  - Frontend Vite dev (port 5173)

**Environment Variables (by service):**

| Variable | Service | Purpose |
|----------|---------|---------|
| `OPENROUTER_API_KEY` | Backend | LLM API access |
| `ANTHROPIC_API_KEY` | Backend | Alt for OpenRouter |
| `ANTHROPIC_BASE_URL` | Backend | OpenRouter API endpoint |
| `DATABASE_URL` | Backend | PostgreSQL connection |
| `EXA_API_KEY` | Backend | Exa search/research |
| `FIRECRAWL_API_KEY` | Backend | Web crawling/scraping |
| `BRIGHTDATA_API_KEY` | Backend | Search engine SERP data |
| `BRIGHTDATA_ZONE` | Backend | BrightData zone (optional) |
| `VITE_API_URL` | Frontend | Backend API base URL |
| `VITE_WS_URL` | Frontend | Multiplayer WebSocket URL |
| `VITE_JITSI_DOMAIN` | Frontend | Jitsi server domain |
| `JITSI_JWT_SECRET` | Frontend | Jitsi auth (self-hosted only) |
| `SESSION_EXPIRY_DAYS` | Backend | Session token lifetime |
| `PREVIEW_API_SECRET` | Backend | CareScope integration |
| `SLACK_BOT_TOKEN` | Optional | Slack integration |
| `SLACK_SIGNING_SECRET` | Optional | Slack webhook security |
| `NODE_ENV` | Multiplayer | Development/production mode |
| `DEBUG` | Backend | Debug logging flag |

## Webhooks & Callbacks

**Incoming:**
- Not detected
- No webhook endpoints in server.py

**Outgoing:**
- Slack integration webhook (mentioned in `.env.example` but not implemented in codebase)
- Agent handoff callbacks via Strands Agents framework (internal multi-agent coordination)

## Integration Patterns

**Multi-Agent Coordination:**
- Strands Agents framework with Swarm mode
- Agent-to-agent handoffs via orchestrator
- Located in: `backend/agents.py` (AGENT_CONFIGS, get_orchestrator, route_to_agent functions)
- Endpoint: `POST /chat` with `use_swarm` flag

**MCP (Model Context Protocol):**
- Server support via `mcp` 1.0.0 package
- Enables standardized tool integration for Exa, Firecrawl, BrightData
- Configured agents receive tool capabilities dynamically

**API Communication:**
- Frontend to Backend: REST via fetch API
  - Endpoints: `/chat`, `/chat/stream`, `/agents`, `/users`, `/rooms`
  - Base URL: `http://localhost:3001` (dev) or `/api` (prod)
- Frontend to Multiplayer: WebSocket via Colyseus client
  - URL: `ws://localhost:2567`
- Backend to External APIs: asyncio + httpx for async HTTP requests

---

*Integration audit: 2026-02-05*
