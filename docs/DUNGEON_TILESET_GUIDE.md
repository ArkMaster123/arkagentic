# Dungeon Tileset Guide (0x72 DungeonTileset II v1.7)

This guide documents how to use the dungeon tileset for creating room interiors in AgentVerse.

## Tileset Info

- **Source**: [0x72 DungeonTileset II](https://0x72.itch.io/dungeontileset-ii)
- **License**: CC0 (Public Domain - free for any use)
- **Image**: `public/assets/tilemaps/tiles/dungeon/0x72_DungeonTilesetII_v1.7.png`
- **Size**: 512x512 pixels
- **Tile Size**: 16x16 pixels
- **Grid**: 32 columns x 32 rows = 1024 tiles max

## Room Dimensions

| Property | Town | Rooms |
|----------|------|-------|
| Width (tiles) | 48 | 24 |
| Height (tiles) | 35 | 17 |
| Width (pixels) | 768 | 384 |
| Height (pixels) | 560 | 272 |

Rooms are exactly **half the size** of the town map.

---

## Tile ID Calculation

Tile IDs in Tiled JSON are **1-based** (first tile = 1, not 0).

```
Tile ID = (row * 32) + column + 1
```

Where:
- `row` = y_position / 16
- `column` = x_position / 16

---

## Key Tile IDs Reference

### Floor Tiles (Row 4-6, starting at y=64)

| Tile Name | Position (x,y) | Tile ID | Description |
|-----------|----------------|---------|-------------|
| floor_1 | 16, 64 | **130** | Stone floor variant 1 |
| floor_2 | 32, 64 | **131** | Stone floor variant 2 |
| floor_3 | 48, 64 | **132** | Stone floor variant 3 |
| floor_4 | 16, 80 | **162** | Stone floor variant 4 |
| floor_5 | 32, 80 | **163** | Stone floor variant 5 |
| floor_6 | 48, 80 | **164** | Stone floor variant 6 |
| floor_7 | 16, 96 | **194** | Stone floor variant 7 |
| floor_8 | 32, 96 | **195** | Stone floor variant 8 |
| floor_ladder | 48, 96 | **196** | Floor with ladder |
| floor_stairs | 80, 192 | **390** | Floor with stairs |

### Wall Tiles (Rows 0-1)

| Tile Name | Position (x,y) | Tile ID | Description |
|-----------|----------------|---------|-------------|
| wall_top_left | 16, 0 | **2** | Top-left corner |
| wall_top_mid | 32, 0 | **3** | Top wall (use for north walls) |
| wall_top_right | 48, 0 | **4** | Top-right corner |
| wall_left | 16, 16 | **34** | Left wall facing |
| wall_mid | 32, 16 | **35** | Middle wall (brick pattern) |
| wall_right | 48, 16 | **36** | Right wall facing |

### Wall Decorations (Row 2-3)

| Tile Name | Position (x,y) | Tile ID | Description |
|-----------|----------------|---------|-------------|
| wall_banner_red | 16, 32 | **66** | Red banner on wall |
| wall_banner_blue | 32, 32 | **67** | Blue banner on wall |
| wall_banner_green | 16, 48 | **98** | Green banner on wall |
| wall_banner_yellow | 32, 48 | **99** | Yellow banner on wall |
| wall_hole_1 | 48, 32 | **68** | Wall with hole |
| wall_hole_2 | 48, 48 | **100** | Wall with hole variant |

### Animated Fountain (Row 1-4, x=64-96)

| Tile Name | Position (x,y) | Tile ID | Description |
|-----------|----------------|---------|-------------|
| wall_fountain_top_1 | 64, 0 | **5** | Fountain top left |
| wall_fountain_top_2 | 80, 0 | **6** | Fountain top mid |
| wall_fountain_top_3 | 96, 0 | **7** | Fountain top right |
| wall_fountain_mid_red_f0 | 64, 16 | **37** | Red fountain (frame 0) |
| wall_fountain_mid_red_f1 | 80, 16 | **38** | Red fountain (frame 1) |
| wall_fountain_mid_red_f2 | 96, 16 | **39** | Red fountain (frame 2) |
| wall_fountain_basin_red_f0 | 64, 32 | **69** | Red basin (frame 0) |
| wall_fountain_mid_blue_f0 | 64, 48 | **101** | Blue fountain (frame 0) |
| wall_fountain_basin_blue_f0 | 64, 64 | **133** | Blue basin (frame 0) |

### Interactive Objects

| Tile Name | Position (x,y) | Tile ID | Description |
|-----------|----------------|---------|-------------|
| crate | 288, 408 | **819** | Wooden crate (16x24) |
| chest_empty_f0 | 304, 400 | **820** | Empty chest |
| chest_full_f0 | 304, 416 | **852** | Full treasure chest |
| chest_mimic_f0 | 304, 432 | **884** | Mimic chest |
| skull | 288, 432 | **883** | Skull decoration |
| column | 80, 80 | **166** | Stone column (16x48) |
| column_wall | 96, 80 | **167** | Wall-attached column |

### Floor Hazards & Mechanics

| Tile Name | Position (x,y) | Tile ID | Description |
|-----------|----------------|---------|-------------|
| floor_spikes_f0 | 16, 192 | **386** | Spikes retracted |
| floor_spikes_f1 | 32, 192 | **387** | Spikes emerging |
| floor_spikes_f2 | 48, 192 | **388** | Spikes half out |
| floor_spikes_f3 | 64, 192 | **389** | Spikes fully out |
| hole | 96, 144 | **294** | Pit/hole in floor |
| lever_left | 80, 208 | **422** | Lever (left position) |
| lever_right | 96, 208 | **423** | Lever (right position) |
| button_red_up | 16, 208 | **418** | Red button (up) |
| button_red_down | 32, 208 | **419** | Red button (pressed) |
| button_blue_up | 48, 208 | **420** | Blue button (up) |
| button_blue_down | 64, 208 | **421** | Blue button (pressed) |

### Doors (Row 14-16, x=16-112)

| Tile Name | Position (x,y) | Tile ID | Size | Description |
|-----------|----------------|---------|------|-------------|
| doors_frame_left | 16, 240 | **482** | 16x32 | Door frame left |
| doors_frame_right | 64, 240 | **484** | 16x32 | Door frame right |
| doors_frame_top | 32, 224 | **450** | 32x16 | Door frame top |
| doors_leaf_closed | 32, 240 | **483** | 32x32 | Closed door |
| doors_leaf_open | 80, 240 | **486** | 32x32 | Open door |

### Wall Edge Pieces (for complex corners)

| Tile Name | Position (x,y) | Tile ID | Description |
|-----------|----------------|---------|-------------|
| wall_edge_top_left | 31, 120 | **249** | Edge corner TL |
| wall_edge_top_right | 48, 120 | **250** | Edge corner TR |
| wall_edge_left | 32, 136 | **281** | Edge left |
| wall_edge_right | 48, 136 | **282** | Edge right |
| wall_edge_bottom_left | 32, 168 | **346** | Edge corner BL |
| wall_edge_bottom_right | 48, 168 | **347** | Edge corner BR |

---

## Room JSON Structure

```json
{
  "compressionlevel": -1,
  "height": 17,
  "width": 24,
  "tileheight": 16,
  "tilewidth": 16,
  "orientation": "orthogonal",
  "renderorder": "right-down",
  "type": "map",
  "version": "1.10",
  "tiledversion": "1.10.1",
  "nextlayerid": 5,
  "nextobjectid": 11,
  "infinite": false,
  "tilesets": [
    {
      "columns": 32,
      "firstgid": 1,
      "image": "../tiles/dungeon/0x72_DungeonTilesetII_v1.7.png",
      "imageheight": 512,
      "imagewidth": 512,
      "margin": 0,
      "name": "dungeon",
      "spacing": 0,
      "tilecount": 1024,
      "tileheight": 16,
      "tilewidth": 16
    }
  ],
  "layers": [
    { "name": "floor", "type": "tilelayer", "data": [...] },
    { "name": "walls", "type": "tilelayer", "data": [...] },
    { "name": "furniture", "type": "tilelayer", "data": [...] },
    { "name": "objects", "type": "objectgroup", "objects": [...] }
  ]
}
```

---

## Layer Structure

### 1. Floor Layer (id: 1)
- Fill entire 24x17 grid with floor tiles
- Alternate between floor_1 (130) and floor_2 (131) for variety
- Use 0 for transparent/no tile

### 2. Walls Layer (id: 2)
- Top row: wall_top_mid (3) with banners (66, 67)
- Second row: wall_mid (35) - the brick pattern
- Side walls: wall_left (34) and wall_right (36)
- Bottom row: wall_mid (35) with gap for exit
- Interior: 0 (transparent)

### 3. Furniture Layer (id: 3)
- Place interactive objects: crates (819), chests (852)
- Decorative items: skulls (883), columns
- Use 0 for empty spaces

### 4. Objects Layer (id: 4)
- Type: `objectgroup`
- Contains interactive hitboxes and spawn points

---

## Object Types

### Interactive Object
```json
{
  "id": 1,
  "name": "Treasure Chest",
  "type": "interactive",
  "x": 80,
  "y": 32,
  "width": 16,
  "height": 16,
  "properties": [
    { "name": "action", "type": "string", "value": "chest" },
    { "name": "message", "type": "string", "value": "You found treasure!" }
  ]
}
```

### Spawn Point
```json
{
  "id": 9,
  "name": "spawn",
  "type": "spawn",
  "point": true,
  "x": 192,
  "y": 140
}
```

### Exit Zone
```json
{
  "id": 10,
  "name": "exit",
  "type": "exit",
  "x": 160,
  "y": 256,
  "width": 64,
  "height": 16
}
```

---

## Basic Room Template

Here's a minimal 24x17 room:

```
Row 0:  [corners + top wall with banners]
Row 1:  [left wall] [brick wall row] [right wall]
Row 2-15: [left wall] [empty floor] [right wall]  
Row 16: [bottom wall with exit gap in center]
```

### Floor Pattern (checkerboard)
```javascript
// Generate alternating floor
for (let y = 0; y < 17; y++) {
  for (let x = 0; x < 24; x++) {
    floor[y * 24 + x] = (x + y) % 2 === 0 ? 130 : 131;
  }
}
```

### Wall Pattern
```javascript
// Top row - decorative wall tops
walls[0] = 2; // corner
for (let x = 1; x < 23; x++) walls[x] = 3; // top
walls[23] = 2; // corner

// Second row - brick wall
walls[24] = 34; // left
for (let x = 1; x < 23; x++) walls[24 + x] = 35; // brick
walls[47] = 36; // right

// Middle rows - just side walls
for (let y = 2; y < 16; y++) {
  walls[y * 24] = 34;      // left
  walls[y * 24 + 23] = 36; // right
}

// Bottom row - wall with exit gap
walls[16 * 24] = 2;
for (let x = 1; x < 10; x++) walls[16 * 24 + x] = 35;
// gap at x=10-13 (exit)
for (let x = 14; x < 23; x++) walls[16 * 24 + x] = 35;
walls[16 * 24 + 23] = 2;
```

---

## Animated Tiles

The tileset includes animated tiles stored as separate frames in `frames/` folder:

### Fountain Animation (3 frames each)
- `wall_fountain_mid_red_anim_f0/f1/f2`
- `wall_fountain_mid_blue_anim_f0/f1/f2`
- `wall_fountain_basin_red_anim_f0/f1/f2`
- `wall_fountain_basin_blue_anim_f0/f1/f2`

### Chest Animation (3 frames)
- `chest_empty_open_anim_f0/f1/f2`
- `chest_full_open_anim_f0/f1/f2`
- `chest_mimic_open_anim_f0/f1/f2`

### Spike Trap (4 frames)
- `floor_spikes_anim_f0/f1/f2/f3`

To animate in Phaser, load the frames folder sprites and create animations.

---

## Character Sprites

The tileset also includes character sprites in the `frames/` folder:

### Heroes (16x28 each, 4 idle + 4 run frames)
- Knight (male/female): `knight_m_*`, `knight_f_*`
- Elf (male/female): `elf_m_*`, `elf_f_*`
- Wizard (male/female): `wizzard_m_*`, `wizzard_f_*`
- Lizard (male/female): `lizard_m_*`, `lizard_f_*`
- Dwarf (male/female): `dwarf_m_*`, `dwarf_f_*`

### Monsters (various sizes)
- **Small (16x16)**: tiny_zombie, goblin, imp, skelet, angel
- **Medium (16x23)**: masked_orc, orc_warrior, orc_shaman, wogol, chort, necromancer, slug
- **Large (32x36)**: big_zombie, big_demon, ogre

---

## File Locations

```
public/assets/tilemaps/
├── json/
│   ├── town.json          # Main town map (48x35)
│   ├── room-scout.json    # Scout's Research Lab (24x17)
│   ├── room-sage.json     # Sage's Strategy Room (24x17)
│   ├── room-chronicle.json # Chronicle's Newsroom (24x17)
│   ├── room-trends.json   # Trends' Intelligence Hub (24x17)
│   └── room-maven.json    # Maven's Welcome Center (24x17)
└── tiles/
    ├── tileset.png        # Town tileset (outdoor)
    └── dungeon/
        ├── 0x72_DungeonTilesetII_v1.7.png  # Main tileset
        ├── atlas_floor-16x16.png           # Autotile floors
        ├── atlas_walls_high-16x32.png      # Autotile walls (tall)
        ├── atlas_walls_low-16x16.png       # Autotile walls (short)
        ├── frames/                          # Individual sprites
        └── tile_list_v1.7                   # Sprite coordinates
```

---

## Quick Reference Card

| Element | Tile ID(s) |
|---------|-----------|
| Floor (alternate) | 130, 131 |
| Wall top | 3 |
| Wall brick | 35 |
| Wall left | 34 |
| Wall right | 36 |
| Corner | 2 |
| Banner red | 66 |
| Banner blue | 67 |
| Crate | 819 |
| Chest (full) | 852 |
| Skull | 883 |
| Empty/transparent | 0 |
