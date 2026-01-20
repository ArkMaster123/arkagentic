import { Scene, Tilemaps, GameObjects, Physics } from 'phaser';
import { Player } from '../classes/Player';
import { MultiplayerManager } from '../classes/MultiplayerManager';
import { MiniMap } from '../classes/MiniMap';
import { MobileControlsManager, isMobileDevice } from '../classes/MobileControls';
import { GameBridge, StorageService } from '../core';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';
import BoardPlugin from 'phaser3-rex-plugins/plugins/board-plugin';
import type { Board } from 'phaser3-rex-plugins/plugins/board-components';

// Type for Tiled object properties
interface TiledProperty {
  name: string;
  type: string;
  value: string | number | boolean;
}

// Type for interactive objects in the museum
interface InteractiveObject {
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  properties?: TiledProperty[];
}

interface SceneData {
  playerAvatar?: string;
  playerName?: string;
  fromTown?: boolean;
}

/**
 * ChatbotRuinsScene - A large museum showcasing the history of LLMs
 * From Transformers (2017) to Claude (2023) and beyond
 */
export class ChatbotRuinsScene extends Scene {
  private map!: Tilemaps.Tilemap;
  private floorLayer!: Tilemaps.TilemapLayer;
  private wallsLayer!: Tilemaps.TilemapLayer;
  private furnitureLayer!: Tilemaps.TilemapLayer;
  
  public rexUI!: UIPlugin;
  public rexBoard!: BoardPlugin;
  public board!: Board;
  
  // Track blocked tiles
  private blockedTiles: Set<string> = new Set();
  
  // Player
  private player: Player | null = null;
  private playerAvatar: string = 'brendan';
  private playerName: string = 'Player';
  
  // Multiplayer
  private multiplayer: MultiplayerManager | null = null;
  
  // Mini-map
  private miniMap: MiniMap | null = null;
  
  // Mobile controls
  private mobileControls: MobileControlsManager | null = null;
  
  // Interactive exhibits
  private interactiveObjects: { obj: InteractiveObject; hitArea: GameObjects.Rectangle }[] = [];
  
  // UI elements
  private titleText: GameObjects.Text | null = null;
  private exhibitInfoPanel: GameObjects.Container | null = null;
  
  // Exit zone detection
  private nearExit: boolean = false;
  private exitPrompt: GameObjects.Container | null = null;

  constructor() {
    super('chatbotruins-scene');
  }

  init(data: SceneData): void {
    if (data?.playerAvatar) {
      this.playerAvatar = data.playerAvatar;
      this.playerName = data.playerName || 'Player';
    } else {
      const storedUser = localStorage.getItem('arkagentic_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        this.playerAvatar = user.avatar_sprite || 'brendan';
        this.playerName = user.display_name || 'Player';
      }
    }
  }

  create(): void {
    this.initMap();
    this.initBoard();
    this.initPlayer();
    this.initCamera();
    this.setupInteractiveObjects();
    this.initUI();
    this.initMultiplayer();
    this.initMobileControls();
    this.setupInput();
    
    // Hide transition after ready
    this.time.delayedCall(500, () => {
      GameBridge.hideTransition();
    });
  }

  private initMap(): void {
    this.map = this.make.tilemap({ key: 'room-chatbotruins' });
    
    // Add all the ruins tilesets (32x32 pixel tiles)
    // These match the tilesets defined in the JSON with their firstgid values
    const grassTileset = this.map.addTilesetImage('grass', 'ruins-grass');      // firstgid: 1
    const stoneTileset = this.map.addTilesetImage('stone', 'ruins-stone');      // firstgid: 65
    const wallTileset = this.map.addTilesetImage('wall', 'ruins-wall');         // firstgid: 129
    const structTileset = this.map.addTilesetImage('struct', 'ruins-struct');   // firstgid: 385
    const propsTileset = this.map.addTilesetImage('props', 'ruins-props');      // firstgid: 641
    const plantTileset = this.map.addTilesetImage('plant', 'ruins-plant');      // firstgid: 897
    
    if (!grassTileset) {
      console.error('Failed to load grass tileset for ChatbotRuins');
      return;
    }

    // Collect all available tilesets for layers that may use multiple
    const allTilesets = [grassTileset, stoneTileset, wallTileset, structTileset, propsTileset, plantTileset].filter(Boolean) as Tilemaps.Tileset[];
    
    // Create layers with all tilesets so any tile ID can be rendered
    this.floorLayer = this.map.createLayer('ground', allTilesets, 0, 0)!;
    this.wallsLayer = this.map.createLayer('walls', allTilesets, 0, 0)!;
    this.furnitureLayer = this.map.createLayer('props', allTilesets, 0, 0)!;
    
    // Create plants layer if it exists
    const plantsLayer = this.map.createLayer('plants', allTilesets, 0, 0);

    // Set depth
    if (this.floorLayer) this.floorLayer.setDepth(0);
    if (this.wallsLayer) this.wallsLayer.setDepth(1);
    if (this.furnitureLayer) this.furnitureLayer.setDepth(2);
    if (plantsLayer) plantsLayer.setDepth(3);

    // Set collision on walls layer (any non-empty tile)
    if (this.wallsLayer) {
      this.wallsLayer.setCollisionByExclusion([-1, 0]);
    }
    
    console.log(`[ChatbotRuins] Map created: ${this.map.widthInPixels}x${this.map.heightInPixels} pixels`);
  }

  private initBoard(): void {
    // This tileset uses 32x32 pixel tiles
    const tileWidth = 32;
    const tileHeight = 32;
    const gridWidth = this.map.width;
    const gridHeight = this.map.height;

    this.board = this.rexBoard.add.board({
      grid: {
        gridType: 'quadGrid',
        x: tileWidth / 2,
        y: tileHeight / 2,
        cellWidth: tileWidth,
        cellHeight: tileHeight,
        type: 'orthogonal',
      },
      width: gridWidth,
      height: gridHeight,
    });

    this.buildBlockedTiles();
    console.log(`[ChatbotRuins] Board: ${gridWidth}x${gridHeight}, ${this.blockedTiles.size} blocked`);
  }

  private buildBlockedTiles(): void {
    this.blockedTiles.clear();

    // Add walls as blocked
    if (this.wallsLayer) {
      this.wallsLayer.forEachTile((tile) => {
        if (tile && tile.index !== -1 && tile.index !== 0) {
          this.blockedTiles.add(`${tile.x},${tile.y}`);
        }
      });
    }
  }

  public isTileWalkable(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= this.map.width || tileY >= this.map.height) {
      return false;
    }
    return !this.blockedTiles.has(`${tileX},${tileY}`);
  }

  public worldToTile(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / 32),
      y: Math.floor(worldY / 32),
    };
  }

  public tileToWorld(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: tileX * 32 + 16,
      y: tileY * 32 + 16,
    };
  }

  private initPlayer(): void {
    // Get spawn point from tilemap
    let spawnX = this.map.widthInPixels / 2;
    let spawnY = this.map.heightInPixels - 80;

    const objectLayer = this.map.getObjectLayer('objects');
    if (objectLayer) {
      const spawn = objectLayer.objects.find((obj) => obj.type === 'spawn');
      if (spawn && spawn.x !== undefined && spawn.y !== undefined) {
        spawnX = spawn.x;
        spawnY = spawn.y;
      }
    }
    
    this.player = new Player(this, spawnX, spawnY, this.playerAvatar, this.playerName);
    this.player.setDepth(15);
    
    // Add collision with walls
    if (this.wallsLayer) {
      this.physics.add.collider(this.player, this.wallsLayer);
    }
    
    // Set up position callback for multiplayer
    this.player.onPositionChange = (x, y, direction, isMoving, animation) => {
      if (this.multiplayer) {
        this.multiplayer.sendPosition(x, y, direction, isMoving, animation);
      }
    };
    
    console.log(`[ChatbotRuins] Player spawned at ${spawnX}, ${spawnY}`);
  }

  private initCamera(): void {
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;

    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

    if (this.player) {
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }
    
    this.cameras.main.setZoom(2);
    this.input.manager.canvas.style.cursor = 'default';
  }

  private setupInteractiveObjects(): void {
    if (!this.map) return;

    const objectLayer = this.map.getObjectLayer('objects');
    if (!objectLayer) return;

    objectLayer.objects.forEach((obj) => {
      if (obj.type === 'interactive' && obj.x !== undefined && obj.y !== undefined) {
        const x = obj.x + (obj.width || 0) / 2;
        const y = obj.y + (obj.height || 0) / 2;
        const w = obj.width || 32;
        const h = obj.height || 32;
        
        // Create invisible hit area
        const hitArea = this.add.rectangle(x, y, w, h, 0x4a90d9, 0.1);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.setDepth(10);

        // Get message from properties
        const messageProp = obj.properties?.find((p: TiledProperty) => p.name === 'message');
        const message = messageProp?.value as string || `This is ${obj.name}`;

        // Hover effects
        hitArea.on('pointerover', () => {
          hitArea.setFillStyle(0x4a90d9, 0.3);
          this.showExhibitTooltip(x, y - h / 2 - 10, obj.name || 'Exhibit');
        });

        hitArea.on('pointerout', () => {
          hitArea.setFillStyle(0x4a90d9, 0.1);
          this.hideExhibitTooltip();
        });

        hitArea.on('pointerdown', () => {
          this.showExhibitInfo(obj.name || 'Exhibit', message);
        });

        this.interactiveObjects.push({ obj, hitArea });
      }
    });
    
    console.log(`[ChatbotRuins] Created ${this.interactiveObjects.length} interactive exhibits`);
  }

  private exhibitTooltip: GameObjects.Container | null = null;

  private showExhibitTooltip(worldX: number, worldY: number, text: string): void {
    this.hideExhibitTooltip();
    
    const bg = this.add.graphics();
    const padding = 8;
    
    const label = this.add.text(0, 0, text, {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    const width = Math.max(80, label.width + padding * 2);
    const height = label.height + padding * 2;
    
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
    bg.lineStyle(1, 0x4a90d9);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);
    
    this.exhibitTooltip = this.add.container(worldX, worldY, [bg, label]);
    this.exhibitTooltip.setDepth(500);
  }

  private hideExhibitTooltip(): void {
    if (this.exhibitTooltip) {
      this.exhibitTooltip.destroy();
      this.exhibitTooltip = null;
    }
  }

  private showExhibitInfo(title: string, message: string): void {
    // Remove existing panel
    if (this.exhibitInfoPanel) {
      this.exhibitInfoPanel.destroy();
      this.exhibitInfoPanel = null;
    }

    // Create info panel at screen center (fixed position)
    const screenCenterX = this.cameras.main.centerX;
    const screenCenterY = this.cameras.main.centerY;
    
    // Get camera scroll to position in world space
    const worldX = this.cameras.main.scrollX + screenCenterX / this.cameras.main.zoom;
    const worldY = this.cameras.main.scrollY + screenCenterY / this.cameras.main.zoom;

    this.exhibitInfoPanel = this.add.container(worldX, worldY);
    this.exhibitInfoPanel.setDepth(1000);
    this.exhibitInfoPanel.setScrollFactor(0); // Fixed to camera

    // Background
    const bg = this.add.graphics();
    const panelWidth = 280;
    const panelHeight = 180;
    
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 8);
    bg.lineStyle(2, 0x4a90d9);
    bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 8);

    // Title
    const titleText = this.add.text(0, -panelHeight / 2 + 20, title, {
      fontSize: '12px',
      color: '#4a90d9',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Message
    const msgText = this.add.text(0, 10, message, {
      fontSize: '9px',
      color: '#ffffff',
      wordWrap: { width: panelWidth - 30 },
      lineSpacing: 3,
      align: 'center',
    }).setOrigin(0.5);

    // Close hint
    const closeHint = this.add.text(0, panelHeight / 2 - 20, '[Click anywhere to close]', {
      fontSize: '8px',
      color: '#888888',
    }).setOrigin(0.5);

    this.exhibitInfoPanel.add([bg, titleText, msgText, closeHint]);

    // Click anywhere to close
    this.input.once('pointerdown', () => {
      if (this.exhibitInfoPanel) {
        this.exhibitInfoPanel.destroy();
        this.exhibitInfoPanel = null;
      }
    });
  }

  private initUI(): void {
    // Create title at top of screen (fixed to camera)
    const uiContainer = this.add.container(0, 0);
    uiContainer.setScrollFactor(0);
    uiContainer.setDepth(2000);

    // Title background
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x000000, 0.7);
    titleBg.fillRect(0, 0, 400, 30);
    titleBg.fillStyle(0x4a90d9, 1);
    titleBg.fillRect(0, 0, 400, 3);

    // Title text
    this.titleText = this.add.text(200, 15, 'CHATBOT RUINS - Museum of LLM History', {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    uiContainer.add([titleBg, this.titleText]);

    // Back button
    const backBtnBg = this.add.graphics();
    backBtnBg.fillStyle(0xe94560, 1);
    backBtnBg.fillRoundedRect(10, 8, 60, 16, 4);
    
    const backBtnText = this.add.text(40, 16, '< Exit', {
      fontSize: '8px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const backHitArea = this.add.rectangle(40, 16, 60, 16, 0x000000, 0);
    backHitArea.setInteractive({ useHandCursor: true });
    backHitArea.on('pointerdown', () => this.exitMuseum());

    uiContainer.add([backBtnBg, backBtnText, backHitArea]);

    // Instructions at bottom
    const instrBg = this.add.graphics();
    instrBg.fillStyle(0x000000, 0.6);
    instrBg.fillRect(0, 270, 400, 30);
    
    const instrText = this.add.text(200, 285, 'WASD to move | Click exhibits to learn | ESC to exit', {
      fontSize: '8px',
      color: '#888888',
    }).setOrigin(0.5);

    uiContainer.add([instrBg, instrText]);

    // Mini-map
    this.miniMap = new MiniMap(this, {
      x: 15,
      y: 200,
      width: 80,
      height: 60,
      worldWidth: this.map.widthInPixels,
      worldHeight: this.map.heightInPixels,
      currentLocation: 'chatbotruins',
    });
  }

  private async initMultiplayer(): Promise<void> {
    if (GameBridge.multiplayerManager && GameBridge.multiplayerManager.isOnline()) {
      console.log('[ChatbotRuins] Reusing existing multiplayer connection');
      this.multiplayer = GameBridge.multiplayerManager;
      this.multiplayer.transferToScene(this);
      
      if (this.multiplayer.getCurrentRoom() !== 'chatbotruins') {
        this.multiplayer.changeRoom('chatbotruins');
      }
      
      if (this.player) {
        this.player.onPositionChange = (x, y, direction, isMoving, animation) => {
          if (this.multiplayer) {
            this.multiplayer.sendPosition(x, y, direction, isMoving, animation);
          }
        };
      }
      return;
    }
    
    // Create new connection
    this.multiplayer = new MultiplayerManager(this);
    GameBridge.multiplayerManager = this.multiplayer;
    
    const session = StorageService.getSessionCredentials();
    const connected = await this.multiplayer.connect('chatbotruins', {
      displayName: this.playerName,
      avatarSprite: this.playerAvatar,
      userId: session?.userId,
    });
    
    if (connected) {
      console.log('[ChatbotRuins] Multiplayer connected!');
    } else {
      console.log('[ChatbotRuins] Playing offline');
    }
  }

  private initMobileControls(): void {
    if (!isMobileDevice()) return;
    
    this.mobileControls = new MobileControlsManager(this, true);
    
    if (this.player) {
      this.player.setMobileControls(this.mobileControls);
    }
    
    this.mobileControls.setCallbacks({
      onActionA: () => {
        // A = primary action
        if (this.nearExit) {
          this.exitMuseum();
        }
      },
      onActionB: () => {
        // B = exit/cancel
        this.exitMuseum();
      },
    });
    
    console.log('[ChatbotRuins] Mobile controls initialized');
  }

  private setupInput(): void {
    // ESC to exit
    this.input.keyboard?.on('keydown-ESC', () => {
      this.exitMuseum();
    });
    
    // SPACE for interactions
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.nearExit) {
        this.exitMuseum();
      }
    });
  }

  private checkExitProximity(): void {
    if (!this.player || !this.map) return;

    const objectLayer = this.map.getObjectLayer('objects');
    if (!objectLayer) return;

    const exit = objectLayer.objects.find((obj) => obj.type === 'exit');
    if (!exit || exit.x === undefined || exit.y === undefined) return;

    const exitCenterX = exit.x + (exit.width || 0) / 2;
    const exitCenterY = exit.y + (exit.height || 0) / 2;
    
    const distance = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      exitCenterX, exitCenterY
    );

    const wasNear = this.nearExit;
    this.nearExit = distance < 40;

    if (this.nearExit !== wasNear) {
      this.updateExitPrompt();
    }
  }

  private updateExitPrompt(): void {
    if (this.exitPrompt) {
      this.exitPrompt.destroy();
      this.exitPrompt = null;
    }

    if (!this.nearExit || !this.player) return;

    const objectLayer = this.map.getObjectLayer('objects');
    if (!objectLayer) return;

    const exit = objectLayer.objects.find((obj) => obj.type === 'exit');
    if (!exit || exit.x === undefined || exit.y === undefined) return;

    const exitX = exit.x + (exit.width || 0) / 2;
    const exitY = exit.y - 20;

    this.exitPrompt = this.add.container(exitX, exitY);
    this.exitPrompt.setDepth(200);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-50, -12, 100, 24, 6);
    bg.lineStyle(1, 0xe94560);
    bg.strokeRoundedRect(-50, -12, 100, 24, 6);

    const text = this.add.text(0, 0, 'SPACE to Exit', {
      fontSize: '9px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.exitPrompt.add([bg, text]);

    // Pulse animation
    this.tweens.add({
      targets: this.exitPrompt,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private exitMuseum(): void {
    // Cleanup
    this.interactiveObjects.forEach(({ hitArea }) => hitArea.destroy());
    this.interactiveObjects = [];
    
    if (this.miniMap) {
      this.miniMap.destroy();
      this.miniMap = null;
    }
    
    if (this.mobileControls) {
      this.mobileControls.destroy();
      this.mobileControls = null;
    }

    // Change multiplayer room
    if (this.multiplayer) {
      this.multiplayer.changeRoom('town');
    }

    // Update URL
    window.history.pushState({}, '', '/town');

    // Transition back to town
    GameBridge.showTransition(
      `/assets/sprites/${this.playerAvatar}.png`,
      'Returning to town...',
      () => {
        this.scene.start('town-scene', {
          playerAvatar: this.playerAvatar,
          playerName: this.playerName,
        });
      }
    );
  }

  update(time: number, delta: number): void {
    // Update player
    if (this.player) {
      this.player.update();
      this.checkExitProximity();
    }

    // Update multiplayer
    if (this.multiplayer) {
      this.multiplayer.update();
    }
  }

  shutdown(): void {
    console.log('[ChatbotRuins] Scene shutting down');
    
    // Cleanup
    this.interactiveObjects.forEach(({ hitArea }) => hitArea.destroy());
    this.interactiveObjects = [];
    
    if (this.miniMap) {
      this.miniMap.destroy();
      this.miniMap = null;
    }
    
    if (this.mobileControls) {
      this.mobileControls.destroy();
      this.mobileControls = null;
    }
  }
}
