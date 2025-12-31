# AgentVerse Sprite & Map Development Guide

## Quick Reference

### Sprite Specifications

| Sprite | Dimensions | Frame Size | Frame Count | Notes |
|--------|-----------|------------|-------------|-------|
| archie.png | 192x20 | 16x20 | 12 | Scout agent |
| birch.png | 192x20 | 16x20 | 12 | Chronicle agent |
| maxie.png | 192x20 | 16x20 | 12 | Trends agent |
| steven.png | 192x21 | 16x21 | 12 | Sage agent |
| may.png | 168x20 | 14x20 | 12 | Maven agent (narrower!) |
| brendan.png | 168x21 | 14x21 | 12 | Player sprite |
| joseph.png | 168x21 | 14x21 | 12 | Extra NPC |

### Animation Frame Layout (All Sprites)
```
Frame 0-2:  DOWN  (front facing, walking toward camera)
Frame 3-5:  UP    (back facing, walking away from camera)
Frame 6-8:  LEFT  (side view, walking left)
Frame 9-11: RIGHT (side view, walking right)
```

### Tileset Specifications
- **File**: `public/assets/tilemaps/tiles/tileset.png`
- **Dimensions**: 128x15968 pixels
- **Tile Size**: 16x16 pixels
- **Columns**: 8 tiles per row
- **Total Tiles**: 7984

### Town Map Specifications
- **File**: `public/assets/tilemaps/json/town.json`
- **Size**: 48x35 tiles (768x560 pixels)
- **Tile Size**: 16x16 pixels
- **Layers**: ground, wall, tree, house, flower, location (objects), npcs (objects)

---

## Loading Sprites in Phaser

### In LoadingScene.ts
```typescript
// Define frame sizes for each sprite
const spriteSizes: Record<string, { width: number; height: number }> = {
  archie: { width: 16, height: 20 },
  birch: { width: 16, height: 20 },
  maxie: { width: 16, height: 20 },
  steven: { width: 16, height: 21 },
  may: { width: 14, height: 20 },      // Narrower!
  brendan: { width: 14, height: 21 },
  joseph: { width: 14, height: 21 },
};

// Load spritesheet
this.load.spritesheet('archie', 'assets/sprites/archie.png', {
  frameWidth: 16,
  frameHeight: 20,
});
```

### Creating Animations in Actor.ts
```typescript
initAnimations(): void {
  // DOWN animation (frames 0-2)
  this.scene.anims.create({
    key: this.name + '-walk-down',
    frames: this.scene.anims.generateFrameNumbers(this.texture.key, {
      start: 0,
      end: 2,
    }),
    frameRate: 8,
    repeat: -1,
  });

  // UP animation (frames 3-5)
  this.scene.anims.create({
    key: this.name + '-walk-up',
    frames: this.scene.anims.generateFrameNumbers(this.texture.key, {
      start: 3,
      end: 5,
    }),
    frameRate: 8,
    repeat: -1,
  });

  // LEFT animation (frames 6-8)
  this.scene.anims.create({
    key: this.name + '-walk-left',
    frames: this.scene.anims.generateFrameNumbers(this.texture.key, {
      start: 6,
      end: 8,
    }),
    frameRate: 8,
    repeat: -1,
  });

  // RIGHT animation (frames 9-11)
  this.scene.anims.create({
    key: this.name + '-walk-right',
    frames: this.scene.anims.generateFrameNumbers(this.texture.key, {
      start: 9,
      end: 11,
    }),
    frameRate: 8,
    repeat: -1,
  });
}
```

---

## CSS Sprite Animation (for UI)

### For 16px-wide sprites (archie, birch, maxie, steven)
```css
.agent-sprite {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  width: 32px;              /* 16 * 2 = 32 (2x scale) */
  height: 40px;             /* 20 * 2 = 40 */
  background-size: 384px 40px;  /* 192 * 2 = 384 */
  background-repeat: no-repeat;
  background-position: 0 0;
  animation: sprite-walk-16 0.5s steps(3) infinite;
}

@keyframes sprite-walk-16 {
  from { background-position: 0 0; }
  to { background-position: -96px 0; }  /* 3 frames * 32px = 96px */
}
```

### For 14px-wide sprites (may, brendan, joseph)
```css
.agent-sprite.sprite-14 {
  width: 28px;              /* 14 * 2 = 28 */
  height: 40px;             /* 20 * 2 = 40 */
  background-size: 336px 40px;  /* 168 * 2 = 336 */
  animation: sprite-walk-14 0.5s steps(3) infinite;
}

@keyframes sprite-walk-14 {
  from { background-position: 0 0; }
  to { background-position: -84px 0; }  /* 3 frames * 28px = 84px */
}
```

### Scale Reference
| Scale | 16px sprite | 14px sprite | Use Case |
|-------|-------------|-------------|----------|
| 1x | 16x20 / 16x21 | 14x20 / 14x21 | Original |
| 2x | 32x40 / 32x42 | 28x40 / 28x42 | UI Cards |
| 3x | 48x60 / 48x63 | 42x60 / 42x63 | Larger UI |
| 4x | 64x80 / 64x84 | 56x80 / 56x84 | Modal/Detail |

---

## Map Layers

### Layer Structure (bottom to top)
1. **ground** - Base grass/path tiles (always visible)
2. **wall** - Fence/barrier tiles (collision)
3. **tree** - Tree/bush decorations (collision)
4. **house** - Building tiles (collision)
5. **flower** - Decorative flowers (no collision)
6. **location** - Object layer with named areas
7. **npcs** - Object layer with NPC spawn points

### Location Objects (from town.json)
| Name | Position | Size |
|------|----------|------|
| Bike Store | (195, 420) | 57x41 |
| Pokemon Center | (323, 277) | 75x23 |
| Pokemon Gym | (465, 306) | 77x28 |
| Shop | (435, 418) | 59x27 |
| Park | (195, 276) | 73x40 |

### NPC Spawn Points
| Name | Position | ID |
|------|----------|-----|
| May | (208, 240) | 0 |
| Birch | (240, 240) | 1 |
| Steven | (480, 304) | 2 |
| Maxie | (336, 272) | 3 |
| Archie | (449, 416) | 4 |
| Joseph | (224, 416) | 5 |

---

## Creating Interior Rooms

### Room Scene Structure
```typescript
export class RoomScene extends Scene {
  private roomId: string;
  private ownerAgent: string;
  
  constructor() {
    super('room-scene');
  }

  init(data: { roomId: string; agent: string }) {
    this.roomId = data.roomId;
    this.ownerAgent = data.agent;
  }

  preload(): void {
    // Load room-specific tilemap
    this.load.tilemapTiledJSON(
      `room-${this.roomId}`,
      `assets/tilemaps/json/rooms/${this.roomId}.json`
    );
  }

  create(): void {
    // Create room tilemap
    // Add interactive objects
    // Place agent owner sprite
  }
}
```

### Door Interaction Pattern
```typescript
// In TownScene - detect door click
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  const tile = this.map.getTileAtWorldXY(worldPoint.x, worldPoint.y, true, this.cameras.main, 'house');
  
  if (tile && this.isDoorTile(tile)) {
    const buildingId = this.getBuildingId(tile);
    this.transitionToRoom(buildingId);
  }
});

// Transition with loading animation
private transitionToRoom(buildingId: string): void {
  // Show retro loading screen
  this.showLoadingTransition(() => {
    this.scene.start('room-scene', { 
      roomId: buildingId,
      agent: this.getBuildingOwner(buildingId)
    });
  });
}
```

### Retro Loading Animation (CSS)
```css
#retro-loading {
  position: fixed;
  inset: 0;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-dots {
  display: flex;
  gap: 8px;
}

.loading-dots span {
  width: 12px;
  height: 12px;
  background: #fff;
  animation: blink 1s steps(1) infinite;
}

.loading-dots span:nth-child(2) { animation-delay: 0.33s; }
.loading-dots span:nth-child(3) { animation-delay: 0.66s; }

@keyframes blink {
  0%, 50% { opacity: 1; }
  50.1%, 100% { opacity: 0; }
}
```

---

## Agent-Building Mapping

| Agent | Building | Interior Theme |
|-------|----------|----------------|
| Scout (archie) | Shop | Research lab, computers, data screens |
| Sage (steven) | Pokemon Gym | Library, strategy boards, analysis tools |
| Chronicle (birch) | Pokemon Center | Newsroom, printing press, articles |
| Trends (maxie) | Bike Store | Monitors, trend graphs, social feeds |
| Maven (may) | Park (outdoor) | Garden, relaxation, general help desk |

---

## Best Practices

### Sprite Animation
1. Always use `image-rendering: pixelated` for crisp pixel art
2. Use integer scale factors (2x, 3x, 4x) to avoid blur
3. Match `steps(N)` to frame count in animation
4. Calculate background-position shifts: `frameWidth * scale * frameCount`

### Map Design
1. Keep collision simple - use wall layer for barriers
2. Door tiles should be identifiable (specific tile IDs)
3. Use object layers for interactive zones
4. Match agent spawn points to their assigned buildings

### Scene Transitions
1. Always show loading indicator for map changes
2. Preserve agent state during transitions
3. Use fade/wipe effects for retro feel
4. Allow ESC or back button to return to town

### Performance
1. Don't load all room maps at once - lazy load on entry
2. Unload room assets when returning to town
3. Keep room sizes reasonable (16x16 to 24x24 tiles)
4. Use sprite atlases for room-specific items
