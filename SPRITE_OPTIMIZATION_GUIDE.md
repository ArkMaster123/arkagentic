# Sprite Sheet Optimization Guide

## ❌ Current Issues with Your Sprite Sheet

**Your sprite sheet:** `1344px × 768px`
**Required:** `192px × 20px` (or `168px × 20px`) - **SINGLE horizontal row**

### Problems Identified:

1. **Wrong dimensions**: 1344×768 is way too large (should be 192×20)
2. **Wrong layout**: Appears to be a 2-row grid (needs to be single horizontal strip)
3. **Wrong frame size**: Frames are ~224×384px (should be 16×20px or 14×20px)
4. **Frame sequence**: Doesn't match the required DOWN→UP→LEFT→RIGHT order
5. **Animation**: Missing proper 3-frame walking cycles per direction

---

## ✅ Correct Sprite Sheet Specifications

### Dimensions (Choose One):

**Option 1 - Standard Size (Recommended):**
- **Total**: 192px wide × 20px tall
- **Frame size**: 16px × 20px
- **12 frames**: All in ONE horizontal row

**Option 2 - Narrow Size:**
- **Total**: 168px wide × 20px tall  
- **Frame size**: 14px × 20px
- **12 frames**: All in ONE horizontal row

**Option 3 - Tall Characters:**
- **Total**: 192px wide × 21px tall (or 168×21 for narrow)
- **Frame size**: 16px × 21px (or 14×21)
- **12 frames**: All in ONE horizontal row

### Frame Layout (Left to Right):

```
[Frame 0] [Frame 1] [Frame 2] [Frame 3] [Frame 4] [Frame 5] [Frame 6] [Frame 7] [Frame 8] [Frame 9] [Frame 10] [Frame 11]
   ↓         ↓         ↓         ↑         ↑         ↑         ←         ←         ←         →         →         →
 DOWN      DOWN      DOWN       UP        UP        UP       LEFT      LEFT      LEFT      RIGHT     RIGHT     RIGHT
Step 1    Step 2    Step 3    Step 1    Step 2    Step 3   Step 1    Step 2    Step 3    Step 1    Step 2    Step 3
```

---

## 🛠️ How to Fix Your Sprite Sheet Generator

### Step 1: Set Canvas Size Correctly

```
Canvas Width: 192px (or 168px for narrow)
Canvas Height: 20px (or 21px for tall)
Layout: Single horizontal row (NOT a grid)
```

### Step 2: Configure Frame Dimensions

```
Frame Width: 16px (or 14px)
Frame Height: 20px (or 21px)
Total Frames: 12
Frames Per Row: 12 (all in one row)
Frames Per Column: 1 (single row only)
```

### Step 3: Frame Sequence Settings

Set your generator to output frames in this EXACT order:

1. **DOWN direction (frames 0-2)**: Character facing camera/down
   - Frame 0: Standing/walking step 1
   - Frame 1: Walking step 2 (mid-stride)
   - Frame 2: Walking step 3 (other leg)

2. **UP direction (frames 3-5)**: Character facing away/up
   - Frame 3: Standing/walking step 1
   - Frame 4: Walking step 2
   - Frame 5: Walking step 3

3. **LEFT direction (frames 6-8)**: Character facing left side
   - Frame 6: Standing/walking step 1
   - Frame 7: Walking step 2
   - Frame 8: Walking step 3

4. **RIGHT direction (frames 9-11)**: Character facing right side
   - Frame 9: Standing/walking step 1
   - Frame 10: Walking step 2
   - Frame 11: Walking step 3

### Step 4: Export Settings

```
Format: PNG
Background: Transparent
No padding/margin between frames
No border around frames
Pixel-perfect (no anti-aliasing)
Export as: Single horizontal strip
```

---

## 📝 Generator Prompt Template (Updated)

Use this for your sprite sheet generator:

```
Create a Pokemon-style pixel art sprite sheet for a robot character.

CANVAS SPECIFICATIONS:
- Canvas size: 192px wide × 20px tall (EXACT dimensions)
- Single horizontal strip layout (NOT a grid, NOT multiple rows)
- 12 frames total, arranged left-to-right in ONE row
- Each frame: exactly 16px wide × 20px tall
- NO spacing, NO padding, NO borders between frames
- Transparent PNG background

FRAME LAYOUT (left to right):
Frames 0-2: DOWN direction (3 walking frames)
Frames 3-5: UP direction (3 walking frames)  
Frames 6-8: LEFT direction (3 walking frames)
Frames 9-11: RIGHT direction (3 walking frames)

ANIMATION REQUIREMENTS:
- Each direction has 3 frames showing a walking cycle
- Walking animation: subtle leg movement, arm swing
- Character appearance consistent across all 12 frames
- Pixel art style, sharp edges, no anti-aliasing

CHARACTER DESIGN:
- Robot character: orange round head, purple body, segmented limbs
- Happy expression (two black square eyes, thin mouth line)
- Match the style of existing sprite sheets in the game

OUTPUT FORMAT:
- Single PNG file
- 192×20 pixels total
- 12 frames seamlessly connected in horizontal row
- Transparent background
- Ready for game engine frame extraction
```

---

## 🔍 Verification Checklist

After generating, verify:

- [ ] Total width is EXACTLY 192px (or 168px)
- [ ] Total height is EXACTLY 20px (or 21px)
- [ ] All 12 frames in ONE horizontal row (NOT a grid)
- [ ] Each frame is exactly 16px wide (or 14px)
- [ ] No gaps or spacing between frames
- [ ] Transparent background
- [ ] Frame order matches: DOWN, UP, LEFT, RIGHT
- [ ] Each direction has 3 walking animation frames
- [ ] Character appears consistent across all frames

---

## 🎯 Quick Reference

**If using a sprite sheet generator tool, set these values:**

```
Output Format: PNG
Layout: Horizontal Strip (NOT Grid)
Canvas Width: 192
Canvas Height: 20
Frame Width: 16
Frame Height: 20
Frames Per Row: 12
Number of Rows: 1
Spacing: 0
Padding: 0
Background: Transparent
```

---

## 💡 Tips

1. **Test with existing sprites**: Look at `archie.png`, `birch.png` in your project to see the exact format
2. **Pixel-perfect is key**: Each frame must align perfectly with no overlap
3. **Walking animation**: Make sure frames 0-2 show clear walking motion (not just duplicates)
4. **Direction consistency**: UP should show the back of the character, LEFT/RIGHT should show profile views
5. **Size consistency**: If your character is taller, use 21px height instead of 20px

