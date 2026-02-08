import { Scene, Tilemaps, GameObjects } from 'phaser';
import { Player } from '../classes/Player';
import { MultiplayerManager } from '../classes/MultiplayerManager';
import { MiniMap } from '../classes/MiniMap';
import { MobileControlsManager, isMobileDevice } from '../classes/MobileControls';
import { GameBridge, StorageService } from '../core';
import { GuidedTourController } from './GuidedTourController';
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
 * ChatbotRuinsScene - A museum showcasing the history of LLMs
 * Uses 32x32 pixel "ruins" tilesets
 */
export class ChatbotRuinsScene extends Scene {
  // Map & layers
  private map!: Tilemaps.Tilemap;
  private groundLayer!: Tilemaps.TilemapLayer;
  private wallsLayer!: Tilemaps.TilemapLayer;
  private propsLayer!: Tilemaps.TilemapLayer;
  private plantsLayer!: Tilemaps.TilemapLayer | null;
  
  // Rex plugins
  public rexUI!: UIPlugin;
  public rexBoard!: BoardPlugin;
  public board!: Board;
  
  // Track blocked tiles for pathfinding
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

  // Museum display graphics (programmatic)
  private exhibitDisplays: GameObjects.GameObject[] = [];
  
  // Tooltip
  private exhibitTooltip: GameObjects.Container | null = null;
  
  // Info panel
  private exhibitInfoPanel: GameObjects.Container | null = null;
  
  // Exit zone detection
  private nearExit: boolean = false;
  private exitPrompt: GameObjects.Container | null = null;

  // Guided tour
  private tourController: GuidedTourController | null = null;
  private isTourMode: boolean = false;

  // Constants
  private readonly TILE_SIZE = 32;

  // Public getter for player (used by GuidedTourController for camera switching)
  get playerRef(): Phaser.GameObjects.Sprite | null { return this.player; }

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
    this.cameras.main.setBackgroundColor('#111111');
    this.createMap();
    this.createBoard();
    this.drawWallBorderGlow();
    this.drawFloorGuidePath();
    this.createPlayer();

    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.setupCamera();
    this.setupInteractiveObjects();
    this.createVFX();
    this.createUI();
    this.initMultiplayer();
    this.initMobileControls();
    this.setupInput();

    // Show tour choice dialog
    this.showTourChoiceDialog();

    // Hide transition after ready
    this.time.delayedCall(500, () => {
      GameBridge.hideTransition();
    });

    console.log('[ChatbotRuins] Scene created successfully');
  }

  /**
   * Create the tilemap and all layers
   */
  private createMap(): void {
    // Create tilemap from JSON
    this.map = this.make.tilemap({ key: 'room-chatbotruins' });

    // Set physics world bounds to match map (default 800x600 clamps player via setCollideWorldBounds)
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    // Add all tilesets — force 32x32 tile size so Phaser computes correct GID ranges
    const grassTileset = this.map.addTilesetImage('grass', 'ruins-grass', 32, 32, 0, 0);
    const stoneTileset = this.map.addTilesetImage('stone', 'ruins-stone', 32, 32, 0, 0);
    const wallTileset = this.map.addTilesetImage('wall', 'ruins-wall', 32, 32, 0, 0);
    const structTileset = this.map.addTilesetImage('struct', 'ruins-struct', 32, 32, 0, 0);
    const propsTileset = this.map.addTilesetImage('props', 'ruins-props', 32, 32, 0, 0);
    const plantTileset = this.map.addTilesetImage('plant', 'ruins-plant', 32, 32, 0, 0);
    
    // Validate tilesets loaded
    if (!stoneTileset || !wallTileset) {
      console.error('[ChatbotRuins] Failed to load required tilesets');
      return;
    }

    // Collect all tilesets for layers, sorted by firstgid
    const allTilesets = [
      grassTileset, stoneTileset, wallTileset, 
      structTileset, propsTileset, plantTileset
    ].filter(Boolean) as Tilemaps.Tileset[];
    allTilesets.sort((a, b) => a.firstgid - b.firstgid);
    
    // Create layers in order (bottom to top)
    // Layer names must match the JSON file exactly
    this.groundLayer = this.map.createLayer('ground', allTilesets, 0, 0)!;
    this.wallsLayer = this.map.createLayer('walls', allTilesets, 0, 0)!;
    this.propsLayer = this.map.createLayer('props', allTilesets, 0, 0)!;
    this.plantsLayer = this.map.createLayer('plants', allTilesets, 0, 0);

    // Set layer depths
    if (this.groundLayer) this.groundLayer.setDepth(0);
    if (this.wallsLayer) this.wallsLayer.setDepth(1);
    if (this.propsLayer) this.propsLayer.setDepth(2);
    if (this.plantsLayer) this.plantsLayer.setDepth(3);

    // Set collision on walls layer - any non-zero tile blocks
    if (this.wallsLayer) {
      this.wallsLayer.setCollisionByExclusion([-1, 0]);
    }
    
    console.log(`[ChatbotRuins] Map: ${this.map.width}x${this.map.height} tiles, ${this.map.widthInPixels}x${this.map.heightInPixels} pixels`);
    console.log(`[ChatbotRuins] Tilesets loaded:`, this.map.tilesets.map(t => `${t.name}(gid:${t.firstgid})`));
    console.log(`[ChatbotRuins] Ground layer:`, this.groundLayer ? 'OK' : 'MISSING');
    console.log(`[ChatbotRuins] Walls layer:`, this.wallsLayer ? 'OK' : 'MISSING');
    
    // Debug: verify tileset GID ranges and texture sources
    for (const ts of allTilesets) {
      console.log(`[ChatbotRuins] Tileset ${ts.name}: firstgid=${ts.firstgid}, total=${ts.total}, range=[${ts.firstgid}..${ts.firstgid + ts.total - 1}], tile=${ts.tileWidth}x${ts.tileHeight}`);
    }
    // Verify texture keys aren't aliased
    const grassSrc = (this.textures.get('ruins-grass').getSourceImage() as HTMLImageElement).src;
    const stoneSrc = (this.textures.get('ruins-stone').getSourceImage() as HTMLImageElement).src;
    console.log(`[ChatbotRuins] ruins-grass texture: ${grassSrc}`);
    console.log(`[ChatbotRuins] ruins-stone texture: ${stoneSrc}`);
    console.log(`[ChatbotRuins] Textures different: ${grassSrc !== stoneSrc}`);

    if (this.groundLayer) {
      const spawnTileX = Math.floor(this.map.width / 2);
      const spawnTileY = this.map.height - 5;
      const tile = this.groundLayer.getTileAt(spawnTileX, spawnTileY);
      if (tile) {
        const tsImg = tile.tileset ? (this.textures.get((tile.tileset as any).image?.key || 'unknown').getSourceImage() as HTMLImageElement).src : 'none';
        console.log(`[ChatbotRuins] Spawn tile (${spawnTileX},${spawnTileY}): gid=${tile.index}, tileset=${tile.tileset?.name}, texture=${tsImg}`);
      }
    }
  }

  /**
   * Create the board for pathfinding
   */
  private createBoard(): void {
    this.board = this.rexBoard.add.board({
      grid: {
        gridType: 'quadGrid',
        x: this.TILE_SIZE / 2,
        y: this.TILE_SIZE / 2,
        cellWidth: this.TILE_SIZE,
        cellHeight: this.TILE_SIZE,
        type: 'orthogonal',
      },
      width: this.map.width,
      height: this.map.height,
    });

    this.buildBlockedTiles();
    console.log(`[ChatbotRuins] Board: ${this.map.width}x${this.map.height}, ${this.blockedTiles.size} blocked tiles`);
  }

  /**
   * Build set of blocked tiles from walls layer
   */
  private buildBlockedTiles(): void {
    this.blockedTiles.clear();

    if (this.wallsLayer) {
      this.wallsLayer.forEachTile((tile) => {
        if (tile && tile.index !== -1 && tile.index !== 0) {
          this.blockedTiles.add(`${tile.x},${tile.y}`);
        }
      });
    }
  }

  /**
   * Check if a tile is walkable
   */
  public isTileWalkable(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= this.map.width || tileY >= this.map.height) {
      return false;
    }
    return !this.blockedTiles.has(`${tileX},${tileY}`);
  }

  /**
   * Convert world coordinates to tile coordinates
   */
  public worldToTile(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / this.TILE_SIZE),
      y: Math.floor(worldY / this.TILE_SIZE),
    };
  }

  /**
   * Convert tile coordinates to world coordinates (center of tile)
   */
  public tileToWorld(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: tileX * this.TILE_SIZE + this.TILE_SIZE / 2,
      y: tileY * this.TILE_SIZE + this.TILE_SIZE / 2,
    };
  }

  private drawWallBorderGlow(): void {
    // Museum barrier sprite sheet: 4x4 grid, 256x256 per cell
    const sheetKey = 'museum-barriers';
    const cell = 256;
    const tex = this.textures.get(sheetKey);

    // Create frames: stanchion posts (col 2-3, row 0) and corner ropes (row 1)
    const frameDefs: Record<string, { col: number; row: number }> = {
      'post-l': { col: 2, row: 0 },   // tall gold post (left-facing)
      'post-r': { col: 3, row: 0 },   // tall gold post (right-facing)
      'corner-bl': { col: 0, row: 1 }, // corner rope piece
      'corner-br': { col: 1, row: 1 }, // corner rope piece
    };
    for (const [name, pos] of Object.entries(frameDefs)) {
      if (!tex.has(name)) {
        tex.add(name, 0, pos.col * cell, pos.row * cell, cell, cell);
      }
    }

    const T = this.TILE_SIZE;
    const scale = (T / cell) * 0.9; // scale to ~90% of tile for visible gold posts

    // Collect edge info
    type EdgeInfo = { hasL: boolean; hasR: boolean; hasT: boolean; hasB: boolean };
    const edgeMap = new Map<string, EdgeInfo>();

    for (let ty = 0; ty < this.map.height; ty++) {
      for (let tx = 0; tx < this.map.width; tx++) {
        if (!this.isTileWalkable(tx, ty)) continue;
        const hasL = !this.isTileWalkable(tx - 1, ty);
        const hasR = !this.isTileWalkable(tx + 1, ty);
        const hasT = !this.isTileWalkable(tx, ty - 1);
        const hasB = !this.isTileWalkable(tx, ty + 1);
        if (hasL || hasR || hasT || hasB) {
          edgeMap.set(`${tx},${ty}`, { hasL, hasR, hasT, hasB });
        }
      }
    }

    // Draw velvet rope lines (graphics) along all edges
    const ropeGfx = this.add.graphics();
    ropeGfx.setDepth(4);

    for (const [key, info] of edgeMap) {
      const [txs, tys] = key.split(',');
      const tx = parseInt(txs);
      const ty = parseInt(tys);
      const px = tx * T;
      const py = ty * T;

      // Draw thick rope line + soft glow on each edge
      if (info.hasL) {
        ropeGfx.fillStyle(0x8b1a1a, 0.7);
        ropeGfx.fillRect(px, py, 3, T);
        ropeGfx.fillStyle(0xcc3344, 0.2);
        ropeGfx.fillRect(px + 3, py, 3, T);
      }
      if (info.hasR) {
        ropeGfx.fillStyle(0x8b1a1a, 0.7);
        ropeGfx.fillRect(px + T - 3, py, 3, T);
        ropeGfx.fillStyle(0xcc3344, 0.2);
        ropeGfx.fillRect(px + T - 6, py, 3, T);
      }
      if (info.hasT) {
        ropeGfx.fillStyle(0x8b1a1a, 0.7);
        ropeGfx.fillRect(px, py, T, 3);
        ropeGfx.fillStyle(0xcc3344, 0.2);
        ropeGfx.fillRect(px, py + 3, T, 3);
      }
      if (info.hasB) {
        ropeGfx.fillStyle(0x8b1a1a, 0.7);
        ropeGfx.fillRect(px, py + T - 3, T, 3);
        ropeGfx.fillStyle(0xcc3344, 0.2);
        ropeGfx.fillRect(px, py + T - 6, T, 3);
      }
    }
    this.exhibitDisplays.push(ropeGfx);

    // Place gold stanchion posts at corners and every 3 tiles along straight edges
    const placedPosts = new Set<string>();

    const placePost = (wx: number, wy: number) => {
      const pkey = `${wx},${wy}`;
      if (placedPosts.has(pkey)) return;
      placedPosts.add(pkey);
      const post = this.add.image(wx, wy, sheetKey, 'post-l');
      post.setScale(scale);
      post.setDepth(6);
      this.exhibitDisplays.push(post);
    };

    for (const [key, info] of edgeMap) {
      const [txs, tys] = key.split(',');
      const tx = parseInt(txs);
      const ty = parseInt(tys);
      const px = tx * T;
      const py = ty * T;

      // Place posts at outer corners (where 2 edges meet)
      if (info.hasL && info.hasT) placePost(px, py);
      if (info.hasR && info.hasT) placePost(px + T, py);
      if (info.hasL && info.hasB) placePost(px, py + T);
      if (info.hasR && info.hasB) placePost(px + T, py + T);

      // Place posts along straight edges every 3 tiles
      if (info.hasL && !info.hasT && !info.hasB && ty % 3 === 0) {
        placePost(px, py + T / 2);
      }
      if (info.hasR && !info.hasT && !info.hasB && ty % 3 === 0) {
        placePost(px + T, py + T / 2);
      }
      if (info.hasT && !info.hasL && !info.hasR && tx % 3 === 0) {
        placePost(px + T / 2, py);
      }
      if (info.hasB && !info.hasL && !info.hasR && tx % 3 === 0) {
        placePost(px + T / 2, py + T);
      }
    }

    console.log(`[ChatbotRuins] Museum barriers: ${placedPosts.size} gold stanchions, ${edgeMap.size} rope edges`);
  }

  private drawFloorGuidePath(): void {
    const guide = this.add.graphics();
    guide.setDepth(1);

    const mapH = this.map.heightInPixels;

    guide.lineStyle(1.5, 0x9b59b6, 0.10);
    const dashLen = 6;
    const gapLen = 10;

    let prevMidX: number | null = null;
    for (let y = 200; y < mapH - 200; y += 2) {
      const tileY = Math.floor(y / this.TILE_SIZE);
      let midX = 0;
      let count = 0;
      for (let tx = 0; tx < this.map.width; tx++) {
        if (this.isTileWalkable(tx, tileY)) {
          midX += tx * this.TILE_SIZE + this.TILE_SIZE / 2;
          count++;
        }
      }
      if (count > 0) {
        midX /= count;
        const segment = Math.floor(y / (dashLen + gapLen));
        if (segment % 2 === 0) {
          guide.lineBetween(midX, y, midX, y + 1);
        }
        if (prevMidX !== null && Math.abs(midX - prevMidX) > 16) {
          guide.fillStyle(0x9b59b6, 0.15);
          guide.fillCircle(midX, y, 2);
        }
        prevMidX = midX;
      }
    }

    this.exhibitDisplays.push(guide);
  }

  private createPlayer(): void {
    // Get spawn point from object layer
    let spawnX = this.map.widthInPixels / 2;
    let spawnY = this.map.heightInPixels - 64;

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
    
    // Collision with walls
    if (this.wallsLayer) {
      this.physics.add.collider(this.player, this.wallsLayer);
    }
    
    // Position callback for multiplayer
    this.player.onPositionChange = (x, y, direction, isMoving, animation) => {
      if (this.multiplayer) {
        this.multiplayer.sendPosition(x, y, direction, isMoving, animation);
      }
    };
    
    console.log(`[ChatbotRuins] Player spawned at (${spawnX}, ${spawnY})`);
  }

  /**
   * Setup camera to follow player
   */
  private setupCamera(): void {
    const cam = this.cameras.main;
    
    // Set camera bounds to map size
    cam.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    
    // Follow player
    if (this.player) {
      cam.startFollow(this.player, true, 0.1, 0.1);
    }
    
    cam.setZoom(2);
    
    this.input.manager.canvas.style.cursor = 'default';
  }

  /**
   * Create interactive exhibit objects from the tilemap
   */
  private setupInteractiveObjects(): void {
    const objectLayer = this.map.getObjectLayer('objects');
    if (!objectLayer) return;

    objectLayer.objects.forEach((obj) => {
      if (obj.type === 'interactive' && obj.x !== undefined && obj.y !== undefined) {
        const x = obj.x + (obj.width || 0) / 2;
        const y = obj.y + (obj.height || 0) / 2;
        const w = obj.width || 32;
        const h = obj.height || 32;
        
        // Create invisible interactive hit area
        const hitArea = this.add.rectangle(x, y, w, h, 0x9b59b6, 0.1);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.setDepth(10);

        const messageProp = obj.properties?.find((p: TiledProperty) => p.name === 'message');
        const message = (messageProp?.value as string) || `This is ${obj.name}`;

        hitArea.on('pointerover', () => {
          hitArea.setFillStyle(0x9b59b6, 0.3);
          this.showTooltip(x, y - h / 2 - 15, obj.name || 'Exhibit');
        });

        hitArea.on('pointerout', () => {
          hitArea.setFillStyle(0x9b59b6, 0.1);
          this.hideTooltip();
        });

        hitArea.on('pointerdown', () => {
          this.showExhibitInfo(obj.name || 'Exhibit', message);
        });

        this.interactiveObjects.push({ obj, hitArea });
      }
    });
    
    console.log(`[ChatbotRuins] Created ${this.interactiveObjects.length} interactive exhibits`);

    this.placeCorridorStorytelling();
    this.placeExhibitDisplays();
  }

  private placeCorridorStorytelling(): void {
    const corridorStory: {
      eraLabel: string;
      eraSubtitle: string;
      floorQuote: string;
    }[] = [
      { eraLabel: 'WELCOME', eraSubtitle: 'Begin your journey through AI history', floorQuote: '"Every revolution begins with a single paper..."' },
      { eraLabel: '2017 — 2018', eraSubtitle: 'The Foundation Era', floorQuote: '"Attention is all you need."' },
      { eraLabel: '2019', eraSubtitle: 'Language Models Get Dangerous', floorQuote: '"Too dangerous to release."' },
      { eraLabel: '2020 — 2021', eraSubtitle: 'The Scaling Era', floorQuote: '"175 billion parameters. Few-shot learning emerges."' },
      { eraLabel: 'NOVEMBER 2022', eraSubtitle: 'The Tipping Point', floorQuote: '"100 million users in two months."' },
      { eraLabel: '2023', eraSubtitle: 'The Cambrian Explosion', floorQuote: '"Open weights change everything."' },
      { eraLabel: '2023', eraSubtitle: 'AI Goes Global', floorQuote: '"Constitutional AI. Multimodal reasoning."' },
      { eraLabel: '2023', eraSubtitle: 'The Challengers', floorQuote: '"Smaller models, bigger impact."' },
      { eraLabel: '2024', eraSubtitle: 'The Open Frontier', floorQuote: '"The race goes worldwide."' },
      { eraLabel: 'THE FUTURE', eraSubtitle: 'What Comes Next?', floorQuote: '"Models that think, plan, and reason."' },
    ];

    const mapW = this.map.widthInPixels;

    const exhibitGroups: { y: number; exhibits: { name: string; x: number; y: number }[] }[] = [];
    const exhibitPositions = this.interactiveObjects.map(({ obj }) => ({
      name: obj.name || '',
      x: (obj.x || 0) + (obj.width || 0) / 2,
      y: (obj.y || 0) + (obj.height || 0) / 2,
    }));

    // Sort by y descending (bottom first = entrance first)
    exhibitPositions.sort((a, b) => b.y - a.y);

    // Group by similar y (within 100px = same corridor)
    for (const ex of exhibitPositions) {
      const existing = exhibitGroups.find(g => Math.abs(g.y - ex.y) < 100);
      if (existing) {
        existing.exhibits.push(ex);
      } else {
        exhibitGroups.push({ y: ex.y, exhibits: [ex] });
      }
    }

    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

    exhibitGroups.forEach((group, idx) => {
      const story = corridorStory[idx];
      if (!story) return;

      const groupCenterX = group.exhibits.reduce((sum, e) => sum + e.x, 0) / group.exhibits.length;
      const groupY = group.y;

      const chapterLabel = idx === 0 ? undefined : `Chapter ${romanNumerals[idx - 1] || idx}`;
      const bannerY = groupY + 50;
      this.placeEraBanner(groupCenterX, bannerY, story.eraLabel, story.eraSubtitle, chapterLabel);

      if (story.floorQuote) {
        const quoteY = groupY + 90;
        this.placeFloorQuote(groupCenterX, quoteY, story.floorQuote);
      }

      if (idx < exhibitGroups.length - 1) {
        const goesRight = idx % 2 === 0;
        const arrowX = goesRight ? mapW - 5 * this.TILE_SIZE : 5 * this.TILE_SIZE;
        this.placeTurnArrow(arrowX, groupY - 40, !goesRight);
        this.placeTorchEffect(arrowX - 16, groupY - 50);
        this.placeTorchEffect(arrowX + 16, groupY - 50);
      }
    });

    this.placeFloorBreadcrumbs();
  }

  private placeFloorBreadcrumbs(): void {
    const breadcrumbs = this.add.graphics();
    breadcrumbs.setDepth(1);

    for (let ty = 0; ty < this.map.height; ty += 3) {
      let midX = 0;
      let count = 0;
      for (let tx = 0; tx < this.map.width; tx++) {
        if (this.isTileWalkable(tx, ty)) {
          midX += tx * this.TILE_SIZE + this.TILE_SIZE / 2;
          count++;
        }
      }
      if (count > 0 && count <= 8) {
        midX /= count;
        const worldY = ty * this.TILE_SIZE + this.TILE_SIZE / 2;
        breadcrumbs.fillStyle(0xcc2233, 0.06);
        breadcrumbs.fillCircle(midX, worldY, 1.5);
        if (ty % 6 === 0) {
          breadcrumbs.fillStyle(0xff8c00, 0.04);
          breadcrumbs.fillCircle(midX, worldY, 3);
        }
      }
    }

    this.exhibitDisplays.push(breadcrumbs);
  }

  private placeEraBanner(x: number, y: number, label: string, subtitle: string, chapter?: string): void {
    const banner = this.add.container(x, y);
    banner.setDepth(6);

    const lineW = 220;
    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0x9b59b6, 0.6);
    lineG.lineBetween(-lineW / 2, 0, -60, 0);
    lineG.lineBetween(60, 0, lineW / 2, 0);

    const bgW = 200;
    const bgH = chapter ? 56 : 44;
    const bg = this.add.graphics();
    bg.fillStyle(0x0f0f23, 0.92);
    bg.fillRoundedRect(-bgW / 2, -20, bgW, bgH, 5);
    bg.lineStyle(1, 0x9b59b6, 0.6);
    bg.strokeRoundedRect(-bgW / 2, -20, bgW, bgH, 5);

    const items: GameObjects.GameObject[] = [bg, lineG];

    if (chapter) {
      const chapterText = this.add.text(0, -12, chapter, {
        fontSize: '8px',
        color: '#ff9999',
        fontStyle: 'italic',
      }).setOrigin(0.5);
      items.push(chapterText);
    }

    const labelText = this.add.text(0, chapter ? 2 : 0, label, {
      fontSize: '12px',
      color: '#f0d8ff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subText = this.add.text(0, chapter ? 16 : 14, subtitle, {
      fontSize: '9px',
      color: '#cccccc',
    }).setOrigin(0.5);

    const accentLine = this.add.graphics();
    accentLine.lineStyle(1, 0xcc2233, 0.5);
    const accentY = chapter ? 28 : 24;
    accentLine.lineBetween(-50, accentY, 50, accentY);

    items.push(labelText, subText, accentLine);
    banner.add(items);
    this.exhibitDisplays.push(banner);
  }

  private placeFloorQuote(x: number, y: number, quote: string): void {
    const container = this.add.container(x, y);
    container.setDepth(6);

    const label = this.add.text(0, 0, `"${quote}"`, {
      fontSize: '8px',
      color: '#f0e0ff',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    const padX = 12;
    const padY = 6;
    const boxW = label.width + padX * 2;
    const boxH = label.height + padY * 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a2e, 0.85);
    bg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 4);
    bg.lineStyle(1, 0x9b59b6, 0.5);
    bg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 4);

    container.add([bg, label]);
    this.exhibitDisplays.push(container);
  }

  private placeTurnArrow(x: number, y: number, pointsLeft: boolean): void {
    const arrow = this.add.graphics();
    arrow.setDepth(2);

    const dir = pointsLeft ? -1 : 1;

    arrow.fillStyle(0x9b59b6, 0.12);
    arrow.fillTriangle(
      x + dir * 8, y,
      x - dir * 4, y - 5,
      x - dir * 4, y + 5,
    );

    arrow.fillStyle(0x9b59b6, 0.08);
    arrow.fillTriangle(
      x + dir * 8, y - 16,
      x, y - 16 - 4,
      x, y - 16 + 4,
    );

    this.tweens.add({
      targets: arrow,
      alpha: { from: 1, to: 0.3 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.exhibitDisplays.push(arrow);
  }

  private placeTorchEffect(x: number, y: number): void {
    const torch = this.add.graphics();
    torch.setDepth(2);

    torch.fillStyle(0xff8c00, 0.12);
    torch.fillCircle(x, y, 6);
    torch.fillStyle(0xffaa33, 0.08);
    torch.fillCircle(x, y, 10);

    this.tweens.add({
      targets: torch,
      alpha: { from: 1, to: 0.3 },
      duration: 800 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.exhibitDisplays.push(torch);
  }

  /**
   * Place decorative museum display sprites at exhibit locations
   * Uses AI-generated sprite sheets (with backgrounds removed via preprocessing)
   */
  private placeExhibitDisplays(): void {
    const showcaseKey = 'museum-showcase';
    const exhibitsKey = 'museum-exhibits';

    const hasSprites = this.textures.exists(showcaseKey) && this.textures.exists(exhibitsKey);

    let scCellW = 256, scCellH = 256, exCellW = 256, exCellH = 256;
    if (hasSprites) {
      const showcaseTex = this.textures.get(showcaseKey);
      const scSrc = showcaseTex.getSourceImage();
      scCellW = scSrc.width / 4;
      scCellH = scSrc.height / 4;
      const exhibitsTex = this.textures.get(exhibitsKey);
      const exSrc = exhibitsTex.getSourceImage();
      exCellW = exSrc.width / 4;
      exCellH = exSrc.height / 4;
    }

    const exhibitDisplayMap: Record<string, { sheet: string; row: number; col: number; cellW: number; cellH: number }> = {
      'Transformers (2017)': { sheet: exhibitsKey, row: 0, col: 0, cellW: exCellW, cellH: exCellH },
      'BERT (2018)': { sheet: exhibitsKey, row: 0, col: 3, cellW: exCellW, cellH: exCellH },
      'GPT-2 (2019)': { sheet: exhibitsKey, row: 0, col: 2, cellW: exCellW, cellH: exCellH },
      'T5 (2019)': { sheet: exhibitsKey, row: 1, col: 0, cellW: exCellW, cellH: exCellH },
      'Grok (2023)': { sheet: exhibitsKey, row: 2, col: 0, cellW: exCellW, cellH: exCellH },
      'GPT-3 (2020)': { sheet: exhibitsKey, row: 1, col: 1, cellW: exCellW, cellH: exCellH },
      'DALL-E (2021)': { sheet: exhibitsKey, row: 1, col: 2, cellW: exCellW, cellH: exCellH },
      'Gemini (2023)': { sheet: exhibitsKey, row: 1, col: 3, cellW: exCellW, cellH: exCellH },
      'DeepSeek (2024)': { sheet: exhibitsKey, row: 3, col: 0, cellW: exCellW, cellH: exCellH },
      'Llama 3 (2024)': { sheet: exhibitsKey, row: 2, col: 1, cellW: exCellW, cellH: exCellH },
      'ChatGPT (2022)': { sheet: showcaseKey, row: 3, col: 1, cellW: scCellW, cellH: scCellH },
      'The Era of Reasoning': { sheet: showcaseKey, row: 1, col: 3, cellW: scCellW, cellH: scCellH },
      'GPT-4 (2023)': { sheet: exhibitsKey, row: 2, col: 2, cellW: exCellW, cellH: exCellH },
      'Claude (2023)': { sheet: exhibitsKey, row: 3, col: 3, cellW: exCellW, cellH: exCellH },
      'LLaMA (2023)': { sheet: exhibitsKey, row: 2, col: 3, cellW: exCellW, cellH: exCellH },
      'Mistral (2023)': { sheet: exhibitsKey, row: 3, col: 2, cellW: exCellW, cellH: exCellH },
      'Welcome': { sheet: showcaseKey, row: 3, col: 3, cellW: scCellW, cellH: scCellH },
    };

    const isCenterExhibit = (name: string) =>
      ['ChatGPT (2022)', 'The Era of Reasoning', 'GPT-4 (2023)', 'Claude (2023)', 'LLaMA (2023)', 'Mistral (2023)', 'Welcome'].includes(name);

    const exhibitPositions: { name: string; x: number; y: number; w: number; h: number }[] = [];

    this.interactiveObjects.forEach(({ obj }) => {
      const name = obj.name || '';
      const mapping = exhibitDisplayMap[name];
      const x = (obj.x || 0) + (obj.width || 0) / 2;
      const y = (obj.y || 0) + (obj.height || 0) / 2;
      const isCenter = isCenterExhibit(name);
      const caseW = isCenter ? 64 : 48;
      const caseH = isCenter ? 48 : 36;

      this.drawGlassCase(x, y, caseW, caseH, isCenter);

      if (mapping && hasSprites) {
        const frameKey = `exhibit-${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const cropX = mapping.col * mapping.cellW;
        const cropY = mapping.row * mapping.cellH;

        if (!this.textures.get(mapping.sheet).has(frameKey)) {
          this.textures.get(mapping.sheet).add(
            frameKey, 0, cropX, cropY, mapping.cellW, mapping.cellH
          );
        }

        const sprite = this.add.image(x, y - 4, mapping.sheet, frameKey);
        const targetSize = isCenter ? 42 : 32;
        const scale = targetSize / Math.max(mapping.cellW, mapping.cellH);
        sprite.setScale(scale);
        sprite.setDepth(7);
        this.exhibitDisplays.push(sprite);
      }

      this.drawExhibitPlaque(x, y + caseH / 2 + 6, name);

      exhibitPositions.push({ name, x, y, w: caseW, h: caseH });
    });

    this.drawRopeBarriers(exhibitPositions);

    console.log(`[ChatbotRuins] Placed ${this.exhibitDisplays.length} exhibit displays with glass cases and rope barriers`);
  }

  /**
   * Create animated VFX effects throughout the museum
   */
  private createVFX(): void {
    // Register VFX animations
    const vfxDefs: { key: string; frames: number; repeat: number }[] = [
      { key: 'vfx-eldenring', frames: 30, repeat: -1 },
      { key: 'vfx-constellation', frames: 30, repeat: -1 },
      { key: 'vfx-electricshield', frames: 30, repeat: -1 },
      { key: 'vfx-anima', frames: 30, repeat: -1 },
      { key: 'vfx-fastpixelfire', frames: 30, repeat: -1 },
      { key: 'vfx-ditheredfire', frames: 30, repeat: -1 },
      { key: 'vfx-charged', frames: 42, repeat: -1 },
    ];

    for (const def of vfxDefs) {
      if (!this.anims.exists(def.key)) {
        this.anims.create({
          key: def.key,
          frames: this.anims.generateFrameNumbers(def.key, { start: 0, end: def.frames - 1 }),
          frameRate: 15,
          repeat: def.repeat,
        });
      }
    }

    // Helper: place a VFX sprite at world position with given scale and optional alpha/blendMode
    const placeVFX = (
      x: number, y: number, animKey: string,
      scale: number, alpha: number = 0.7, depth: number = 5
    ) => {
      const sprite = this.add.sprite(x, y, animKey);
      sprite.play(animKey);
      sprite.setScale(scale);
      sprite.setAlpha(alpha);
      sprite.setDepth(depth);
      sprite.setBlendMode(Phaser.BlendModes.ADD);
      this.exhibitDisplays.push(sprite);
      return sprite;
    };

    const T = this.TILE_SIZE;
    let vfxCount = 0;

    // --- 1. Golden ring aura on featured center exhibits ---
    const featuredExhibits = ['ChatGPT (2022)', 'Welcome'];
    this.interactiveObjects.forEach(({ obj }) => {
      const name = obj.name || '';
      const x = (obj.x || 0) + (obj.width || 0) / 2;
      const y = (obj.y || 0) + (obj.height || 0) / 2;

      if (featuredExhibits.includes(name)) {
        // Golden Elden Ring aura — scaled to ~64px
        placeVFX(x, y, 'vfx-eldenring', 64 / 421, 0.5, 3);
        vfxCount++;
      }
    });

    // --- 2. Constellation sparkles on landmark exhibits ---
    const landmarkExhibits = ['GPT-4 (2023)', 'Claude (2023)', 'The Era of Reasoning'];
    this.interactiveObjects.forEach(({ obj }) => {
      const name = obj.name || '';
      const x = (obj.x || 0) + (obj.width || 0) / 2;
      const y = (obj.y || 0) + (obj.height || 0) / 2;

      if (landmarkExhibits.includes(name)) {
        placeVFX(x, y, 'vfx-constellation', 48 / 299, 0.4, 3);
        vfxCount++;
      }
    });

    // --- 3. Charged blue sparks on all non-featured interactive exhibits ---
    const specialExhibits = [...featuredExhibits, ...landmarkExhibits];
    this.interactiveObjects.forEach(({ obj }) => {
      const name = obj.name || '';
      const x = (obj.x || 0) + (obj.width || 0) / 2;
      const y = (obj.y || 0) + (obj.height || 0) / 2;

      if (!specialExhibits.includes(name) && name !== '') {
        placeVFX(x, y, 'vfx-charged', 32 / 321, 0.3, 3);
        vfxCount++;
      }
    });

    // --- 4. Wall torches (fire) along corridor edges every 6 tiles ---
    for (let ty = 0; ty < this.map.height; ty++) {
      for (let tx = 0; tx < this.map.width; tx++) {
        if (!this.isTileWalkable(tx, ty)) continue;
        const leftWall = !this.isTileWalkable(tx - 1, ty);
        const rightWall = !this.isTileWalkable(tx + 1, ty);

        if ((leftWall || rightWall) && ty % 6 === 0) {
          const wx = leftWall ? tx * T : (tx + 1) * T;
          const wy = ty * T + T / 2;
          placeVFX(wx, wy, 'vfx-fastpixelfire', 24 / 173, 0.6, 9);
          vfxCount++;
        }
      }
    }

    // --- 5. Anima energy wings at the museum entrance (bottom of map) ---
    const entranceX = (this.map.width / 2) * T;
    const entranceY = (this.map.height - 3) * T;
    placeVFX(entranceX, entranceY, 'vfx-anima', 48 / 437, 0.4, 3);
    vfxCount++;

    console.log(`[ChatbotRuins] Placed ${vfxCount} animated VFX effects`);
  }

  private drawGlassCase(x: number, y: number, w: number, h: number, isCenter: boolean): void {
    const caseBg = this.add.graphics();
    caseBg.setDepth(4);

    caseBg.fillStyle(0x0a0a1a, 0.4);
    caseBg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 3);

    caseBg.lineStyle(1.5, 0x88ccff, 0.5);
    caseBg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 3);

    caseBg.lineStyle(0.5, 0xaaddff, 0.2);
    caseBg.strokeRoundedRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4, 2);

    const shineW = w * 0.15;
    const shineH = h * 0.6;
    caseBg.fillStyle(0xffffff, 0.06);
    caseBg.fillRect(x - w / 2 + 3, y - h / 2 + 3, shineW, shineH);

    if (isCenter) {
      const glow = this.add.graphics();
      glow.setDepth(3);
      glow.fillStyle(0x9b59b6, 0.08);
      glow.fillCircle(x, y, w * 0.6);
      this.exhibitDisplays.push(glow);

      this.tweens.add({
        targets: glow,
        alpha: { from: 1, to: 0.4 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.exhibitDisplays.push(caseBg);
  }

  private drawExhibitPlaque(x: number, y: number, name: string): void {
    const plaque = this.add.container(x, y);
    plaque.setDepth(8);

    const shortName = name.replace(/\s*\(\d{4}\)\s*$/, '');
    const yearMatch = name.match(/\((\d{4})\)/);

    const nameText = this.add.text(0, yearMatch ? -4 : 0, shortName, {
      fontSize: '9px',
      color: '#ffe080',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const bg = this.add.graphics();
    const plaqueW = Math.max(70, nameText.width + 24);
    const plaqueH = yearMatch ? 26 : 18;
    bg.fillStyle(0x1a0a0a, 0.95);
    bg.fillRoundedRect(-plaqueW / 2, -plaqueH / 2, plaqueW, plaqueH, 3);
    bg.lineStyle(1, 0xd4a44a, 0.8);
    bg.strokeRoundedRect(-plaqueW / 2, -plaqueH / 2, plaqueW, plaqueH, 3);

    plaque.add([bg, nameText]);

    if (yearMatch) {
      const yearText = this.add.text(0, 6, yearMatch[1], {
        fontSize: '8px',
        color: '#cccccc',
      }).setOrigin(0.5);
      plaque.add(yearText);
    }

    this.exhibitDisplays.push(plaque);
  }

  private drawRopeBarriers(_exhibits: { name: string; x: number; y: number; w: number; h: number }[]): void {
    const rope = this.add.graphics();
    rope.setDepth(3);

    const mapH = this.map.heightInPixels;
    const wallMargin = 5 * this.TILE_SIZE;

    const stanchionSpacing = 32;

    for (let y = wallMargin; y < mapH - wallMargin; y += stanchionSpacing) {
      const leftWallX = this.findCorridorEdge(y, 'left');
      const rightWallX = this.findCorridorEdge(y, 'right');

      if (leftWallX !== null) {
        const sx = leftWallX + 6;
        this.drawStanchion(rope, sx, y);
        rope.lineStyle(0.5, 0xcc2233, 0.15);
        rope.lineBetween(leftWallX, y - stanchionSpacing / 2, leftWallX, y + stanchionSpacing / 2);
      }
      if (rightWallX !== null) {
        const sx = rightWallX - 6;
        this.drawStanchion(rope, sx, y);
        rope.lineStyle(0.5, 0xcc2233, 0.15);
        rope.lineBetween(rightWallX, y - stanchionSpacing / 2, rightWallX, y + stanchionSpacing / 2);
      }
    }

    for (let y = wallMargin; y < mapH - wallMargin - stanchionSpacing; y += stanchionSpacing) {
      const leftWallX = this.findCorridorEdge(y, 'left');
      const leftWallXNext = this.findCorridorEdge(y + stanchionSpacing, 'left');
      const rightWallX = this.findCorridorEdge(y, 'right');
      const rightWallXNext = this.findCorridorEdge(y + stanchionSpacing, 'right');

      if (leftWallX !== null && leftWallXNext !== null && Math.abs(leftWallX - leftWallXNext) < 4) {
        const sx = leftWallX + 6;
        this.drawRopeSegment(rope, sx, y, sx, y + stanchionSpacing);
      }
      if (rightWallX !== null && rightWallXNext !== null && Math.abs(rightWallX - rightWallXNext) < 4) {
        const sx = rightWallX - 6;
        this.drawRopeSegment(rope, sx, y, sx, y + stanchionSpacing);
      }
    }

    this.exhibitDisplays.push(rope);
  }

  private findCorridorEdge(worldY: number, side: 'left' | 'right'): number | null {
    const tileY = Math.floor(worldY / this.TILE_SIZE);
    if (tileY < 0 || tileY >= this.map.height) return null;

    if (side === 'left') {
      for (let tx = 0; tx < this.map.width; tx++) {
        if (this.isTileWalkable(tx, tileY) && !this.isTileWalkable(tx - 1, tileY)) {
          return tx * this.TILE_SIZE;
        }
      }
    } else {
      for (let tx = this.map.width - 1; tx >= 0; tx--) {
        if (this.isTileWalkable(tx, tileY) && !this.isTileWalkable(tx + 1, tileY)) {
          return (tx + 1) * this.TILE_SIZE;
        }
      }
    }
    return null;
  }

  private drawRopeSegment(g: GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const sag = Math.min(4, dist * 0.03);
    const steps = 10;

    g.lineStyle(1.5, 0xaa1122, 0.8);
    g.beginPath();
    g.moveTo(x1, y1 + 2);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + 2 + (y2 - 2 - y1 - 2) * t;
      const sagOffset = Math.sin(t * Math.PI) * sag;
      g.lineTo(px + sagOffset, py);
    }
    g.strokePath();
  }

  private drawStanchion(g: GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0xaa1122, 0.9);
    g.fillCircle(x, y, 3);
    g.fillStyle(0xd4af37, 0.85);
    g.fillCircle(x, y, 2);
    g.fillStyle(0xc4944a, 0.8);
    g.fillRect(x - 1, y, 2, 6);
    g.fillStyle(0x333333, 0.6);
    g.fillEllipse(x, y + 6, 5, 2);
  }

  /**
   * Show tooltip above an exhibit
   */
  private showTooltip(worldX: number, worldY: number, text: string): void {
    this.hideTooltip();
    
    const bg = this.add.graphics();
    const padding = 8;
    
    const label = this.add.text(0, 0, text, {
      fontSize: '10px',
      color: '#f0e8ff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const width = Math.max(80, label.width + padding * 2);
    const height = label.height + padding * 2;
    
    bg.fillStyle(0x1a0a2e, 0.92);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 3);
    bg.lineStyle(1, 0x9b59b6, 0.7);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 3);
    
    const arrow = this.add.graphics();
    arrow.fillStyle(0x1a0a2e, 0.92);
    arrow.fillTriangle(-4, height / 2 - 1, 4, height / 2 - 1, 0, height / 2 + 4);
    
    this.exhibitTooltip = this.add.container(worldX, worldY, [bg, arrow, label]);
    this.exhibitTooltip.setDepth(500);
  }

  /**
   * Hide the tooltip
   */
  private hideTooltip(): void {
    if (this.exhibitTooltip) {
      this.exhibitTooltip.destroy();
      this.exhibitTooltip = null;
    }
  }

  /**
   * Show exhibit info panel
   */
  private showExhibitInfo(title: string, message: string): void {
    if (this.exhibitInfoPanel) {
      this.exhibitInfoPanel.destroy();
      this.exhibitInfoPanel = null;
    }

    const cam = this.cameras.main;
    const screenW = cam.width / cam.zoom;
    const screenH = cam.height / cam.zoom;
    const centerX = screenW / 2;
    const centerY = screenH / 2;

    this.exhibitInfoPanel = this.add.container(centerX, centerY);
    this.exhibitInfoPanel.setDepth(1000);
    this.exhibitInfoPanel.setScrollFactor(0);

    const panelWidth = Math.min(280, screenW * 0.7);
    const panelHeight = 180;

    const dimmer = this.add.graphics();
    dimmer.fillStyle(0x000000, 0.5);
    dimmer.fillRect(-screenW, -screenH, screenW * 2, screenH * 2);

    const bg = this.add.graphics();
    bg.fillStyle(0x0f0f23, 0.97);
    bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 6);
    bg.lineStyle(1, 0x9b59b6, 0.8);
    bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 6);
    bg.lineStyle(1, 0x4a90d9, 0.3);
    bg.strokeRoundedRect(-panelWidth / 2 + 2, -panelHeight / 2 + 2, panelWidth - 4, panelHeight - 4, 5);

    const accentBar = this.add.graphics();
    accentBar.fillStyle(0x9b59b6, 1);
    accentBar.fillRect(-panelWidth / 2, -panelHeight / 2, panelWidth, 2);

    const titleText = this.add.text(0, -panelHeight / 2 + 22, title, {
      fontSize: '14px',
      color: '#e0c0f0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const divider = this.add.graphics();
    divider.lineStyle(1, 0x4a90d9, 0.3);
    divider.lineBetween(-panelWidth / 2 + 16, -panelHeight / 2 + 40, panelWidth / 2 - 16, -panelHeight / 2 + 40);

    const msgText = this.add.text(0, 10, message, {
      fontSize: '11px',
      color: '#e8eaed',
      wordWrap: { width: panelWidth - 32 },
      lineSpacing: 5,
      align: 'center',
    }).setOrigin(0.5);

    const closeHint = this.add.text(0, panelHeight / 2 - 14, 'Click anywhere to close', {
      fontSize: '9px',
      color: '#777777',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    this.exhibitInfoPanel.add([dimmer, bg, accentBar, titleText, divider, msgText, closeHint]);

    this.exhibitInfoPanel.setAlpha(0);
    this.tweens.add({
      targets: this.exhibitInfoPanel,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });

    this.input.once('pointerdown', () => {
      if (this.exhibitInfoPanel) {
        this.tweens.add({
          targets: this.exhibitInfoPanel,
          alpha: 0,
          duration: 150,
          ease: 'Power2',
          onComplete: () => {
            if (this.exhibitInfoPanel) {
              this.exhibitInfoPanel.destroy();
              this.exhibitInfoPanel = null;
            }
          },
        });
      }
    });
  }

  /**
   * Show Pokemon-style tour choice: guide NPC spawns, dialogue box appears at bottom
   */
  private showTourChoiceDialog(): void {
    // Create controller and spawn the guide NPC (visible before any choice)
    this.tourController = new GuidedTourController(this);

    this.tourController.onTourEnd = () => {
      this.isTourMode = false;
      this.tourController = null;
    };

    this.tourController.onTourDeclined = () => {
      this.isTourMode = false;
      this.tourController = null;
    };

    this.tourController.spawnGuide();

    // Set tour mode so update() drives the controller and ESC can exit
    this.isTourMode = true;

    this.tourController.showChoiceDialog();
  }

  /**
   * Create UI overlay
   */
  private createUI(): void {
    const cam = this.cameras.main;
    const screenW = cam.width / cam.zoom;
    const screenH = cam.height / cam.zoom;

    const ui = this.add.container(0, 0);
    ui.setScrollFactor(0);
    ui.setDepth(2000);

    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x0f0f23, 0.85);
    titleBg.fillRect(0, 0, screenW, 24);
    titleBg.fillStyle(0x9b59b6, 1);
    titleBg.fillRect(0, 0, screenW, 2);

    const titleText = this.add.text(screenW / 2, 13, 'CHATBOT RUINS — Museum of LLM History', {
      fontSize: '11px',
      color: '#c39bd3',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    ui.add([titleBg, titleText]);

    const backBtnBg = this.add.graphics();
    backBtnBg.fillStyle(0x9b59b6, 0.9);
    backBtnBg.fillRoundedRect(6, 5, 44, 14, 3);

    const backBtnText = this.add.text(28, 12, '← Exit', {
      fontSize: '9px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const backHitArea = this.add.rectangle(28, 12, 44, 14, 0x000000, 0);
    backHitArea.setInteractive({ useHandCursor: true });
    backHitArea.on('pointerover', () => backBtnBg.clear().fillStyle(0xc39bd3, 1).fillRoundedRect(6, 5, 44, 14, 3));
    backHitArea.on('pointerout', () => backBtnBg.clear().fillStyle(0x9b59b6, 0.9).fillRoundedRect(6, 5, 44, 14, 3));
    backHitArea.on('pointerdown', () => this.exitMuseum());

    ui.add([backBtnBg, backBtnText, backHitArea]);

    const instrBg = this.add.graphics();
    instrBg.fillStyle(0x0f0f23, 0.7);
    instrBg.fillRect(0, screenH - 20, screenW, 20);

    const instrText = this.add.text(screenW / 2, screenH - 10, 'WASD to move  ·  Click exhibits to learn  ·  ESC to exit', {
      fontSize: '9px',
      color: '#888888',
    }).setOrigin(0.5);

    ui.add([instrBg, instrText]);

    this.miniMap = new MiniMap(this, {
      x: 8,
      y: screenH - 80,
      width: 70,
      height: 50,
      worldWidth: this.map.widthInPixels,
      worldHeight: this.map.heightInPixels,
      currentLocation: 'chatbotruins',
    });
  }

  /**
   * Initialize multiplayer connection
   */
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
    
    console.log(`[ChatbotRuins] Multiplayer ${connected ? 'connected' : 'offline'}`);
  }

  /**
   * Initialize mobile controls if on mobile device
   */
  private initMobileControls(): void {
    if (!isMobileDevice()) return;
    
    this.mobileControls = new MobileControlsManager(this, true);
    
    if (this.player) {
      this.player.setMobileControls(this.mobileControls);
    }
    
    this.mobileControls.setCallbacks({
      onActionA: () => {
        if (this.nearExit) {
          this.exitMuseum();
        }
      },
      onActionB: () => {
        this.exitMuseum();
      },
    });
    
    console.log('[ChatbotRuins] Mobile controls initialized');
  }

  /**
   * Setup keyboard input
   */
  private setupInput(): void {
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.isTourMode && this.tourController) {
        this.tourController.exitTour();
        this.isTourMode = false;
        this.tourController = null;
      } else {
        this.exitMuseum();
      }
    });
    
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.nearExit) {
        this.exitMuseum();
      }
    });
  }

  /**
   * Check if player is near the exit
   */
  private checkExitProximity(): void {
    if (!this.player) return;

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
    this.nearExit = distance < 50;

    if (this.nearExit !== wasNear) {
      this.updateExitPrompt(exitCenterX, exit.y - 16);
    }
  }

  /**
   * Show or hide the exit prompt
   */
  private updateExitPrompt(exitX: number, exitY: number): void {
    if (this.exitPrompt) {
      this.exitPrompt.destroy();
      this.exitPrompt = null;
    }

    if (!this.nearExit) return;

    this.exitPrompt = this.add.container(exitX, exitY);
    this.exitPrompt.setDepth(200);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a2e, 0.9);
    bg.fillRoundedRect(-45, -10, 90, 20, 4);
    bg.lineStyle(1, 0x9b59b6, 0.8);
    bg.strokeRoundedRect(-45, -10, 90, 20, 4);

    const text = this.add.text(0, 0, 'SPACE to Exit', {
      fontSize: '10px',
      color: '#c39bd3',
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

  /**
   * Exit the museum and return to town
   */
  private exitMuseum(): void {
    // Cleanup guided tour
    if (this.tourController) {
      this.tourController.destroy();
      this.tourController = null;
      this.isTourMode = false;
    }

    // Cleanup
    this.interactiveObjects.forEach(({ hitArea }) => hitArea.destroy());
    this.interactiveObjects = [];
    this.exhibitDisplays.forEach(s => s.destroy());
    this.exhibitDisplays = [];
    
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

    // Update guided tour controller
    if (this.tourController && this.isTourMode) {
      this.tourController.update();
    }

    // Update multiplayer
    if (this.multiplayer) {
      this.multiplayer.update();
    }
  }

  shutdown(): void {
    console.log('[ChatbotRuins] Scene shutting down');

    // Cleanup guided tour
    if (this.tourController) {
      this.tourController.destroy();
      this.tourController = null;
      this.isTourMode = false;
    }

    // Cleanup
    this.interactiveObjects.forEach(({ hitArea }) => hitArea.destroy());
    this.interactiveObjects = [];
    this.exhibitDisplays.forEach(s => s.destroy());
    this.exhibitDisplays = [];
    
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
