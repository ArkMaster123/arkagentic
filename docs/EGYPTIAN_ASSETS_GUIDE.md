# Egyptian Assets Integration Guide

Complete guide for integrating the Pixel Ancient Egypt assets into your Pokemon Ruby-style game.

## 📦 Asset Packs Overview

### Basic Pack Contents
**Location**: `docs/Pixel_Ancient_Egypt_Extracted/Pixel Art Ancient Egypt/`

This pack contains 6 PNG files:

| File | Dimensions | Description | Use Case |
|------|-----------|-------------|----------|
| `Environment.png` | 1280×1280 | Large tileset with environment tiles | Background/ground tiles, extract individual 16×16 tiles |
| `Pyramid.png` | 256×256 | Pyramid structure sprite | Main pyramid structures, scale to desired size |
| `Pyramid with Door.png` | 256×256 | Pyramid with entrance/door | Enterable pyramid structures, landmarks |
| `Pillar.png` | 128×128 | Egyptian pillar/column | Decorative temple columns, architectural elements |
| `Vase.png` | 128×128 | Egyptian vase/urn | Decorative items, collectibles, treasure |
| `Back.png` | 128×128 | Background tile/backdrop | Background layers, sky/desert backdrop |

### Full Version Pack
**Location**: `docs/Pixel_Ancient_Egypt_FullVersion_Extracted/`

Contains only `Back.png` (same file as basic pack). The basic pack appears to be the complete version.

## 🎮 Integration into Your Game

### Recommended Project Structure

```
public/
  assets/
    sprites/
      egyptian/
        pyramid.png
        pyramid-door.png
        pillar.png
        vase.png
        back.png
    tilemaps/
      tiles/
        egyptian/
          environment.png          # Full tileset
          environment-tiles/       # Individual extracted tiles (if needed)
      json/
        pyramid-desert.json        # Your new map file
```

### Asset Specifications

All assets are PNG format with transparency support (RGBA).

**Tile Size Reference**:
- Your game uses: **16×16 pixel tiles**
- Environment.png is 1280×1280 = **80×80 grid** of 16×16 tiles
- Large objects (256×256) = 16×16 tiles each dimension
- Medium objects (128×128) = 8×8 tiles each dimension

## 📐 Sizing Strategy

Since your game uses 16×16 tiles, you'll need to decide how to handle larger assets:

### Option 1: Use as Large Objects
- Keep pyramids at 256×256 (16×16 tiles)
- Use as single large objects/landmarks
- Good for: Main structures, landmarks, boss locations

### Option 2: Extract/Scale to 16×16
- Break down Environment.png into individual 16×16 tiles
- Scale down pyramids/pillars to fit your grid
- Good for: Consistent grid-based map building

### Option 3: Hybrid Approach (Recommended)
- Use Environment.png as source for ground/background tiles
- Keep pyramids as large objects (multiple tiles)
- Scale pillars/vases to 16×16 or 32×32

## 🔧 Loading Assets in Phaser

### Method 1: Load as Individual Images

```typescript
// In LoadingScene.ts or your scene's preload()
preload(): void {
  // Large objects
  this.load.image('pyramid', 'assets/sprites/egyptian/pyramid.png');
  this.load.image('pyramidDoor', 'assets/sprites/egyptian/pyramid-door.png');
  
  // Medium objects
  this.load.image('egyptianPillar', 'assets/sprites/egyptian/pillar.png');
  this.load.image('egyptianVase', 'assets/sprites/egyptian/vase.png');
  this.load.image('egyptianBack', 'assets/sprites/egyptian/back.png');
  
  // Tileset (for tilemaps)
  this.load.image('egyptianTiles', 'assets/tilemaps/tiles/egyptian/environment.png');
}
```

### Method 2: Load as Spritesheet (if extracted into tiles)

```typescript
// If you extract Environment.png into 16x16 tiles
this.load.spritesheet('egyptianTiles', 'assets/tilemaps/tiles/egyptian/environment-tiles.png', {
  frameWidth: 16,
  frameHeight: 16
});
```

### Method 3: Load as Tilemap

```typescript
// If you create a Tiled map using the tileset
this.load.tilemapTiledJSON('pyramidDesert', 'assets/tilemaps/json/pyramid-desert.json');
this.load.image('egyptianTiles', 'assets/tilemaps/tiles/egyptian/environment.png');
```

## 🗺️ Creating Your Egyptian Map

### Step 1: Prepare Tileset

1. Open `Environment.png` in an image editor (GIMP, Photoshop, Aseprite)
2. If needed, extract individual 16×16 tiles
3. Create a tileset compatible with Tiled Map Editor or your mapping tool

### Step 2: Design Map Layout

Consider your map structure:
- **Desert ground** from Environment.png tiles
- **Pyramids** as large landmarks (256×256)
- **Pillars** for temple/ruin areas (128×128 or scaled)
- **Vases** as collectibles/decoration (128×128 or scaled to 16×16)
- **Back.png** for background layers

### Step 3: Integration with Existing System

Following your `SPRITE_AND_MAP_GUIDE.md` pattern:

```typescript
// Map specifications
- Size: X×Y tiles (using 16×16 tile size)
- Layers: 
  - ground (desert tiles from Environment.png)
  - structures (pyramids, pillars)
  - objects (vases, items)
  - npcs (mummies, enemies - from other asset packs)
```

## 🎨 Style Matching

### Color Palette Considerations

Your existing game uses Pokemon Ruby-style sprites. The Egyptian assets should blend well, but you may want to:

1. **Check color harmony** - Ensure Egyptian assets complement existing palettes
2. **Adjust if needed** - Use image editing tools to match color tones
3. **Maintain consistency** - Keep the pixel art style consistent

### Scale Consistency

- Your sprites: 14×20, 14×21, 16×20, 16×21
- Egyptian objects: 128×128, 256×256
- **Recommendation**: Scale objects proportionally or use them as larger landmarks

## 🔗 Related Assets

For complete Egyptian/pyramid map, also consider:

1. **Mummies/Zombies**: See `EGYPTIAN_MAP_ASSETS.md` for undead character packs
2. **Additional Items**: Weapons/items from Anokolisa's pack (50+ items)
3. **Desert Tiles**: Purple Dragoon's pack for additional sand/desert elements

## 📝 File Organization Checklist

- [ ] Copy assets to `public/assets/sprites/egyptian/`
- [ ] Copy Environment.png to `public/assets/tilemaps/tiles/egyptian/`
- [ ] Extract individual tiles if needed
- [ ] Create tilemap JSON file for your Egyptian map
- [ ] Update LoadingScene.ts to load new assets
- [ ] Create new scene class (e.g., `PyramidDesertScene.ts`) if needed
- [ ] Test asset loading and rendering
- [ ] Adjust colors/scales to match game style

## 🛠️ Tools Needed

- **Image Editor**: GIMP, Photoshop, or Aseprite (for extracting tiles, scaling)
- **Map Editor**: Tiled Map Editor (for creating tilemaps)
- **Code Editor**: Your existing setup (for Phaser integration)

## 💡 Usage Tips

1. **Start Small**: Test with one or two assets first
2. **Layer Approach**: Use Back.png for backgrounds, Environment for ground, objects on top
3. **Performance**: Large 1280×1280 tilesets are fine, but consider extracting only needed tiles
4. **Collision**: Mark pyramids and pillars as collision objects in your map
5. **Animation**: Consider adding simple animations (e.g., sand particles, torches)

## 📚 Additional Resources

- See `SPRITE_AND_MAP_GUIDE.md` for existing sprite/map patterns
- See `EGYPTIAN_MAP_ASSETS.md` for additional free asset sources
- Phaser documentation: https://phaser.io/docs

## 📍 File Locations Reference

```
docs/
  Pixel_Ancient_Egypt_Extracted/
    Pixel Art Ancient Egypt/
      Environment.png
      Pyramid.png
      Pyramid with Door.png
      Pillar.png
      Vase.png
      Back.png
  Pixel_Ancient_Egypt_FullVersion_Extracted/
    Back.png (duplicate of basic pack)
  EGYPTIAN_ASSETS_GUIDE.md (this file)
  EGYPTIAN_MAP_ASSETS.md (resource list)
```

---

**Next Steps**: 
1. Review the assets and decide on sizing strategy
2. Copy assets to public/assets/ folder
3. Extract/create individual tiles if needed
4. Build your Egyptian/pyramid map scene

