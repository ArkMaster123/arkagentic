# User-Generated Worlds & Modular Map System Research

> **Purpose**: Research document exploring how to implement user-generated content (UGC), custom maps, and modular world-building in ArkAgentic - inspired by systems like Minecraft, Fortnite Creative, Roblox, and Super Mario Maker but adapted for 2D browser-based Phaser games.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Industry Analysis](#industry-analysis)
3. [Technical Architectures](#technical-architectures)
4. [Phaser-Specific Implementation](#phaser-specific-implementation)
5. [Map Editor Design](#map-editor-design)
6. [Asset & Content Pipeline](#asset--content-pipeline)
7. [Multiplayer Synchronization](#multiplayer-synchronization)
8. [Storage & Database Design](#storage--database-design)
9. [Moderation & Safety](#moderation--safety)
10. [Monetization Considerations](#monetization-considerations)
11. [Implementation Roadmap](#implementation-roadmap)
12. [References](#references)

---

## Executive Summary

### Vision
Transform ArkAgentic from a single-world experience into a **modular platform** where users can:
- Create and share custom "villages" or "worlds"
- Design agent workspaces with custom layouts
- Build meeting rooms and collaboration spaces
- Share creations with the community
- Play in worlds created by others

### Key Design Principles

| Principle | Description |
|-----------|-------------|
| **Accessibility** | No coding required - visual drag-and-drop editor |
| **Modularity** | Worlds built from reusable, validated components |
| **Composability** | Users combine existing elements in new ways |
| **Shareability** | One-click publishing and discovery |
| **Safety** | Automated moderation and content validation |

### Comparison to Industry Leaders

| Feature | Minecraft | Roblox | Fortnite | Mario Maker | **ArkAgentic Goal** |
|---------|-----------|--------|----------|-------------|---------------------|
| Editor Type | External (MCEdit) + In-game | Roblox Studio | UEFN | In-game | In-browser + Tiled |
| Programming | Java/Datapacks | Lua (Luau) | Verse | None | None (visual) |
| Asset Creation | Texture packs | 3D models | UE5 assets | Predefined | Tileset upload |
| Sharing | Files/Servers | Centralized | Codes | Codes | Centralized + Codes |
| Monetization | Server hosting | Robux | Creator codes | None | Optional premium |

---

## Industry Analysis

### How Major Platforms Handle UGC

#### Minecraft
- **Architecture**: Decentralized - players host servers or use Realms (cloud)
- **Editor**: External tools (MCEdit, WorldEdit mod) or in-game building
- **Storage**: Local files (Anvil region format), ~256x256 block chunks
- **Sharing**: Community sites (Planet Minecraft, CurseForge), no native marketplace
- **Moderation**: Server owners moderate; Microsoft reports for Realms

**Key Insight**: Minecraft's decentralized approach gives maximum freedom but makes discovery and moderation difficult.

#### Roblox
- **Architecture**: Centralized client-server with Luau scripting
- **Editor**: Roblox Studio (desktop application)
- **Storage**: Cloud-based DataStores, serialized PlaceFiles
- **Sharing**: Roblox Marketplace with Robux monetization
- **Moderation**: AI scanning + human review, age-gated content

**Key Insight**: Roblox's centralized approach enables 354M MAU and built-in economy but requires massive infrastructure.

#### Fortnite Creative / UEFN
- **Architecture**: Unreal Engine 5 integration with Verse scripting
- **Editor**: UEFN (desktop) for advanced, in-game for simple
- **Storage**: Cloud-hosted islands (~10GB limits)
- **Sharing**: Island codes, Epic Marketplace
- **Moderation**: AI content classifiers + human review

**Key Insight**: Fortnite bridges casual in-game editing with professional UEFN tools.

#### Super Mario Maker
- **Architecture**: Nintendo's proprietary system
- **Editor**: In-game grid-based editor (16x16 pixel tiles)
- **Storage**: Cloud saves (~few KB per course, compressed)
- **Sharing**: Upload codes, global/random queues
- **Moderation**: Server-side validation, AI flags griefing

**Key Insight**: Strict constraints (Mario physics only) prevent exploits and maintain quality.

### UGC Classification Framework

Based on academic research ([arXiv:2412.13743](https://arxiv.org/html/2412.13743v1)), UGC in games falls into two categories:

#### 1. Gameplay Changes
- **Game Modes**: New rules, objectives (Counter-Strike from Half-Life)
- **Game Levels/Campaigns**: New challenges within existing rules
- **Game Paths**: Different routes to same goal (racing tracks, beatmaps)

#### 2. Resource File Changes
- **Objects**: Characters, items, decorations
- **Instruments**: Plugins, tools, modifiers
- **Global Impacts**: Visual (shaders), auditory, physical (controls)

**For ArkAgentic**, we focus on:
- **Level/Campaign creation** (new villages/worlds)
- **Object placement** (buildings, agents, decorations)
- **Path creation** (walkable areas, zones)

---

## Technical Architectures

### Content Architecture Patterns

From [LostGarden's "Designing Game Content Architectures"](https://lostgarden.com/2021/01/04/designing-game-content-architectures/):

#### Lego Block Pattern
> "Embrace composition by building player-facing experiences out of highly reusable standardized content chunks."

**Application to ArkAgentic**:
```
World = Collection of Rooms
Room = Grid of Tiles + Objects + Spawn Points + Zones
Tile = Reference to Tileset (visual) + Collision flag
Object = Reference to Object Definition + Instance Properties
Zone = Polygon/Rectangle + Type (Jitsi, Agent Spawn, Door)
```

#### Template Pattern
> "Reusable structures that have blanks the author can fill in."

**World Templates**:
- "Village" - Town square with 4 agent buildings
- "Office" - Meeting rooms around central hub
- "Campus" - Multiple buildings with outdoor areas
- "Custom" - Blank canvas

#### References Pattern
> "Master object stored in some central location and then an instance of that content is used."

```typescript
// Master definition (stored once)
interface BuildingMaster {
  id: string;
  name: string;
  tilemap: string;  // Reference to tilemap JSON
  size: { width: number; height: number };
  defaultSpawnPoint: { x: number; y: number };
}

// Instance in a world (stored per world)
interface BuildingInstance {
  masterId: string;  // Reference to master
  position: { x: number; y: number };
  rotation: number;
  instanceProperties: {
    assignedAgent?: string;
    customName?: string;
  };
}
```

### Leverage Considerations

| Content Type | Creation Cost | Reuse Potential | Leverage |
|--------------|---------------|-----------------|----------|
| Tileset | High (art) | Very High | High |
| Building Template | Medium | High | High |
| World Layout | Low | Medium | Medium |
| Custom Objects | High | Medium | Medium |
| Zone Definitions | Low | Low | Low |

**Strategy**: Invest heavily in high-leverage assets (tilesets, building templates) that users can compose freely.

---

## Phaser-Specific Implementation

### Modular Tilemaps in Phaser 3

Based on [Michael Hadley's "Modular Game Worlds in Phaser 3"](https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6):

#### Loading Tilemaps from JSON

```typescript
// In LoadingScene
preload() {
  // Load user-created world
  this.load.tilemapTiledJSON('custom-world', worldJsonUrl);
  this.load.image('tileset', tilesetImageUrl);
}

// In WorldScene
create() {
  const map = this.make.tilemap({ key: 'custom-world' });
  const tileset = map.addTilesetImage('tileset-name', 'tileset');
  
  // Create layers
  const groundLayer = map.createLayer('Ground', tileset);
  const objectLayer = map.createLayer('Objects', tileset);
  const collisionLayer = map.createLayer('Collision', tileset);
  
  // Set collision from Tiled properties
  collisionLayer.setCollisionByProperty({ collides: true });
}
```

#### Dynamic Tilemap Manipulation

```typescript
// Allow users to place tiles at runtime
placeTile(x: number, y: number, tileIndex: number) {
  const worldPoint = this.cameras.main.getWorldPoint(x, y);
  const tile = this.map.getTileAtWorldXY(worldPoint.x, worldPoint.y, true, this.editLayer);
  
  if (tile) {
    tile.index = tileIndex;
    this.map.setTileAt(tile.x, tile.y, tileIndex, true, this.editLayer);
  }
}

// Export map to JSON for saving
exportMap(): object {
  return {
    width: this.map.width,
    height: this.map.height,
    tileWidth: this.map.tileWidth,
    tileHeight: this.map.tileHeight,
    layers: this.map.layers.map(layer => ({
      name: layer.name,
      data: layer.data.flat().map(tile => tile?.index ?? -1)
    }))
  };
}
```

### Recommended Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| [Tiled](https://www.mapeditor.org/) | Desktop map editor | Export JSON, import in Phaser |
| [Sprite Fusion](https://www.spritefusion.com/) | Browser-based editor | Direct JSON export |
| [LDtk](https://ldtk.io/) | Modern level editor | JSON export, Phaser plugin |
| Custom In-Game Editor | Simple placement | Built into ArkAgentic |

### In-Game Editor Architecture

```typescript
// EditorScene.ts
export class EditorScene extends Phaser.Scene {
  private currentTool: 'select' | 'tile' | 'object' | 'zone' | 'erase';
  private selectedTileIndex: number;
  private gridOverlay: Phaser.GameObjects.Graphics;
  private undoStack: EditAction[];
  private redoStack: EditAction[];
  
  create() {
    this.setupGrid();
    this.setupToolbar();
    this.setupInput();
    this.setupKeyboardShortcuts();
  }
  
  private setupInput() {
    this.input.on('pointerdown', this.handleClick, this);
    this.input.on('pointermove', this.handleDrag, this);
  }
  
  private handleClick(pointer: Phaser.Input.Pointer) {
    const action = this.createAction(pointer);
    this.executeAction(action);
    this.undoStack.push(action);
    this.redoStack = [];
  }
  
  undo() {
    const action = this.undoStack.pop();
    if (action) {
      this.reverseAction(action);
      this.redoStack.push(action);
    }
  }
}
```

---

## Map Editor Design

### Editor Modes

#### 1. Simple Mode (In-Browser)
For casual users who want to customize their space quickly.

**Features**:
- Drag-and-drop pre-made buildings
- Choose from template layouts
- Place decorations and NPCs
- Define spawn points
- Set world metadata (name, description, thumbnail)

**Constraints**:
- Limited to predefined building types
- Fixed tileset
- Maximum world size (64x64 tiles)
- No custom scripting

#### 2. Advanced Mode (Tiled Integration)
For power users who want full control.

**Features**:
- Full Tiled editor support
- Custom tileset upload
- Multiple layers
- Object properties
- Collision painting
- Zone definitions

**Workflow**:
1. Download ArkAgentic Tiled template
2. Create world in Tiled
3. Export as JSON
4. Upload to ArkAgentic
5. Validation and processing
6. Publish

### World Schema

```typescript
interface UserWorld {
  // Metadata
  id: string;
  name: string;
  description: string;
  author: {
    id: string;
    displayName: string;
  };
  createdAt: Date;
  updatedAt: Date;
  version: number;
  
  // Publishing
  status: 'draft' | 'review' | 'published' | 'rejected';
  visibility: 'private' | 'unlisted' | 'public';
  shareCode: string;  // 8-character unique code
  
  // Statistics
  plays: number;
  likes: number;
  reports: number;
  
  // Content
  thumbnail: string;  // URL
  tilemap: WorldTilemap;
  objects: WorldObject[];
  zones: WorldZone[];
  spawnPoints: SpawnPoint[];
  
  // Settings
  settings: {
    maxPlayers: number;
    allowJitsi: boolean;
    allowAgents: string[];  // Which agents are available
    backgroundMusic?: string;
  };
}

interface WorldTilemap {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  tilesetRef: string;  // Reference to approved tileset
  layers: TilemapLayer[];
}

interface WorldObject {
  id: string;
  type: 'building' | 'decoration' | 'npc' | 'interactive';
  templateRef: string;  // Reference to object template
  position: { x: number; y: number };
  properties: Record<string, any>;
}

interface WorldZone {
  id: string;
  type: 'jitsi' | 'agent-spawn' | 'door' | 'trigger';
  bounds: {
    type: 'rect' | 'polygon';
    points: { x: number; y: number }[];
  };
  properties: Record<string, any>;
}
```

### Validation Rules

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

const VALIDATION_RULES = {
  // Size limits
  MAX_WIDTH: 256,
  MAX_HEIGHT: 256,
  MAX_OBJECTS: 500,
  MAX_ZONES: 100,
  
  // Required elements
  REQUIRED_SPAWN_POINTS: 1,
  REQUIRED_EXIT: 1,
  
  // Content rules
  ALLOWED_TILESETS: ['town', 'dungeon', 'modern', 'nature'],
  MAX_TILESET_SIZE: 2048,  // pixels
  
  // Safety
  BANNED_WORDS: ['...'],
  MAX_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
};

function validateWorld(world: UserWorld): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Size validation
  if (world.tilemap.width > VALIDATION_RULES.MAX_WIDTH) {
    errors.push({ code: 'WIDTH_EXCEEDED', message: 'World too wide' });
  }
  
  // Spawn point validation
  if (world.spawnPoints.length < VALIDATION_RULES.REQUIRED_SPAWN_POINTS) {
    errors.push({ code: 'NO_SPAWN', message: 'At least one spawn point required' });
  }
  
  // Walkability validation
  const walkableArea = calculateWalkableArea(world);
  if (walkableArea < 100) {  // tiles
    warnings.push({ code: 'LIMITED_SPACE', message: 'Very limited walkable area' });
  }
  
  // Check spawn points are reachable
  for (const spawn of world.spawnPoints) {
    if (!isReachable(world, spawn)) {
      errors.push({ code: 'UNREACHABLE_SPAWN', message: 'Spawn point blocked' });
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}
```

---

## Asset & Content Pipeline

### Tileset Management

#### Approved Tilesets (Phase 1)
Start with curated, high-quality tilesets:

| Tileset | Style | Tiles | Source |
|---------|-------|-------|--------|
| Town | Pokemon-style outdoor | 256 | Existing |
| Dungeon | Indoor fantasy | 256 | Existing |
| Modern Office | Contemporary interior | 256 | New |
| Nature | Parks and gardens | 256 | New |
| Tech | Futuristic/cyber | 256 | New |

#### Custom Tileset Upload (Phase 2)

```typescript
interface TilesetUpload {
  image: File;
  tileWidth: number;
  tileHeight: number;
  name: string;
  tags: string[];
}

async function processTilesetUpload(upload: TilesetUpload): Promise<ProcessedTileset> {
  // 1. Validate dimensions
  const img = await loadImage(upload.image);
  if (img.width > 2048 || img.height > 2048) {
    throw new Error('Tileset too large');
  }
  if (img.width % upload.tileWidth !== 0 || img.height % upload.tileHeight !== 0) {
    throw new Error('Image dimensions must be divisible by tile size');
  }
  
  // 2. Content moderation (AI scan)
  const moderationResult = await moderateImage(upload.image);
  if (!moderationResult.safe) {
    throw new Error('Content policy violation');
  }
  
  // 3. Generate optimized versions
  const webp = await convertToWebP(upload.image);
  const thumbnail = await generateThumbnail(upload.image);
  
  // 4. Upload to CDN
  const urls = await uploadToCDN({
    original: upload.image,
    optimized: webp,
    thumbnail
  });
  
  // 5. Create database entry
  return await db.tilesets.create({
    name: upload.name,
    tileWidth: upload.tileWidth,
    tileHeight: upload.tileHeight,
    tilesX: img.width / upload.tileWidth,
    tilesY: img.height / upload.tileHeight,
    urls,
    status: 'pending_review',
    uploadedBy: currentUser.id
  });
}
```

### Object Templates

Pre-built objects users can place:

```typescript
const OBJECT_TEMPLATES = {
  buildings: [
    {
      id: 'agent-office-small',
      name: 'Small Agent Office',
      category: 'buildings',
      size: { width: 3, height: 3 },  // tiles
      tilemap: 'room-small.json',
      defaultAgent: null,  // User assigns
      interactionType: 'enter'
    },
    {
      id: 'meeting-room-4',
      name: 'Meeting Room (4 people)',
      category: 'buildings',
      size: { width: 4, height: 4 },
      tilemap: 'meeting-4.json',
      maxOccupants: 4,
      interactionType: 'jitsi'
    }
  ],
  decorations: [
    { id: 'tree-oak', name: 'Oak Tree', size: { width: 1, height: 2 }, blocking: true },
    { id: 'bench', name: 'Bench', size: { width: 2, height: 1 }, blocking: false },
    { id: 'fountain', name: 'Fountain', size: { width: 2, height: 2 }, blocking: true }
  ],
  npcs: [
    { id: 'villager-male', name: 'Male Villager', sprite: 'villager-m', behavior: 'wander' },
    { id: 'villager-female', name: 'Female Villager', sprite: 'villager-f', behavior: 'wander' }
  ]
};
```

---

## Multiplayer Synchronization

### World State Sync

When multiple players are in a user-created world:

```typescript
// Colyseus Room Schema for Custom Worlds
import { Schema, MapSchema, type } from '@colyseus/schema';

class WorldState extends Schema {
  @type('string') worldId: string;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: ObjectState }) dynamicObjects = new MapSchema<ObjectState>();
}

class PlayerState extends Schema {
  @type('number') x: number;
  @type('number') y: number;
  @type('string') animation: string;
  @type('string') displayName: string;
  @type('string') avatar: string;
}

class ObjectState extends Schema {
  @type('string') objectId: string;
  @type('string') state: string;  // e.g., 'open', 'closed', 'active'
  @type('number') lastInteractedBy: number;
}
```

### World Loading Flow

```typescript
// Client-side world loading
async function loadUserWorld(worldId: string) {
  // 1. Fetch world metadata
  const worldMeta = await api.getWorld(worldId);
  
  // 2. Load required assets
  await preloadWorldAssets(worldMeta);
  
  // 3. Connect to multiplayer room
  const room = await colyseusClient.joinOrCreate('custom-world', {
    worldId,
    playerId: currentUser.id
  });
  
  // 4. Wait for initial state
  await new Promise(resolve => room.onStateChange.once(resolve));
  
  // 5. Initialize scene with world data
  game.scene.start('CustomWorldScene', {
    worldMeta,
    room
  });
}
```

### Handling World Variations

What happens when world author updates their world while players are in it?

```typescript
// Server-side version management
class CustomWorldRoom extends Room<WorldState> {
  private worldVersion: number;
  
  async onJoin(client: Client, options: any) {
    const world = await db.worlds.findById(options.worldId);
    
    // Check if world version matches
    if (this.worldVersion && this.worldVersion !== world.version) {
      // Notify all players of update
      this.broadcast('world-updated', {
        message: 'World has been updated. Reload for latest version.',
        newVersion: world.version
      });
    }
    
    this.worldVersion = world.version;
  }
}
```

---

## Storage & Database Design

### Database Schema

```sql
-- User Worlds
CREATE TABLE user_worlds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  author_id UUID REFERENCES users(id) NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft',
  visibility VARCHAR(20) DEFAULT 'private',
  share_code VARCHAR(8) UNIQUE,
  
  -- Content references
  tilemap_url TEXT NOT NULL,
  thumbnail_url TEXT,
  tileset_id UUID REFERENCES tilesets(id),
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Stats
  plays INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  reports INTEGER DEFAULT 0,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- World content (separate for large data)
CREATE TABLE world_content (
  world_id UUID PRIMARY KEY REFERENCES user_worlds(id),
  tilemap_data JSONB NOT NULL,
  objects JSONB DEFAULT '[]',
  zones JSONB DEFAULT '[]',
  spawn_points JSONB DEFAULT '[]'
);

-- Approved tilesets
CREATE TABLE tilesets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  tile_width INTEGER NOT NULL,
  tile_height INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Approval
  status VARCHAR(20) DEFAULT 'pending',
  uploaded_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  
  -- Usage
  is_default BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- World plays/analytics
CREATE TABLE world_plays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES user_worlds(id) NOT NULL,
  player_id UUID REFERENCES users(id),
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- World likes
CREATE TABLE world_likes (
  world_id UUID REFERENCES user_worlds(id),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id)
);

-- World reports (moderation)
CREATE TABLE world_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES user_worlds(id) NOT NULL,
  reporter_id UUID REFERENCES users(id) NOT NULL,
  reason VARCHAR(50) NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_worlds_author ON user_worlds(author_id);
CREATE INDEX idx_worlds_status ON user_worlds(status, visibility);
CREATE INDEX idx_worlds_share_code ON user_worlds(share_code);
CREATE INDEX idx_worlds_plays ON user_worlds(plays DESC);
CREATE INDEX idx_world_plays_world ON world_plays(world_id);
```

### Storage Strategy

| Content Type | Storage | Reason |
|--------------|---------|--------|
| Tilemap JSON | PostgreSQL (JSONB) | Queryable, versioned |
| Tileset Images | CDN (S3/Cloudflare) | Fast delivery |
| Thumbnails | CDN | Fast delivery |
| World Metadata | PostgreSQL | Queryable |
| Player Sessions | Redis | Fast, ephemeral |

### API Endpoints

```typescript
// World CRUD
POST   /api/worlds                    // Create new world
GET    /api/worlds/:id                // Get world by ID
GET    /api/worlds/code/:shareCode    // Get world by share code
PUT    /api/worlds/:id                // Update world
DELETE /api/worlds/:id                // Delete world (soft)

// Publishing
POST   /api/worlds/:id/publish        // Submit for review
POST   /api/worlds/:id/unpublish      // Remove from public

// Discovery
GET    /api/worlds                    // List public worlds
GET    /api/worlds/featured           // Featured/curated worlds
GET    /api/worlds/popular            // Most played
GET    /api/worlds/recent             // Recently published
GET    /api/worlds/search?q=          // Search worlds

// Interactions
POST   /api/worlds/:id/play           // Record play session
POST   /api/worlds/:id/like           // Like world
DELETE /api/worlds/:id/like           // Unlike world
POST   /api/worlds/:id/report         // Report world

// Assets
POST   /api/tilesets                  // Upload tileset
GET    /api/tilesets                  // List approved tilesets
GET    /api/object-templates          // List object templates
```

---

## Moderation & Safety

### Automated Moderation

```typescript
interface ModerationPipeline {
  // Text moderation
  checkText(text: string): Promise<{
    safe: boolean;
    flags: string[];
  }>;
  
  // Image moderation
  checkImage(imageUrl: string): Promise<{
    safe: boolean;
    flags: string[];
    confidence: number;
  }>;
  
  // World structure validation
  checkWorldStructure(world: UserWorld): Promise<{
    valid: boolean;
    issues: string[];
  }>;
}

// Implementation
const moderationPipeline: ModerationPipeline = {
  async checkText(text: string) {
    // Use perspective API or similar
    const result = await perspectiveApi.analyze(text);
    return {
      safe: result.toxicity < 0.7,
      flags: result.categories.filter(c => c.score > 0.5).map(c => c.name)
    };
  },
  
  async checkImage(imageUrl: string) {
    // Use Google Vision, AWS Rekognition, or similar
    const result = await visionApi.safeSearch(imageUrl);
    return {
      safe: result.adult !== 'LIKELY' && result.violence !== 'LIKELY',
      flags: Object.entries(result).filter(([_, v]) => v === 'LIKELY').map(([k]) => k),
      confidence: result.confidence
    };
  },
  
  async checkWorldStructure(world: UserWorld) {
    const issues: string[] = [];
    
    // Check for trap designs (no exit)
    if (!hasReachableExit(world)) {
      issues.push('No reachable exit from spawn');
    }
    
    // Check for offensive patterns in layout
    // (e.g., swastikas made from tiles)
    const patternCheck = await checkOffensivePatterns(world.tilemap);
    if (patternCheck.found) {
      issues.push(`Offensive pattern detected: ${patternCheck.type}`);
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
};
```

### Human Review Queue

```typescript
// Review workflow
const REVIEW_STATES = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  APPEALED: 'appealed'
};

interface ReviewDecision {
  worldId: string;
  reviewerId: string;
  decision: 'approve' | 'reject';
  reason?: string;
  notes?: string;
}

async function submitForReview(worldId: string) {
  const world = await db.worlds.findById(worldId);
  
  // Run automated checks first
  const autoResult = await runAutomatedChecks(world);
  
  if (!autoResult.passed) {
    return {
      success: false,
      errors: autoResult.errors,
      message: 'Please fix issues before submitting'
    };
  }
  
  // Add to review queue
  await db.worlds.update(worldId, {
    status: REVIEW_STATES.PENDING,
    submittedAt: new Date()
  });
  
  // If auto-moderation confidence is high, auto-approve
  if (autoResult.confidence > 0.95) {
    await approveWorld(worldId, 'system');
  }
  
  return { success: true };
}
```

### Content Guidelines

```markdown
## World Creation Guidelines

### Allowed
- Creative town layouts and designs
- Custom agent workspaces
- Meeting and collaboration spaces
- Decorative elements
- Puzzle or maze-like areas (with solution)

### Not Allowed
- Offensive symbols or imagery
- Worlds designed to trap players
- Inappropriate text content
- Copyright-infringing content
- Exploitative or harmful mechanics

### Recommendations
- Ensure clear pathways between areas
- Test your world before publishing
- Add helpful signs or indicators
- Consider accessibility
```

---

## Monetization Considerations

### Free Tier
- Create up to 3 worlds
- 64x64 max world size
- Default tilesets only
- Basic sharing (share code)

### Premium Tier ($9.99/month)
- Unlimited worlds
- 256x256 max world size
- Custom tileset upload
- Featured placement opportunity
- Advanced analytics
- Priority moderation review

### Creator Monetization (Future)
- Tip jar for popular worlds
- Premium world access (users pay to play)
- Asset marketplace (sell custom objects)
- Revenue share from featured worlds

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Database schema for user worlds
- [ ] World JSON format specification
- [ ] Basic world loading in game
- [ ] World validation system
- [ ] API endpoints for CRUD

### Phase 2: Simple Editor (Weeks 5-8)
- [ ] In-browser drag-and-drop editor
- [ ] Template-based world creation
- [ ] Object placement tools
- [ ] Spawn point and zone definition
- [ ] Preview and test mode

### Phase 3: Sharing & Discovery (Weeks 9-12)
- [ ] Share code generation
- [ ] World browser/gallery
- [ ] Search and filtering
- [ ] Like and play tracking
- [ ] Basic moderation queue

### Phase 4: Advanced Editor (Weeks 13-16)
- [ ] Tiled integration guide
- [ ] Custom tileset upload
- [ ] Advanced zone editing
- [ ] Multiple layers support
- [ ] Version history

### Phase 5: Multiplayer Worlds (Weeks 17-20)
- [ ] Custom world room handling
- [ ] State synchronization
- [ ] Dynamic object support
- [ ] World-specific agents
- [ ] Cross-world navigation

### Phase 6: Community Features (Weeks 21-24)
- [ ] Featured worlds curation
- [ ] Creator profiles
- [ ] World collections
- [ ] Comments and feedback
- [ ] Events and competitions

---

## References

### Academic Research
- [User-Generated Content and Editors in Games: A Comprehensive Survey (arXiv:2412.13743)](https://arxiv.org/html/2412.13743v1) - Comprehensive UGC classification framework
- [Designing Game Content Architectures (LostGarden)](https://lostgarden.com/2021/01/04/designing-game-content-architectures/) - Content pipeline design patterns

### Phaser Resources
- [Modular Game Worlds in Phaser 3 (Part 1)](https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6) - Tilemap fundamentals
- [Modular Game Worlds in Phaser 3 (Part 2)](https://itnext.io/modular-game-worlds-in-phaser-3-tilemaps-2-dynamic-platformer-3d68e73d494a) - Dynamic tilemaps
- [Modular Game Worlds in Phaser 3 (Part 3)](https://itnext.io/modular-game-worlds-in-phaser-3-tilemaps-3-procedural-dungeon-3bc19b841cd) - Procedural generation

### Tools
- [Tiled Map Editor](https://www.mapeditor.org/) - Open source level editor
- [LDtk](https://ldtk.io/) - Modern level design toolkit
- [Sprite Fusion](https://www.spritefusion.com/) - Browser-based tilemap editor

### Platform Case Studies
- [Roblox Technical Architecture](https://medium.com/@lex.sokolin/sizing-up-roblox-minecraft-and-fortnite-8e7bac7d6c3c)
- [Fortnite Creative / UEFN](https://dev.epicgames.com/documentation/en-us/fortnite)
- [Super Mario Maker Design Analysis](https://www.gamedeveloper.com/design/the-design-of-super-mario-maker)

---

*Document created: January 2026*
*Status: Research & Planning Phase*
*Next Steps: Review with team, prioritize Phase 1 tasks*
