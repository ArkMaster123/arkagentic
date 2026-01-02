# Zombie/Undead Assets Guide

Complete guide for the undead/zombie assets from the DeepDiveGameStudio Undead Asset Pack.

## 📦 Asset Pack Overview

**Source**: DeepDiveGameStudio Undead Asset Pack [16x16]  
**Location**: `docs/zombie_assets/`  
**License**: Free tier (name your own price), commercial use allowed with credit  
**Format**: PNG, GIF, Aseprite files  
**Style**: 16x16 pixel art, top-down RPG style

## 📁 Folder Structure

```
zombie_assets/
├── animations/
│   └── Basic Undead Animations/
│       ├── Bound Cadaver/
│       ├── Brittle Archer/
│       ├── Carcass Feeder/
│       ├── Decrepit Bones/
│       ├── Dismembered Crawler/
│       ├── Ghastly Eye/
│       ├── Giant Royal Scarab/
│       ├── Grave Revenant/
│       ├── Mutilated Stumbler/
│       ├── Royal Scarab/
│       ├── Sand Ghoul/
│       ├── Skittering Hand/
│       ├── Toxic Hound/
│       ├── Unraveling Crawler/
│       └── Vampire Bat/
└── spritesheets/
    └── Basic Undead Sprites/
        ├── Basic Undead 1x.png (88×54)
        ├── Basic Undead 2x.png (176×108)
        └── Basic Undead 4x.png (352×216)
```

## 🧟 Undead Creatures (15 Total)

Each creature has 3 files:
- `.png` - Sprite sheet/image
- `.gif` - Animated preview
- `.aseprite` - Source file for Aseprite editor

### 1. **Bound Cadaver**
- Wrapped mummy-like creature
- Perfect for Egyptian/pyramid themes

### 2. **Brittle Archer**
- Skeleton archer with bow
- Ranged enemy type

### 3. **Carcass Feeder**
- Ghoul/feeder creature
- Melee enemy

### 4. **Decrepit Bones**
- Classic skeleton
- Basic undead enemy

### 5. **Dismembered Crawler**
- Crawling undead
- Ground-based enemy

### 6. **Ghastly Eye**
- Floating eye monster
- Unique enemy type

### 7. **Giant Royal Scarab**
- Large Egyptian scarab
- Boss/mini-boss material
- Perfect for pyramid themes!

### 8. **Grave Revenant**
- Classic zombie/ghost
- Standard undead enemy

### 9. **Mutilated Stumbler**
- Wounded zombie
- Slow-moving enemy

### 10. **Royal Scarab**
- Regular-sized Egyptian scarab
- Great for Egyptian themes

### 11. **Sand Ghoul**
- Desert-themed ghoul
- **Perfect for Egyptian/pyramid maps!**

### 12. **Skittering Hand**
- Crawling hand
- Small, fast enemy

### 13. **Toxic Hound**
- Undead dog/wolf
- Fast enemy

### 14. **Unraveling Crawler**
- Mummy-like crawler
- **Perfect for Egyptian themes!**

### 15. **Vampire Bat**
- Flying enemy
- Aerial threat

## 📊 Sprite Sheets

Three scales available for the basic undead sprites:

| File | Dimensions | Scale | Use Case |
|------|-----------|-------|----------|
| `Basic Undead 1x.png` | 88×54 | 1x | Original size, individual sprites |
| `Basic Undead 2x.png` | 176×108 | 2x | Scaled up for UI/previews |
| `Basic Undead 4x.png` | 352×216 | 4x | Larger preview/demo |

**Note**: These appear to be sprite sheets containing multiple undead sprites. You'll need to extract individual sprites based on your tile size (16×16).

## 🎮 Integration into Your Game

### Recommended Project Structure

```
public/
  assets/
    sprites/
      zombies/
        bound-cadaver.png
        brittle-archer.png
        carcass-feeder.png
        decrepit-bones.png
        dismembered-crawler.png
        ghastly-eye.png
        giant-royal-scarab.png
        grave-revenant.png
        mutilated-stumbler.png
        royal-scarab.png
        sand-ghoul.png
        skittering-hand.png
        toxic-hound.png
        unraveling-crawler.png
        vampire-bat.png
```

### Loading Assets in Phaser

```typescript
// In LoadingScene.ts or your scene's preload()
preload(): void {
  // Individual undead creatures
  this.load.image('boundCadaver', 'assets/sprites/zombies/bound-cadaver.png');
  this.load.image('brittleArcher', 'assets/sprites/zombies/brittle-archer.png');
  this.load.image('sandGhoul', 'assets/sprites/zombies/sand-ghoul.png');
  this.load.image('royalScarab', 'assets/sprites/zombies/royal-scarab.png');
  this.load.image('giantRoyalScarab', 'assets/sprites/zombies/giant-royal-scarab.png');
  this.load.image('unravelingCrawler', 'assets/sprites/zombies/unraveling-crawler.png');
  
  // Add more as needed...
}
```

### Using with Egyptian/Pyramid Map

These assets pair perfectly with your Egyptian assets! Recommended combinations:

**Egyptian-themed enemies**:
- Sand Ghoul (desert theme)
- Royal Scarab / Giant Royal Scarab (Egyptian theme)
- Bound Cadaver (mummy theme)
- Unraveling Crawler (mummy theme)

**General undead enemies**:
- Grave Revenant
- Decrepit Bones
- Mutilated Stumbler
- Carcass Feeder

**Special enemies**:
- Ghastly Eye (unique)
- Vampire Bat (flying)
- Brittle Archer (ranged)
- Toxic Hound (fast)

## 📐 Sprite Specifications

- **Base size**: 16×16 pixels (matches your game!)
- **Format**: PNG with transparency (RGBA)
- **Animations**: Each creature has idle animations
- **Style**: Top-down RPG, pixel art
- **Compatibility**: Works with your Pokemon Ruby-style game

## 🎨 Usage Tips

1. **Egyptian Theme**: Focus on Sand Ghoul, Royal Scarab, Bound Cadaver, Unraveling Crawler
2. **Animation**: Use the `.gif` files as reference for animation patterns
3. **Editing**: `.aseprite` files available if you need to modify sprites
4. **Scaling**: Assets are 16×16, perfect match for your tile system
5. **Layering**: These work well as NPCs/enemies in your pyramid map scene

## 🔗 Related Assets

- **Egyptian Assets**: See `EGYPTIAN_ASSETS_GUIDE.md` for pyramid/environment assets
- **Map Assets**: Combine with Egyptian tiles for complete pyramid map

## 📝 File Organization Checklist

- [ ] Copy PNG files to `public/assets/sprites/zombies/`
- [ ] Decide which creatures to use for your pyramid map
- [ ] Update LoadingScene.ts to load selected zombie sprites
- [ ] Create enemy/NPC classes using these sprites
- [ ] Add to your Egyptian/pyramid map scene
- [ ] Test sprite rendering and animations

## 🎯 Recommended Egyptian/Pyramid Map Enemies

For your Egyptian/pyramid map, these work best:

1. **Sand Ghoul** ⭐ - Desert/egyptian themed
2. **Royal Scarab** ⭐ - Perfect Egyptian theme
3. **Giant Royal Scarab** ⭐ - Boss material!
4. **Bound Cadaver** ⭐ - Mummy-like, perfect
5. **Unraveling Crawler** ⭐ - Mummy crawler
6. **Grave Revenant** - Classic zombie
7. **Brittle Archer** - Skeleton archer for variety

## 💡 Animation Notes

- Each creature folder contains animated `.gif` files
- These show idle animations
- You may need to create walk/attack animations following your existing sprite pattern (4 directions, 3 frames each)
- Use the GIFs as reference for animation timing and style

## 📍 Asset Locations

**Source**: `docs/basic asset pack/` (original location)  
**Organized**: `docs/zombie_assets/` (current location)  
**Destination**: `public/assets/sprites/zombies/` (for game use)

---

**Next Steps**: 
1. Review the animated GIFs to see creatures in action
2. Select which enemies fit your Egyptian/pyramid theme
3. Copy selected PNG files to your game assets folder
4. Integrate into your pyramid map scene
5. Create enemy spawn points and behaviors

