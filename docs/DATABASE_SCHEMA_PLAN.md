# ArkAgentic Database Schema Plan

> **Document Version**: 1.1  
> **Last Updated**: January 2026  
> **Status**: Requirements Gathering  
> **Target Scale**: ~20 concurrent users (initial)  
> **Game Engine**: Phaser.js

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [What We Need (Requirements)](#2-what-we-need-requirements)
3. [Database Architecture Decision](#3-database-architecture-decision)
4. [Schema Design (Tables)](#4-schema-design-tables)
5. [Future Service Separation (WorkAdventure Pattern)](#5-future-service-separation-workadventure-pattern)
6. [VPS Resource Planning](#6-vps-resource-planning)
7. [Implementation Priority](#7-implementation-priority)

---

## 1. Current State Analysis

### What Exists Today (No Database)

| Component | Current State | Where It Lives | Problem |
|-----------|---------------|----------------|---------|
| **Users** | None | N/A | Everyone is anonymous, no identity |
| **Conversations** | In-memory array | `TownScene.ts` | Lost on page refresh |
| **Agent Definitions** | Hardcoded 3 times | `constants.ts`, `agents.py`, `server.ts` | Duplicated, requires code deploy to change |
| **Agent Positions** | Hardcoded coordinates | `TownScene.ts` | Can't move agents without code change |
| **Building Zones** | Hardcoded | `TownScene.ts` | Can't add buildings without code change |
| **Room Configs** | Hardcoded | `RoomScene.ts` | Can't create new rooms without code |
| **Tilemaps** | Static JSON files | `public/assets/tilemaps/json/` | Works fine, but users can't create own maps |
| **Player State** | None persisted | Only in Phaser scene | Multiplayer impossible without this |
| **Rate Limiting** | In-memory Map | `server.ts` | Resets on server restart |

### Current File Locations

```
Data that needs to move to database:
.
├── src/
│   ├── constants.ts           # AGENTS object (display info, keywords)
│   └── scenes/
│       ├── TownScene.ts       # buildingZones[], agent spawn positions
│       └── RoomScene.ts       # ROOM_CONFIGS object
│
├── backend/
│   └── agents.py              # AGENT_CONFIGS (prompts, personality)
│
├── server.ts                  # AGENT_PERSONALITIES (duplicate!)
│
└── public/assets/tilemaps/json/
    ├── town.json              # Main map (can stay as file OR move to DB)
    └── room-*.json            # 5 agent room maps
```

### The Core Problem

**Nothing persists.** When a user:
- Refreshes the page → conversation history gone
- Comes back tomorrow → no idea who they are
- Wants to see another player → impossible, no shared state

---

## 2. What We Need (Requirements)

### Must Have (P0) - For Basic Multiplayer

| Requirement | Why | Data to Store |
|-------------|-----|---------------|
| **User Identity** | Know who is who, show names above avatars | ID, display name, chosen avatar sprite |
| **Player Sessions** | Track who's online, enable reconnection | Session token, last position, connection status |
| **Persistent Chat** | Don't lose conversations on refresh | Messages, timestamps, which agent/user |
| **Shared Player State** | See other players move in real-time | Position (x, y), direction, current room |

### Should Have (P1) - For Better Experience

| Requirement | Why | Data to Store |
|-------------|-----|---------------|
| **Agent Configs in DB** | Change agents without code deploy | Name, prompt, keywords, sprite, position |
| **Room/Building Configs** | Add zones without code deploy | Building coords, door positions, linked agent |
| **User Preferences** | Remember audio/video settings | Volume, theme, notification preferences |
| **Chat History per Agent** | Resume conversations with agents | Link messages to user+agent pair |

### Nice to Have (P2) - For User-Created Content

| Requirement | Why | Data to Store |
|-------------|-----|---------------|
| **Custom Worlds** | Users create their own spaces | World metadata, owner, privacy settings |
| **Custom Maps** | Users upload/create tilemaps | Tilemap JSON, tileset references |
| **Custom Agents** | Users create AI characters | Custom prompts, appearances |
| **Meeting Room Tracking** | Know who's in Jitsi calls | Room name, participants, duration |

### Won't Need Yet (P3) - Future Scale

| Requirement | When Needed |
|-------------|-------------|
| Analytics/metrics | 100+ users |
| Moderation tools | Public launch |
| Payment/subscriptions | Monetization |
| Federation (multi-server) | 1000+ users |

---

## 3. Database Architecture Decision

### For 20 Users: Keep It Simple

```
┌─────────────────────────────────────────────────────────────┐
│                     SAME VPS                                 │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Phaser    │  │   Game      │  │     PostgreSQL      │  │
│  │   Client    │  │   Server    │  │     (Single DB)     │  │
│  │   (Static)  │  │  (Colyseus) │  │                     │  │
│  └─────────────┘  └──────┬──────┘  │  • Users            │  │
│                          │         │  • Sessions         │  │
│                          │         │  • Chat messages    │  │
│                          ├────────►│  • Agents           │  │
│                          │         │  • Rooms            │  │
│                          │         │  • Player state     │  │
│  ┌─────────────┐         │         │                     │  │
│  │    Redis    │◄────────┘         └─────────────────────┘  │
│  │  (Optional) │                                            │
│  │             │  For real-time state if needed             │
│  └─────────────┘                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Why PostgreSQL + Optional Redis?

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **SQLite** | Zero setup, single file | No concurrent writes, no pub/sub | Too limited for multiplayer |
| **PostgreSQL** | ACID, JSON support, scales later | Slightly more setup | Best choice |
| **MongoDB** | Flexible schema | Overkill, less tooling | Not needed |
| **Redis alone** | Super fast | Not persistent by default, no relations | Good for real-time only |

**Decision**: PostgreSQL for all persistent data. Add Redis later if real-time performance needs it.

### Resource Estimate (20 Users)

| Component | RAM | Disk | Notes |
|-----------|-----|------|-------|
| PostgreSQL | 256-512 MB | 500 MB - 2 GB | Mostly chat messages |
| Redis (if added) | 64-128 MB | 50 MB | Session cache only |
| **Total Addition** | ~500 MB | ~2 GB | Minimal impact on VPS |

---

## 4. Schema Design (Tables)

### Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE TABLES                                │
│                                                                          │
│  IDENTITY                    CONTENT                    COMMUNICATION   │
│  ────────                    ───────                    ─────────────   │
│  ┌─────────┐                ┌─────────┐                ┌─────────────┐  │
│  │  users  │                │ agents  │                │chat_sessions│  │
│  └────┬────┘                └────┬────┘                └──────┬──────┘  │
│       │                          │                            │         │
│       │ 1:1                      │ 1:N                        │ 1:N     │
│       ▼                          ▼                            ▼         │
│  ┌──────────┐              ┌────────────┐              ┌─────────────┐  │
│  │user_     │              │agent_      │              │chat_        │  │
│  │settings  │              │prompts     │              │messages     │  │
│  └──────────┘              └────────────┘              └─────────────┘  │
│                                                                          │
│  WORLD STATE                 WORLD CONTENT                              │
│  ───────────                 ─────────────                              │
│  ┌──────────────┐           ┌─────────┐                                 │
│  │player_       │           │  rooms  │                                 │
│  │presence      │           └────┬────┘                                 │
│  └──────────────┘                │                                      │
│                                  │ 1:N                                  │
│                            ┌─────┴─────┐                                │
│                            ▼           ▼                                │
│                      ┌──────────┐ ┌────────────┐                        │
│                      │buildings │ │spawn_points│                        │
│                      └──────────┘ └────────────┘                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Table Definitions (What Each Stores)

#### `users` - Who is playing

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Unique identifier |
| display_name | String | Name shown above avatar |
| avatar_sprite | String | Which sprite to use (brendan, may, etc) |
| email | String (optional) | For login later, nullable for anonymous |
| is_anonymous | Boolean | True if no email/password set |
| created_at | Timestamp | When they first joined |
| last_seen_at | Timestamp | For "online X ago" display |

#### `user_settings` - Per-user preferences

| Column | Type | Purpose |
|--------|------|---------|
| user_id | UUID (FK) | Links to users table |
| audio_enabled | Boolean | Microphone on/off default |
| video_enabled | Boolean | Camera on/off default |
| volume | Integer | Speaker volume 0-100 |
| theme | String | dark/light preference |
| show_player_names | Boolean | See names above other players |

#### `player_presence` - Who's online and where

| Column | Type | Purpose |
|--------|------|---------|
| user_id | UUID (FK) | Which user |
| room_id | UUID (FK) | Which room they're in |
| x | Integer | Tile X position |
| y | Integer | Tile Y position |
| direction | String | up/down/left/right (for sprite) |
| status | String | online/away/busy |
| session_token | String | For reconnection |
| last_update | Timestamp | For stale detection |

#### `agents` - AI characters (replaces hardcoded AGENTS)

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Unique identifier |
| slug | String | URL-safe name (scout, sage, etc) |
| name | String | Display name |
| role | String | "Research Specialist", etc |
| emoji | String | Icon emoji |
| sprite_key | String | Which sprite (archie, steven, etc) |
| greeting | Text | Initial message when chat starts |
| routing_keywords | Array | Words that route to this agent |
| is_active | Boolean | Can be disabled without deleting |

#### `agent_prompts` - System prompts (versioned)

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Unique identifier |
| agent_id | UUID (FK) | Which agent |
| version | Integer | Version number (for history) |
| system_prompt | Text | The full system prompt |
| is_active | Boolean | Which version is live |
| created_at | Timestamp | When created |

#### `rooms` - Map/room definitions

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Unique identifier |
| slug | String | URL-safe name (town, room-scout) |
| name | String | Display name |
| tilemap_key | String | Reference to tilemap JSON file |
| width_tiles | Integer | Map width |
| height_tiles | Integer | Map height |
| default_spawn_x | Integer | Where players appear |
| default_spawn_y | Integer | Where players appear |
| is_main | Boolean | Is this the starting room? |

#### `buildings` - Interactive zones in rooms

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Unique identifier |
| room_id | UUID (FK) | Which room it's in |
| name | String | "Scout's Lab", etc |
| type | String | agent_room/meeting/portal |
| x, y | Integer | Position (tiles) |
| width, height | Integer | Size (tiles) |
| door_x, door_y | Integer | Entry point |
| agent_id | UUID (FK) | Linked agent (if agent_room) |
| target_room_id | UUID (FK) | Destination (if portal) |
| jitsi_room | String | Jitsi room name (if meeting) |

#### `spawn_points` - Where entities appear

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Unique identifier |
| room_id | UUID (FK) | Which room |
| x, y | Integer | Position |
| type | String | player/agent |
| agent_id | UUID (FK) | Which agent (if type=agent) |
| direction | String | Initial facing direction |

#### `chat_sessions` - Conversation containers

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Unique identifier |
| type | String | agent/proximity/private |
| user_id | UUID (FK) | Primary user |
| agent_id | UUID (FK) | Agent (if agent chat) |
| other_user_id | UUID (FK) | Other player (if private) |
| created_at | Timestamp | When started |
| last_message_at | Timestamp | For sorting recent chats |

#### `chat_messages` - Individual messages

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Unique identifier |
| session_id | UUID (FK) | Which conversation |
| sender_type | String | user/agent/system |
| sender_id | UUID | User or agent ID |
| sender_name | String | Denormalized for display |
| content | Text | The message |
| created_at | Timestamp | When sent |

---

## 5. Future Service Separation (WorkAdventure Pattern)

### WorkAdventure's Docker Services

WorkAdventure splits into these services so they can update independently:

```
WorkAdventure Services:
├── play        → Frontend (Phaser game client)
├── pusher      → WebSocket handler (real-time state)
├── back        → Business logic API
├── map-storage → Tilemap file serving
├── uploader    → File upload handling
├── livekit     → Video/audio SFU
├── coturn      → TURN server for WebRTC
└── redis       → Pub/sub, session cache
```

### Our Path (Start Simple, Split Later)

**Phase 1: Monolith (Now - 20 users)**
```
Single Server:
├── Phaser Client (static files)
├── Colyseus Server (WebSocket + API)
├── PostgreSQL (all data)
└── (Redis optional)
```

**Phase 2: First Split (50-100 users)**
```
├── Frontend Container (Phaser static)
├── Game Server Container (Colyseus)
├── PostgreSQL Container
└── Redis Container
```

**Phase 3: Full Split (100+ users)**
```
├── Frontend Service
├── WebSocket Service (Pusher equivalent)
├── API Service (Back equivalent)
├── PostgreSQL
├── Redis
├── Jitsi Service
└── Coturn Service
```

### Why Not Split Now?

| Concern | At 20 Users | At 100+ Users |
|---------|-------------|---------------|
| Deployment complexity | Overkill | Worth it |
| Resource overhead | Wasteful | Necessary |
| Update independence | Not needed yet | Critical |
| Debugging | Harder with split | Logs per service |

**Decision**: Start monolith, split when we hit scaling pain points.

---

## 6. VPS Resource Planning

### Current VPS (Assumed)

You likely have something like:
- 2-4 CPU cores
- 4-8 GB RAM
- 40-80 GB SSD

### With Database Added

| Service | CPU | RAM | Disk | Notes |
|---------|-----|-----|------|-------|
| Node.js (Vite + Server) | 0.5 core | 512 MB | - | Current |
| Phaser Client | - | - | 50 MB | Static files |
| PostgreSQL | 0.5 core | 256-512 MB | 1-2 GB | New |
| Redis (optional) | 0.1 core | 64 MB | 50 MB | Future |
| **Total** | ~1 core | ~1 GB | ~2 GB | Fits easily |

### Growth Projections

| Users | PostgreSQL RAM | Chat Storage | Notes |
|-------|----------------|--------------|-------|
| 20 | 256 MB | 100 MB | Comfortable |
| 50 | 512 MB | 500 MB | Still fine |
| 100 | 1 GB | 1-2 GB | Consider Redis |
| 500 | 2 GB | 5-10 GB | Split services |

---

## 7. Implementation Priority

### Phase 1: Foundation (Week 1)

**Goal**: Get database running, migrate hardcoded data

| Task | Effort | Outcome |
|------|--------|---------|
| Install PostgreSQL on VPS | 1 hour | DB running |
| Create tables (users, agents, rooms, buildings, spawn_points) | 2 hours | Schema ready |
| Insert current agents/rooms/buildings as seed data | 2 hours | No more hardcoded |
| Update Phaser scenes to load from API | 4 hours | Dynamic loading |

### Phase 2: User Identity (Week 2)

**Goal**: Users have persistent identity

| Task | Effort | Outcome |
|------|--------|---------|
| Auto-create anonymous user on first visit | 2 hours | User exists |
| Store user ID in localStorage | 1 hour | Survives refresh |
| Show user's chosen name above avatar | 2 hours | Identity visible |
| Avatar sprite selection | 3 hours | Personalization |

### Phase 3: Chat Persistence (Week 3)

**Goal**: Conversations survive page refresh

| Task | Effort | Outcome |
|------|--------|---------|
| Create chat_sessions on conversation start | 2 hours | Sessions tracked |
| Store messages to chat_messages table | 2 hours | History saved |
| Load chat history on scene enter | 3 hours | Resume conversations |
| UI for chat history panel | 4 hours | Browse past chats |

### Phase 4: Multiplayer State (Week 4+)

**Goal**: See other players

| Task | Effort | Outcome |
|------|--------|---------|
| Colyseus room integration | 8 hours | Shared state |
| player_presence updates | 4 hours | Track positions |
| Remote player rendering | 4 hours | See others |
| Reconnection handling | 4 hours | Robust connections |

---

## Summary: What Changes

### Before (Current)

```
User visits → Anonymous, no state
User chats → Lost on refresh  
User leaves → No trace
Admin wants to add agent → Redeploy code
Admin wants new room → Redeploy code
```

### After (With Database)

```
User visits → Gets user ID, stored in browser
User chats → Saved to PostgreSQL, loads on return
User leaves → Position saved, can reconnect
Admin wants to add agent → Add row to agents table
Admin wants new room → Add row to rooms table
Multiplayer → All possible via shared state
```

### Files That Will Change

```
REMOVE hardcoding from:
├── src/constants.ts          → Load agents from API
├── src/scenes/TownScene.ts   → Load buildings/spawns from API
├── src/scenes/RoomScene.ts   → Load room configs from API
├── backend/agents.py         → Load prompts from DB
└── server.ts                 → Load personalities from DB

ADD:
├── Database schema (SQL file)
├── API endpoints for CRUD
├── Database connection config
└── Seed data migration script
```

---

## Next Steps (No Code Yet)

1. **Confirm VPS specs** - What do you have?
2. **Confirm database choice** - PostgreSQL OK?
3. **Review table design** - Any missing data?
4. **Prioritize features** - What first?
5. **Then we implement** - One phase at a time

---

*This document is for planning only. Implementation begins after requirements are confirmed.*
