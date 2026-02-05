# Roadmap: ChatbotRuins Museum Tilemap Fix

**Milestone:** M1 - Ruined Temple Museum Visual Enhancement
**Created:** 2026-02-05
**Scope:** Fix and enhance the ChatbotRuins tilemap to properly render as a ruined temple museum

---

## Phase Overview

| Phase | Name | Goal | Dependencies |
|-------|------|------|--------------|
| 1 | Floor Enhancement | Create visual zones with varied stone floor patterns | None |
| 2 | Structural Ruins | Add ruined temple elements from struct tileset | Phase 1 |
| 3 | Vegetation & Polish | Add plants and decorative finishing touches | Phase 2 |

---

## Phase 1: Floor Enhancement

**Goal:** Transform the monotonous checkerboard floor into distinct museum zones with visual variety.

**Why:** The current floor uses only 4 tile variants (69, 70, 77, 78 + base 74) in a repeating pattern. This makes the 40x30 space feel uniform and generic.

**Plans:** 2 plans

Plans:
- [ ] 01-01-PLAN.md — Entry zone and central hall floor enhancement
- [ ] 01-02-PLAN.md — Side wings and north sanctuary floor enhancement

**Success Criteria:**
- [ ] Entry zone (rows 28-30) has distinct welcoming floor pattern
- [ ] Central hall (around ChatGPT statue) has ceremonial floor treatment
- [ ] Side galleries have subtle variation from main hall
- [ ] Worn/aged floor tiles in corners suggest ruins

**Constraints:**
- Stone tileset only (GIDs 65-128)
- Don't modify interactive object positions
- Maintain floor in front of exit (rows 29-30)

**Key Tiles (Stone tileset, firstgid=65, 8 columns):**
- 65-67, 73-75, 81-83: Edge tiles for zone borders
- 69-70, 77-78: Checkerboard (reduce overuse)
- Other tiles in 65-128 range for variation

---

## Phase 2: Structural Ruins

**Goal:** Add "ruined temple" structural elements that tell the story of an ancient place converted to a museum.

**Why:** The struct tileset (385-640) is completely unused. This tileset contains crumbling walls, archways, and moss-covered stone that would create the "ruins" aesthetic.

**Success Criteria:**
- [ ] At least 2 crumbling wall sections in corners
- [ ] Archway elements suggesting grand temple architecture
- [ ] Visual break between exhibit "wings"
- [ ] Props layer enhanced with structural decoration

**Constraints:**
- Struct tileset (GIDs 385-640)
- Don't block walkways (maintain 2+ tile paths)
- Don't cover existing columns (681, 697) or statue (689-723)

**Key Tiles (Struct tileset, firstgid=385, 16 columns):**
- Needs visual inspection of TX Struct.png to identify specific tiles
- Look for: moss walls, crumbling edges, archway pieces

---

## Phase 3: Vegetation & Polish

**Goal:** Add nature reclaiming the ruins - plants growing through stone, creating atmosphere.

**Why:** Currently only using tree (897-931) and one small plant (932). The plant tileset has much more variety for creating an overgrown ruins feel.

**Success Criteria:**
- [ ] Grass/moss scattered on floor edges
- [ ] Additional plant variety beyond current 2 types
- [ ] Plants positioned to suggest "nature vs museum" tension
- [ ] Visual cohesion between zones

**Constraints:**
- Plant tileset (GIDs 897-1152)
- Don't block exhibit interaction areas
- Plants should accent, not overwhelm

**Key Tiles (Plant tileset, firstgid=897, 16 columns):**
- 897-931: Large trees (corners)
- 932+: Small plants, grass, bushes, vines

---

## Milestone Success Criteria

The museum map is complete when:

1. **Renders correctly** - No gray/checkered placeholder tiles
2. **Has visual zones** - Entry, galleries, central hall are distinguishable
3. **Feels like ruins** - Ancient temple converted to museum, not just a generic room
4. **Maintains functionality** - All 17 interactive exhibits remain accessible
5. **Uses available assets** - Leverages underutilized struct/plant tilesets

---

## Technical Notes

**Single file to modify:** `public/assets/tilemaps/json/room-chatbotruins.json`

**Tile calculation:** `GID = firstgid + (row * columns) + column`

**Layer data indexing:** `data[y * 40 + x]` for 40-wide map

**Testing:** Load game, navigate to ChatbotRuins scene, visually verify
