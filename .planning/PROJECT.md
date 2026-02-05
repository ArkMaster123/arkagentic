# ChatbotRuins Museum Map Fix

## What This Is

Fix the ChatbotRuins scene tilemap to properly use the "Pixel Art Top Down - Basic v1.2.2" asset pack. The museum should look like an ancient ruined temple that's been converted into an LLM history museum - stone floors, pillars, some overgrown plants, but with organized exhibit areas.

## Core Value

The museum map must render correctly and look visually appealing using the available tileset assets.

## Requirements

### Validated

- ✓ Tilemap loading infrastructure exists — existing
- ✓ Interactive exhibit system works — existing
- ✓ Multiplayer sync works in scene — existing
- ✓ All tileset images available in `/public/assets/tilemaps/tiles/ruins/` — existing

### Active

- [ ] Stone floor tiles render correctly (not gray/checkered)
- [ ] Museum has proper "ruined temple" aesthetic
- [ ] Exhibit areas are visually distinct and organized
- [ ] Decorative elements (pillars, plants, props) placed throughout
- [ ] Map looks cohesive and intentional, not placeholder

### Out of Scope

- Adding new interactive exhibits — existing ones are fine
- Changing scene code (ChatbotRuinsScene.ts) — map JSON only
- Adding new tilesets — use existing assets only

## Context

**Current state:** The map JSON uses tile IDs that don't correspond to actual tiles in the tilesets, resulting in broken/missing tile rendering.

**Available tilesets (32x32 tiles):**
- Grass (firstgid: 1, 64 tiles) - 256x256px, 8x8 grid
- Stone Ground (firstgid: 65, 64 tiles) - 256x256px, 8x8 grid
- Wall (firstgid: 129, 256 tiles) - 512x512px, 16x16 grid
- Struct (firstgid: 385, 256 tiles) - 512x512px, 16x16 grid
- Props (firstgid: 641, 256 tiles) - 512x512px, 16x16 grid
- Plant (firstgid: 897, 256 tiles) - 512x512px, 16x16 grid

**Reference:** Scene Overview.png in the asset pack shows how tiles should be composed.

**Map dimensions:** 40 tiles wide × 30 tiles tall (1280×960 pixels)

## Constraints

- **Assets:** Must use only existing tileset images - no new assets
- **File:** Only modify `public/assets/tilemaps/json/room-chatbotruins.json`
- **Compatibility:** Must work with existing ChatbotRuinsScene.ts tileset loading code

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use grass (tile 1) as base floor | Grass tiles are confirmed working, stone tiles have rendering issues | — Pending |
| Keep existing interactive objects | Exhibits already positioned and working | — Pending |

---
*Last updated: 2026-02-05 after initialization*
