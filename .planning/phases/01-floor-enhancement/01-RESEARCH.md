# Phase 1: Floor Enhancement - Research

**Researched:** 2026-02-05
**Domain:** Tilemap floor design, zone differentiation, stone floor patterns
**Confidence:** HIGH

## Summary

This research investigates how to transform the ChatbotRuins museum's monotonous checkerboard floor into distinct visual zones using only the stone tileset (GIDs 65-128). The current implementation uses a repetitive pattern of just 5 tile types (69, 70, 77, 78 for decoration + 74 as base), creating a uniform feel across the entire 40x30 tile space.

The stone tileset provides 64 tiles with distinct functional categories: edge/border pieces (65-67, 73, 75, 81-83), plain center tiles (74), decorated 2x2 patterns (69-70, 77-78), large stone blocks (68, 76, 84), hollow frames (89-96 region), and cross/intersection patterns (97-104 region). By strategically assigning different tile combinations to different museum zones, we can create visual variety while maintaining the cohesive stone aesthetic.

**Primary recommendation:** Use edge tiles (65-67, 73, 75, 81-83) to define zone boundaries, reserve the current 2x2 dot pattern (69-70, 77-78) for side galleries only, introduce hollow frame tiles for the ceremonial center, and use plain tile 74 with scattered large stone blocks (68, 76) for transition areas and worn corners.

## Standard Stack

This phase requires no external libraries - it's pure JSON data manipulation.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| JSON editing | N/A | Direct tilemap modification | Precise control over tile placement |
| Text editor | Any | Edit room-chatbotruins.json | No intermediate tooling needed |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Tiled (optional) | 1.10+ | Visual verification | Only if visual preview needed |
| Image viewer | Any | Reference TX Tileset Stone Ground.png | When identifying tile appearance |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct JSON | Tiled editor | Tiled is visual but slower for known edits |
| Manual calculation | Script | Script overkill for one-time zone fills |

## Architecture Patterns

### Tile GID Reference Map (Stone Tileset)

```
Stone Tileset: TX Tileset Stone Ground.png
firstgid = 65, 8 columns, 8 rows (64 tiles total)
GID Formula: 65 + (row * 8) + column

Visual Layout (8x8 grid):
Row 0: [65][66][67][68][69][70][71][72]
        TL  T   TR  LG  D1  D2  --  --

Row 1: [73][74][75][76][77][78][79][80]
        L   C   R   LG  D3  D4  --  --

Row 2: [81][82][83][84][85][86][87][88]
        BL  B   BR  --  --  --  --  --

Row 3: [89][90][91][92][93][94][95][96]
        HF  HF  HF  --  --  --  --  --

Row 4: [97][98][99][100][101][102][103][104]
        CR  CR  CR  CR   --   --   --   --

Rows 5-7: Additional patterns (105-128)

Legend:
TL/T/TR = Top-left/Top/Top-right corner/edge
L/C/R = Left/Center/Right edge
BL/B/BR = Bottom-left/Bottom/Bottom-right corner/edge
LG = Large stone block (part of 2x2)
D1-D4 = Decorated dot pattern (2x2 set)
HF = Hollow frame pieces
CR = Cross/intersection pieces
```

### Recommended Zone Structure

```
Map Layout (40 wide x 30 tall):

Rows 0-1: Wall/border (no floor editing)
Rows 2-9: NORTH SANCTUARY (oldest, most worn)
Rows 10-25: CENTRAL HALL (ceremonial center)
Rows 26-27: TRANSITION to entry
Rows 28-29: ENTRY ZONE (welcoming)
Row 29: Exit row (maintain current floor)

Columns:
0: Wall (no editing)
1-12: WEST WING (gallery)
13-27: CENTER (main hall + statue area)
28-38: EAST WING (gallery)
39: Wall (no editing)
```

### Pattern 1: Zone Border Definition
**What:** Use edge tiles to create subtle visual boundaries between zones
**When to use:** Transitions between entry/hall, hall/sanctuary, wing boundaries
**Example:**
```
Zone border using top edge (66) and corners (65, 67):

Before (uniform):
[74][74][74][74][74]
[74][74][74][74][74]

After (bordered zone):
[65][66][66][66][67]  <- Border row
[73][74][74][74][75]  <- Zone interior with side edges
[73][74][74][74][75]
[81][82][82][82][83]  <- Bottom border
```

### Pattern 2: Ceremonial Center (ChatGPT Statue Area)
**What:** Create distinctive floor around central statue using hollow frame tiles
**When to use:** Rows 10-13, columns 17-23 (around the 3x3 statue at 18-20, 10-12)
**Example:**
```
Statue floor treatment (conceptual):

Using hollow frame tiles from row 3 (89-96):
[74][89][90][90][91][74]
[74][xx][SS][SS][xx][74]  <- SS = statue tiles (props layer)
[74][xx][SS][SS][xx][74]
[74][93][94][94][95][74]

Where 89=TL frame, 90=T frame, 91=TR frame
      93=BL frame, 94=B frame, 95=BR frame
```

### Pattern 3: Worn/Aged Corners
**What:** Use plain tiles with scattered large stone blocks for "ancient" feel
**When to use:** North sanctuary corners, side wing corners
**Example:**
```
Worn corner (northwest, rows 2-5, cols 1-4):

[74][74][68][76]  <- Large stone block (2x2)
[74][74][84][xx]  <- Continuation or plain
[74][74][74][74]
[74][68][76][74]  <- Another scattered block
```

### Pattern 4: Gallery Wing Floors
**What:** Reduced checkerboard frequency with more plain tiles
**When to use:** Side wings (cols 1-12 and 28-38)
**Example:**
```
Current gallery (too busy):
[69][70][74][69][70]
[77][78][74][77][78]

Improved gallery (sparser):
[74][74][74][74][74]
[74][69][70][74][74]
[74][77][78][74][74]
[74][74][74][74][74]
```

### Anti-Patterns to Avoid
- **Uniform zone boundaries:** Don't make every zone edge identical; vary corner usage
- **Perfect symmetry:** Some asymmetry suggests natural wear and ruins aesthetic
- **Overusing decorated tiles:** The current problem; reserve dots for galleries only
- **Blocking walkways:** Ensure 2+ tile clear paths between exhibits

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zone fill scripts | Custom Python/JS zone filler | Manual JSON editing | Only 1200 tiles, manual is faster for one-time |
| Tile calculators | GID calculation scripts | Reference table above | Formula is simple: 65 + row*8 + col |
| Visual preview | Custom renderer | Load game or Tiled | Game itself is the preview tool |
| Pattern templates | Reusable zone templates | Copy-paste within JSON | Each zone is unique |

**Key insight:** This is a one-time visual enhancement, not a procedural generation system. Manual editing with a clear plan is faster than building automation.

## Common Pitfalls

### Pitfall 1: Off-by-One Index Errors
**What goes wrong:** Editing wrong tile positions due to index miscalculation
**Why it happens:** data[y * 40 + x] is 0-indexed, but rows/columns are often discussed 1-indexed
**How to avoid:**
- Row 0 = top of map (index 0-39)
- Row 29 = bottom of map (index 1160-1199)
- Always calculate: `index = y * 40 + x` where y=0 is top
**Warning signs:** Floor patterns appear shifted from expected location

### Pitfall 2: Breaking the Exit Zone
**What goes wrong:** Modifying row 29 tiles 17-22 where the exit is
**Why it happens:** Exit needs specific floor tiles to remain walkable
**How to avoid:**
- Row 29 (indices 1160-1199): Only modify columns 0-16 and 23-39
- Keep columns 17-22 as plain 74 tiles
**Warning signs:** Player can't exit the map

### Pitfall 3: Covering Interactive Objects
**What goes wrong:** Floor pattern changes make it unclear where exhibits are
**Why it happens:** Floor decoration competes visually with props layer exhibits
**How to avoid:**
- Keep floor plain (74) directly under exhibit locations
- Reference objects layer for exhibit positions
- Exhibits are on props/plants layers, floor should be neutral beneath
**Warning signs:** Visual clutter around exhibit pedestals

### Pitfall 4: Tile Seam Mismatches
**What goes wrong:** Using edge tiles that don't connect properly
**Why it happens:** Stone tileset has specific edge pieces that must align
**How to avoid:**
- 65 connects to 66 (top edge) and 73 (left edge)
- 67 connects to 66 (top edge) and 75 (right edge)
- Always use matching corner pieces at intersections
**Warning signs:** Visible seams or "broken" floor appearance

### Pitfall 5: Losing the "Ruins" Aesthetic
**What goes wrong:** Floor looks too pristine and organized
**Why it happens:** Applying patterns too uniformly
**How to avoid:**
- Introduce occasional "breaks" in patterns
- Use large stone blocks (68, 76) as interruptions
- North sanctuary should be most irregular
**Warning signs:** Museum feels like a modern building, not ancient ruins

## Code Examples

### Example 1: Calculate Array Index
```javascript
// Source: Direct calculation based on map structure
// Map is 40 tiles wide

function tileIndex(x, y) {
  return y * 40 + x;
}

// Example: Tile at column 19, row 10 (center statue area)
const index = tileIndex(19, 10);  // = 419

// To modify ground layer:
// json.layers[0].data[419] = newGID;
```

### Example 2: Define Zone Boundaries
```javascript
// Zone definitions (0-indexed)
const zones = {
  northSanctuary: {
    rows: [2, 9],      // rows 2-9
    cols: [1, 38],     // cols 1-38 (inside walls)
    style: 'worn'
  },
  centralHall: {
    rows: [10, 25],    // rows 10-25
    cols: [13, 27],    // cols 13-27
    style: 'ceremonial'
  },
  westWing: {
    rows: [2, 27],
    cols: [1, 12],
    style: 'gallery'
  },
  eastWing: {
    rows: [2, 27],
    cols: [28, 38],
    style: 'gallery'
  },
  entry: {
    rows: [28, 29],
    cols: [1, 38],
    style: 'welcoming',
    preserve: [[17, 22]]  // exit columns to preserve
  }
};
```

### Example 3: Stone Tile GID Quick Reference
```javascript
// Source: Visual analysis of TX Tileset Stone Ground.png

const stoneTiles = {
  // Edges and corners (brown border)
  topLeft: 65,
  top: 66,
  topRight: 67,
  left: 73,
  center: 74,      // Plain floor - most common
  right: 75,
  bottomLeft: 81,
  bottom: 82,
  bottomRight: 83,

  // Decorated 2x2 (dots pattern) - currently overused
  dotTL: 69,
  dotTR: 70,
  dotBL: 77,
  dotBR: 78,

  // Large stone blocks (for worn areas)
  largeTopLeft: 68,
  largeBottomLeft: 76,
  largeBottomRight: 84,

  // Hollow frames (for ceremonial center)
  frameTL: 89,
  frameT: 90,
  frameTR: 91,
  frameL: 97,      // Row 4 - cross/frame left
  frameR: 99,      // Row 4 - cross/frame right
  frameBL: 105,    // Estimate - verify visually
  frameB: 106,     // Estimate - verify visually
  frameBR: 107     // Estimate - verify visually
};
```

### Example 4: Ground Layer Data Modification Pattern
```json
// Source: room-chatbotruins.json structure

// To modify the ground layer, edit layers[0].data array
// Current structure (excerpt showing row pattern):

// Row 0 (indices 0-39): Wall edge
// "data": [65,66,66,66,...,66,67,  <- top border

// Row 1 (indices 40-79): Interior start
// 73,74,74,74,...,74,75,  <- plain floor with side edges

// Row 2-27: Main floor area to enhance
// Row 28-29: Entry and exit
```

## Tile Assignment by Zone

### Entry Zone (Rows 28-29, Cols 1-38)
**Goal:** Welcoming, slightly more decorated than plain
**Tiles to use:**
- Base: 74 (plain center)
- Accent: Sparse 69-70, 77-78 pattern (1 set per 6-8 tiles)
- Border at row 27/28 transition: 66 (top edge) as subtle threshold

**Constraints:**
- Columns 17-22 on row 29: MUST remain 74 (exit path)
- Row 29 currently uses 82 for wall bottom - preserve corners

### Central Hall (Rows 10-25, Cols 13-27)
**Goal:** Ceremonial, distinctive floor around ChatGPT statue
**Tiles to use:**
- Statue surround (rows 10-12, cols 18-20): Hollow frame tiles 89-91, 97-99, 105-107
- Path from entry to statue: Plain 74 forming clear walkway
- Hall edges: Mix of 74 with occasional large blocks (68, 76)

**Constraints:**
- Statue at rows 10-12, cols 18-20 - floor must not compete visually
- Internal wall breaks at cols 15 and 24 (wall layer) - floor can emphasize these

### Side Wings (West: Cols 1-12, East: Cols 28-38)
**Goal:** Gallery feel, exhibit-focused, less floor decoration
**Tiles to use:**
- Base: 74 (plain)
- Sparse decoration: One 2x2 dot pattern (69-70, 77-78) per exhibit alcove
- Keep decoration away from exhibit pedestals (refer to objects layer)

**Constraints:**
- Exhibits are positioned at specific columns - check objects layer
- Columns/pillars at certain positions - floor should be plain beneath

### North Sanctuary (Rows 2-9, Cols 1-38)
**Goal:** Ancient, worn, "oldest part of ruins"
**Tiles to use:**
- Base: 74 (plain)
- Worn effect: Large stone blocks (68, 76) scattered irregularly
- No dot patterns - too uniform for "ancient" feel
- Occasional breaks in edge alignment

**Constraints:**
- Welcome sign exhibit at top center
- Tree exhibits at corners (plants layer)

## Implementation Order

1. **Entry Zone first** - Most visible to player on spawn
2. **Central Hall** - Defines the "heart" of the museum
3. **Side Wings** - Reduce current checkerboard density
4. **North Sanctuary** - Add worn/aged character
5. **Transitions** - Subtle edge work between zones

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single repeating pattern | Zone-based floor design | 2020s game design trends | Better player navigation, visual interest |
| Dense decoration everywhere | Strategic use of plain tiles | Modern minimalist UI influence | Cleaner look, better exhibit visibility |
| Uniform wear | Graduated wear (north=oldest) | Storytelling through environment | Implied history without text |

**Current best practices:**
- Tilemaps should guide player visually toward important areas
- Less decoration around interactive elements
- Zones should be distinguishable without being jarring

## Open Questions

1. **Exact hollow frame tile positions**
   - What we know: Rows 3-4 (GIDs 89-104) contain frame/cross pieces
   - What's unclear: Exact mapping of complete hollow frame borders
   - Recommendation: Test tiles 89-91 and 97-99 first, adjust based on visual result

2. **Large stone block completeness**
   - What we know: 68, 76 are clearly large stone blocks in top-left 2x2
   - What's unclear: Is there a complete 2x2 set, or are these standalone?
   - Recommendation: Use 68 and 76 together, fill remaining with 74 if no match

3. **Optimal decoration density**
   - What we know: Current pattern is too dense (every 3 tiles)
   - What's unclear: Exact optimal spacing for galleries
   - Recommendation: Start with 1 decorated 2x2 per 6x6 area, adjust if too sparse

## Sources

### Primary (HIGH confidence)
- room-chatbotruins.json - Current tilemap structure verified
- TX Tileset Stone Ground.png - Visual inspection of tile graphics
- ROADMAP.md, STATE.md - Project context and constraints

### Secondary (MEDIUM confidence)
- [MDN Tilemaps Overview](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps) - General tilemap patterns
- [Pixel Art Stone Tileset Examples](https://itch.io/game-assets/tag-pixel-art/tag-stone) - Community patterns
- [OpenGameArt Tilesets](https://opengameart.org/content/tilesets-and-backgrounds-pixelart) - Reference implementations

### Tertiary (LOW confidence)
- Web search results on floor zone design - General guidance, not specific to this tileset

## Metadata

**Confidence breakdown:**
- Tile GID mapping: HIGH - Direct visual inspection of tileset image
- Zone definitions: HIGH - Based on map dimensions and exhibit positions
- Pattern recommendations: MEDIUM - Based on general tilemap best practices
- Hollow frame specifics: MEDIUM - Row 3-4 identified, exact tiles need verification

**Research date:** 2026-02-05
**Valid until:** Indefinite (static tileset, no library dependencies)
