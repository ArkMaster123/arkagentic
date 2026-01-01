# Jitsi Meet Self-Hosting & Integration Research

## Overview

This document provides comprehensive technical research on Jitsi Meet for integration with virtual world/game applications. It covers architecture, self-hosting, APIs, and integration patterns used by WorkAdventure and similar applications.

---

## 1. Jitsi Architecture Components

Jitsi Meet is built on a microservices architecture with several key components:

### Core Components

| Component | Role | Protocol |
|-----------|------|----------|
| **Jitsi Meet Web** | React-based WebRTC client application | HTTPS, WebSocket |
| **Prosody** | XMPP signaling server for real-time messaging | XMPP (5222, 5280) |
| **Jicofo** | Conference focus - orchestrates meetings | XMPP |
| **Jitsi Videobridge (JVB)** | SFU for media routing (audio/video streams) | RTP/UDP (10000) |
| **Jibri** | Recording/streaming service (optional) | - |
| **Jigasi** | SIP gateway for phone integration (optional) | SIP |

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Browser                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │               Jitsi Meet Web (React + WebRTC)                │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                           │                    │
                    HTTPS/WSS              RTP/UDP
                    (Signaling)            (Media)
                           │                    │
                           ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Jitsi Server                                 │
│                                                                      │
│  ┌────────────┐    ┌───────────┐    ┌──────────────────────────┐   │
│  │   Nginx    │───▶│  Prosody  │◀──▶│         Jicofo           │   │
│  │  (Proxy)   │    │  (XMPP)   │    │  (Conference Orchestrator)│   │
│  └────────────┘    └───────────┘    └──────────────────────────┘   │
│        │                 │                      │                   │
│        │                 │                      │                   │
│        ▼                 ▼                      ▼                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                Jitsi Videobridge (JVB)                        │  │
│  │           Selective Forwarding Unit (SFU)                     │  │
│  │      Routes video/audio streams between participants         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────┐    ┌────────────┐                                  │
│  │   Jibri    │    │  Jigasi    │    (Optional Components)         │
│  │ (Recording)│    │   (SIP)    │                                  │
│  └────────────┘    └────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Details

#### Prosody (XMPP Server)
- Handles all signaling between clients and server
- Manages component and user authentication
- Room management and messaging
- SSL/TLS certificates for secure communication
- Users like 'focus' and 'jvb' must be registered with secure secrets

#### Jicofo (Conference Focus)
- Orchestrates signaling between clients and the videobridge
- Load balancing across multiple JVB instances
- Session management and participant coordination
- Requires `focusSecret` in configuration

#### Jitsi Videobridge (JVB)
- **SFU (Selective Forwarding Unit)** - routes RTP streams, doesn't mix them
- Low latency media routing
- UDP port 10000 for media traffic
- Can be horizontally scaled for large deployments
- CPU-intensive for real-time video routing

---

## 2. Self-Hosting Requirements

### Minimum Server Specifications

| Concurrent Users | CPU Cores | RAM | Bandwidth | Notes |
|-----------------|-----------|-----|-----------|-------|
| <10 (test) | 2-4 | 4-8 GB | 100-500 Mbps | Basic VPS OK |
| 30-40 | 4 | 8 GB | 1 Gbps | Minimum production |
| 100+ | 8+ | 16-32 GB | 10 Gbps+ | Add multiple JVBs |
| 1000+ streams | Quad-core | ~3 GB JVM | 550+ Mbps | Optimized deployment |

### Bandwidth Per User
- **Minimum**: 2 Mbps up/down
- **HD (720p)**: 2.5 Mbps per user
- **Full HD (1080p)**: 5 Mbps per user
- **4K**: >10 Mbps per user

### Network Requirements

**Required Ports:**
| Port | Protocol | Service |
|------|----------|---------|
| 80 | TCP | HTTP redirect |
| 443 | TCP | HTTPS (web, XMPP-BOSH) |
| 10000 | UDP | JVB media traffic |
| 4443 | TCP | JVB fallback (optional) |
| 5222 | TCP | XMPP client connections |
| 5280 | TCP | XMPP BOSH |

### SSL/TLS Requirements
- Valid SSL certificate required (Let's Encrypt works)
- HTTPS mandatory for WebRTC (camera/mic access)
- Certificates needed for both main domain and auth subdomain

---

## 3. Docker Deployment

### Official Docker Compose Setup

```bash
# Download latest release
wget $(wget -q -O - https://api.github.com/repos/jitsi/docker-jitsi-meet/releases/latest | grep zip | cut -d\" -f4)

# Create config directories
mkdir -p ~/.jitsi-meet-cfg/{web,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb,jigasi,jibri}

# Generate passwords
./gen-passwords.sh

# Configure .env file
cp env.example .env
# Edit PUBLIC_URL, ENABLE_LETSENCRYPT, etc.

# Start services
docker compose up -d
```

### Docker Services Architecture

```yaml
services:
  web:
    image: jitsi/web
    # Nginx-based frontend
    
  prosody:
    image: jitsi/prosody
    # XMPP signaling server
    
  jicofo:
    image: jitsi/jicofo
    # Conference focus
    
  jvb:
    image: jitsi/jvb
    # Video bridge (SFU)
    
  # Optional:
  jibri:
    image: jitsi/jibri
    # Recording (8-12 GB RAM per stream)
```

### Key Environment Variables

```bash
# Core settings
PUBLIC_URL=https://meet.example.com
ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=meet.example.com
LETSENCRYPT_EMAIL=admin@example.com

# NAT traversal
JVB_ADVERTISE_IPS=<public-ip>

# Authentication
ENABLE_AUTH=1
AUTH_TYPE=internal  # or jwt, ldap

# TURN server
TURN_HOST=turn.example.com
TURN_PORT=5349

# Ports
HTTP_PORT=8000
HTTPS_PORT=8443
```

### Scaling with Multiple JVBs

For >100 users, deploy multiple JVB instances:

```yaml
# Add additional JVBs
jvb2:
  image: jitsi/jvb
  environment:
    - JVB_ADVERTISE_IPS=<second-server-ip>
```

---

## 4. IFrame API Integration

### Basic Embedding

```html
<!-- Load external API -->
<script src='https://meet.jit.si/external_api.js'></script>
<!-- Or for self-hosted: -->
<script src='https://your-domain.com/external_api.js'></script>

<div id="meet"></div>

<script>
const domain = 'meet.jit.si'; // or your self-hosted domain
const options = {
    roomName: 'MyMeetingRoom',
    width: 700,
    height: 700,
    parentNode: document.querySelector('#meet'),
    
    // User info
    userInfo: {
        email: 'user@example.com',
        displayName: 'John Doe'
    },
    
    // Config overrides
    configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: false,
        prejoinPageEnabled: false
    },
    
    // Interface customization
    interfaceConfigOverwrite: {
        DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
        TILE_VIEW_MAX_COLUMNS: 2,
        TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup']
    },
    
    // JWT for authentication (if enabled)
    jwt: '<jwt_token>'
};

const api = new JitsiMeetExternalAPI(domain, options);
</script>
```

### Key Commands

```javascript
// Control meeting
api.executeCommand('displayName', 'New Name');
api.executeCommand('toggleAudio');           // Mute/unmute
api.executeCommand('toggleVideo');           // Camera on/off
api.executeCommand('hangup');                // Leave meeting

// Room management
api.executeCommand('password', 'secret');    // Set room password
api.executeCommand('subject', 'Meeting Title');

// Moderation
api.executeCommand('kickParticipant', participantId);
api.executeCommand('muteEveryone', 'audio');
api.executeCommand('grantModerator', participantId);

// UI control
api.executeCommand('toggleTileView');
api.executeCommand('toggleChat');
api.executeCommand('setVideoQuality', 720);  // Resolution height

// Recording
api.executeCommand('startRecording', {
    mode: 'file',  // or 'stream' for RTMP
    shouldShare: true
});

// Messaging
api.executeCommand('sendChatMessage', 'Hello!', recipientId);
api.executeCommand('sendEndpointTextMessage', recipientId, 'private msg');
```

### Key Events

```javascript
// Conference lifecycle
api.addListener('videoConferenceJoined', (data) => {
    console.log('Joined room:', data.roomName);
    console.log('My ID:', data.id);
});

api.addListener('videoConferenceLeft', () => {
    console.log('Left the conference');
});

// Participant tracking
api.addListener('participantJoined', (data) => {
    console.log('Participant joined:', data.displayName, data.id);
});

api.addListener('participantLeft', (data) => {
    console.log('Participant left:', data.id);
});

// Media status
api.addListener('audioMuteStatusChanged', (data) => {
    console.log('Audio muted:', data.muted);
});

api.addListener('videoMuteStatusChanged', (data) => {
    console.log('Video muted:', data.muted);
});

// Messaging
api.addListener('incomingMessage', (data) => {
    console.log('Message from:', data.nick);
    console.log('Text:', data.message);
});

// Data channel (for custom messages)
api.addListener('endpointTextMessageReceived', (data) => {
    console.log('Custom message:', data.eventData.text);
});

// Ready to close
api.addListener('readyToClose', () => {
    api.dispose();  // Clean up
});
```

### API Functions

```javascript
// Get participant info
const rooms = await api.getRoomsInfo();
const participants = api.getParticipantsInfo();
const displayName = api.getDisplayName(participantId);

// Media state
const isMuted = api.isAudioMuted();
const isVideoMuted = api.isVideoMuted();
const devices = await api.getAvailableDevices();

// Cleanup
api.dispose();  // Remove IFrame
```

---

## 5. WorkAdventure Integration Pattern

WorkAdventure demonstrates the ideal pattern for proximity-based video chat in virtual worlds.

### Zone-Based Triggering

WorkAdventure uses **predefined zones** in Tiled maps rather than real-time distance calculation:

```
┌─────────────────────────────────────────────────────────────────┐
│                       Virtual World Map                          │
│                                                                  │
│    ┌──────────────────────┐                                     │
│    │   Meeting Zone A      │  ◄── jitsiRoom: "zone-a"          │
│    │   (Area Object)       │      jitsiTrigger: "onenter"       │
│    │                       │                                     │
│    │      🧑  🧑           │  Players inside = same Jitsi room  │
│    │                       │                                     │
│    └──────────────────────┘                                     │
│                                                                  │
│         🧑 (outside - no video)                                 │
│                                                                  │
│    ┌──────────────────────┐                                     │
│    │   Conference Room B   │  ◄── jitsiRoom: "zone-b"          │
│    │   jitsiTrigger:       │                                     │
│    │   "onaction"          │  ◄── Requires keypress to join     │
│    │                       │                                     │
│    └──────────────────────┘                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tiled Map Properties

Define Jitsi zones as "area" objects with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `jitsiRoom` | string | Room name for the Jitsi meeting |
| `jitsiUrl` | string | Custom Jitsi server domain (optional) |
| `jitsiTrigger` | string | `onenter` (auto) or `onaction` (manual) |
| `jitsiConfig` | JSON string | Overrides for config.js |
| `jitsiInterfaceConfig` | JSON string | Overrides for interface_config.js |
| `jitsiRoomAdminTag` | string | Tag for moderator privileges |
| `meetingRoomLabel` | string | Display label for the room |

### Implementation Flow

```javascript
// Pseudocode for WorkAdventure-style integration

class JitsiZoneManager {
    private currentZone: string | null = null;
    private jitsiApi: JitsiMeetExternalAPI | null = null;
    
    // Called when player enters a zone
    onPlayerEnterZone(zone: JitsiZoneConfig) {
        // Same zone, do nothing
        if (this.currentZone === zone.roomName) return;
        
        // Leave current room if any
        if (this.jitsiApi) {
            this.leaveCurrentRoom();
        }
        
        // Check trigger type
        if (zone.trigger === 'onenter') {
            this.joinRoom(zone);
        } else if (zone.trigger === 'onaction') {
            this.showJoinPrompt(zone);
        }
    }
    
    // Called when player leaves zone
    onPlayerLeaveZone(zone: JitsiZoneConfig) {
        if (this.currentZone === zone.roomName) {
            this.leaveCurrentRoom();
        }
    }
    
    private joinRoom(zone: JitsiZoneConfig) {
        const container = document.getElementById('jitsi-container');
        
        this.jitsiApi = new JitsiMeetExternalAPI(
            zone.jitsiUrl || 'meet.jit.si',
            {
                roomName: zone.roomName,
                parentNode: container,
                configOverwrite: zone.config || {},
                interfaceConfigOverwrite: zone.interfaceConfig || {
                    TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup'],
                    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
                },
                userInfo: {
                    displayName: this.playerName
                }
            }
        );
        
        this.currentZone = zone.roomName;
        this.showJitsiContainer();
        
        // Event handlers
        this.jitsiApi.addListener('videoConferenceLeft', () => {
            this.leaveCurrentRoom();
        });
    }
    
    private leaveCurrentRoom() {
        if (this.jitsiApi) {
            this.jitsiApi.executeCommand('hangup');
            this.jitsiApi.dispose();
            this.jitsiApi = null;
        }
        this.currentZone = null;
        this.hideJitsiContainer();
    }
}
```

### UI Layout Pattern

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Browser Window                                 │
│  ┌────────────────────────────────┬───────────────────────────────┐  │
│  │                                │                               │  │
│  │                                │       Jitsi IFrame            │  │
│  │      Game Canvas               │    (appears when in zone)     │  │
│  │      (Phaser/etc)              │                               │  │
│  │                                │    ┌───────────────────────┐  │  │
│  │         🧑 ← Player            │    │  Video Tiles          │  │  │
│  │                                │    │  ┌─────┐ ┌─────┐      │  │  │
│  │                                │    │  │ P1  │ │ P2  │      │  │  │
│  │                                │    │  └─────┘ └─────┘      │  │  │
│  │                                │    └───────────────────────┘  │  │
│  │                                │                               │  │
│  └────────────────────────────────┴───────────────────────────────┘  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. Proximity-Based Video Chat Patterns

### Pattern 1: Zone-Based (WorkAdventure Style)

**Pros:**
- Simple to implement
- Low computational overhead
- Map designer controls meeting areas
- No real-time distance calculations

**Cons:**
- Less dynamic/organic feeling
- Requires pre-planned zones

```javascript
// Zone detection using Phaser collision
const zone = this.add.zone(x, y, width, height);
this.physics.world.enable(zone);

this.physics.add.overlap(player, zone, () => {
    jitsiManager.onPlayerEnterZone(zone.data);
});
```

### Pattern 2: Proximity Radius (Dynamic)

**Pros:**
- More organic interaction
- No predefined zones needed
- Feels more natural

**Cons:**
- Higher CPU usage for distance checks
- Complex room management
- Harder to scale

```javascript
class ProximityManager {
    private readonly PROXIMITY_RADIUS = 100; // pixels
    private nearbyPlayers: Set<string> = new Set();
    
    update(allPlayers: Player[]) {
        const localPlayer = this.getLocalPlayer();
        const nowNearby = new Set<string>();
        
        for (const player of allPlayers) {
            if (player.id === localPlayer.id) continue;
            
            const distance = Phaser.Math.Distance.Between(
                localPlayer.x, localPlayer.y,
                player.x, player.y
            );
            
            if (distance <= this.PROXIMITY_RADIUS) {
                nowNearby.add(player.id);
                
                // New player entered proximity
                if (!this.nearbyPlayers.has(player.id)) {
                    this.onPlayerEnterProximity(player);
                }
            }
        }
        
        // Check for players who left
        for (const playerId of this.nearbyPlayers) {
            if (!nowNearby.has(playerId)) {
                this.onPlayerLeaveProximity(playerId);
            }
        }
        
        this.nearbyPlayers = nowNearby;
    }
}
```

### Pattern 3: Spatial Audio with Distance Falloff

For audio-only proximity without video:

```javascript
// Adjust volume based on distance
const maxDistance = 200;
const distance = getDistanceToPlayer(otherPlayer);
const volume = Math.max(0, 1 - (distance / maxDistance));

api.executeCommand('setParticipantVolume', otherPlayer.id, volume);
```

### Pattern 4: Hybrid Approach (Recommended)

Combine zones for video with proximity-based audio:

```javascript
// Video: Zone-based (like WorkAdventure)
// Audio: Distance-based volume falloff within zones

class HybridProximityManager {
    // Zone triggers video chat
    onEnterVideoZone(zone) {
        this.joinJitsiRoom(zone.roomName);
    }
    
    // Distance affects audio volume
    updateAudioProximity(participants) {
        for (const p of participants) {
            const distance = this.getDistanceTo(p);
            const volume = this.calculateVolume(distance);
            this.jitsiApi.executeCommand('setParticipantVolume', p.id, volume);
        }
    }
}
```

---

## 7. Integration Architecture for Virtual Worlds

### Recommended Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           Client Browser                                │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Game Application (Phaser.js)                  │   │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │   │
│  │  │  Zone Manager   │  │  Player Tracker  │  │   UI Manager   │  │   │
│  │  │                 │  │                  │  │                │  │   │
│  │  │ - Enter/Leave   │  │ - Position sync  │  │ - Jitsi panel  │  │   │
│  │  │ - Zone props    │  │ - Nearby players │  │ - Controls     │  │   │
│  │  └────────┬────────┘  └────────┬─────────┘  └───────┬────────┘  │   │
│  │           │                    │                     │           │   │
│  │           └──────────┬─────────┴─────────────────────┘           │   │
│  │                      │                                           │   │
│  │            ┌─────────▼─────────┐                                 │   │
│  │            │  Jitsi Manager    │                                 │   │
│  │            │                   │                                 │   │
│  │            │ - Room lifecycle  │                                 │   │
│  │            │ - API commands    │                                 │   │
│  │            │ - Event handling  │                                 │   │
│  │            └─────────┬─────────┘                                 │   │
│  │                      │                                           │   │
│  └──────────────────────┼───────────────────────────────────────────┘   │
│                         │                                               │
│  ┌──────────────────────▼───────────────────────────────────────────┐   │
│  │              Jitsi IFrame (JitsiMeetExternalAPI)                  │   │
│  │                                                                   │   │
│  │  [Video Tiles] [Controls] [Chat]                                  │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                         │                                               │
└─────────────────────────┼───────────────────────────────────────────────┘
                          │ WebRTC (Media)
                          │ WebSocket (Signaling)
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Jitsi Meet Server                                   │
│  (Self-hosted or meet.jit.si)                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Complete Implementation Example

```typescript
// JitsiManager.ts
interface JitsiZone {
    id: string;
    roomName: string;
    jitsiUrl?: string;
    trigger: 'onenter' | 'onaction';
    config?: object;
    interfaceConfig?: object;
}

class JitsiManager {
    private api: JitsiMeetExternalAPI | null = null;
    private currentZone: JitsiZone | null = null;
    private container: HTMLElement;
    private playerName: string;
    private playerEmail: string;
    
    constructor(containerId: string, playerInfo: { name: string; email: string }) {
        this.container = document.getElementById(containerId)!;
        this.playerName = playerInfo.name;
        this.playerEmail = playerInfo.email;
    }
    
    enterZone(zone: JitsiZone): void {
        // Prevent duplicate joins
        if (this.currentZone?.id === zone.id) return;
        
        // Leave current room first
        if (this.api) {
            this.leaveRoom();
        }
        
        if (zone.trigger === 'onenter') {
            this.joinRoom(zone);
        }
        // For 'onaction', UI should show a button that calls joinRoom
    }
    
    joinRoom(zone: JitsiZone): void {
        // Show container
        this.container.style.display = 'block';
        
        // Create Jitsi API
        this.api = new JitsiMeetExternalAPI(zone.jitsiUrl || 'meet.jit.si', {
            roomName: this.sanitizeRoomName(zone.roomName),
            parentNode: this.container,
            width: '100%',
            height: '100%',
            
            userInfo: {
                displayName: this.playerName,
                email: this.playerEmail
            },
            
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: false,
                disableDeepLinking: true,
                ...zone.config
            },
            
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'hangup',
                    'chat', 'tileview', 'settings'
                ],
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                MOBILE_APP_PROMO: false,
                ...zone.interfaceConfig
            }
        });
        
        this.currentZone = zone;
        this.setupEventListeners();
    }
    
    leaveRoom(): void {
        if (this.api) {
            this.api.executeCommand('hangup');
            this.api.dispose();
            this.api = null;
        }
        this.currentZone = null;
        this.container.style.display = 'none';
    }
    
    exitZone(zoneId: string): void {
        if (this.currentZone?.id === zoneId) {
            this.leaveRoom();
        }
    }
    
    private setupEventListeners(): void {
        if (!this.api) return;
        
        this.api.addListener('videoConferenceJoined', (data) => {
            console.log('Joined Jitsi room:', data.roomName);
            this.emit('joined', data);
        });
        
        this.api.addListener('videoConferenceLeft', () => {
            console.log('Left Jitsi room');
            this.leaveRoom();
            this.emit('left', {});
        });
        
        this.api.addListener('participantJoined', (data) => {
            console.log('Participant joined:', data.displayName);
            this.emit('participantJoined', data);
        });
        
        this.api.addListener('participantLeft', (data) => {
            console.log('Participant left:', data.id);
            this.emit('participantLeft', data);
        });
    }
    
    private sanitizeRoomName(name: string): string {
        // Jitsi room names should be URL-safe
        return name.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    
    // Event emitter pattern
    private listeners: Map<string, Function[]> = new Map();
    
    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }
    
    private emit(event: string, data: any): void {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(data));
    }
    
    // Public controls
    toggleAudio(): void {
        this.api?.executeCommand('toggleAudio');
    }
    
    toggleVideo(): void {
        this.api?.executeCommand('toggleVideo');
    }
    
    isInRoom(): boolean {
        return this.api !== null;
    }
    
    getCurrentRoomName(): string | null {
        return this.currentZone?.roomName || null;
    }
}

export default JitsiManager;
```

### Phaser Integration

```typescript
// In your Phaser scene
class GameScene extends Phaser.Scene {
    private jitsiManager: JitsiManager;
    private currentZone: Phaser.GameObjects.Zone | null = null;
    
    create() {
        // Initialize Jitsi manager
        this.jitsiManager = new JitsiManager('jitsi-container', {
            name: this.playerName,
            email: this.playerEmail
        });
        
        // Create meeting zones from map data
        const zonesLayer = this.map.getObjectLayer('jitsi-zones');
        
        zonesLayer.objects.forEach(obj => {
            const zone = this.add.zone(obj.x, obj.y, obj.width, obj.height);
            zone.setOrigin(0, 0);
            
            // Store zone config
            zone.setData('jitsiConfig', {
                id: obj.name,
                roomName: obj.properties.find(p => p.name === 'jitsiRoom')?.value,
                trigger: obj.properties.find(p => p.name === 'jitsiTrigger')?.value || 'onenter',
                jitsiUrl: obj.properties.find(p => p.name === 'jitsiUrl')?.value
            });
            
            // Physics overlap detection
            this.physics.world.enable(zone);
            this.physics.add.overlap(this.player, zone, () => {
                this.onEnterJitsiZone(zone);
            });
        });
    }
    
    update() {
        // Check if player left current zone
        if (this.currentZone && !this.physics.overlap(this.player, this.currentZone)) {
            this.onLeaveJitsiZone(this.currentZone);
        }
    }
    
    private onEnterJitsiZone(zone: Phaser.GameObjects.Zone) {
        if (this.currentZone === zone) return;
        
        this.currentZone = zone;
        const config = zone.getData('jitsiConfig');
        this.jitsiManager.enterZone(config);
    }
    
    private onLeaveJitsiZone(zone: Phaser.GameObjects.Zone) {
        const config = zone.getData('jitsiConfig');
        this.jitsiManager.exitZone(config.id);
        this.currentZone = null;
    }
}
```

---

## 8. JWT Authentication (Optional)

For secure room access with self-hosted Jitsi:

### Server-Side Token Generation

```javascript
// Node.js example
const jwt = require('jsonwebtoken');

function generateJitsiToken(roomName, userInfo, expiresIn = '2h') {
    const payload = {
        context: {
            user: {
                name: userInfo.name,
                email: userInfo.email,
                avatar: userInfo.avatar,
                id: userInfo.id
            }
        },
        aud: 'jitsi',
        iss: 'your-app-id',
        sub: 'your-jitsi-domain.com',
        room: roomName
    };
    
    return jwt.sign(payload, process.env.JITSI_APP_SECRET, {
        expiresIn,
        algorithm: 'HS256'
    });
}
```

### Client Usage

```javascript
// Get token from your server
const token = await fetch('/api/jitsi-token', {
    method: 'POST',
    body: JSON.stringify({ roomName: 'my-room' })
}).then(r => r.json());

// Use token with Jitsi
const api = new JitsiMeetExternalAPI(domain, {
    roomName: 'my-room',
    jwt: token.jwt,
    // ... other options
});
```

---

## 9. Recommendations for ArkAgentic

### Recommended Approach

1. **Use Zone-Based Pattern** (like WorkAdventure)
   - Define meeting areas in Tiled map editor
   - Simpler implementation, better performance
   - Clear boundaries for users

2. **Start with meet.jit.si**
   - No server setup needed for prototyping
   - Migrate to self-hosted later for production

3. **Self-Host for Production**
   - 4 core / 8GB RAM minimum
   - Docker deployment for simplicity
   - Consider JWT auth for security

4. **UI Integration**
   - Slide-in panel on right side of game canvas
   - Minimal toolbar (mic, camera, hangup)
   - Hide Jitsi branding

5. **Agent Conversations**
   - Create unique room per agent: `agent-{agentId}-{playerId}`
   - Pre-join with audio muted
   - Text chat fallback for AI agents

### CSS for Jitsi Container

```css
#jitsi-container {
    position: fixed;
    right: 0;
    top: 0;
    width: 400px;
    height: 100vh;
    z-index: 1000;
    display: none; /* shown when joining */
    box-shadow: -4px 0 10px rgba(0,0,0,0.3);
}

#jitsi-container iframe {
    width: 100%;
    height: 100%;
    border: none;
}

/* Responsive: full width on mobile */
@media (max-width: 768px) {
    #jitsi-container {
        width: 100%;
    }
}
```

---

## 10. References

- [Jitsi Meet Handbook](https://jitsi.github.io/handbook/)
- [IFrame API Documentation](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/)
- [Docker Deployment Guide](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker/)
- [WorkAdventure Meeting Rooms](https://docs.workadventu.re/map-building/tiled-editor/meeting-rooms)
- [Jitsi Videobridge Performance](https://jitsi.org/jitsi-videobridge-performance-evaluation/)
- [Self-Hosting Requirements](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-requirements/)

---

*Research compiled January 2026*
