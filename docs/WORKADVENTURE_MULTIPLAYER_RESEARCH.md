# WorkAdventure Open Source Multiplayer Architecture Research

## Overview
WorkAdventure is an open-source collaborative web application presented as a 16-bit RPG video game that enables real-time multiplayer interactions in virtual worlds. This document analyzes their multiplayer architecture, focusing on online sessions, player connections, and proximity-based interactions.

## Core Architecture Components

### 1. Server Architecture
WorkAdventure uses a microservices architecture with several key components:

- **Play Service (Frontend)**: The main client application built with TypeScript and Phaser.js
- **Pusher Service**: Handles WebSocket connections and real-time communication
- **Back Service**: Manages authentication, user management, and business logic
- **Map Storage**: Stores and serves map data and assets
- **Livekit**: Handles WebRTC video/audio conferencing for large groups
- **Coturn**: STUN/TURN server for WebRTC peer connections
- **Room API**: gRPC-based API for server-to-server communication

### 2. Real-Time Communication

#### WebSocket Connections
- **Primary Protocol**: WebSocket with protobuf message serialization
- **Connection Management**: Clients connect to the Pusher service via WebSocket
- **Message Format**: Protocol Buffers (.proto files) for efficient serialization
- **Connection Flow**:
  1. Client establishes WebSocket connection to pusher
  2. Authentication via JWT tokens
  3. Room joining with viewport information
  4. Continuous message exchange for player state updates

#### Message Types
Key protobuf messages include:
- `UserMoves`: Player position and movement updates
- `JoinRoom`: Initial room connection
- `WebRtcSignalToServer`: WebRTC signaling data
- `VariableMessage`: Shared state variables

### 3. Player Tracking System

#### "Nearby Zone" Concept
WorkAdventure implements an aggressive optimization where clients only receive information about players within their viewport or "nearby zone":

```typescript
// From their documentation
WA.players.configureTracking({
  players: true,    // Track player enter/leave nearby zone
  movement: false   // Opt-out of movement tracking for performance
});
```

**Key Optimizations:**
- Clients only track players visible on screen or in nearby zones
- Movement events throttled to ~5 times per second (200ms intervals)
- No awareness of players outside viewport for performance

#### Player State Management
```typescript
interface RemotePlayerInterface {
  readonly id: number;           // Unique player ID
  readonly name: string;         // Display name
  readonly uuid: string;         // User UUID (can have multiple characters)
  readonly position: PlayerPosition; // Current position in game pixels
  readonly position$: Observable<PlayerPosition>; // Real-time position stream
  readonly state: ReadOnlyState; // Player variables
}
```

### 4. Proximity-Based Interactions

#### Chat Zones
WorkAdventure implements different types of interactive zones:
- **Proximity Chat**: Audio/video enabled when players are close
- **Meeting Rooms**: Dedicated video conferencing areas
- **Speaker Zones**: One-way audio broadcasting areas
- **Silent Zones**: Muted areas

#### Voice Communication Architecture
1. **Peer-to-Peer (≤4 users)**: Direct WebRTC connections
2. **Livekit SFU (≥5 users)**: Server-mediated video conferencing
3. **TURN Server**: NAT traversal for peer connections

#### Zone Detection
- Players trigger zone events when entering/leaving areas
- Zones defined in Tiled map editor with properties
- Real-time zone state synchronization across clients

### 5. Room and Session Management

#### Room Concept
- **Room**: A virtual space containing multiple players
- **Map**: The visual layout and interactive elements
- **Session**: A player's connection to a room

#### Room API (gRPC)
The Room API enables server-to-server communication:
```protobuf
service RoomApi {
  rpc readVariable(VariableRequest) returns (google.protobuf.Value);
  rpc listenVariable(VariableRequest) returns (stream google.protobuf.Value);
  rpc saveVariable(SaveVariableRequest) returns (google.protobuf.Empty);
  rpc broadcastEvent(DispatchEventRequest) returns (google.protobuf.Empty);
  rpc listenToEvent(EventRequest) returns (stream EventResponse);
}
```

#### Shared State Management
- **Variables**: Key-value storage shared across room
- **Player Variables**: Public variables attached to individual players
- **Events**: Real-time event broadcasting system

### 6. Client-Side Scripting API

#### Map Scripting
WorkAdventure supports client-side JavaScript/TypeScript for map interactions:

```javascript
// Enable player tracking
await WA.players.configureTracking();

// Listen for nearby players
WA.players.onPlayerEnters.subscribe((player) => {
  console.log(`Player ${player.name} entered nearby zone`);
});

// Track player movement
WA.players.onPlayerMoves().subscribe((event) => {
  const { player, newPosition, oldPosition } = event;
  // Handle movement
});
```

#### Scripting Architecture
- **Map Scripts**: JavaScript files loaded with maps
- **Iframe Scripts**: Scripts in embedded websites with API access
- **WA Object**: Global API object for game interactions
- **Security**: Scripts execute in sandboxed iframes

### 7. Scalability Considerations

#### Performance Optimizations
- **Viewport Culling**: Only render visible players
- **Message Batching**: Efficient protobuf serialization
- **Connection Limits**: ~100-200 concurrent users per room
- **CDN Assets**: Static assets served via CDN

#### Infrastructure Requirements
- **Load Balancing**: Multiple pusher instances
- **Redis**: Session storage and pub/sub messaging
- **Database**: User data and room state persistence
- **WebRTC Infrastructure**: STUN/TURN servers for connectivity

### 8. Security Architecture

#### Authentication
- **JWT Tokens**: For API authentication
- **OIDC Support**: Optional OpenID Connect integration
- **Room Access Control**: Configurable room permissions

#### Connection Security
- **HTTPS Required**: All connections must be secure
- **CORS Policies**: Strict cross-origin resource sharing
- **API Keys**: For server-to-server Room API access

### 9. Deployment Architecture

#### Docker Compose Setup
```yaml
services:
  play:       # Frontend application
  pusher:     # WebSocket server
  back:       # Backend API
  map-storage: # Map file server
  livekit:    # Video conferencing
  coturn:     # WebRTC relay
```

#### Kubernetes Support
- Helm charts available for production deployment
- Horizontal scaling support
- Multi-domain configurations

## Key Takeaways for ArkAgentic Implementation

### Proximity Zone System
WorkAdventure's "nearby zone" concept is perfect for our agent interaction system:
- Players only see/interact with agents within a circular radius
- Efficient viewport-based culling prevents performance issues
- Real-time zone enter/leave events trigger interactions

### Multiplayer Communication
- WebSocket + protobuf for efficient real-time messaging
- gRPC Room API for external integrations
- Shared state variables for room-wide data

### Voice Integration
- WebRTC for direct peer connections (small groups)
- SFU (Livekit) for larger conversations
- Proximity-based audio zones

### State Synchronization
- Player variables for individual agent state
- Room variables for shared world state
- Event system for real-time notifications

## Recommended Implementation Strategy

1. **WebSocket Infrastructure**: Implement WebSocket server with protobuf messages
2. **Viewport System**: Only track agents within player's interaction radius
3. **Zone Management**: Define circular proximity zones for agent interactions
4. **State Sync**: Use variables/events for agent state synchronization
5. **Voice Integration**: WebRTC for agent-to-player conversations
6. **Scalability**: Implement connection limits and load balancing

## Challenges Identified

1. **Performance**: Managing many concurrent users and agents
2. **Network**: Handling WebRTC connections through firewalls
3. **State**: Synchronizing agent behaviors across clients
4. **Security**: Protecting against cheating and spam
5. **Scalability**: Handling world state for many simultaneous sessions

## Next Steps

1. Implement basic WebSocket server with player tracking
2. Add proximity zone detection system
3. Integrate WebRTC for voice communication
4. Build agent interaction UI (click to chat)
5. Add room state management
6. Implement agent behavior synchronization

---

*Research based on WorkAdventure v1.27.x open source codebase and documentation as of December 2025*
