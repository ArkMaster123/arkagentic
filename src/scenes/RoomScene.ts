import { Scene, Tilemaps, GameObjects } from 'phaser';
import { AGENTS, AGENT_COLORS } from '../constants';
import { DIRECTION } from '../utils';
import { getIconSpan } from '../icons';
import { MiniMap } from '../classes/MiniMap';
import { Player } from '../classes/Player';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';
import BoardPlugin from 'phaser3-rex-plugins/plugins/board-plugin';

// Room configurations for each agent
const ROOM_CONFIGS: Record<string, {
  name: string;
  description: string;
  mapKey: string;
}> = {
  scout: {
    name: "Scout's Research Lab",
    description: "Where data comes to life",
    mapKey: 'room-scout',
  },
  sage: {
    name: "Sage's Strategy Room",
    description: "Where decisions are made",
    mapKey: 'room-sage',
  },
  chronicle: {
    name: "Chronicle's Newsroom",
    description: "Breaking stories daily",
    mapKey: 'room-chronicle',
  },
  trends: {
    name: "Trends' Intelligence Hub",
    description: "Pulse of the world",
    mapKey: 'room-trends',
  },
  maven: {
    name: "Maven's Welcome Center",
    description: "Your friendly starting point",
    mapKey: 'room-maven',
  },
};

interface RoomData {
  agentType: string;
  fromTown: boolean;
  playerAvatar?: string;
  playerName?: string;
}

export class RoomScene extends Scene {
  private agentType: string = 'scout';
  private roomConfig!: typeof ROOM_CONFIGS.scout;
  private agentSprite!: GameObjects.Sprite;
  private agentNameTag!: GameObjects.Text;
  private speechBubble: GameObjects.Container | null = null;
  private map!: Tilemaps.Tilemap;
  private interactiveObjects: { obj: any; hitArea: GameObjects.Rectangle }[] = [];
  
  // Agent movement properties
  private agentDirection: number = DIRECTION.DOWN;
  private isAgentMoving: boolean = false;
  private moveSpeed: number = 60; // pixels per second
  private pendingMessage: string | null = null;
  
  public rexUI!: UIPlugin;
  public rexBoard!: BoardPlugin;
  
  // Mini-map
  private miniMap: MiniMap | null = null;

  constructor() {
    super('room-scene');
  }

  init(data: RoomData): void {
    this.agentType = data.agentType || 'scout';
    this.roomConfig = ROOM_CONFIGS[this.agentType] || ROOM_CONFIGS.scout;
  }

  create(): void {
    // Create UI first (before camera adjustments)
    this.createUI();
    
    // Create the room from tilemap
    this.createRoomFromTilemap();
    this.createAgent();
    this.setupInteractiveObjects();
    this.setupInput();
    
    // Configure UI camera to ignore game world objects (must be called after all objects are created)
    this.configureUICameraIgnore();
    
    // Hide transition after room is ready
    setTimeout(() => {
      if ((window as any).hideTransition) {
        (window as any).hideTransition();
      }
    }, 500);
  }

  private createRoomFromTilemap(): void {
    // Create the tilemap
    this.map = this.make.tilemap({ key: this.roomConfig.mapKey });
    
    // Add tileset - using dungeon tileset for rooms
    const tileset = this.map.addTilesetImage('dungeon', 'dungeon-tiles');
    
    if (!tileset) {
      console.error('Failed to load tileset for room');
      this.createFallbackRoom();
      return;
    }

    // Room is 24x17 tiles = 384x272 pixels at native size
    // Screen is 800x600
    // We want to fit the room nicely with some UI space
    
    // Create layers at origin
    const floorLayer = this.map.createLayer('floor', tileset, 0, 0);
    const wallsLayer = this.map.createLayer('walls', tileset, 0, 0);
    const furnitureLayer = this.map.createLayer('furniture', tileset, 0, 0);

    // Set depth for proper layering
    if (floorLayer) floorLayer.setDepth(0);
    if (wallsLayer) wallsLayer.setDepth(1);
    if (furnitureLayer) furnitureLayer.setDepth(2);

    // Set up camera to zoom and center the room
    // Leave 60px at top for title, 40px at bottom for instructions
    const availableHeight = 600 - 100;
    const availableWidth = 800;
    
    const roomWidth = this.map.widthInPixels;   // 384
    const roomHeight = this.map.heightInPixels; // 272
    
    // Calculate zoom to fit room in available space
    const zoomX = availableWidth / roomWidth;
    const zoomY = availableHeight / roomHeight;
    const zoom = Math.min(zoomX, zoomY); // Should be about 1.84
    
    // Set camera zoom and bounds
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(0, 0, roomWidth, roomHeight);
    
    // Center the room in the available space
    // The camera centers on a point, so we center on the middle of the room
    this.cameras.main.centerOn(roomWidth / 2, roomHeight / 2);
    
    // Offset the camera viewport to leave room for UI
    // Move the viewport down by 30px to center in the available area
    this.cameras.main.setViewport(0, 30, 800, 600 - 30);

    console.log(`Room: ${roomWidth}x${roomHeight}, Zoom: ${zoom.toFixed(2)}`);
  }

  private createFallbackRoom(): void {
    const graphics = this.add.graphics();
    const width = 24 * 16;  // 384
    const height = 17 * 16; // 272

    const agentColor = AGENT_COLORS[this.agentType as keyof typeof AGENT_COLORS] || 0xe94560;
    
    // Floor
    graphics.fillStyle(0x3d3d3d, 1);
    graphics.fillRect(0, 0, width, height);

    // Walls - top and bottom rows with brick pattern
    graphics.fillStyle(0x5c4033, 1);
    graphics.fillRect(0, 0, width, 32);  // Top wall (2 tiles)
    graphics.fillRect(0, 0, 16, height); // Left wall
    graphics.fillRect(width - 16, 0, 16, height); // Right wall
    graphics.fillRect(0, height - 16, width, 16); // Bottom wall

    // Door opening at bottom
    graphics.fillStyle(0x3d3d3d, 1);
    graphics.fillRect(160, height - 16, 64, 16);

    // Set up camera like tilemap version
    const availableHeight = 600 - 100;
    const zoomX = 800 / width;
    const zoomY = availableHeight / height;
    const zoom = Math.min(zoomX, zoomY);
    
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.centerOn(width / 2, height / 2);
    this.cameras.main.setViewport(0, 30, 800, 600 - 30);
  }

  private setupInteractiveObjects(): void {
    if (!this.map) return;

    const objectLayer = this.map.getObjectLayer('objects');
    if (!objectLayer) return;

    objectLayer.objects.forEach((obj) => {
      if (obj.type === 'interactive' && obj.x !== undefined && obj.y !== undefined) {
        // Objects are in tilemap coordinates - the camera handles the transform
        const x = obj.x + (obj.width || 0) / 2;
        const y = obj.y + (obj.height || 0) / 2;
        const w = obj.width || 32;
        const h = obj.height || 32;
        
        // Create invisible hit area in world/tilemap space
        const hitArea = this.add.rectangle(x, y, w, h, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.setDepth(500);

        // Get custom properties
        const messageProp = obj.properties?.find((p: any) => p.name === 'message');
        const message = messageProp?.value || `This is ${obj.name}`;

        // Hover effect
        hitArea.on('pointerover', () => {
          this.showItemTooltip(x, y - h / 2 - 10, obj.name || 'Item');
          hitArea.setFillStyle(0xffffff, 0.2);
        });

        hitArea.on('pointerout', () => {
          this.hideItemTooltip();
          hitArea.setFillStyle(0x000000, 0);
        });

        hitArea.on('pointerdown', () => {
          // Walk to the object first, then show the message
          this.walkToAndSpeak(x, y, message);
        });

        this.interactiveObjects.push({ obj, hitArea });
      }
    });
  }

  private tooltip: GameObjects.Container | null = null;

  private showItemTooltip(worldX: number, worldY: number, text: string): void {
    this.hideItemTooltip();
    
    // Convert world coordinates to screen coordinates for crisp text
    const screenPos = this.worldToScreen(worldX, worldY);
    
    const bg = this.add.graphics();
    const padding = 10;
    
    const label = this.add.text(0, 0, text, {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    const width = Math.max(100, label.width + padding * 2);
    const height = label.height + padding * 2;
    
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    
    // Clamp to safe zone
    const clampedPos = this.clampToSafeZone(screenPos.x, screenPos.y, width, height);
    
    this.tooltip = this.add.container(clampedPos.x, clampedPos.y, [bg, label]);
    this.tooltip.setDepth(2500);
    
    // Tooltip is rendered by UI camera (screen space) - main camera should ignore
    this.cameras.main.ignore(this.tooltip);
  }

  private hideItemTooltip(): void {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  private createAgent(): void {
    // Get spawn point from tilemap or use default center
    let spawnX = this.map ? this.map.widthInPixels / 2 : 192;
    let spawnY = this.map ? this.map.heightInPixels / 2 : 136;

    if (this.map) {
      const objectLayer = this.map.getObjectLayer('objects');
      if (objectLayer) {
        const spawn = objectLayer.objects.find((obj) => obj.type === 'spawn');
        if (spawn && spawn.x !== undefined && spawn.y !== undefined) {
          spawnX = spawn.x;
          spawnY = spawn.y;
        }
      }
    }
    
    const agentConfig = AGENTS[this.agentType as keyof typeof AGENTS];
    
    // Create the sprite in tilemap/world coordinates
    this.agentSprite = this.add.sprite(spawnX, spawnY, agentConfig.sprite);
    this.agentSprite.setScale(1.5); // Slightly larger than tiles
    this.agentSprite.setDepth(100);
    
    // Create walking animation if it doesn't exist
    const animKey = `${agentConfig.sprite}-walk-down`;
    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(agentConfig.sprite, { start: 0, end: 2 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    this.agentSprite.play(animKey);
    
    // Create name tag in SCREEN SPACE (rendered by UI camera, crisp text)
    const agentColor = AGENT_COLORS[this.agentType as keyof typeof AGENT_COLORS];
    const screenPos = this.worldToScreen(spawnX, spawnY - 35);

    // For Phaser text, keep emoji for now (HTML overlay will handle icons)
    this.agentNameTag = this.add.text(
      0, 0, // Position will be set after we know dimensions
      `${agentConfig.emoji} ${agentConfig.name}`,
      {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#' + agentColor.toString(16).padStart(6, '0'),
        padding: { x: 6, y: 3 },
      }
    ).setOrigin(0.5, 1).setDepth(2500);
    
    // Clamp to safe zone
    const clampedPos = this.clampToSafeZone(
      screenPos.x, 
      screenPos.y, 
      this.agentNameTag.width, 
      this.agentNameTag.height
    );
    this.agentNameTag.setPosition(clampedPos.x, clampedPos.y);
    
    // Name tag is UI element - main camera should ignore it
    this.cameras.main.ignore(this.agentNameTag);
    
    // Force an immediate position update after camera is fully set up
    this.time.delayedCall(50, () => {
      if (this.agentNameTag && this.agentSprite) {
        const screenPos = this.worldToScreen(this.agentSprite.x, this.agentSprite.y - 35);
        const clampedPos = this.clampToSafeZone(
          screenPos.x, 
          screenPos.y, 
          this.agentNameTag.width, 
          this.agentNameTag.height
        );
        this.agentNameTag.setPosition(clampedPos.x, clampedPos.y);
      }
    });
    
    // Welcome message
    this.time.delayedCall(800, () => {
      this.showSpeechBubble(`Welcome to my space! I'm ${agentConfig.name}. Click on items to learn more!`);
    });
  }

  // Convert world coordinates to screen coordinates
  private worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const camera = this.cameras.main;
    
    // Camera viewport: x=0, y=30, width=800, height=570
    // Camera is centered on the room center and zoomed
    
    // Get the top-left corner of what the camera sees in world space
    const worldViewX = camera.worldView.x;
    const worldViewY = camera.worldView.y;
    
    // Convert world position to screen position
    // (worldX - worldViewX) gives position relative to camera view in world units
    // Multiply by zoom to get screen pixels
    // Add camera viewport offset (camera.x, camera.y)
    const screenX = camera.x + (worldX - worldViewX) * camera.zoom;
    const screenY = camera.y + (worldY - worldViewY) * camera.zoom;
    
    return { x: screenX, y: screenY };
  }

  // Safe zone padding for UI elements (invisible chat padding box)
  private readonly UI_PADDING = {
    top: 70,      // Below the title bar
    bottom: 50,   // Above the footer
    left: 30,
    right: 30
  };

  // Clamp a screen position to stay within the safe zone
  private clampToSafeZone(
    screenX: number, 
    screenY: number, 
    elementWidth: number = 0, 
    elementHeight: number = 0
  ): { x: number; y: number } {
    const halfWidth = elementWidth / 2;
    const halfHeight = elementHeight / 2;
    
    // Calculate safe bounds
    const minX = this.UI_PADDING.left + halfWidth;
    const maxX = 800 - this.UI_PADDING.right - halfWidth;
    const minY = this.UI_PADDING.top + halfHeight;
    const maxY = 600 - this.UI_PADDING.bottom - halfHeight;
    
    return {
      x: Math.max(minX, Math.min(maxX, screenX)),
      y: Math.max(minY, Math.min(maxY, screenY))
    };
  }

  // Store speech bubble dimensions for clamping in update()
  private speechBubbleSize = { width: 0, height: 0 };

  private showSpeechBubble(text: string): void {
    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }
    
    const bg = this.add.graphics();
    const padding = 12;
    const maxWidth = 240;
    
    const speechText = this.add.text(0, 0, text, {
      fontSize: '13px',
      color: '#ffffff',
      wordWrap: { width: maxWidth - padding * 2 },
      lineSpacing: 3,
      align: 'center',
    }).setOrigin(0.5);
    
    const width = Math.min(maxWidth, speechText.width + padding * 2);
    const height = speechText.height + padding * 2;
    
    // Store dimensions for clamping
    this.speechBubbleSize = { width, height: height + 12 }; // +12 for the tail
    
    const agentColor = AGENT_COLORS[this.agentType as keyof typeof AGENT_COLORS];
    bg.fillStyle(agentColor, 0.95);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.fillTriangle(0, height / 2, -8, height / 2 + 10, 8, height / 2);
    
    // Get initial position (above agent) and clamp to safe zone
    const screenPos = this.worldToScreen(this.agentSprite.x, this.agentSprite.y - 60);
    const clampedPos = this.clampToSafeZone(screenPos.x, screenPos.y, width, height + 12);
    
    this.speechBubble = this.add.container(clampedPos.x, clampedPos.y, [bg, speechText]);
    this.speechBubble.setDepth(2500);
    
    // Speech bubble is rendered by UI camera (screen space) - main camera should ignore
    this.cameras.main.ignore(this.speechBubble);
    
    // Auto-hide
    this.time.delayedCall(5000, () => {
      if (this.speechBubble) {
        this.tweens.add({
          targets: this.speechBubble,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (this.speechBubble) {
              this.speechBubble.destroy();
              this.speechBubble = null;
            }
          }
        });
      }
    });
  }

  // Store UI elements to configure camera ignore lists
  private uiElements: GameObjects.GameObject[] = [];
  private uiCamera: Phaser.Cameras.Scene2D.Camera | null = null;

  private createUI(): void {
    // Create a separate UI camera that covers the full screen
    this.uiCamera = this.cameras.add(0, 0, 800, 600);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setName('ui-camera');
    
    const agentConfig = AGENTS[this.agentType as keyof typeof AGENTS];
    const agentColor = AGENT_COLORS[this.agentType as keyof typeof AGENT_COLORS];
    
    // Title bar background
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x000000, 0.8);
    titleBg.fillRect(0, 0, 800, 50);
    titleBg.fillStyle(agentColor, 1);
    titleBg.fillRect(0, 0, 800, 4);
    titleBg.setDepth(3000);

    // Room title
    const titleText = this.add.text(400, 15, this.roomConfig.name, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(3001);

    const descText = this.add.text(400, 33, this.roomConfig.description, {
      fontSize: '11px',
      color: '#aaaaaa',
    }).setOrigin(0.5, 0).setDepth(3001);

    // Back button
    const backBtnBg = this.add.graphics();
    backBtnBg.fillStyle(0xe94560, 1);
    backBtnBg.fillRoundedRect(15, 10, 110, 30, 6);
    backBtnBg.setDepth(3001);
    
    const backBtnText = this.add.text(70, 25, '< Back to Town', {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3002);
    
    // Create invisible hit area for back button
    const backHitArea = this.add.rectangle(70, 25, 110, 30, 0x000000, 0);
    backHitArea.setDepth(3003);
    backHitArea.setInteractive({ useHandCursor: true });
    
    backHitArea.on('pointerover', () => {
      backBtnBg.clear();
      backBtnBg.fillStyle(0xff6b8a, 1);
      backBtnBg.fillRoundedRect(15, 10, 110, 30, 6);
    });
    
    backHitArea.on('pointerout', () => {
      backBtnBg.clear();
      backBtnBg.fillStyle(0xe94560, 1);
      backBtnBg.fillRoundedRect(15, 10, 110, 30, 6);
    });
    
    backHitArea.on('pointerdown', () => this.exitRoom());

    // Agent badge (top right)
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(agentColor, 0.9);
    badgeBg.fillRoundedRect(800 - 115, 10, 100, 30, 6);
    badgeBg.setDepth(3001);
    
    // For Phaser text in UI, keep emoji for now (HTML overlay will handle icons)
    const badgeText = this.add.text(800 - 65, 25, `${agentConfig.emoji} ${agentConfig.name}`, {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3002);

    // Instructions at bottom
    const footerBg = this.add.graphics();
    footerBg.fillStyle(0x000000, 0.6);
    footerBg.fillRect(0, 570, 800, 30);
    footerBg.setDepth(3000);

    const instrText = this.add.text(400, 585, 'Click on items to interact  |  Press ESC to exit', {
      fontSize: '11px',
      color: '#888888',
    }).setOrigin(0.5).setDepth(3001);
    
    // Create mini-map in bottom-left corner (smaller for room view)
    this.miniMap = new MiniMap(this, {
      x: 15,
      y: 600 - 100 - 45, // Above the footer
      width: 100,
      height: 100,
      worldWidth: 384,
      worldHeight: 272,
      currentLocation: 'ark-central', // We're inside the village
    });
    
    // Store UI elements for camera configuration
    this.uiElements = [titleBg, titleText, descText, backBtnBg, backBtnText, backHitArea, badgeBg, badgeText, footerBg, instrText];
    
    // Make main camera ignore UI elements (they'll only show on UI camera)
    this.cameras.main.ignore(this.uiElements);
  }

  // Configure UI camera to ignore game world objects (called after room and agent are created)
  private configureUICameraIgnore(): void {
    if (!this.uiCamera) return;
    
    // Collect all game world objects that the UI camera should ignore
    const gameObjects: GameObjects.GameObject[] = [];
    
    // Add tilemap layers
    if (this.map) {
      this.map.layers.forEach(layerData => {
        if (layerData.tilemapLayer) {
          gameObjects.push(layerData.tilemapLayer);
        }
      });
    }
    
    // Add agent sprite (but NOT name tag - it's now in screen space for crisp rendering)
    if (this.agentSprite) gameObjects.push(this.agentSprite);
    
    // Add interactive object hit areas
    this.interactiveObjects.forEach(({ hitArea }) => {
      gameObjects.push(hitArea);
    });
    
    // Make UI camera ignore all game objects
    if (gameObjects.length > 0) {
      this.uiCamera.ignore(gameObjects);
    }
  }

  private setupInput(): void {
    this.input.keyboard?.on('keydown-ESC', () => {
      this.exitRoom();
    });
  }

  // Walk to an object and then speak
  private walkToAndSpeak(targetX: number, targetY: number, message: string): void {
    // If already moving, cancel current movement
    if (this.isAgentMoving) {
      this.tweens.killTweensOf(this.agentSprite);
      this.isAgentMoving = false;
    }
    
    // Hide current speech bubble
    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }
    
    // Calculate distance and duration
    const dx = targetX - this.agentSprite.x;
    const dy = targetY - this.agentSprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Stop near the object, not on top of it
    const stopDistance = 20;
    const ratio = Math.max(0, (distance - stopDistance) / distance);
    const finalX = this.agentSprite.x + dx * ratio;
    const finalY = this.agentSprite.y + dy * ratio;
    
    // Determine direction for animation
    if (Math.abs(dx) > Math.abs(dy)) {
      this.agentDirection = dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT;
    } else {
      this.agentDirection = dy > 0 ? DIRECTION.DOWN : DIRECTION.UP;
    }
    
    // Start walking animation
    this.playWalkAnimation();
    this.isAgentMoving = true;
    
    // Calculate duration based on distance and speed
    const duration = (distance / this.moveSpeed) * 1000;
    
    // If very close, just show the message
    if (distance < stopDistance) {
      this.isAgentMoving = false;
      this.playIdleAnimation();
      this.showSpeechBubble(message);
      return;
    }
    
    // Tween to the target
    this.tweens.add({
      targets: this.agentSprite,
      x: finalX,
      y: finalY,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        this.isAgentMoving = false;
        // Face toward the object
        this.faceToward(targetX, targetY);
        this.playIdleAnimation();
        // Show message after arriving
        this.showSpeechBubble(message);
      }
    });
  }

  private faceToward(targetX: number, targetY: number): void {
    const dx = targetX - this.agentSprite.x;
    const dy = targetY - this.agentSprite.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      this.agentDirection = dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT;
    } else {
      this.agentDirection = dy > 0 ? DIRECTION.DOWN : DIRECTION.UP;
    }
  }

  private getDirectionText(): string {
    switch (this.agentDirection) {
      case DIRECTION.UP: return 'up';
      case DIRECTION.DOWN: return 'down';
      case DIRECTION.LEFT: return 'left';
      case DIRECTION.RIGHT: return 'right';
      default: return 'down';
    }
  }

  private playWalkAnimation(): void {
    const agentConfig = AGENTS[this.agentType as keyof typeof AGENTS];
    const dirText = this.getDirectionText();
    const animKey = `${agentConfig.sprite}-walk-${dirText}`;
    
    // Create animation if it doesn't exist
    if (!this.anims.exists(animKey)) {
      // Get frame offset based on direction
      let startFrame = 0;
      switch (this.agentDirection) {
        case DIRECTION.DOWN: startFrame = 0; break;
        case DIRECTION.LEFT: startFrame = 3; break;
        case DIRECTION.RIGHT: startFrame = 6; break;
        case DIRECTION.UP: startFrame = 9; break;
      }
      
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(agentConfig.sprite, { 
          start: startFrame, 
          end: startFrame + 2 
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
    
    this.agentSprite.play(animKey, true);
  }

  private playIdleAnimation(): void {
    const agentConfig = AGENTS[this.agentType as keyof typeof AGENTS];
    const dirText = this.getDirectionText();
    const animKey = `${agentConfig.sprite}-walk-${dirText}`;
    
    // Create animation if it doesn't exist
    if (!this.anims.exists(animKey)) {
      let startFrame = 0;
      switch (this.agentDirection) {
        case DIRECTION.DOWN: startFrame = 0; break;
        case DIRECTION.LEFT: startFrame = 3; break;
        case DIRECTION.RIGHT: startFrame = 6; break;
        case DIRECTION.UP: startFrame = 9; break;
      }
      
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(agentConfig.sprite, { 
          start: startFrame, 
          end: startFrame + 2 
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
    
    // Play animation and stop on first frame
    this.agentSprite.play(animKey, true);
    this.agentSprite.anims.stop();
    if (this.agentSprite.anims.currentAnim) {
      this.agentSprite.setFrame(this.agentSprite.anims.currentAnim.frames[0].frame.name);
    }
  }

  private exitRoom(): void {
    const agentConfig = AGENTS[this.agentType as keyof typeof AGENTS];
    
    // Cleanup
    this.interactiveObjects.forEach(({ hitArea }) => hitArea.destroy());
    this.interactiveObjects = [];
    
    // Cleanup mini-map
    if (this.miniMap) {
      this.miniMap.destroy();
      this.miniMap = null;
    }
    
    // Update URL to town
    window.history.pushState({}, '', '/town');
    
    if ((window as any).showTransition) {
      (window as any).showTransition(
        `/assets/sprites/${agentConfig.sprite}.png`,
        'Returning to town...',
        () => {
          this.scene.start('town-scene');
        }
      );
    } else {
      this.scene.start('town-scene');
    }
  }

  update(): void {
    // Update name tag to follow agent (in screen space, clamped to safe zone)
    if (this.agentNameTag && this.agentSprite) {
      const screenPos = this.worldToScreen(this.agentSprite.x, this.agentSprite.y - 35);
      const clampedPos = this.clampToSafeZone(
        screenPos.x, 
        screenPos.y, 
        this.agentNameTag.width, 
        this.agentNameTag.height
      );
      this.agentNameTag.setPosition(clampedPos.x, clampedPos.y);
    }
    
    // Update speech bubble to follow agent (in screen space, clamped to safe zone)
    if (this.speechBubble && this.agentSprite) {
      const screenPos = this.worldToScreen(this.agentSprite.x, this.agentSprite.y - 60);
      const clampedPos = this.clampToSafeZone(
        screenPos.x, 
        screenPos.y, 
        this.speechBubbleSize.width, 
        this.speechBubbleSize.height
      );
      this.speechBubble.setPosition(clampedPos.x, clampedPos.y);
    }
  }
}
