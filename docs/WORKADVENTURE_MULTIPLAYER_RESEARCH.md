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

---

## Extended Technical Deep Dive (January 2026 Update)

### 10. Avatar Movement System

#### Keyboard Controls (Desktop)
WorkAdventure's movement is built on Phaser.js input handling:

```typescript
// Typical Phaser.js keyboard input setup
this.cursors = this.input.keyboard.createCursorKeys();

// In update loop
if (this.cursors.left.isDown) {
  this.player.setVelocityX(-speed);
  this.player.anims.play('walk-left', true);
} else if (this.cursors.right.isDown) {
  this.player.setVelocityX(speed);
  this.player.anims.play('walk-right', true);
}
```

**Key Implementation Details:**
- **WASD + Arrow Keys**: Both control schemes supported simultaneously
- **Diagonal Movement**: Combined key detection (up+left, etc.)
- **Grid-Aligned**: Movement aligns to 32x32 tile grid for collision
- **Velocity-Based**: Uses Phaser.js arcade physics
- **Animation Syncing**: Direction-based sprite animations (walk-up, walk-down, etc.)
- **Camera Following**: Smooth camera follow on player avatar

#### Mobile Touch Controls
WorkAdventure implements a virtual joystick for mobile devices:

```typescript
// Mobile joystick implementation concept
// Uses libraries like phaser3-rex-plugins or nipplejs

const joystick = this.plugins.get('rexVirtualJoystick').add(this, {
  x: 100,
  y: this.cameras.main.height - 100,
  radius: 50,
  base: baseSprite,
  thumb: thumbSprite,
});

// Convert joystick angle to movement
joystick.on('update', () => {
  const angle = joystick.angle;
  const force = joystick.force;
  
  player.setVelocity(
    Math.cos(angle) * force * speed,
    Math.sin(angle) * force * speed
  );
});
```

**Mobile-Specific Features:**
- **Virtual Joystick**: Bottom-left positioned thumb control
- **Touch Drag**: Direct drag-to-move on map areas
- **Pinch Zoom**: Multi-touch zoom support
- **Responsive UI**: Action buttons adapt to screen size
- **Viewport Optimization**: Reduced render distance on mobile

### 11. WebSocket Communication Architecture (Detailed)

#### Protocol Buffers Message Schema
WorkAdventure uses Protocol Buffers for efficient binary serialization:

```protobuf
// Key message types from their messages/ directory

message UserMovesMessage {
  PositionMessage position = 1;
  ViewportMessage viewport = 2;
}

message PositionMessage {
  int32 x = 1;
  int32 y = 2;
  enum Direction {
    UP = 0;
    RIGHT = 1;
    DOWN = 2;
    LEFT = 3;
  }
  Direction direction = 3;
  bool moving = 4;
}

message ViewportMessage {
  int32 left = 1;
  int32 top = 2;
  int32 right = 3;
  int32 bottom = 4;
}
```

#### Connection Flow (Detailed)
```
Client                    Pusher                    Back
  |                         |                         |
  |--[WebSocket Connect]-->|                         |
  |                         |--[Authenticate JWT]--->|
  |                         |<--[User Data]----------|
  |<--[ConnectionReady]----|                         |
  |--[JoinRoomMessage]---->|                         |
  |                         |--[Register in Room]--->|
  |<--[UsersInRoom]--------|                         |
  |                         |                         |
  |===[Real-time Loop]==============================>|
  |--[UserMoves]---------->|--[Broadcast to room]-->|
  |<--[OtherUserMoves]----|                         |
```

#### Pusher Service Architecture
The Pusher service handles:
- **WebSocket Upgrade**: HTTP -> WebSocket handshake
- **Room Management**: Grouping connections by room/map
- **Message Broadcasting**: Efficient fan-out to room members
- **Viewport Filtering**: Only send messages for visible players
- **Rate Limiting**: Throttle position updates (~5/second)

### 12. Proximity Chat & Video Implementation

#### Bubble Detection Algorithm
```typescript
// Proximity detection concept
const PROXIMITY_RADIUS = 80; // pixels

function detectNearbyPlayers(player: Player, allPlayers: Player[]): Player[] {
  return allPlayers.filter(other => {
    if (other.id === player.id) return false;
    const distance = Math.hypot(
      player.x - other.x,
      player.y - other.y
    );
    return distance <= PROXIMITY_RADIUS;
  });
}

// Called on position updates
function onProximityChange(nearbyPlayers: Player[]) {
  if (nearbyPlayers.length > 0 && !inBubble) {
    enterBubble(nearbyPlayers);
  } else if (nearbyPlayers.length === 0 && inBubble) {
    exitBubble();
  }
}
```

#### WebRTC Full-Mesh (≤4 users)
```typescript
// Peer-to-peer connection for small groups
class PeerConnection {
  private connections: Map<string, RTCPeerConnection> = new Map();
  
  async connectToPeer(peerId: string, isInitiator: boolean) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.workadventure.localhost:3478' },
        { urls: 'turn:turn.workadventure.localhost:3478', 
          username: 'user', credential: 'pass' }
      ]
    });
    
    // Add local media tracks
    this.localStream.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream);
    });
    
    // Handle remote tracks
    pc.ontrack = (event) => {
      this.onRemoteStream(peerId, event.streams[0]);
    };
    
    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: peerId
        });
      }
    };
    
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.signaling.send({ type: 'offer', sdp: offer, to: peerId });
    }
    
    this.connections.set(peerId, pc);
  }
}
```

#### LiveKit Integration (≥5 users)
WorkAdventure seamlessly upgrades to LiveKit SFU:

```typescript
// LiveKit room connection
import { Room, RoomEvent, Track } from 'livekit-client';

class LiveKitConnection {
  private room: Room;
  
  async connect(token: string, serverUrl: string) {
    this.room = new Room();
    
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Video) {
        this.attachVideoTrack(track, participant.identity);
      } else if (track.kind === Track.Kind.Audio) {
        this.attachAudioTrack(track, participant.identity);
      }
    });
    
    await this.room.connect(serverUrl, token);
    await this.room.localParticipant.enableCameraAndMicrophone();
  }
  
  // Seamless upgrade from full-mesh
  async upgradeFromFullMesh(existingPeers: string[]) {
    // Disconnect WebRTC peers
    this.peerConnections.forEach(pc => pc.close());
    // Connect to LiveKit
    await this.connect(this.livekitToken, this.livekitUrl);
  }
}
```

### 13. Jitsi Integration (Detailed)

#### Zone-Triggered Jitsi Rooms
```typescript
// Tiled map area object properties
{
  "class": "area",
  "properties": {
    "jitsiRoom": "meeting-room-alpha",
    "jitsiWidth": 75,               // iframe width percentage
    "jitsiClosable": true,          // show close button
    "jitsiTrigger": "onaction",     // or "onenter"
    "jitsiTriggerMessage": "Press SPACE to join meeting",
    "jitsiConfig": "{\"startWithAudioMuted\": true}",
    "jitsiInterfaceConfig": "{\"TOOLBAR_BUTTONS\": [\"microphone\", \"camera\"]}",
    "jitsiUrl": "meet.jit.si",      // custom Jitsi server
    "jitsiNoPrefix": false          // use room hash prefix
  }
}
```

#### Jitsi Embed Implementation
```typescript
class JitsiMeetManager {
  private api: any;
  
  openMeeting(roomName: string, config: JitsiConfig) {
    // Room name is hashed with map URL for uniqueness
    const hashedRoom = this.hashRoomName(roomName, this.mapUrl);
    
    const options = {
      roomName: hashedRoom,
      parentNode: document.getElementById('jitsi-container'),
      width: config.width || '100%',
      height: '100%',
      configOverwrite: {
        startWithAudioMuted: config.audioMuted,
        startWithVideoMuted: config.videoMuted,
        prejoinPageEnabled: false,
        ...config.jitsiConfig
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: ['microphone', 'camera', 'chat', 'desktop', 'hangup'],
        ...config.jitsiInterfaceConfig
      },
      userInfo: {
        displayName: this.currentUser.name
      }
    };
    
    this.api = new JitsiMeetExternalAPI(config.domain || 'meet.jit.si', options);
    
    // Handle events
    this.api.on('videoConferenceLeft', () => this.onLeave());
  }
}
```

### 14. Zone/Area System (Tiled Map Properties)

#### Area Object Types
WorkAdventure supports these area types via object properties:

```typescript
// Area detection system
interface AreaConfig {
  // Meeting rooms
  jitsiRoom?: string;
  liveKitRoom?: string;  // New in v1.27+
  bbbMeeting?: string;   // BigBlueButton
  
  // Audio/video zones
  silent?: boolean;       // Disable all communication
  playAudio?: string;     // Background audio URL
  audioLoop?: boolean;
  audioVolume?: number;   // 0.0 - 1.0
  
  // Navigation
  exitUrl?: string;       // Link to another map
  exitSceneUrl?: string;  // Link within same WorkAdventure
  
  // Display
  openWebsite?: string;   // Open iframe
  openWebsiteAllowApi?: boolean;
  openWebsiteTrigger?: 'onenter' | 'onaction';
  
  // Special zones
  focusable?: boolean;    // Highlight zone
  zone?: string;          // Zone identifier
}
```

#### Collision & Zone Detection
```typescript
// Zone overlap detection
class ZoneManager {
  private zones: Map<string, Phaser.GameObjects.Zone> = new Map();
  
  createZone(areaObject: TiledObject) {
    const zone = this.scene.add.zone(
      areaObject.x,
      areaObject.y,
      areaObject.width,
      areaObject.height
    );
    
    this.scene.physics.world.enable(zone);
    
    // Collision detection with player
    this.scene.physics.add.overlap(
      this.player,
      zone,
      () => this.onEnterZone(areaObject),
      null,
      this
    );
    
    this.zones.set(areaObject.id, zone);
  }
  
  onEnterZone(area: TiledObject) {
    const props = area.properties;
    
    if (props.jitsiRoom) {
      this.jitsiManager.openMeeting(props.jitsiRoom);
    }
    if (props.silent) {
      this.audioManager.muteAll();
    }
    if (props.playAudio) {
      this.audioManager.playBackground(props.playAudio);
    }
  }
}
```

### 15. Self-Hosting Architecture (Production)

#### Complete Docker Stack
```yaml
version: '3.8'
services:
  # Core WorkAdventure
  play:
    image: thecodingmachine/workadventure-play:v1.27
    environment:
      - PUSHER_URL=//pusher.example.com
      - UPLOADER_URL=//uploader.example.com
      - MAP_STORAGE_URL=//maps.example.com
    
  pusher:
    image: thecodingmachine/workadventure-pusher:v1.27
    environment:
      - BACK_URL=back:50051
      - LIVEKIT_URL=wss://livekit.example.com
      - LIVEKIT_API_KEY=key
      - LIVEKIT_API_SECRET=secret
    
  back:
    image: thecodingmachine/workadventure-back:v1.27
    environment:
      - SECRET_KEY=your-secret-key
      - REDIS_HOST=redis
      - ENABLE_OPENID_CONNECT=true
    
  map-storage:
    image: thecodingmachine/workadventure-map-storage:v1.27
    volumes:
      - ./maps:/maps
    
  uploader:
    image: thecodingmachine/workadventure-uploader:v1.27
    environment:
      - UPLOADER_AWS_BUCKET=uploads
    
  # Supporting services
  redis:
    image: redis:7
    
  # External services (separate servers recommended)
  livekit:
    image: livekit/livekit-server:v1.5
    ports:
      - "7880:7880"   # HTTP
      - "7881:7881"   # WebSocket
      - "7882:7882/udp" # WebRTC UDP
    
  coturn:
    image: coturn/coturn:latest
    ports:
      - "3478:3478"
      - "3478:3478/udp"
      - "5349:5349"   # TLS
    
  # Optional
  jitsi:
    # Jitsi docker-compose setup
    # See: https://github.com/jitsi/docker-jitsi-meet
    
  synapse:
    # Matrix Synapse for persistent chat
    image: matrixdotorg/synapse:latest
```

#### Required DNS Entries
```
play.example.com      -> Load balancer
pusher.example.com    -> WebSocket server
maps.example.com      -> Map storage
uploader.example.com  -> File uploads
livekit.example.com   -> Video SFU
turn.example.com      -> TURN server
jitsi.example.com     -> Jitsi (optional)
matrix.example.com    -> Synapse (optional)
```

### 16. Session & State Persistence

#### Player State Variables
```typescript
// Per-player public variables
WA.player.state.saveVariable('status', 'available');
WA.player.state.saveVariable('role', 'developer');

// Observable state changes
WA.player.state.onVariableChange('status').subscribe((value) => {
  updatePlayerBadge(value);
});

// Other players' variables
WA.players.onPlayerEnters.subscribe((player) => {
  const status = player.state.get('status');
  const role = player.state.get('role');
});
```

#### Room-Wide State
```typescript
// Shared room variables (persisted)
await WA.state.saveVariable('roomMode', 'presentation');
await WA.state.saveVariable('currentSpeaker', 'user-123');

// Listen for changes
WA.state.onVariableChange('roomMode').subscribe((mode) => {
  if (mode === 'presentation') {
    dimLights();
  }
});
```

#### Session Token Flow
```
1. User authenticates via OIDC provider
2. Back service issues JWT with claims:
   - userId, email, name
   - membershipLevel, tags
   - roomPermissions
3. JWT passed to Pusher on WebSocket connect
4. Session stored in Redis for cross-instance coordination
5. Token refresh handled automatically
```

### 17. Phaser.js Integration Patterns

#### Scene Structure
```typescript
// Typical WorkAdventure-style scene setup
class GameScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Sprite;
  private remotePlayers: Map<string, RemotePlayer>;
  private tilemap: Phaser.Tilemaps.Tilemap;
  private wsConnection: WebSocketConnection;
  
  preload() {
    this.load.tilemapTiledJSON('map', 'map.json');
    this.load.spritesheet('player', 'woka.png', {
      frameWidth: 32,
      frameHeight: 32
    });
  }
  
  create() {
    // Load tilemap
    this.tilemap = this.make.tilemap({ key: 'map' });
    const tileset = this.tilemap.addTilesetImage('tileset', 'tiles');
    
    // Create layers
    const groundLayer = this.tilemap.createLayer('floor', tileset);
    const collisionLayer = this.tilemap.createLayer('collisions', tileset);
    collisionLayer.setCollisionByProperty({ collides: true });
    
    // Create floor layer object group (for z-ordering)
    const floorLayer = this.tilemap.getObjectLayer('floorLayer');
    
    // Create player
    this.player = this.physics.add.sprite(
      this.spawnPoint.x, 
      this.spawnPoint.y, 
      'player'
    );
    
    // Setup collisions
    this.physics.add.collider(this.player, collisionLayer);
    
    // Camera follow
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    
    // Connect WebSocket
    this.wsConnection.connect();
    this.wsConnection.onPlayerUpdate(this.handleRemotePlayer.bind(this));
    
    // Parse zone objects
    this.parseMapZones();
  }
  
  update(time: number, delta: number) {
    this.handleInput();
    this.sendPositionUpdate();
    this.checkProximity();
  }
}
```

### 18. Adaptations for Phaser.js-Based Games

#### Recommended Implementation for ArkAgentic

1. **Movement System**
   - Use Phaser's arcade physics for smooth movement
   - Implement 8-direction movement with diagonal handling
   - Add virtual joystick plugin for mobile (rex-plugins)
   - Throttle position broadcasts to 5Hz

2. **Proximity Detection**
   - Use Phaser's physics overlap for zone detection
   - Implement spatial hashing for many-agent scenarios
   - Trigger agent interactions at configurable radius

3. **Real-Time Communication**
   - Socket.io or native WebSocket with MessagePack/Protobuf
   - Viewport-based filtering on server side
   - Redis pub/sub for multi-instance scaling

4. **Video/Audio Integration**
   - Daily.co or LiveKit for managed WebRTC
   - Fallback to peer-to-peer for small groups
   - Proximity-based audio attenuation

5. **Zone System**
   - Define zones in Tiled with custom properties
   - Parse zone objects on scene load
   - Trigger events on zone enter/exit

```typescript
// Example zone properties for ArkAgentic
{
  "class": "area",
  "name": "agent-scout-zone",
  "properties": {
    "agentId": "scout",
    "interactionType": "chat",
    "autoTrigger": false,
    "triggerMessage": "Press E to talk to Scout",
    "privateZone": true  // Hide from other players when occupied
  }
}
```

---

## Summary: Key Technical Insights

| Feature | WorkAdventure Approach | Recommendation for ArkAgentic |
|---------|----------------------|------------------------------|
| Movement | Phaser.js arcade physics + keyboard/touch | Same, with virtual joystick plugin |
| Real-time | WebSocket + Protobuf | Socket.io + MessagePack |
| Proximity Video | WebRTC full-mesh → LiveKit SFU | LiveKit or Daily.co SDK |
| Zone Detection | Tiled object layers + Phaser overlap | Same approach |
| State Sync | Redis + gRPC Room API | Redis + REST/WebSocket events |
| Session | JWT + OIDC | JWT with simpler auth |
| Self-hosting | Docker Compose / Kubernetes | Docker Compose initially |

*Updated January 2026 with comprehensive technical deep-dive*

