import { Scene, Tilemaps, GameObjects } from 'phaser';
import { AGENTS, AGENT_COLORS } from '../constants';
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
}

export class RoomScene extends Scene {
  private agentType: string = 'scout';
  private roomConfig!: typeof ROOM_CONFIGS.scout;
  private agentSprite!: GameObjects.Sprite;
  private agentNameTag!: GameObjects.Text;
  private speechBubble: GameObjects.Container | null = null;
  private map!: Tilemaps.Tilemap;
  private interactiveObjects: { obj: any; hitArea: GameObjects.Rectangle }[] = [];
  private roomContainer!: GameObjects.Container;
  private uiContainer!: GameObjects.Container;
  
  public rexUI!: UIPlugin;
  public rexBoard!: BoardPlugin;

  constructor() {
    super('room-scene');
  }

  init(data: RoomData): void {
    this.agentType = data.agentType || 'scout';
    this.roomConfig = ROOM_CONFIGS[this.agentType] || ROOM_CONFIGS.scout;
  }

  create(): void {
    // Create containers for layering
    this.roomContainer = this.add.container(0, 0);
    this.uiContainer = this.add.container(0, 0);
    this.uiContainer.setDepth(1000);
    
    // Create the room from tilemap
    this.createRoomFromTilemap();
    this.createAgent();
    this.setupInteractiveObjects();
    this.createUI();
    this.setupInput();
    
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
    
    // Add tileset - using the same tileset as town
    // The tileset name in the JSON is 'tileset', and we load the image as 'tiles'
    const tileset = this.map.addTilesetImage('tileset', 'tiles');
    
    if (!tileset) {
      console.error('Failed to load tileset for room');
      this.createFallbackRoom();
      return;
    }

    // Room is 24x17 tiles = 384x272 pixels at native size
    // We want it to fill most of the 800x600 screen
    // Calculate zoom to fit with some padding for UI
    const roomPixelWidth = this.map.widthInPixels;   // 384
    const roomPixelHeight = this.map.heightInPixels; // 272
    
    const availableWidth = 800 - 40;  // padding for UI
    const availableHeight = 600 - 120; // padding for title and footer
    
    const zoomX = availableWidth / roomPixelWidth;
    const zoomY = availableHeight / roomPixelHeight;
    const zoom = Math.min(zoomX, zoomY); // ~1.76
    
    // Create layers at origin, we'll position via container
    const floorLayer = this.map.createLayer('floor', tileset, 0, 0);
    const wallsLayer = this.map.createLayer('walls', tileset, 0, 0);
    const furnitureLayer = this.map.createLayer('furniture', tileset, 0, 0);

    // Set depth for proper layering
    if (floorLayer) floorLayer.setDepth(0);
    if (wallsLayer) wallsLayer.setDepth(1);
    if (furnitureLayer) furnitureLayer.setDepth(2);

    // Add layers to room container
    if (floorLayer) this.roomContainer.add(floorLayer);
    if (wallsLayer) this.roomContainer.add(wallsLayer);
    if (furnitureLayer) this.roomContainer.add(furnitureLayer);

    // Scale and center the room container
    this.roomContainer.setScale(zoom);
    
    const scaledWidth = roomPixelWidth * zoom;
    const scaledHeight = roomPixelHeight * zoom;
    const offsetX = (800 - scaledWidth) / 2;
    const offsetY = 70 + (availableHeight - scaledHeight) / 2; // 70px for title area
    
    this.roomContainer.setPosition(offsetX, offsetY);

    // Store zoom and offset for interactive objects
    (this as any).roomZoom = zoom;
    (this as any).roomOffsetX = offsetX;
    (this as any).roomOffsetY = offsetY;

    // Add room title (in UI container, not affected by zoom)
    const agentColor = AGENT_COLORS[this.agentType as keyof typeof AGENT_COLORS] || 0xe94560;
    
    // Room name sign background
    const signBg = this.add.graphics();
    signBg.fillStyle(0x000000, 0.8);
    signBg.fillRoundedRect(400 - 150, 15, 300, 50, 10);
    signBg.fillStyle(agentColor, 1);
    signBg.fillRect(400 - 150, 15, 300, 5);
    this.uiContainer.add(signBg);

    const titleText = this.add.text(400, 30, this.roomConfig.name, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.uiContainer.add(titleText);

    const descText = this.add.text(400, 50, this.roomConfig.description, {
      fontSize: '12px',
      color: '#aaaaaa',
    }).setOrigin(0.5, 0);
    this.uiContainer.add(descText);
  }

  private createFallbackRoom(): void {
    const graphics = this.add.graphics();
    const width = 24 * 16;
    const height = 17 * 16;
    
    const zoom = 1.7;
    const scaledWidth = width * zoom;
    const scaledHeight = height * zoom;
    const offsetX = (800 - scaledWidth) / 2;
    const offsetY = 70 + ((600 - 120) - scaledHeight) / 2;

    const agentColor = AGENT_COLORS[this.agentType as keyof typeof AGENT_COLORS] || 0xe94560;
    
    // Floor
    graphics.fillStyle(0x2c3e50, 1);
    graphics.fillRect(0, 0, width, height);

    // Walls
    graphics.fillStyle(0x1a252f, 1);
    graphics.fillRect(0, 0, width, 16);
    graphics.fillRect(0, 0, 16, height);
    graphics.fillRect(width - 16, 0, 16, height);
    graphics.fillRect(0, height - 16, width, 16);

    this.roomContainer.add(graphics);
    this.roomContainer.setScale(zoom);
    this.roomContainer.setPosition(offsetX, offsetY);

    (this as any).roomZoom = zoom;
    (this as any).roomOffsetX = offsetX;
    (this as any).roomOffsetY = offsetY;

    // Title
    const signBg = this.add.graphics();
    signBg.fillStyle(0x000000, 0.8);
    signBg.fillRoundedRect(400 - 150, 15, 300, 50, 10);
    signBg.fillStyle(agentColor, 1);
    signBg.fillRect(400 - 150, 15, 300, 5);
    this.uiContainer.add(signBg);

    const titleText = this.add.text(400, 30, this.roomConfig.name, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.uiContainer.add(titleText);
  }

  private setupInteractiveObjects(): void {
    if (!this.map) return;

    const objectLayer = this.map.getObjectLayer('objects');
    if (!objectLayer) return;

    const zoom = (this as any).roomZoom || 1;
    const offsetX = (this as any).roomOffsetX || 0;
    const offsetY = (this as any).roomOffsetY || 0;

    objectLayer.objects.forEach((obj) => {
      if (obj.type === 'interactive' && obj.x !== undefined && obj.y !== undefined) {
        // Calculate screen position (accounting for zoom and offset)
        const x = offsetX + (obj.x + (obj.width || 0) / 2) * zoom;
        const y = offsetY + (obj.y + (obj.height || 0) / 2) * zoom;
        const w = (obj.width || 32) * zoom;
        const h = (obj.height || 32) * zoom;
        
        // Create invisible hit area in screen space
        const hitArea = this.add.rectangle(x, y, w, h, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.setDepth(500);

        // Get custom properties
        const actionProp = obj.properties?.find((p: any) => p.name === 'action');
        const messageProp = obj.properties?.find((p: any) => p.name === 'message');
        
        const message = messageProp?.value || `This is ${obj.name}`;

        // Hover effect
        hitArea.on('pointerover', () => {
          this.showItemTooltip(x, y - h / 2 - 15, obj.name || 'Item');
          hitArea.setFillStyle(0xffffff, 0.15);
        });

        hitArea.on('pointerout', () => {
          this.hideItemTooltip();
          hitArea.setFillStyle(0x000000, 0);
        });

        hitArea.on('pointerdown', () => {
          this.showSpeechBubble(message);
        });

        this.interactiveObjects.push({ obj, hitArea });
      }
    });
  }

  private tooltip: GameObjects.Container | null = null;

  private showItemTooltip(x: number, y: number, text: string): void {
    this.hideItemTooltip();
    
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
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    
    this.tooltip = this.add.container(x, y, [bg, label]);
    this.tooltip.setDepth(2000);
  }

  private hideItemTooltip(): void {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  private createAgent(): void {
    const zoom = (this as any).roomZoom || 1;
    const offsetX = (this as any).roomOffsetX || 0;
    const offsetY = (this as any).roomOffsetY || 0;
    
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
    
    // Convert to screen coordinates
    const screenX = offsetX + spawnX * zoom;
    const screenY = offsetY + spawnY * zoom;
    
    const agentConfig = AGENTS[this.agentType as keyof typeof AGENTS];
    
    // Create the sprite (scaled with the room)
    this.agentSprite = this.add.sprite(screenX, screenY, agentConfig.sprite);
    this.agentSprite.setScale(zoom * 1.5); // Slightly larger than tiles
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
    
    // Create name tag
    const agentColor = AGENT_COLORS[this.agentType as keyof typeof AGENT_COLORS];
    this.agentNameTag = this.add.text(
      screenX,
      screenY - 30 * zoom,
      `${agentConfig.emoji} ${agentConfig.name}`,
      {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#' + agentColor.toString(16).padStart(6, '0'),
        padding: { x: 6, y: 3 },
      }
    ).setOrigin(0.5, 1).setDepth(101);
    
    // Welcome message
    this.time.delayedCall(800, () => {
      this.showSpeechBubble(`Welcome to my space! I'm ${agentConfig.name}. Click on items to learn more!`);
    });
  }

  private showSpeechBubble(text: string): void {
    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }
    
    const x = this.agentSprite.x;
    const y = this.agentSprite.y - 60;
    
    this.speechBubble = this.add.container(x, y);
    this.speechBubble.setDepth(2000);
    
    const bg = this.add.graphics();
    const padding = 12;
    const maxWidth = 220;
    
    const speechText = this.add.text(0, 0, text, {
      fontSize: '13px',
      color: '#ffffff',
      wordWrap: { width: maxWidth - padding * 2 },
      lineSpacing: 3,
    }).setOrigin(0.5);
    
    const width = Math.min(maxWidth, speechText.width + padding * 2);
    const height = speechText.height + padding * 2;
    
    const agentColor = AGENT_COLORS[this.agentType as keyof typeof AGENT_COLORS];
    bg.fillStyle(agentColor, 0.95);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    bg.fillTriangle(0, height / 2, -10, height / 2 + 12, 10, height / 2);
    
    this.speechBubble.add([bg, speechText]);
    
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

  private createUI(): void {
    // Back button
    const backBtn = this.add.container(20, 20);
    
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xe94560, 1);
    btnBg.fillRoundedRect(0, 0, 140, 40, 10);
    
    const btnText = this.add.text(70, 20, '< Back to Town', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    backBtn.add([btnBg, btnText]);
    backBtn.setSize(140, 40);
    backBtn.setInteractive({ useHandCursor: true });
    this.uiContainer.add(backBtn);
    
    backBtn.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0xff6b8a, 1);
      btnBg.fillRoundedRect(0, 0, 140, 40, 10);
    });
    
    backBtn.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0xe94560, 1);
      btnBg.fillRoundedRect(0, 0, 140, 40, 10);
    });
    
    backBtn.on('pointerdown', () => this.exitRoom());

    // Agent badge (top right)
    const agentConfig = AGENTS[this.agentType as keyof typeof AGENTS];
    const agentColor = AGENT_COLORS[this.agentType as keyof typeof AGENT_COLORS];
    
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(agentColor, 0.9);
    badgeBg.fillRoundedRect(800 - 160, 20, 140, 40, 10);
    this.uiContainer.add(badgeBg);
    
    const badgeText = this.add.text(800 - 90, 40, `${agentConfig.emoji} ${agentConfig.name}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.uiContainer.add(badgeText);

    // Instructions at bottom
    const instrText = this.add.text(400, 580, 'Click on items to interact  |  Press ESC to exit', {
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(0.5);
    this.uiContainer.add(instrText);
  }

  private setupInput(): void {
    this.input.keyboard?.on('keydown-ESC', () => {
      this.exitRoom();
    });
  }

  private exitRoom(): void {
    const agentConfig = AGENTS[this.agentType as keyof typeof AGENTS];
    
    // Cleanup
    this.interactiveObjects.forEach(({ hitArea }) => hitArea.destroy());
    this.interactiveObjects = [];
    
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
    // Update name tag to follow agent
    if (this.agentNameTag && this.agentSprite) {
      const zoom = (this as any).roomZoom || 1;
      this.agentNameTag.setPosition(this.agentSprite.x, this.agentSprite.y - 30 * zoom);
    }
  }
}
