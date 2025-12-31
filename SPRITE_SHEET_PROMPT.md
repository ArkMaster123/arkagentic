# Pixel Art Sprite Sheet Generation Prompt

## Technical Specifications

Create a **Pokemon-style pixel art sprite sheet** for a walking character animation.

### Dimensions
- **Total canvas size**: 192px wide × 20px high (or 192px × 21px if taller character)
- **Frame size**: 16px wide × 20px high (or 16px × 21px)
- **Number of frames**: 12 frames arranged horizontally in a single row
- **Format**: PNG with transparency

### Frame Layout (Left to Right)
The sprite sheet must have 12 frames in this exact order:

1. **Frames 0-2**: DOWN animation (character facing camera/down)
   - Frame 0: Idle/down step 1
   - Frame 1: Down step 2 (walk cycle)
   - Frame 2: Down step 3 (walk cycle)

2. **Frames 3-5**: UP animation (character facing away/up)
   - Frame 3: Up step 1
   - Frame 4: Up step 2 (walk cycle)
   - Frame 5: Up step 3 (walk cycle)

3. **Frames 6-8**: LEFT animation (character facing left side)
   - Frame 6: Left step 1
   - Frame 7: Left step 2 (walk cycle)
   - Frame 8: Left step 3 (walk cycle)

4. **Frames 9-11**: RIGHT animation (character facing right side)
   - Frame 9: Right step 1
   - Frame 10: Right step 2 (walk cycle)
   - Frame 11: Right step 3 (walk cycle)

### Style Requirements
- **Pixel art style**: Classic Pokemon-style pixel art
- **Color depth**: Use a limited palette (16-32 colors typical)
- **Transparency**: Use transparent background
- **Animation**: Walking cycle with subtle body movement, arm swing, and leg alternation
- **Consistency**: Character appearance and proportions must remain consistent across all 12 frames
- **Centering**: Each frame should be centered within its 16×20px (or 16×21px) boundary
- **No anti-aliasing**: Sharp, pixelated edges only

### Visual Reference
Use the provided reference image to match the character's appearance, color scheme, and overall style. The character should look identical in style to classic Pokemon trainer sprites from Pokemon Ruby/Sapphire/Emerald era.

### Output Requirements
- Single horizontal strip PNG file
- 192px width × 20px (or 21px) height
- Transparent background
- Pixel-perfect alignment (no half-pixels)
- Each frame exactly 16px wide, perfectly aligned
- Ready for use in a game engine with frame-based animation

### Prompt Template (for AI image generation)

```
Create a Pokemon-style pixel art sprite sheet. Horizontal strip, 192px × 20px total. 12 frames, each 16px × 20px. Frame order: DOWN (frames 0-2), UP (frames 3-5), LEFT (frames 6-8), RIGHT (frames 9-11). Walking animation cycle with 3 frames per direction. Pixel art style matching Pokemon Ruby/Sapphire trainer sprites. Transparent background. Character based on [YOUR REFERENCE IMAGE DESCRIPTION]. No anti-aliasing, sharp pixel edges, consistent character appearance across all frames.
```

---

**Note**: After generating, verify that each frame is exactly 16px wide and that the total width is exactly 192px (16 × 12 = 192).

