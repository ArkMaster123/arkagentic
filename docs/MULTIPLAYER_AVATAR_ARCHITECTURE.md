# ArkAgentic Multiplayer Avatar World - Complete Architecture Document

> **Document Version**: 1.0  
> **Last Updated**: January 2026  
> **Status**: Research & Planning Phase  
> **Inspired By**: WorkAdventure, Gather.town, Mozilla Hubs

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Avatar Movement System](#3-avatar-movement-system)
4. [Real-Time Multiplayer Networking](#4-real-time-multiplayer-networking)
5. [Persistent Chat Sessions](#5-persistent-chat-sessions)
6. [Proximity-Based Communication](#6-proximity-based-communication)
7. [Video Conferencing Integration (Jitsi)](#7-video-conferencing-integration-jitsi)
8. [Zone & Room System](#8-zone--room-system)
9. [Mobile Support](#9-mobile-support)
10. [Self-Hosting Infrastructure](#10-self-hosting-infrastructure)
11. [Security Architecture](#11-security-architecture)
12. [Scalability Strategy](#12-scalability-strategy)
13. [Implementation Phases](#13-implementation-phases)
14. [Technology Stack Summary](#14-technology-stack-summary)
15. [Appendix: Code Patterns](#15-appendix-code-patterns)

---

## 1. Executive Summary

### Vision

Transform ArkAgentic from a single-player agent exploration game into a fully multiplayer virtual world where:

- **Users control avatars** with smooth WASD/arrow key movement (desktop) and virtual joystick (mobile)
- **Multiple users coexist** in the same world, seeing each other's avatars move in real-time
- **Proximity-based chat** allows users to talk to each other when they get close
- **Private meeting rooms** enable video conferencing (Jitsi) when entering designated zones
- **Persistent sessions** ensure chat history and state survive page refreshes and reconnections
- **AI agents** remain interactive NPCs that users can approach and converse with

### Key Technical Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Networking** | Colyseus (WebSocket) | Purpose-built for games, automatic state sync, reconnection support |
| **Movement** | Client-side prediction + Server reconciliation | Responsive feel with authoritative server |
| **Proximity Chat** | Zone-based + Distance audio | WorkAdventure pattern, efficient for many users |
| **Video Calls** | Self-hosted Jitsi | Privacy, control, proven WorkAdventure integration |
| **Session Storage** | Redis + PostgreSQL | Fast real-time state + durable persistence |
| **Mobile Controls** | Virtual joystick (custom) | Better UX than external libraries |

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      PHASER.JS GAME ENGINE                           │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐    │    │
│  │  │  Movement  │ │  Renderer  │ │   Zones    │ │    UI Layer    │    │    │
│  │  │  System    │ │  (Canvas)  │ │  Manager   │ │  (React/HTML)  │    │    │
│  │  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └───────┬────────┘    │    │
│  └────────┼──────────────┼──────────────┼────────────────┼─────────────┘    │
│           │              │              │                │                   │
│  ┌────────▼──────────────▼──────────────▼────────────────▼─────────────┐    │
│  │                    COLYSEUS CLIENT SDK                               │    │
│  │         (State Sync, Input Sending, Reconnection)                    │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                            │
│  ┌──────────────────────────────┼──────────────────────────────────────┐    │
│  │             JITSI IFRAME (JitsiMeetExternalAPI)                      │    │
│  │                  (Video/Audio when in zones)                         │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
└─────────────────────────────────┼────────────────────────────────────────────┘
                                  │ WebSocket + WebRTC
                                  │
┌─────────────────────────────────▼────────────────────────────────────────────┐
│                            SERVER INFRASTRUCTURE                              │
│                                                                               │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │ COLYSEUS SERVER │◄──►│      REDIS      │◄──►│       POSTGRESQL        │  │
│  │  (Game State)   │    │  (Sessions/PubSub)│   │   (Persistent Data)     │  │
│  └────────┬────────┘    └─────────────────┘    └─────────────────────────┘  │
│           │                                                                   │
│           │             ┌─────────────────────────────────────────────────┐  │
│           └────────────►│              JITSI MEET SERVER                   │  │
│                         │  (Prosody + Jicofo + JVB + Coturn)               │  │
│                         └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. System Overview

### Core User Flows

#### Flow 1: User Joins the World
```
1. User opens app → Authenticates (or anonymous session created)
2. Client connects to Colyseus server via WebSocket
3. Server creates player entity with position, assigns session ID
4. Client receives full room state (all current players + agents)
5. Client spawns local avatar + remote player avatars
6. User can now move and interact
```

#### Flow 2: User Moves Around
```
1. User presses arrow key / touches joystick
2. Client immediately predicts movement (responsive feel)
3. Client sends input to server: { seq: 42, left: true, ... }
4. Server validates, simulates, broadcasts position to all
5. Other clients interpolate the moving player smoothly
6. Original client reconciles if server state differs from prediction
```

#### Flow 3: Two Users Get Close (Proximity Chat)
```
1. Server detects players A and B within 100px radius
2. Server broadcasts "proximity_enter" event to both
3. Both clients enable microphone/audio for peer
4. WebRTC audio channel established (via Jitsi or direct)
5. As they move, volume attenuates based on distance
6. When >100px apart, audio disconnected
```

#### Flow 4: User Enters Meeting Room Zone
```
1. Player avatar overlaps zone with "jitsiRoom" property
2. Client triggers JitsiManager.enterZone()
3. Jitsi IFrame appears, auto-joins room "zone-{roomName}"
4. All players in same zone see each other in video
5. When player exits zone, Jitsi disconnects automatically
```

#### Flow 5: User Refreshes Page / Loses Connection
```
1. Colyseus detects disconnect
2. Server holds player state for 30 seconds (allowReconnection)
3. Client stores reconnectionToken in localStorage
4. On refresh, client attempts reconnect with token
5. If successful, player resumes exactly where they were
6. If timeout, player removed from room (can rejoin fresh)
```

---

## 3. Avatar Movement System

### 3.1 Input Handling (Desktop)

**Keyboard Controls:**
- Arrow keys OR WASD for 8-directional movement
- Diagonal movement with combined keys (e.g., Up+Right)
- Optional: Shift to run (increased speed)
- Space/Enter to interact with nearby objects/agents/players

```typescript
// Input capture structure
interface InputPayload {
  seq: number;        // Sequence number for reconciliation
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  running: boolean;   // Shift held
  interact: boolean;  // Space/Enter pressed
  timestamp: number;  // Client timestamp
}
```

### 3.2 Client-Side Prediction

To ensure responsive movement despite network latency, the client predicts movement locally:

```
Frame 1: User presses RIGHT
         → Client immediately moves avatar right
         → Client sends input #1 to server
         → Input #1 stored in buffer

Frame 5: Server acknowledges input #1 with authoritative position
         → Client compares server position to predicted position
         → If within threshold (5px): smooth interpolation
         → If large difference: snap to server position
         → Discard input #1 from buffer, replay any unacknowledged inputs
```

**Key Implementation Points:**
- Store last ~200ms of inputs in a circular buffer
- Each input has a sequence number
- Server responds with last processed sequence
- Client replays unacknowledged inputs on server snapshot

### 3.3 Server-Side Movement Validation

The server is authoritative to prevent cheating:

```typescript
// Server-side movement simulation (must match client exactly)
function applyInput(player: Player, input: InputPayload, deltaMs: number) {
  const speed = input.running ? 240 : 160; // pixels per second
  const delta = speed * (deltaMs / 1000);
  
  let dx = 0, dy = 0;
  if (input.left) dx -= delta;
  if (input.right) dx += delta;
  if (input.up) dy -= delta;
  if (input.down) dy += delta;
  
  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    dx = (dx / magnitude) * delta;
    dy = (dy / magnitude) * delta;
  }
  
  // Collision detection against tilemap
  const newX = player.x + dx;
  const newY = player.y + dy;
  
  if (!collidesWith(newX, newY, collisionLayer)) {
    player.x = newX;
    player.y = newY;
  }
  
  // Update facing direction for animation
  player.direction = determineDirection(dx, dy);
}
```

### 3.4 Remote Player Interpolation

Other players' movements are interpolated for smooth rendering:

```typescript
// Interpolation settings
const INTERPOLATION_FACTOR = 0.2;  // 20% per frame toward target
const RENDER_DELAY_MS = 100;       // Render 100ms behind real-time

// In Phaser update loop
update(time: number, delta: number) {
  for (const [sessionId, entity] of this.remotePlayers) {
    const serverX = entity.getData('serverX');
    const serverY = entity.getData('serverY');
    
    // Smooth interpolation
    entity.x = Phaser.Math.Linear(entity.x, serverX, INTERPOLATION_FACTOR);
    entity.y = Phaser.Math.Linear(entity.y, serverY, INTERPOLATION_FACTOR);
    
    // Snap if too far (teleport, lag spike)
    if (Math.abs(entity.x - serverX) > 50 || Math.abs(entity.y - serverY) > 50) {
      entity.x = serverX;
      entity.y = serverY;
    }
  }
}
```

### 3.5 Animation System

Avatar animations based on movement state:

```typescript
// Animation states
type AnimationState = 'idle' | 'walk' | 'run';
type Direction = 'up' | 'down' | 'left' | 'right';

// Animation key format: "{state}-{direction}"
// Examples: "idle-down", "walk-left", "run-up"

function updateAnimation(player: Sprite, velocity: Vector2, isRunning: boolean) {
  const isMoving = velocity.length() > 0;
  const state: AnimationState = !isMoving ? 'idle' : (isRunning ? 'run' : 'walk');
  
  // Determine direction (prioritize horizontal for diagonal)
  let direction: Direction = 'down';
  if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
    direction = velocity.x > 0 ? 'right' : 'left';
  } else if (velocity.y !== 0) {
    direction = velocity.y > 0 ? 'down' : 'up';
  }
  
  const animKey = `${state}-${direction}`;
  if (player.anims.currentAnim?.key !== animKey) {
    player.anims.play(animKey, true);
  }
}
```

---

## 4. Real-Time Multiplayer Networking

### 4.1 Why Colyseus?

| Feature | Colyseus | Socket.io | Custom WebSocket |
|---------|----------|-----------|------------------|
| **State Synchronization** | Automatic delta sync | Manual | Manual |
| **Room Management** | Built-in | Manual | Manual |
| **Reconnection** | Built-in with tokens | Manual | Manual |
| **Schema Serialization** | Binary, efficient | JSON | Variable |
| **Game Loop** | Built-in tick rate | Manual | Manual |
| **Phaser Integration** | Official examples | Community | DIY |
| **Horizontal Scaling** | Redis presence/driver | Manual | Manual |

**Verdict**: Colyseus reduces boilerplate significantly and has patterns proven for games.

### 4.2 Colyseus Room Architecture

```typescript
// shared/schemas/GameState.ts
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") sessionId: string;
  @type("string") odisplayName: string;
  @type("string") odavatarId: string;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") direction: string = "down";
  @type("boolean") isMoving: boolean = false;
  @type("boolean") isRunning: boolean = false;
  @type("boolean") connected: boolean = true;
  @type("number") lastInputSeq: number = 0;
  
  // Public variables other players can see
  @type("string") status: string = "online";
  @type("string") currentZone: string = "";
}

export class Agent extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("string") sprite: string;
  @type("boolean") isBusy: boolean = false;
  @type("string") currentChattingWith: string = "";
}

export class ChatMessage extends Schema {
  @type("string") id: string;
  @type("string") senderId: string;
  @type("string") senderName: string;
  @type("string") content: string;
  @type("number") timestamp: number;
  @type("string") type: string; // "proximity" | "agent" | "system"
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Agent }) agents = new MapSchema<Agent>();
  @type([ ChatMessage ]) recentMessages = new ArraySchema<ChatMessage>();
  @type("number") tick: number = 0;
}
```

### 4.3 Server Room Implementation

```typescript
// server/rooms/GameRoom.ts
import { Room, Client, Delayed } from "colyseus";
import { GameState, Player, Agent } from "../schemas/GameState";

export class GameRoom extends Room<GameState> {
  maxClients = 100;
  patchRate = 50;      // Send state updates every 50ms (20Hz)
  autoDispose = false; // Keep room alive even if empty
  
  // Delayed actions
  private reconnectionTimeouts: Map<string, Delayed> = new Map();
  
  onCreate(options: any) {
    this.setState(new GameState());
    
    // Initialize agents from configuration
    this.initializeAgents();
    
    // Fixed timestep game loop (60Hz simulation)
    let lastTime = Date.now();
    this.setSimulationInterval((deltaTime) => {
      const now = Date.now();
      this.gameLoop(now - lastTime);
      lastTime = now;
      this.state.tick++;
    }, 1000 / 60);
    
    // Handle player input
    this.onMessage("input", (client, input: InputPayload) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.processInput(player, input);
      }
    });
    
    // Handle chat messages
    this.onMessage("chat", (client, message: { content: string; type: string }) => {
      this.broadcastChat(client.sessionId, message);
    });
    
    // Handle zone enter/leave
    this.onMessage("enterZone", (client, zoneId: string) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.currentZone = zoneId;
        this.broadcast("playerEnteredZone", { sessionId: client.sessionId, zoneId });
      }
    });
    
    this.onMessage("leaveZone", (client, zoneId: string) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.currentZone === zoneId) {
        player.currentZone = "";
        this.broadcast("playerLeftZone", { sessionId: client.sessionId, zoneId });
      }
    });
  }
  
  onJoin(client: Client, options: { displayName: string; avatarId: string; x?: number; y?: number }) {
    console.log(`Player ${client.sessionId} joined`);
    
    const player = new Player();
    player.sessionId = client.sessionId;
    player.displayName = options.displayName || `Player-${client.sessionId.slice(0,4)}`;
    player.avatarId = options.avatarId || "default";
    player.x = options.x ?? this.getSpawnPoint().x;
    player.y = options.y ?? this.getSpawnPoint().y;
    player.connected = true;
    
    this.state.players.set(client.sessionId, player);
    
    // Clear any pending reconnection timeout
    this.reconnectionTimeouts.get(client.sessionId)?.clear();
    this.reconnectionTimeouts.delete(client.sessionId);
  }
  
  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    player.connected = false;
    
    try {
      if (consented) {
        // Player intentionally left - remove immediately
        throw new Error("consented leave");
      }
      
      // Unexpected disconnect - allow 30 seconds for reconnection
      console.log(`Player ${client.sessionId} disconnected, waiting for reconnect...`);
      
      await this.allowReconnection(client, 30);
      
      // Successfully reconnected!
      console.log(`Player ${client.sessionId} reconnected`);
      player.connected = true;
      
    } catch (e) {
      // Timed out or consented leave - remove player
      console.log(`Player ${client.sessionId} removed from room`);
      this.state.players.delete(client.sessionId);
    }
  }
  
  private processInput(player: Player, input: InputPayload) {
    // Validate sequence number to prevent replay
    if (input.seq <= player.lastInputSeq) return;
    
    // Calculate delta time from last input (capped at 100ms)
    const deltaMs = Math.min(input.timestamp - player.lastInputTimestamp || 16, 100);
    
    // Apply movement (must match client simulation exactly!)
    const speed = input.running ? 240 : 160;
    const delta = speed * (deltaMs / 1000);
    
    let dx = 0, dy = 0;
    if (input.left) dx -= delta;
    if (input.right) dx += delta;
    if (input.up) dy -= delta;
    if (input.down) dy += delta;
    
    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      const mag = Math.sqrt(dx*dx + dy*dy);
      dx = (dx / mag) * delta;
      dy = (dy / mag) * delta;
    }
    
    // Collision check
    const newX = player.x + dx;
    const newY = player.y + dy;
    if (!this.checkCollision(newX, newY)) {
      player.x = newX;
      player.y = newY;
    }
    
    // Update state
    player.isMoving = dx !== 0 || dy !== 0;
    player.isRunning = input.running && player.isMoving;
    player.direction = this.getDirection(dx, dy);
    player.lastInputSeq = input.seq;
    player.lastInputTimestamp = input.timestamp;
  }
  
  private gameLoop(deltaMs: number) {
    // Run AI agent behaviors
    this.updateAgents(deltaMs);
    
    // Check proximity between players
    this.checkPlayerProximity();
  }
  
  private checkPlayerProximity() {
    const PROXIMITY_RADIUS = 100; // pixels
    const players = Array.from(this.state.players.values()).filter(p => p.connected);
    
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const p1 = players[i];
        const p2 = players[j];
        
        const distance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const key = [p1.sessionId, p2.sessionId].sort().join('-');
        
        if (distance <= PROXIMITY_RADIUS) {
          if (!this.proximityPairs.has(key)) {
            // Newly in proximity
            this.proximityPairs.add(key);
            this.broadcast("proximityEnter", {
              player1: p1.sessionId,
              player2: p2.sessionId,
              distance
            });
          }
        } else {
          if (this.proximityPairs.has(key)) {
            // Left proximity
            this.proximityPairs.delete(key);
            this.broadcast("proximityLeave", {
              player1: p1.sessionId,
              player2: p2.sessionId
            });
          }
        }
      }
    }
  }
  
  private proximityPairs: Set<string> = new Set();
}
```

### 4.4 Client Connection Management

```typescript
// src/networking/ColyseusManager.ts
import { Client, Room } from "colyseus.js";
import { GameState } from "../schemas/GameState";

class ColyseusManager {
  private client: Client;
  private room: Room<GameState> | null = null;
  private reconnectionToken: string | null = null;
  
  async connect(serverUrl: string, options: JoinOptions): Promise<Room<GameState>> {
    this.client = new Client(serverUrl);
    
    // Try reconnection first
    const cachedToken = localStorage.getItem("arkagenticReconnectToken");
    if (cachedToken) {
      try {
        this.room = await this.client.reconnect<GameState>(cachedToken);
        console.log("Reconnected successfully!");
        this.setupRoom();
        return this.room;
      } catch (e) {
        console.log("Reconnection failed, joining fresh");
        localStorage.removeItem("arkagenticReconnectToken");
      }
    }
    
    // Fresh join
    this.room = await this.client.joinOrCreate<GameState>("game_room", options);
    this.setupRoom();
    return this.room;
  }
  
  private setupRoom() {
    if (!this.room) return;
    
    // Cache reconnection token
    this.reconnectionToken = this.room.reconnectionToken;
    localStorage.setItem("arkagenticReconnectToken", this.reconnectionToken);
    
    // Handle disconnection
    this.room.onLeave((code) => {
      console.log("Disconnected with code:", code);
      
      if (code === 1000 || code === 4000) {
        // Clean disconnect - clear token
        localStorage.removeItem("arkagenticReconnectToken");
      } else {
        // Unexpected disconnect - attempt reconnect
        this.attemptReconnect();
      }
    });
    
    // Handle state changes
    this.room.state.players.onAdd((player, sessionId) => {
      eventCenter.emit("playerJoined", { player, sessionId });
    });
    
    this.room.state.players.onRemove((player, sessionId) => {
      eventCenter.emit("playerLeft", { sessionId });
    });
    
    // Handle custom events
    this.room.onMessage("proximityEnter", (data) => {
      eventCenter.emit("proximityEnter", data);
    });
    
    this.room.onMessage("proximityLeave", (data) => {
      eventCenter.emit("proximityLeave", data);
    });
  }
  
  private async attemptReconnect(maxAttempts = 5) {
    for (let i = 0; i < maxAttempts; i++) {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.pow(2, i) * 1000;
      console.log(`Reconnection attempt ${i + 1} in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      
      try {
        const token = localStorage.getItem("arkagenticReconnectToken");
        if (!token) throw new Error("No token");
        
        this.room = await this.client.reconnect<GameState>(token);
        console.log("Reconnected!");
        this.setupRoom();
        eventCenter.emit("reconnected");
        return;
      } catch (e) {
        console.log(`Attempt ${i + 1} failed`);
      }
    }
    
    // All attempts failed
    localStorage.removeItem("arkagenticReconnectToken");
    eventCenter.emit("reconnectFailed");
  }
  
  sendInput(input: InputPayload) {
    this.room?.send("input", input);
  }
  
  sendChat(content: string, type: string) {
    this.room?.send("chat", { content, type });
  }
  
  getSessionId(): string | undefined {
    return this.room?.sessionId;
  }
  
  disconnect() {
    this.room?.leave();
    localStorage.removeItem("arkagenticReconnectToken");
  }
}

export const colyseusManager = new ColyseusManager();
```

### 4.5 Network Architecture Diagram

```
                                   INTERNET
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
              ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
              │ Client A  │     │ Client B  │     │ Client C  │
              │ (Browser) │     │ (Browser) │     │ (Mobile)  │
              └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      │
                              WebSocket (wss://)
                                      │
                    ┌─────────────────▼─────────────────┐
                    │           LOAD BALANCER           │
                    │    (Sticky Sessions by IP/Token)  │
                    └─────────────────┬─────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
   ┌─────▼─────┐                ┌─────▼─────┐                ┌─────▼─────┐
   │ Colyseus  │                │ Colyseus  │                │ Colyseus  │
   │ Server 1  │◄──────────────►│ Server 2  │◄──────────────►│ Server 3  │
   │           │    Redis       │           │    Redis       │           │
   └─────┬─────┘    Pub/Sub     └─────┬─────┘    Pub/Sub     └─────┬─────┘
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │         REDIS           │
                         │  • Session Storage      │
                         │  • Cross-server PubSub  │
                         │  • Presence Tracking    │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │       POSTGRESQL        │
                         │  • User Accounts        │
                         │  • Chat History         │
                         │  • World State          │
                         └─────────────────────────┘
```

---

## 5. Persistent Chat Sessions

### 5.1 Chat Persistence Requirements

| Requirement | Solution |
|-------------|----------|
| **Survive page refresh** | localStorage + server-side storage |
| **Survive reconnection** | Colyseus state sync on rejoin |
| **Historical messages** | PostgreSQL with pagination |
| **Real-time delivery** | Colyseus room broadcast |
| **Per-user history** | User-specific chat tables |
| **Agent conversations** | Separate session per agent |

### 5.2 Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(50) NOT NULL,
  avatar_id VARCHAR(50) DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);

-- Chat sessions (each conversation has a session)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- 'proximity', 'agent', 'private', 'zone'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Participants in a chat session
CREATE TABLE chat_participants (
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id VARCHAR(50), -- NULL for player chats
  joined_at TIMESTAMP DEFAULT NOW(),
  last_read_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (session_id, user_id)
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  sender_type VARCHAR(20) NOT NULL, -- 'player', 'agent', 'system'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_messages_session ON chat_messages(session_id, created_at DESC);
CREATE INDEX idx_participants_user ON chat_participants(user_id);
CREATE INDEX idx_sessions_type ON chat_sessions(type);
```

### 5.3 Chat Session Manager (Server)

```typescript
// server/services/ChatSessionManager.ts
import { Pool } from 'pg';

interface ChatSession {
  id: string;
  type: 'proximity' | 'agent' | 'private' | 'zone';
  participants: string[];
  messages: ChatMessage[];
}

class ChatSessionManager {
  private pool: Pool;
  private activeSessions: Map<string, ChatSession> = new Map();
  
  // Get or create session for agent conversation
  async getAgentSession(userId: string, agentId: string): Promise<ChatSession> {
    const key = `agent:${userId}:${agentId}`;
    
    // Check memory cache
    if (this.activeSessions.has(key)) {
      return this.activeSessions.get(key)!;
    }
    
    // Check database
    const result = await this.pool.query(`
      SELECT cs.* FROM chat_sessions cs
      JOIN chat_participants cp ON cs.id = cp.session_id
      WHERE cs.type = 'agent'
        AND cp.user_id = $1
        AND cp.agent_id = $2
      ORDER BY cs.updated_at DESC
      LIMIT 1
    `, [userId, agentId]);
    
    if (result.rows.length > 0) {
      const session = await this.loadSession(result.rows[0].id);
      this.activeSessions.set(key, session);
      return session;
    }
    
    // Create new session
    const session = await this.createSession('agent', [userId], agentId);
    this.activeSessions.set(key, session);
    return session;
  }
  
  // Get recent messages for a session (with pagination)
  async getMessages(sessionId: string, limit = 50, before?: string): Promise<ChatMessage[]> {
    const query = before
      ? `SELECT * FROM chat_messages WHERE session_id = $1 AND id < $2 ORDER BY created_at DESC LIMIT $3`
      : `SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2`;
    
    const params = before ? [sessionId, before, limit] : [sessionId, limit];
    const result = await this.pool.query(query, params);
    
    return result.rows.reverse(); // Return in chronological order
  }
  
  // Add message to session
  async addMessage(sessionId: string, senderId: string, senderType: string, content: string): Promise<ChatMessage> {
    const result = await this.pool.query(`
      INSERT INTO chat_messages (session_id, sender_id, sender_type, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [sessionId, senderId, senderType, content]);
    
    // Update session timestamp
    await this.pool.query(`
      UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1
    `, [sessionId]);
    
    const message = result.rows[0];
    
    // Update memory cache
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      // Keep only last 100 in memory
      if (session.messages.length > 100) {
        session.messages = session.messages.slice(-100);
      }
    }
    
    return message;
  }
  
  private async createSession(type: string, userIds: string[], agentId?: string): Promise<ChatSession> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create session
      const sessionResult = await client.query(`
        INSERT INTO chat_sessions (type) VALUES ($1) RETURNING *
      `, [type]);
      
      const sessionId = sessionResult.rows[0].id;
      
      // Add participants
      for (const userId of userIds) {
        await client.query(`
          INSERT INTO chat_participants (session_id, user_id, agent_id)
          VALUES ($1, $2, $3)
        `, [sessionId, userId, agentId]);
      }
      
      await client.query('COMMIT');
      
      return {
        id: sessionId,
        type: type as any,
        participants: userIds,
        messages: []
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
```

### 5.4 Client-Side Chat Storage

```typescript
// src/services/ChatStorage.ts

interface LocalChatSession {
  id: string;
  type: string;
  lastMessage: string;
  lastTimestamp: number;
  unreadCount: number;
}

class ChatStorage {
  private readonly STORAGE_KEY = 'arkagentic_chat_sessions';
  
  // Get all local sessions
  getSessions(): LocalChatSession[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }
  
  // Update session metadata
  updateSession(sessionId: string, updates: Partial<LocalChatSession>) {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    
    if (index >= 0) {
      sessions[index] = { ...sessions[index], ...updates };
    } else {
      sessions.push({
        id: sessionId,
        type: 'unknown',
        lastMessage: '',
        lastTimestamp: Date.now(),
        unreadCount: 0,
        ...updates
      });
    }
    
    // Keep only last 50 sessions
    const sorted = sessions.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sorted.slice(0, 50)));
  }
  
  // Mark session as read
  markRead(sessionId: string) {
    this.updateSession(sessionId, { unreadCount: 0 });
  }
  
  // Clear all local data
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const chatStorage = new ChatStorage();
```

### 5.5 Restoration Flow on Reconnect

```typescript
// When player reconnects or refreshes
async function restoreChatState(userId: string) {
  // 1. Get local session list
  const localSessions = chatStorage.getSessions();
  
  // 2. For each session, fetch recent messages from server
  for (const session of localSessions.slice(0, 10)) { // Top 10 recent
    const messages = await api.get(`/chat/sessions/${session.id}/messages?limit=20`);
    
    // 3. Update UI with restored messages
    chatUI.restoreSession(session.id, messages);
    
    // 4. Subscribe to real-time updates
    colyseusManager.room?.onMessage(`chat:${session.id}`, (message) => {
      chatUI.addMessage(session.id, message);
    });
  }
}
```

---

## 6. Proximity-Based Communication

### 6.1 Proximity Detection Strategy

WorkAdventure uses two complementary approaches:

1. **Server-Side Detection**: Authoritative proximity calculations for security
2. **Zone-Based Video**: Predefined areas for video conferencing
3. **Distance-Based Audio**: Volume attenuation based on distance

### 6.2 Spatial Hashing for Scalability

For 100+ players, checking every pair is O(n^2). Use spatial hashing:

```typescript
// server/services/SpatialHash.ts

class SpatialHash {
  private cellSize: number;
  private cells: Map<string, Set<string>> = new Map();
  
  constructor(cellSize = 100) {
    this.cellSize = cellSize;
  }
  
  // Get cell key for position
  private getKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }
  
  // Update player position in hash
  update(playerId: string, x: number, y: number, prevX?: number, prevY?: number) {
    // Remove from old cell
    if (prevX !== undefined && prevY !== undefined) {
      const oldKey = this.getKey(prevX, prevY);
      this.cells.get(oldKey)?.delete(playerId);
    }
    
    // Add to new cell
    const newKey = this.getKey(x, y);
    if (!this.cells.has(newKey)) {
      this.cells.set(newKey, new Set());
    }
    this.cells.get(newKey)!.add(playerId);
  }
  
  // Remove player from hash
  remove(playerId: string, x: number, y: number) {
    const key = this.getKey(x, y);
    this.cells.get(key)?.delete(playerId);
  }
  
  // Get nearby players (within radius)
  getNearby(x: number, y: number, radius: number): string[] {
    const nearby: string[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    
    // Check surrounding cells
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const cell = this.cells.get(key);
        if (cell) {
          nearby.push(...cell);
        }
      }
    }
    
    return nearby;
  }
}
```

### 6.3 Proximity Chat Implementation

```typescript
// Client-side proximity audio manager
class ProximityAudioManager {
  private audioContext: AudioContext;
  private gainNodes: Map<string, GainNode> = new Map();
  private mediaStreams: Map<string, MediaStream> = new Map();
  
  private readonly MAX_DISTANCE = 200; // Full volume within this
  private readonly FALLOFF_DISTANCE = 400; // Silence beyond this
  
  async setupAudioForPlayer(playerId: string, stream: MediaStream) {
    const source = this.audioContext.createMediaStreamSource(stream);
    const gainNode = this.audioContext.createGain();
    
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    this.gainNodes.set(playerId, gainNode);
    this.mediaStreams.set(playerId, stream);
    
    // Start at zero volume
    gainNode.gain.value = 0;
  }
  
  updateVolume(playerId: string, distance: number) {
    const gainNode = this.gainNodes.get(playerId);
    if (!gainNode) return;
    
    let volume: number;
    
    if (distance <= this.MAX_DISTANCE) {
      volume = 1.0;
    } else if (distance >= this.FALLOFF_DISTANCE) {
      volume = 0.0;
    } else {
      // Linear falloff
      volume = 1.0 - (distance - this.MAX_DISTANCE) / (this.FALLOFF_DISTANCE - this.MAX_DISTANCE);
    }
    
    // Smooth transition
    gainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
  }
  
  disconnectPlayer(playerId: string) {
    const gainNode = this.gainNodes.get(playerId);
    gainNode?.disconnect();
    this.gainNodes.delete(playerId);
    
    const stream = this.mediaStreams.get(playerId);
    stream?.getTracks().forEach(track => track.stop());
    this.mediaStreams.delete(playerId);
  }
}
```

### 6.4 Proximity Events Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER (Colyseus)                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Proximity Detector                         │   │
│  │                                                               │   │
│  │  Every tick (60Hz):                                           │   │
│  │    1. Update spatial hash with player positions               │   │
│  │    2. For each player:                                        │   │
│  │       - Get nearby players from spatial hash                  │   │
│  │       - Calculate exact distances                             │   │
│  │       - Compare with previous tick                            │   │
│  │       - Emit enter/leave events                               │   │
│  │                                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     Event Broadcaster                         │   │
│  │                                                               │   │
│  │  proximityEnter { player1, player2, distance }               │   │
│  │  proximityLeave { player1, player2 }                         │   │
│  │  proximityUpdate { pairs: [{ p1, p2, distance }, ...] }      │   │
│  │                                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    WebSocket events
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT                                     │
│                                                                      │
│  proximityEnter:                                                     │
│    1. Establish WebRTC audio connection with peer                   │
│    2. Show "nearby player" indicator in UI                          │
│    3. Enable text chat with that player                             │
│                                                                      │
│  proximityLeave:                                                     │
│    1. Disconnect WebRTC audio                                       │
│    2. Remove UI indicators                                          │
│    3. Keep chat history accessible                                  │
│                                                                      │
│  proximityUpdate (10Hz):                                            │
│    1. Update audio volume based on distance                         │
│    2. Update UI proximity indicators                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Video Conferencing Integration (Jitsi)

### 7.1 Why Self-Hosted Jitsi?

| Consideration | meet.jit.si (Free) | Self-Hosted |
|---------------|-------------------|-------------|
| **Privacy** | Google analytics, third-party servers | Full control |
| **Branding** | Jitsi watermarks | Fully customizable |
| **Reliability** | Rate limits, public server load | Dedicated resources |
| **Latency** | Variable (nearest public server) | Optimized for your region |
| **Cost** | Free | ~$20-50/month for VPS |
| **Setup** | None | Medium complexity |

**Recommendation**: Start with meet.jit.si for development, self-host for production.

### 7.2 Jitsi Self-Hosting Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        JITSI SERVER (VPS)                                │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                          NGINX (Reverse Proxy)                      │ │
│  │                     • SSL termination (Let's Encrypt)               │ │
│  │                     • Static files serving                          │ │
│  │                     • WebSocket proxying                            │ │
│  └──────────────────────────────┬─────────────────────────────────────┘ │
│                                 │                                        │
│        ┌────────────────────────┼────────────────────────┐              │
│        │                        │                        │              │
│        ▼                        ▼                        ▼              │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────────────┐    │
│  │ JITSI-MEET   │      │   PROSODY    │      │  VIDEOBRIDGE (JVB) │    │
│  │    WEB       │      │   (XMPP)     │      │      (SFU)         │    │
│  │              │      │              │      │                    │    │
│  │ React app   │◄────►│ Signaling    │◄────►│ Media routing      │    │
│  │ IFrame API  │      │ Auth         │      │ UDP port 10000     │    │
│  │             │      │ Rooms        │      │                    │    │
│  └──────────────┘      └──────────────┘      └────────────────────┘    │
│                                 │                                        │
│                                 │                                        │
│                        ┌────────▼────────┐                              │
│                        │     JICOFO      │                              │
│                        │ (Focus/Orc.)    │                              │
│                        │                 │                              │
│                        │ Session mgmt    │                              │
│                        │ Load balancing  │                              │
│                        └─────────────────┘                              │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         COTURN (TURN Server)                        │ │
│  │                 • NAT traversal for ~15% of users                   │ │
│  │                 • UDP ports 3478, 5349                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Docker Compose for Jitsi

```yaml
# docker-compose.jitsi.yml
version: '3.8'

services:
  web:
    image: jitsi/web:stable-8719
    restart: unless-stopped
    ports:
      - '8080:80'
      - '8443:443'
    volumes:
      - ${CONFIG}/web:/config:Z
      - ${CONFIG}/web/crontabs:/var/spool/cron/crontabs:Z
      - ${CONFIG}/transcripts:/usr/share/jitsi-meet/transcripts:Z
    environment:
      - ENABLE_LETSENCRYPT
      - LETSENCRYPT_DOMAIN
      - LETSENCRYPT_EMAIL
      - PUBLIC_URL
      - TZ
    networks:
      jitsi:

  prosody:
    image: jitsi/prosody:stable-8719
    restart: unless-stopped
    expose:
      - '5222'
      - '5280'
      - '5347'
    volumes:
      - ${CONFIG}/prosody/config:/config:Z
      - ${CONFIG}/prosody/prosody-plugins-custom:/prosody-plugins-custom:Z
    environment:
      - AUTH_TYPE
      - ENABLE_AUTH
      - ENABLE_GUESTS
      - ENABLE_LOBBY
      - JWT_APP_ID
      - JWT_APP_SECRET
      - JWT_ACCEPTED_ISSUERS
      - JWT_ACCEPTED_AUDIENCES
      - PROSODY_ADMINS
    networks:
      jitsi:
        aliases:
          - xmpp.meet.jitsi

  jicofo:
    image: jitsi/jicofo:stable-8719
    restart: unless-stopped
    volumes:
      - ${CONFIG}/jicofo:/config:Z
    environment:
      - AUTH_TYPE
      - JICOFO_AUTH_PASSWORD
      - JICOFO_ENABLE_BRIDGE_HEALTH_CHECKS
      - TZ
    depends_on:
      - prosody
    networks:
      jitsi:

  jvb:
    image: jitsi/jvb:stable-8719
    restart: unless-stopped
    ports:
      - '10000:10000/udp'
      - '8080:8080'
    volumes:
      - ${CONFIG}/jvb:/config:Z
    environment:
      - JVB_ADVERTISE_IPS
      - JVB_PORT
      - JVB_STUN_SERVERS
      - TZ
    depends_on:
      - prosody
    networks:
      jitsi:

networks:
  jitsi:
    driver: bridge
```

### 7.4 Environment Configuration

```bash
# .env.jitsi

# Basic settings
PUBLIC_URL=https://meet.arkagentic.com
TZ=UTC

# SSL with Let's Encrypt
ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=meet.arkagentic.com
LETSENCRYPT_EMAIL=admin@arkagentic.com

# NAT settings (important for cloud servers)
JVB_ADVERTISE_IPS=203.0.113.10  # Your server's public IP
JVB_PORT=10000
JVB_STUN_SERVERS=meet-jit-si-turnrelay.jitsi.net:443

# Authentication (enable for production)
ENABLE_AUTH=1
AUTH_TYPE=jwt
JWT_APP_ID=arkagentic
JWT_APP_SECRET=your-super-secret-key-here
JWT_ACCEPTED_ISSUERS=arkagentic
JWT_ACCEPTED_AUDIENCES=jitsi

# Internal passwords (auto-generated)
JICOFO_AUTH_PASSWORD=random-password-1
JVB_AUTH_PASSWORD=random-password-2

# Config directory
CONFIG=~/.jitsi-meet-cfg
```

### 7.5 JitsiManager Implementation

```typescript
// src/services/JitsiManager.ts

interface JitsiZone {
  id: string;
  roomName: string;
  jitsiUrl: string;
  trigger: 'onenter' | 'onaction';
  config?: Partial<JitsiConfig>;
}

interface JitsiConfig {
  startWithAudioMuted: boolean;
  startWithVideoMuted: boolean;
  prejoinPageEnabled: boolean;
  disableDeepLinking: boolean;
}

class JitsiManager {
  private api: any = null;  // JitsiMeetExternalAPI
  private currentZone: JitsiZone | null = null;
  private container: HTMLElement;
  private playerInfo: { name: string; email: string; id: string };
  private jwtToken: string | null = null;
  
  constructor(containerId: string, playerInfo: any) {
    this.container = document.getElementById(containerId)!;
    this.playerInfo = playerInfo;
    
    // Pre-fetch JWT token if using auth
    this.fetchJwtToken();
  }
  
  private async fetchJwtToken() {
    try {
      const response = await fetch('/api/jitsi/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.playerInfo.id })
      });
      const data = await response.json();
      this.jwtToken = data.token;
    } catch (e) {
      console.log('JWT fetch failed, will use anonymous mode');
    }
  }
  
  // Called when player enters a meeting zone
  enterZone(zone: JitsiZone) {
    if (this.currentZone?.id === zone.id) return;
    
    // Leave current room first
    if (this.api) {
      this.leaveRoom();
    }
    
    if (zone.trigger === 'onenter') {
      this.joinRoom(zone);
    } else {
      // Show prompt UI
      eventCenter.emit('showJitsiPrompt', zone);
    }
  }
  
  joinRoom(zone: JitsiZone) {
    // Load Jitsi API script if not loaded
    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script');
      script.src = `https://${zone.jitsiUrl}/external_api.js`;
      script.onload = () => this.initJitsi(zone);
      document.head.appendChild(script);
    } else {
      this.initJitsi(zone);
    }
  }
  
  private initJitsi(zone: JitsiZone) {
    // Show container
    this.container.style.display = 'block';
    this.container.classList.add('jitsi-active');
    
    // Generate unique room name per zone instance
    const roomName = this.sanitizeRoomName(`arkagentic-${zone.roomName}`);
    
    const options: any = {
      roomName,
      parentNode: this.container,
      width: '100%',
      height: '100%',
      
      userInfo: {
        displayName: this.playerInfo.name,
        email: this.playerInfo.email
      },
      
      configOverwrite: {
        // Disable pre-join for seamless entry
        prejoinPageEnabled: false,
        
        // Start unmuted for quick conversations
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        
        // Disable various features for game integration
        disableDeepLinking: true,
        disableInviteFunctions: true,
        enableClosePage: false,
        
        // Performance settings
        channelLastN: 4, // Only receive 4 video streams
        enableLayerSuspension: true,
        
        // Custom overrides from zone
        ...zone.config
      },
      
      interfaceConfigOverwrite: {
        // Minimal UI for game integration
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'hangup',
          'chat', 'tileview', 'settings'
        ],
        
        // Remove branding
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        
        // Disable promotional content
        MOBILE_APP_PROMO: false,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        
        // Tile view by default
        filmStripOnly: false,
        VERTICAL_FILMSTRIP: false,
        FILM_STRIP_MAX_HEIGHT: 120,
        
        // Settings
        SETTINGS_SECTIONS: ['devices', 'language'],
      }
    };
    
    // Add JWT if available
    if (this.jwtToken) {
      options.jwt = this.jwtToken;
    }
    
    this.api = new window.JitsiMeetExternalAPI(zone.jitsiUrl, options);
    this.currentZone = zone;
    
    this.setupEventListeners();
    
    // Emit join event
    eventCenter.emit('jitsiJoined', { zone, roomName });
  }
  
  private setupEventListeners() {
    if (!this.api) return;
    
    // Conference lifecycle
    this.api.addListener('videoConferenceJoined', (data: any) => {
      console.log('Joined Jitsi room:', data.roomName);
      eventCenter.emit('jitsiConferenceJoined', data);
    });
    
    this.api.addListener('videoConferenceLeft', () => {
      console.log('Left Jitsi room');
      this.leaveRoom();
    });
    
    // Participant tracking
    this.api.addListener('participantJoined', (data: any) => {
      eventCenter.emit('jitsiParticipantJoined', data);
    });
    
    this.api.addListener('participantLeft', (data: any) => {
      eventCenter.emit('jitsiParticipantLeft', data);
    });
    
    // Error handling
    this.api.addListener('errorOccurred', (error: any) => {
      console.error('Jitsi error:', error);
      eventCenter.emit('jitsiError', error);
    });
  }
  
  leaveRoom() {
    if (this.api) {
      this.api.executeCommand('hangup');
      this.api.dispose();
      this.api = null;
    }
    
    this.currentZone = null;
    this.container.style.display = 'none';
    this.container.classList.remove('jitsi-active');
    
    eventCenter.emit('jitsiLeft', {});
  }
  
  exitZone(zoneId: string) {
    if (this.currentZone?.id === zoneId) {
      this.leaveRoom();
    }
  }
  
  // Public controls
  toggleAudio() {
    this.api?.executeCommand('toggleAudio');
  }
  
  toggleVideo() {
    this.api?.executeCommand('toggleVideo');
  }
  
  isInRoom(): boolean {
    return this.api !== null;
  }
  
  private sanitizeRoomName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

export const jitsiManager = new JitsiManager('jitsi-container', {
  name: 'Player',
  email: '',
  id: ''
});
```

### 7.6 Server-Side JWT Generation

```typescript
// server/routes/jitsi.ts
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

const JITSI_APP_ID = process.env.JITSI_APP_ID || 'arkagentic';
const JITSI_SECRET = process.env.JITSI_SECRET!;
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.arkagentic.com';

router.post('/token', async (req, res) => {
  const { userId, roomName } = req.body;
  
  // Get user info from database
  const user = await getUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const payload = {
    context: {
      user: {
        id: user.id,
        name: user.displayName,
        email: user.email,
        avatar: user.avatarUrl
      },
      features: {
        livestreaming: false,
        recording: false,
        transcription: false
      }
    },
    aud: 'jitsi',
    iss: JITSI_APP_ID,
    sub: JITSI_DOMAIN,
    room: roomName || '*', // * allows any room
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 2) // 2 hours
  };
  
  const token = jwt.sign(payload, JITSI_SECRET, { algorithm: 'HS256' });
  
  res.json({ token });
});

export default router;
```

### 7.7 UI Layout for Jitsi Integration

```css
/* styles/jitsi.css */

/* Container slides in from right */
#jitsi-container {
  position: fixed;
  right: -400px; /* Hidden off-screen */
  top: 0;
  width: 400px;
  height: 100vh;
  z-index: 1000;
  background: #1a1a1a;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
  transition: right 0.3s ease-out;
}

#jitsi-container.jitsi-active {
  right: 0; /* Slide in */
}

#jitsi-container iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* Close button */
#jitsi-container .jitsi-close {
  position: absolute;
  top: 10px;
  left: -40px;
  width: 32px;
  height: 32px;
  background: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: white;
  font-size: 18px;
  z-index: 1001;
}

/* Mobile: full width */
@media (max-width: 768px) {
  #jitsi-container {
    width: 100%;
    height: 50vh;
    top: auto;
    bottom: -50vh;
    right: 0;
    transition: bottom 0.3s ease-out;
  }
  
  #jitsi-container.jitsi-active {
    bottom: 0;
  }
  
  #jitsi-container .jitsi-close {
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
  }
}

/* Adjust game canvas when Jitsi is open */
body.jitsi-open #game-container {
  width: calc(100% - 400px);
  transition: width 0.3s ease-out;
}

@media (max-width: 768px) {
  body.jitsi-open #game-container {
    width: 100%;
    height: 50vh;
  }
}
```

---

## 8. Zone & Room System

### 8.1 Zone Types

| Zone Type | Trigger | Effect |
|-----------|---------|--------|
| **jitsiRoom** | onenter / onaction | Opens Jitsi video call |
| **silent** | onenter | Disables all audio |
| **playAudio** | onenter | Plays background music |
| **agentZone** | onenter / onaction | Opens chat with AI agent |
| **exitUrl** | onenter | Teleports to another map |
| **private** | onenter | Hides player from others |

### 8.2 Zone Definition in Tiled

```json
// In Tiled map JSON, zones are "objects" in an object layer
{
  "type": "objectgroup",
  "name": "zones",
  "objects": [
    {
      "id": 1,
      "name": "meeting-room-alpha",
      "type": "area",
      "x": 320,
      "y": 480,
      "width": 192,
      "height": 128,
      "properties": [
        { "name": "jitsiRoom", "type": "string", "value": "alpha" },
        { "name": "jitsiTrigger", "type": "string", "value": "onenter" },
        { "name": "jitsiUrl", "type": "string", "value": "meet.arkagentic.com" }
      ]
    },
    {
      "id": 2,
      "name": "scout-zone",
      "type": "area",
      "x": 512,
      "y": 320,
      "width": 64,
      "height": 64,
      "properties": [
        { "name": "agentId", "type": "string", "value": "scout" },
        { "name": "agentTrigger", "type": "string", "value": "onaction" },
        { "name": "triggerMessage", "type": "string", "value": "Press E to talk to Scout" }
      ]
    },
    {
      "id": 3,
      "name": "quiet-library",
      "type": "area",
      "x": 800,
      "y": 200,
      "width": 256,
      "height": 192,
      "properties": [
        { "name": "silent", "type": "bool", "value": true },
        { "name": "playAudio", "type": "string", "value": "assets/audio/library-ambience.mp3" },
        { "name": "audioVolume", "type": "float", "value": 0.3 }
      ]
    }
  ]
}
```

### 8.3 ZoneManager Implementation

```typescript
// src/managers/ZoneManager.ts

interface Zone {
  id: string;
  name: string;
  bounds: Phaser.Geom.Rectangle;
  properties: Map<string, any>;
  physicsBody: Phaser.Physics.Arcade.Body;
}

class ZoneManager {
  private scene: Phaser.Scene;
  private zones: Map<string, Zone> = new Map();
  private currentZones: Set<string> = new Set();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  // Parse zones from Tiled object layer
  loadFromTilemap(map: Phaser.Tilemaps.Tilemap) {
    const objectLayer = map.getObjectLayer('zones');
    if (!objectLayer) return;
    
    objectLayer.objects.forEach(obj => {
      // Create invisible physics body for collision detection
      const zone = this.scene.add.zone(
        obj.x! + obj.width! / 2,  // Phaser zones are centered
        obj.y! + obj.height! / 2,
        obj.width!,
        obj.height!
      );
      
      this.scene.physics.world.enable(zone);
      const body = zone.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setImmovable(true);
      
      // Parse properties
      const properties = new Map<string, any>();
      (obj.properties || []).forEach((prop: any) => {
        properties.set(prop.name, prop.value);
      });
      
      const zoneData: Zone = {
        id: obj.name || `zone-${obj.id}`,
        name: obj.name || '',
        bounds: new Phaser.Geom.Rectangle(obj.x!, obj.y!, obj.width!, obj.height!),
        properties,
        physicsBody: body
      };
      
      this.zones.set(zoneData.id, zoneData);
      
      // Store reference on game object
      zone.setData('zoneData', zoneData);
      
      // Add collision with player
      this.scene.physics.add.overlap(
        this.scene.player,
        zone,
        () => this.onEnterZone(zoneData),
        undefined,
        this
      );
    });
  }
  
  // Check if player is still in zones (called in update)
  update() {
    for (const zoneId of this.currentZones) {
      const zone = this.zones.get(zoneId);
      if (!zone) continue;
      
      const player = this.scene.player;
      const inZone = zone.bounds.contains(player.x, player.y);
      
      if (!inZone) {
        this.onExitZone(zone);
      }
    }
  }
  
  private onEnterZone(zone: Zone) {
    if (this.currentZones.has(zone.id)) return;
    
    this.currentZones.add(zone.id);
    console.log(`Entered zone: ${zone.name}`);
    
    // Notify server
    colyseusManager.sendMessage('enterZone', zone.id);
    
    // Handle zone-specific behaviors
    if (zone.properties.has('jitsiRoom')) {
      this.handleJitsiZone(zone);
    }
    
    if (zone.properties.has('agentId')) {
      this.handleAgentZone(zone);
    }
    
    if (zone.properties.has('silent')) {
      this.handleSilentZone(zone);
    }
    
    if (zone.properties.has('playAudio')) {
      this.handleAudioZone(zone);
    }
  }
  
  private onExitZone(zone: Zone) {
    if (!this.currentZones.has(zone.id)) return;
    
    this.currentZones.delete(zone.id);
    console.log(`Exited zone: ${zone.name}`);
    
    // Notify server
    colyseusManager.sendMessage('leaveZone', zone.id);
    
    // Cleanup zone behaviors
    if (zone.properties.has('jitsiRoom')) {
      jitsiManager.exitZone(zone.id);
    }
    
    if (zone.properties.has('silent')) {
      proximityAudioManager.unmute();
    }
    
    if (zone.properties.has('playAudio')) {
      audioManager.stopBackground();
    }
  }
  
  private handleJitsiZone(zone: Zone) {
    const trigger = zone.properties.get('jitsiTrigger') || 'onenter';
    
    if (trigger === 'onenter') {
      jitsiManager.enterZone({
        id: zone.id,
        roomName: zone.properties.get('jitsiRoom'),
        jitsiUrl: zone.properties.get('jitsiUrl') || 'meet.jit.si',
        trigger: 'onenter'
      });
    } else {
      // Show prompt
      const message = zone.properties.get('triggerMessage') || 'Press E to join meeting';
      this.showInteractionPrompt(message, () => {
        jitsiManager.enterZone({
          id: zone.id,
          roomName: zone.properties.get('jitsiRoom'),
          jitsiUrl: zone.properties.get('jitsiUrl') || 'meet.jit.si',
          trigger: 'onaction'
        });
      });
    }
  }
  
  private handleAgentZone(zone: Zone) {
    const agentId = zone.properties.get('agentId');
    const trigger = zone.properties.get('agentTrigger') || 'onaction';
    
    if (trigger === 'onenter') {
      eventCenter.emit('startAgentChat', { agentId });
    } else {
      const message = zone.properties.get('triggerMessage') || 'Press E to talk';
      this.showInteractionPrompt(message, () => {
        eventCenter.emit('startAgentChat', { agentId });
      });
    }
  }
  
  private handleSilentZone(zone: Zone) {
    proximityAudioManager.mute();
    // Optionally show indicator
    eventCenter.emit('silentZoneEntered');
  }
  
  private handleAudioZone(zone: Zone) {
    const audioUrl = zone.properties.get('playAudio');
    const volume = zone.properties.get('audioVolume') || 0.5;
    const loop = zone.properties.get('audioLoop') !== false;
    
    audioManager.playBackground(audioUrl, { volume, loop });
  }
  
  private showInteractionPrompt(message: string, callback: () => void) {
    eventCenter.emit('showInteractionPrompt', { message, callback });
  }
}
```

---

## 9. Mobile Support

### 9.1 Virtual Joystick Implementation

```typescript
// src/ui/VirtualJoystick.ts

interface JoystickConfig {
  x: number;
  y: number;
  baseRadius: number;
  thumbRadius: number;
  deadzone: number;
}

class VirtualJoystick {
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private activePointer: Phaser.Input.Pointer | null = null;
  
  public vector: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  public isActive: boolean = false;
  
  private config: JoystickConfig;
  private basePosition: Phaser.Math.Vector2;
  
  constructor(scene: Phaser.Scene, config: Partial<JoystickConfig> = {}) {
    this.scene = scene;
    
    this.config = {
      x: config.x ?? 120,
      y: config.y ?? scene.scale.height - 120,
      baseRadius: config.baseRadius ?? 60,
      thumbRadius: config.thumbRadius ?? 30,
      deadzone: config.deadzone ?? 0.15
    };
    
    this.basePosition = new Phaser.Math.Vector2(this.config.x, this.config.y);
    
    this.createVisuals();
    this.setupInput();
  }
  
  private createVisuals() {
    // Base circle (semi-transparent)
    this.base = this.scene.add.circle(
      this.config.x,
      this.config.y,
      this.config.baseRadius,
      0x888888,
      0.4
    );
    this.base.setScrollFactor(0);
    this.base.setDepth(1000);
    
    // Thumb circle
    this.thumb = this.scene.add.circle(
      this.config.x,
      this.config.y,
      this.config.thumbRadius,
      0xcccccc,
      0.7
    );
    this.thumb.setScrollFactor(0);
    this.thumb.setDepth(1001);
    
    // Initially hidden on desktop
    this.setVisible(this.scene.sys.game.device.input.touch);
  }
  
  private setupInput() {
    // Enable multi-touch
    this.scene.input.addPointer(2);
    
    // Create touch zone for left side of screen
    const touchZone = this.scene.add.zone(
      0, 0,
      this.scene.scale.width / 2,
      this.scene.scale.height
    );
    touchZone.setOrigin(0, 0);
    touchZone.setScrollFactor(0);
    touchZone.setInteractive();
    touchZone.setDepth(999);
    
    touchZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.activePointer) return; // Already tracking a touch
      
      this.activePointer = pointer;
      this.isActive = true;
      
      // Move joystick to touch position
      this.base.setPosition(pointer.x, pointer.y);
      this.thumb.setPosition(pointer.x, pointer.y);
      this.basePosition.set(pointer.x, pointer.y);
      
      this.setVisible(true);
    });
    
    touchZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.activePointer?.id !== pointer.id) return;
      this.updateThumbPosition(pointer);
    });
    
    touchZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.activePointer?.id !== pointer.id) return;
      this.reset();
    });
    
    touchZone.on('pointerout', (pointer: Phaser.Input.Pointer) => {
      if (this.activePointer?.id !== pointer.id) return;
      this.reset();
    });
  }
  
  private updateThumbPosition(pointer: Phaser.Input.Pointer) {
    const dx = pointer.x - this.basePosition.x;
    const dy = pointer.y - this.basePosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Clamp to base radius
    const clampedDistance = Math.min(distance, this.config.baseRadius);
    const angle = Math.atan2(dy, dx);
    
    // Update thumb visual
    this.thumb.x = this.basePosition.x + Math.cos(angle) * clampedDistance;
    this.thumb.y = this.basePosition.y + Math.sin(angle) * clampedDistance;
    
    // Calculate normalized vector (-1 to 1)
    const normalized = clampedDistance / this.config.baseRadius;
    
    // Apply deadzone
    if (normalized < this.config.deadzone) {
      this.vector.set(0, 0);
    } else {
      // Remap deadzone to 0-1 range
      const remapped = (normalized - this.config.deadzone) / (1 - this.config.deadzone);
      this.vector.set(
        Math.cos(angle) * remapped,
        Math.sin(angle) * remapped
      );
    }
  }
  
  private reset() {
    this.activePointer = null;
    this.isActive = false;
    this.vector.set(0, 0);
    
    // Return to default position
    this.base.setPosition(this.config.x, this.config.y);
    this.thumb.setPosition(this.config.x, this.config.y);
    this.basePosition.set(this.config.x, this.config.y);
  }
  
  setVisible(visible: boolean) {
    this.base.setVisible(visible);
    this.thumb.setVisible(visible);
  }
  
  // Convert joystick to input payload
  toInputPayload(): Partial<InputPayload> {
    const threshold = 0.3;
    return {
      left: this.vector.x < -threshold,
      right: this.vector.x > threshold,
      up: this.vector.y < -threshold,
      down: this.vector.y > threshold
    };
  }
  
  destroy() {
    this.base.destroy();
    this.thumb.destroy();
  }
}
```

### 9.2 Mobile Action Button

```typescript
// src/ui/MobileActionButton.ts

class MobileActionButton {
  private scene: Phaser.Scene;
  private button: Phaser.GameObjects.Arc;
  private icon: Phaser.GameObjects.Text;
  private callback: (() => void) | null = null;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Position in bottom-right
    const x = scene.scale.width - 80;
    const y = scene.scale.height - 120;
    
    // Button background
    this.button = scene.add.circle(x, y, 40, 0x4CAF50, 0.8);
    this.button.setScrollFactor(0);
    this.button.setDepth(1000);
    this.button.setInteractive();
    
    // Icon/Label
    this.icon = scene.add.text(x, y, 'E', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff'
    });
    this.icon.setOrigin(0.5);
    this.icon.setScrollFactor(0);
    this.icon.setDepth(1001);
    
    // Touch handling
    this.button.on('pointerdown', () => {
      this.button.setScale(0.9);
    });
    
    this.button.on('pointerup', () => {
      this.button.setScale(1);
      this.callback?.();
    });
    
    // Hidden by default
    this.setVisible(false);
  }
  
  show(label: string, callback: () => void) {
    this.callback = callback;
    this.icon.setText(label);
    this.setVisible(true);
  }
  
  hide() {
    this.callback = null;
    this.setVisible(false);
  }
  
  private setVisible(visible: boolean) {
    this.button.setVisible(visible);
    this.icon.setVisible(visible);
  }
}
```

### 9.3 Responsive Layout

```typescript
// src/utils/responsive.ts

interface LayoutConfig {
  gameWidth: number;
  gameHeight: number;
  joystickX: number;
  joystickY: number;
  actionButtonX: number;
  actionButtonY: number;
  jitsiWidth: number;
  chatPanelWidth: number;
}

function getResponsiveLayout(width: number, height: number): LayoutConfig {
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  
  if (isMobile) {
    return {
      gameWidth: width,
      gameHeight: height * 0.6, // 60% for game when chat/video open
      joystickX: 100,
      joystickY: height - 100,
      actionButtonX: width - 80,
      actionButtonY: height - 100,
      jitsiWidth: width,
      chatPanelWidth: width
    };
  }
  
  if (isTablet) {
    return {
      gameWidth: width * 0.6,
      gameHeight: height,
      joystickX: 120,
      joystickY: height - 120,
      actionButtonX: width * 0.6 - 80,
      actionButtonY: height - 100,
      jitsiWidth: width * 0.4,
      chatPanelWidth: width * 0.4
    };
  }
  
  // Desktop
  return {
    gameWidth: width - 400,
    gameHeight: height,
    joystickX: 120,
    joystickY: height - 120,
    actionButtonX: width - 500,
    actionButtonY: height - 100,
    jitsiWidth: 400,
    chatPanelWidth: 350
  };
}
```

### 9.4 Touch Event Handling

```typescript
// Prevent default touch behaviors
document.addEventListener('touchmove', (e) => {
  // Prevent scroll on game canvas
  if (e.target === document.getElementById('game-canvas')) {
    e.preventDefault();
  }
}, { passive: false });

// Prevent double-tap zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// Handle orientation change
window.addEventListener('orientationchange', () => {
  // Recalculate layout after orientation settles
  setTimeout(() => {
    const layout = getResponsiveLayout(window.innerWidth, window.innerHeight);
    game.scale.resize(layout.gameWidth, layout.gameHeight);
    eventCenter.emit('layoutChanged', layout);
  }, 100);
});
```

---

## 10. Self-Hosting Infrastructure

### 10.1 Complete Docker Compose Stack

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ===================
  # Core Game Services
  # ===================
  
  game-server:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "2567:2567"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/arkagentic
      - JITSI_APP_ID=${JITSI_APP_ID}
      - JITSI_SECRET=${JITSI_SECRET}
      - JITSI_DOMAIN=${JITSI_DOMAIN}
    depends_on:
      - redis
      - postgres
    networks:
      - arkagentic
  
  web-client:
    build:
      context: ./client
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3000:80"
    environment:
      - VITE_WS_URL=wss://game.arkagentic.com
      - VITE_JITSI_DOMAIN=${JITSI_DOMAIN}
    networks:
      - arkagentic
  
  # ===================
  # Data Services
  # ===================
  
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - arkagentic
  
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=arkagentic
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - arkagentic
  
  # ===================
  # Jitsi Services
  # ===================
  
  jitsi-web:
    image: jitsi/web:stable-8719
    restart: unless-stopped
    ports:
      - "8443:443"
    volumes:
      - ${JITSI_CONFIG}/web:/config:Z
      - ${JITSI_CONFIG}/transcripts:/usr/share/jitsi-meet/transcripts:Z
    environment:
      - ENABLE_AUTH=1
      - AUTH_TYPE=jwt
      - JWT_APP_ID=${JITSI_APP_ID}
      - JWT_APP_SECRET=${JITSI_SECRET}
      - PUBLIC_URL=https://${JITSI_DOMAIN}
      - ENABLE_LETSENCRYPT=0  # Use nginx proxy instead
      - TZ=UTC
    networks:
      jitsi:
        aliases:
          - meet.jitsi
  
  jitsi-prosody:
    image: jitsi/prosody:stable-8719
    restart: unless-stopped
    expose:
      - "5222"
      - "5280"
      - "5347"
    volumes:
      - ${JITSI_CONFIG}/prosody/config:/config:Z
    environment:
      - AUTH_TYPE=jwt
      - JWT_APP_ID=${JITSI_APP_ID}
      - JWT_APP_SECRET=${JITSI_SECRET}
      - JWT_ACCEPTED_ISSUERS=${JITSI_APP_ID}
      - JWT_ACCEPTED_AUDIENCES=jitsi
      - TZ=UTC
    networks:
      jitsi:
        aliases:
          - xmpp.meet.jitsi
  
  jitsi-jicofo:
    image: jitsi/jicofo:stable-8719
    restart: unless-stopped
    volumes:
      - ${JITSI_CONFIG}/jicofo:/config:Z
    environment:
      - AUTH_TYPE=jwt
      - TZ=UTC
    depends_on:
      - jitsi-prosody
    networks:
      - jitsi
  
  jitsi-jvb:
    image: jitsi/jvb:stable-8719
    restart: unless-stopped
    ports:
      - "10000:10000/udp"
    volumes:
      - ${JITSI_CONFIG}/jvb:/config:Z
    environment:
      - JVB_ADVERTISE_IPS=${PUBLIC_IP}
      - JVB_PORT=10000
      - TZ=UTC
    depends_on:
      - jitsi-prosody
    networks:
      - jitsi
  
  # ===================
  # TURN Server
  # ===================
  
  coturn:
    image: coturn/coturn:latest
    restart: unless-stopped
    ports:
      - "3478:3478"
      - "3478:3478/udp"
      - "5349:5349"
      - "5349:5349/udp"
      - "49152-65535:49152-65535/udp"
    volumes:
      - ./coturn/turnserver.conf:/etc/turnserver.conf:ro
    command: -c /etc/turnserver.conf
    networks:
      - jitsi
  
  # ===================
  # Reverse Proxy
  # ===================
  
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
      - ./nginx/certbot:/var/www/certbot:ro
    depends_on:
      - game-server
      - web-client
      - jitsi-web
    networks:
      - arkagentic
      - jitsi

networks:
  arkagentic:
    driver: bridge
  jitsi:
    driver: bridge

volumes:
  redis_data:
  postgres_data:
```

### 10.2 Nginx Configuration

```nginx
# nginx/nginx.conf

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # WebSocket upgrade map
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Main game website
    server {
        listen 443 ssl http2;
        server_name arkagentic.com www.arkagentic.com;
        
        ssl_certificate /etc/nginx/certs/arkagentic.com.crt;
        ssl_certificate_key /etc/nginx/certs/arkagentic.com.key;
        
        # Static files
        location / {
            proxy_pass http://web-client:80;
            limit_req zone=general burst=20 nodelay;
        }
        
        # API endpoints
        location /api/ {
            proxy_pass http://game-server:2567;
            limit_req zone=api burst=50 nodelay;
        }
    }
    
    # Game WebSocket server
    server {
        listen 443 ssl http2;
        server_name game.arkagentic.com;
        
        ssl_certificate /etc/nginx/certs/arkagentic.com.crt;
        ssl_certificate_key /etc/nginx/certs/arkagentic.com.key;
        
        location / {
            proxy_pass http://game-server:2567;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 86400; # Long timeout for WebSocket
        }
    }
    
    # Jitsi Meet
    server {
        listen 443 ssl http2;
        server_name meet.arkagentic.com;
        
        ssl_certificate /etc/nginx/certs/meet.arkagentic.com.crt;
        ssl_certificate_key /etc/nginx/certs/meet.arkagentic.com.key;
        
        location / {
            proxy_pass https://jitsi-web:443;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    
    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name arkagentic.com www.arkagentic.com game.arkagentic.com meet.arkagentic.com;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$host$request_uri;
        }
    }
}
```

### 10.3 TURN Server Configuration

```conf
# coturn/turnserver.conf

# Public IP address of the server
external-ip=203.0.113.10

# Ports
listening-port=3478
tls-listening-port=5349
min-port=49152
max-port=65535

# Credentials
user=arkagentic:supersecretpassword
realm=arkagentic.com

# TLS certificates (optional but recommended)
# cert=/etc/ssl/certs/turn.crt
# pkey=/etc/ssl/private/turn.key

# Logging
log-file=/var/log/turnserver.log
verbose

# Security
fingerprint
lt-cred-mech
no-loopback-peers
no-multicast-peers
```

### 10.4 Server Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **Game Server** | 2 CPU, 4GB RAM | 4 CPU, 8GB RAM | Per 100 concurrent |
| **Jitsi (JVB)** | 4 CPU, 8GB RAM | 8 CPU, 16GB RAM | Per 50 video users |
| **Redis** | 1 CPU, 1GB RAM | 2 CPU, 2GB RAM | Session storage |
| **PostgreSQL** | 2 CPU, 4GB RAM | 4 CPU, 8GB RAM | Chat history |
| **Coturn** | 1 CPU, 512MB RAM | 2 CPU, 1GB RAM | ~15% of users need TURN |

**Bandwidth Requirements:**
- Game server: ~1-5 KB/s per user
- Jitsi video: ~2 Mbps per user
- Total for 100 users with 20 in video: ~50 Mbps minimum

---

## 11. Security Architecture

### 11.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                               │
│                                                                          │
│  ┌────────────────┐                                                     │
│  │    Browser     │                                                     │
│  │                │                                                     │
│  │  1. User logs  │                                                     │
│  │     in via     │                                                     │
│  │   OAuth/Email  │                                                     │
│  └───────┬────────┘                                                     │
│          │                                                              │
│          │ 2. Auth request                                              │
│          ▼                                                              │
│  ┌────────────────┐         ┌────────────────┐                         │
│  │   Auth Server  │────────►│   PostgreSQL   │                         │
│  │  (Your Backend)│         │  (User data)   │                         │
│  └───────┬────────┘         └────────────────┘                         │
│          │                                                              │
│          │ 3. Return JWT tokens                                         │
│          │    - accessToken (15min)                                     │
│          │    - refreshToken (7 days)                                   │
│          ▼                                                              │
│  ┌────────────────┐                                                     │
│  │    Browser     │                                                     │
│  │                │                                                     │
│  │  4. Store      │                                                     │
│  │     tokens     │                                                     │
│  └───────┬────────┘                                                     │
│          │                                                              │
│          │ 5. Connect to Colyseus with accessToken                     │
│          ▼                                                              │
│  ┌────────────────┐         ┌────────────────┐                         │
│  │ Colyseus Server│────────►│     Redis      │                         │
│  │                │         │ (Session cache)│                         │
│  │  6. Validate   │         └────────────────┘                         │
│  │     token      │                                                     │
│  │  7. Create     │                                                     │
│  │     session    │                                                     │
│  └────────────────┘                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Token Validation

```typescript
// server/middleware/auth.ts
import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
  email: string;
  displayName: string;
  exp: number;
}

async function validateToken(token: string): Promise<TokenPayload | null> {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    // Check if token is blacklisted (for logout)
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) return null;
    
    return payload;
  } catch (e) {
    return null;
  }
}

// In Colyseus room
onAuth(client: Client, options: { token: string }) {
  const payload = await validateToken(options.token);
  if (!payload) {
    throw new Error('Unauthorized');
  }
  return payload;
}

onJoin(client: Client, options: any, auth: TokenPayload) {
  // auth contains validated user data
  const player = new Player();
  player.sessionId = client.sessionId;
  player.userId = auth.userId;
  player.displayName = auth.displayName;
  // ...
}
```

### 11.3 Input Validation

```typescript
// server/validation/input.ts

const InputSchema = {
  type: 'object',
  properties: {
    seq: { type: 'number', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
    left: { type: 'boolean' },
    right: { type: 'boolean' },
    up: { type: 'boolean' },
    down: { type: 'boolean' },
    running: { type: 'boolean' },
    timestamp: { type: 'number' }
  },
  required: ['seq', 'left', 'right', 'up', 'down', 'timestamp'],
  additionalProperties: false
};

// Validate and sanitize input
function validateInput(input: any): InputPayload | null {
  const valid = ajv.validate(InputSchema, input);
  if (!valid) return null;
  
  // Additional checks
  if (input.timestamp > Date.now() + 1000) {
    // Future timestamp - possible cheating
    return null;
  }
  
  return input as InputPayload;
}
```

### 11.4 Rate Limiting

```typescript
// server/middleware/rateLimit.ts

class RateLimiter {
  private buckets: Map<string, { count: number; resetAt: number }> = new Map();
  
  check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }
    
    bucket.count++;
    return bucket.count <= limit;
  }
}

// Usage in Colyseus room
const inputLimiter = new RateLimiter();
const chatLimiter = new RateLimiter();

this.onMessage("input", (client, input) => {
  // 60 inputs per second max
  if (!inputLimiter.check(client.sessionId, 60, 1000)) {
    console.warn(`Rate limit exceeded: ${client.sessionId}`);
    return;
  }
  // Process input...
});

this.onMessage("chat", (client, message) => {
  // 5 messages per 10 seconds
  if (!chatLimiter.check(client.sessionId, 5, 10000)) {
    client.send("error", { message: "Too many messages, slow down!" });
    return;
  }
  // Process chat...
});
```

### 11.5 Chat Content Filtering

```typescript
// server/services/ContentFilter.ts

class ContentFilter {
  private badWords: Set<string>;
  private urlPattern = /https?:\/\/[^\s]+/gi;
  
  constructor() {
    // Load bad words list
    this.badWords = new Set(loadBadWordsList());
  }
  
  filter(content: string): { clean: string; blocked: boolean; reason?: string } {
    // Check length
    if (content.length > 500) {
      return { clean: '', blocked: true, reason: 'Message too long' };
    }
    
    // Check for spam patterns
    if (this.isSpam(content)) {
      return { clean: '', blocked: true, reason: 'Spam detected' };
    }
    
    // Filter bad words
    let clean = content;
    for (const word of this.badWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      clean = clean.replace(regex, '*'.repeat(word.length));
    }
    
    // Remove URLs (optional)
    // clean = clean.replace(this.urlPattern, '[link removed]');
    
    return { clean, blocked: false };
  }
  
  private isSpam(content: string): boolean {
    // Repeated characters
    if (/(.)\1{10,}/.test(content)) return true;
    
    // All caps
    if (content.length > 10 && content === content.toUpperCase()) return true;
    
    return false;
  }
}
```

---

## 12. Scalability Strategy

### 12.1 Horizontal Scaling Architecture

```
                              ┌─────────────────┐
                              │  DNS / CDN      │
                              │  (CloudFlare)   │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
              ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐
              │   Nginx   │      │   Nginx   │      │   Nginx   │
              │  (LB #1)  │      │  (LB #2)  │      │  (LB #3)  │
              └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
                    │                  │                  │
                    └──────────────────┼──────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
   ┌─────▼─────┐                 ┌─────▼─────┐                 ┌─────▼─────┐
   │ Colyseus  │                 │ Colyseus  │                 │ Colyseus  │
   │ Node #1   │◄───────────────►│ Node #2   │◄───────────────►│ Node #3   │
   │ (Town A)  │   Redis PubSub  │ (Town B)  │   Redis PubSub  │ (Overflow)│
   └─────┬─────┘                 └─────┬─────┘                 └─────┬─────┘
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
              ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐
              │   Redis   │      │   Redis   │      │   Redis   │
              │  Primary  │─────►│  Replica  │─────►│  Replica  │
              └───────────┘      └───────────┘      └───────────┘
```

### 12.2 Colyseus Horizontal Scaling Setup

```typescript
// server/index.ts
import { Server } from "colyseus";
import { RedisPresence } from "@colyseus/redis-presence";
import { RedisDriver } from "@colyseus/redis-driver";

const gameServer = new Server({
  // Redis for cross-server presence tracking
  presence: new RedisPresence({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
  }),
  
  // Redis driver for matchmaking across servers
  driver: new RedisDriver({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
  })
});

// Room definition with filtering
gameServer.define("town", TownRoom)
  .filterBy(['mapId'])  // Route players to same map
  .enableRealtimeListing();

gameServer.listen(2567);
```

### 12.3 Room Sharding Strategy

```typescript
// Shard rooms by map/region to limit players per instance
const MAX_PLAYERS_PER_ROOM = 100;

// Client joins specific map
const room = await client.joinOrCreate("town", {
  mapId: "town-main",
  region: "us-east"
});

// Server-side room matching
class TownRoom extends Room {
  // Filter to match players by mapId
  filterBy = ['mapId'];
  
  onCreate(options: { mapId: string }) {
    this.mapId = options.mapId;
    this.maxClients = MAX_PLAYERS_PER_ROOM;
  }
  
  onJoin(client: Client, options: any) {
    // If this room is full, Colyseus auto-creates another
    // with same filterBy options
  }
}
```

### 12.4 Performance Monitoring

```typescript
// server/monitoring/metrics.ts
import { collectDefaultMetrics, Counter, Gauge, Histogram } from 'prom-client';

// Collect Node.js metrics
collectDefaultMetrics();

// Custom game metrics
export const connectedPlayers = new Gauge({
  name: 'arkagentic_connected_players',
  help: 'Number of currently connected players'
});

export const roomCount = new Gauge({
  name: 'arkagentic_room_count',
  help: 'Number of active rooms'
});

export const messageLatency = new Histogram({
  name: 'arkagentic_message_latency_ms',
  help: 'Message processing latency in milliseconds',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000]
});

export const messagesPerSecond = new Counter({
  name: 'arkagentic_messages_total',
  help: 'Total messages processed',
  labelNames: ['type']
});

// Usage in room
this.onMessage("input", (client, input) => {
  const start = performance.now();
  
  // Process input...
  
  const duration = performance.now() - start;
  messageLatency.observe(duration);
  messagesPerSecond.inc({ type: 'input' });
});
```

### 12.5 Capacity Guidelines

| Users | Server Nodes | Redis | Jitsi JVBs | Est. Monthly Cost |
|-------|--------------|-------|------------|-------------------|
| 100 | 1 x 4CPU/8GB | 1 x 2GB | 1 x 4CPU/8GB | ~$100 |
| 500 | 3 x 4CPU/8GB | 1 x 4GB | 2 x 4CPU/8GB | ~$400 |
| 2000 | 6 x 8CPU/16GB | 3-node cluster | 4 x 8CPU/16GB | ~$1500 |
| 10000 | 15 x 8CPU/16GB | 5-node cluster | 10 x 8CPU/16GB | ~$6000 |

---

## 13. Implementation Phases

### Phase 1: Core Multiplayer (2-3 weeks)
- [ ] Set up Colyseus server with basic room
- [ ] Implement player schema and state sync
- [ ] Add keyboard movement with client-side prediction
- [ ] Implement server reconciliation
- [ ] Add remote player interpolation
- [ ] Basic reconnection handling
- [ ] Deploy to staging environment

### Phase 2: Mobile Support (1-2 weeks)
- [ ] Implement virtual joystick
- [ ] Add mobile action button
- [ ] Responsive layout system
- [ ] Touch event optimization
- [ ] Test on various devices

### Phase 3: Persistent Chat (1-2 weeks)
- [ ] PostgreSQL schema for chat
- [ ] Chat session management
- [ ] Server-side chat storage
- [ ] Client-side chat restoration
- [ ] Chat UI with history

### Phase 4: Proximity System (1-2 weeks)
- [ ] Spatial hashing implementation
- [ ] Proximity detection on server
- [ ] Proximity events (enter/leave)
- [ ] Text chat between nearby players
- [ ] UI indicators for nearby players

### Phase 5: Jitsi Integration (2-3 weeks)
- [ ] Self-host Jitsi (Docker)
- [ ] JitsiManager implementation
- [ ] Zone-based room triggers
- [ ] JWT authentication
- [ ] UI overlay for video
- [ ] Mobile video layout

### Phase 6: Proximity Audio (1-2 weeks)
- [ ] WebRTC audio connections
- [ ] Distance-based volume
- [ ] Audio zone handling
- [ ] Microphone permissions UI

### Phase 7: Polish & Scale (2-3 weeks)
- [ ] Security hardening
- [ ] Rate limiting
- [ ] Content filtering
- [ ] Horizontal scaling setup
- [ ] Monitoring & alerting
- [ ] Load testing
- [ ] Performance optimization

**Total Estimated Time: 10-17 weeks**

---

## 14. Technology Stack Summary

### Frontend
| Category | Technology | Purpose |
|----------|------------|---------|
| Game Engine | Phaser.js 3.x | Game rendering, physics |
| UI Framework | React 18 | Chat panels, settings |
| State Management | Zustand | Client state |
| Networking | Colyseus.js | Real-time communication |
| Video | Jitsi IFrame API | Video conferencing |
| Styling | Tailwind CSS | Responsive UI |
| Build | Vite | Fast development |

### Backend
| Category | Technology | Purpose |
|----------|------------|---------|
| Game Server | Colyseus | Rooms, state sync |
| Runtime | Node.js 20 | Server execution |
| Database | PostgreSQL 15 | Persistent data |
| Cache | Redis 7 | Sessions, pub/sub |
| Video | Jitsi Meet | Video conferencing |
| TURN | Coturn | NAT traversal |
| Proxy | Nginx | Load balancing, SSL |

### Infrastructure
| Category | Technology | Purpose |
|----------|------------|---------|
| Containers | Docker | Deployment |
| Orchestration | Docker Compose | Multi-service |
| SSL | Let's Encrypt | HTTPS certificates |
| CDN | CloudFlare | Static assets, DDoS |
| Monitoring | Prometheus + Grafana | Metrics |
| Logging | Loki | Log aggregation |

---

## 15. Appendix: Code Patterns

### A. Event Center (Phaser ↔ React Communication)

```typescript
// src/services/EventCenter.ts
type EventCallback = (...args: any[]) => void;

class EventCenter {
  private events: Map<string, Set<EventCallback>> = new Map();
  
  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }
  
  off(event: string, callback: EventCallback) {
    this.events.get(event)?.delete(callback);
  }
  
  emit(event: string, ...args: any[]) {
    this.events.get(event)?.forEach(cb => cb(...args));
  }
  
  once(event: string, callback: EventCallback) {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }
}

export const eventCenter = new EventCenter();
```

### B. React Hook for Colyseus State

```typescript
// src/hooks/useColyseusState.ts
import { useState, useEffect } from 'react';
import { colyseusManager } from '../services/ColyseusManager';

export function useColyseusState<T>(selector: (state: GameState) => T): T | null {
  const [value, setValue] = useState<T | null>(null);
  
  useEffect(() => {
    const room = colyseusManager.room;
    if (!room) return;
    
    // Initial value
    setValue(selector(room.state));
    
    // Subscribe to changes
    const onChange = () => {
      setValue(selector(room.state));
    };
    
    room.state.onChange(onChange);
    
    return () => {
      // Cleanup if needed
    };
  }, [selector]);
  
  return value;
}

// Usage
function PlayerList() {
  const players = useColyseusState(state => 
    Array.from(state.players.values())
  );
  
  return (
    <ul>
      {players?.map(p => (
        <li key={p.sessionId}>{p.displayName}</li>
      ))}
    </ul>
  );
}
```

### C. Complete Input System

```typescript
// src/systems/InputSystem.ts

class InputSystem {
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { W: Key; A: Key; S: Key; D: Key };
  private joystick: VirtualJoystick | null = null;
  
  private sequence = 0;
  private inputBuffer: InputPayload[] = [];
  private lastSendTime = 0;
  private readonly SEND_RATE = 1000 / 20; // 20Hz
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Keyboard
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as any;
    
    // Joystick (mobile only)
    if (scene.sys.game.device.input.touch) {
      this.joystick = new VirtualJoystick(scene);
    }
  }
  
  update(): InputPayload {
    const now = Date.now();
    
    // Gather input from all sources
    const keyboard = this.getKeyboardInput();
    const touch = this.joystick?.toInputPayload() ?? {};
    
    // Merge inputs (OR logic)
    const input: InputPayload = {
      seq: this.sequence++,
      left: keyboard.left || touch.left || false,
      right: keyboard.right || touch.right || false,
      up: keyboard.up || touch.up || false,
      down: keyboard.down || touch.down || false,
      running: keyboard.running || false,
      interact: keyboard.interact || false,
      timestamp: now
    };
    
    // Buffer for reconciliation
    this.inputBuffer.push(input);
    if (this.inputBuffer.length > 120) { // ~2 seconds at 60Hz
      this.inputBuffer.shift();
    }
    
    // Send at fixed rate
    if (now - this.lastSendTime >= this.SEND_RATE) {
      colyseusManager.sendInput(input);
      this.lastSendTime = now;
    }
    
    return input;
  }
  
  private getKeyboardInput(): Partial<InputPayload> {
    return {
      left: this.cursors.left.isDown || this.wasd.A.isDown,
      right: this.cursors.right.isDown || this.wasd.D.isDown,
      up: this.cursors.up.isDown || this.wasd.W.isDown,
      down: this.cursors.down.isDown || this.wasd.S.isDown,
      running: this.cursors.shift.isDown,
      interact: Phaser.Input.Keyboard.JustDown(this.cursors.space)
    };
  }
  
  // For server reconciliation
  getInputsSince(seq: number): InputPayload[] {
    return this.inputBuffer.filter(i => i.seq > seq);
  }
  
  clearInputsUpTo(seq: number) {
    this.inputBuffer = this.inputBuffer.filter(i => i.seq > seq);
  }
}
```

---

## Document Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial comprehensive architecture |

---

*This document serves as the technical blueprint for transforming ArkAgentic into a multiplayer virtual world. Implementation should follow the phased approach, with each phase being testable independently before moving to the next.*
