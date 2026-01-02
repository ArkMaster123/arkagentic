# Pixel Ancient Egypt Assets - Extracted Contents

## Files Included

1. **Environment.png** (1280x1280)
   - Large tileset image containing various environment tiles
   - Likely contains 16x16 tiles (80x80 grid = 6400 tiles)
   - Use for background/ground tiles

2. **Pyramid.png** (256x256)
   - Pyramid sprite/tile
   - Could be a single large pyramid or a sprite sheet
   - Use for main pyramid structures

3. **Pyramid with Door.png** (256x256)
   - Pyramid with entrance/door
   - Use for enterable pyramid structures

4. **Pillar.png** (128x128)
   - Egyptian pillar/temple column
   - Use for decorative elements or structures

5. **Vase.png** (128x128)
   - Egyptian vase/urn
   - Use as decorative items or collectibles

6. **Back.png** (128x128)
   - Background tile or backdrop element
   - Use for background layers

## Integration Notes

These assets are larger than 16x16 individual tiles, but they're designed to be used as:
- **Sprite sheets** - Multiple tiles in one image
- **Large objects** - Single large objects that can be scaled down
- **Tilesets** - The Environment.png is likely a tileset you can extract individual tiles from

## Recommended Next Steps

1. **Review the images** to understand their structure
2. **Extract individual tiles** from Environment.png if needed (using an image editor)
3. **Scale down** larger sprites if they don't match your 16x16 grid
4. **Add to your assets folder** at `public/assets/tilemaps/tiles/` or `public/assets/sprites/`

## Usage in Phaser

You may need to:
- Load as spritesheets with proper frame sizes
- Use Phaser's `load.image()` for single objects
- Extract frames from the tileset using `load.spritesheet()` with appropriate frame dimensions

