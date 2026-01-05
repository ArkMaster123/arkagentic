import { Scene, Tilemaps, GameObjects, Physics, Math as PhaserMath } from 'phaser';
import { Agent } from '../classes/Agent';
import { Player } from '../classes/Player';
import { MultiplayerManager } from '../classes/MultiplayerManager';
import { JitsiManager, JitsiZone } from '../classes/JitsiManager';
import eventsCenter from '../classes/EventCenter';
import { MiniMap } from '../classes/MiniMap';
import { MobileControlsManager, isMobileDevice } from '../classes/MobileControls';
import { AGENTS, AGENT_COLORS, MEETING_POINT, COLOR_PRIMARY, COLOR_LIGHT, COLOR_DARK, API_BASE_URL, JITSI_CONFIG, JITSI_ZONES } from '../constants';
import { DIRECTION, routeQuery, escapeHtml } from '../utils';
import { getIconSpan } from '../icons';
import { GameBridge, StorageService } from '../core';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';
import BoardPlugin from 'phaser3-rex-plugins/plugins/board-plugin';
import type { Board, QuadGrid } from 'phaser3-rex-plugins/plugins/board-components';

// Meeting room entrance zone configuration
const MEETING_ROOM_ENTRANCE = {
  name: 'Meeting Rooms',
  x: 720,      // Far right of the map (tile 45 * 16 = 720)
  y: 240,      // Center-ish vertically
  width: 48,
  height: 64,
};

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
}

export class TownScene extends Scene {
  private map!: Tilemaps.Tilemap;
  private tileset!: Tilemaps.Tileset;
  private groundLayer!: Tilemaps.TilemapLayer;
  private wallLayer!: Tilemaps.TilemapLayer;
  private treeLayer!: Tilemaps.TilemapLayer;
  private houseLayer!: Tilemaps.TilemapLayer;

  private agents: Map<string, Agent> = new Map();
  private agentGroup!: GameObjects.Group;
  
  public rexUI!: UIPlugin;
  public rexBoard!: BoardPlugin;
  public board!: Board;
  
  // Track which tiles are blocked (walls, trees, houses, agents)
  private blockedTiles: Set<string> = new Set();
  
  private conversationHistory: ConversationMessage[] = [];
  private isProcessing: boolean = false;
  
  // Edge panning settings
  private edgePanSpeed: number = 300;
  private edgeThreshold: number = 50;
  
  // Mini-map
  private miniMap: MiniMap | null = null;
  
  // Player (user-controlled character)
  private player: Player | null = null;
  private playerAvatar: string = 'brendan';
  private playerName: string = 'Player';
  
  // Multiplayer
  private multiplayer: MultiplayerManager | null = null;
  private playerCountText: GameObjects.Text | null = null;
  private playerNameText: GameObjects.Text | null = null;
  
  // Jitsi proximity chat
  private jitsiManager: JitsiManager | null = null;
  private currentJitsiZone: JitsiZone | null = null;
  private jitsiZones: JitsiZone[] = [];
  
  // Door interaction
  private nearbyDoor: typeof this.buildingZones[0] | null = null;
  private doorPrompt: GameObjects.Container | null = null;
  
  // Meeting room entrance
  private nearMeetingRoomEntrance: boolean = false;
  private meetingRoomPrompt: GameObjects.Container | null = null;
  private meetingRoomSign: GameObjects.Container | null = null;
  
  // Nearby agent for chat interaction
  private nearbyAgent: { type: string; agent: Agent } | null = null;
  private agentChatPrompt: GameObjects.Container | null = null;
  private readonly AGENT_CHAT_DISTANCE = 50; // pixels
  
  // Mobile controls
  private mobileControls: MobileControlsManager | null = null;

  // Building zones for door detection (pixel coordinates)
  // Based on visible buildings in the tilemap - doors are at bottom of each building
  private buildingZones: {
    name: string;
    agentType: string;
    doorX: number;
    doorY: number;
    doorWidth: number;
    doorHeight: number;
  }[] = [
    // Top row houses (row 5-8, y ~80-128 pixels)
    // Left house - door at tile (10,8) = pixel (160, 128)
    { name: "Scout's Lab", agentType: 'scout', doorX: 168, doorY: 128, doorWidth: 32, doorHeight: 16 },
    // Middle-left house - door at tile (17,8) = pixel (272, 128)  
    { name: "Sage's Study", agentType: 'sage', doorX: 272, doorY: 128, doorWidth: 32, doorHeight: 16 },
    // Right house - door at tile (31,8) = pixel (496, 128)
    { name: "Chronicle's Office", agentType: 'chronicle', doorX: 496, doorY: 128, doorWidth: 32, doorHeight: 16 },
    
    // Middle row - large building (row 11-14)  
    // Center building door at tile (17,14) = pixel (272, 224)
    { name: "Trends' Hub", agentType: 'trends', doorX: 272, doorY: 224, doorWidth: 32, doorHeight: 16 },
    
    // Pokemon Center (right side) - door at approximately (41, 7) = pixel (656, 112)
    // Actually visible at around x:624, y:128 based on screenshot
    { name: "Maven's Center", agentType: 'maven', doorX: 640, doorY: 128, doorWidth: 32, doorHeight: 16 },
  ];

  constructor() {
    super('town-scene');
  }

  create(data?: { playerAvatar?: string; playerName?: string; isNewPlayer?: boolean }): void {
    // Get player info from scene data or localStorage
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
    
    this.initMap();
    this.initBoard();
    this.initPlayer();
    this.initAgents();
    this.initCamera();
    this.initUI();
    this.initMultiplayer();
    this.initMobileControls();
    // Jitsi disabled in town - only available in Meeting Rooms
    // this.initJitsi();
    this.createMeetingRoomSign();
    
    // Listen for global events
    this.setupEventListeners();
    
    // Show welcome message for new players
    if (data?.isNewPlayer) {
      this.showWelcomeMessage();
    }
    
    // Hide any transition overlay (in case we came from another scene)
    this.time.delayedCall(500, () => {
      GameBridge.hideTransition();
    });
  }

  /**
   * Called when the scene is shut down (transitioning away)
   * Ensures cleanup happens even if scene.start() is called directly
   */
  shutdown(): void {
    console.log('[TownScene] Scene shutting down');
    this.cleanupBeforeSceneChange();
  }

  update(time: number, delta: number): void {
    // Update player
    if (this.player) {
      this.player.update();
      
      // Check for nearby doors
      this.checkDoorProximity();
      
      // Check for meeting room entrance
      this.checkMeetingRoomProximity();
      
      // Check for nearby agents to chat with
      this.checkAgentProximity();
      
      // Jitsi disabled in town - only available in Meeting Rooms
      // this.checkJitsiProximity();
      
      // Update proximity audio for other players
      this.updateProximityAudio();
    }
    
    // Update all agents
    this.agents.forEach((agent) => {
      agent.update();
    });
    
    // Update multiplayer (interpolation for remote players)
    if (this.multiplayer) {
      this.multiplayer.update();
    }
    
    // Edge panning - move camera when mouse is near screen edges
    // Only when player is not moving (WASD takes priority)
    if (!this.player?.isMoving) {
      this.handleEdgePanning(delta);
    }
  }
  
  /**
   * Update proximity-based audio for nearby players
   * Adjusts volume based on distance to other players
   */
  private updateProximityAudio(): void {
    if (!this.player || !this.jitsiManager || !this.multiplayer) return;
    
    // Only update if we're in a Jitsi room
    if (!this.jitsiManager.isInRoom()) return;
    
    // Get all remote players from multiplayer manager
    const remotePlayers = this.multiplayer.getRemotePlayers();
    
    remotePlayers.forEach((remotePlayer: { x: number; y: number; name: string }, sessionId: string) => {
      const distance = Phaser.Math.Distance.Between(
        this.player!.x, this.player!.y,
        remotePlayer.x, remotePlayer.y
      );
      
      // Update Jitsi volume based on proximity
      this.jitsiManager!.updatePlayerProximity(
        sessionId,
        distance,
        remotePlayer.name
      );
    });
  }
  
  private checkDoorProximity(): void {
    if (!this.player) return;
    
    const playerX = this.player.x;
    const playerY = this.player.y;
    const proximityDistance = 24; // pixels
    
    // Find nearby door
    const nearDoor = this.buildingZones.find((zone) => {
      const doorCenterX = zone.doorX + zone.doorWidth / 2;
      const doorCenterY = zone.doorY + zone.doorHeight / 2;
      const distance = Math.sqrt(
        Math.pow(playerX - doorCenterX, 2) + 
        Math.pow(playerY - doorCenterY, 2)
      );
      return distance < proximityDistance;
    });
    
    if (nearDoor !== this.nearbyDoor) {
      this.nearbyDoor = nearDoor || null;
      this.updateDoorPrompt();
    }
  }
  
  private updateDoorPrompt(): void {
    // Remove existing prompt
    if (this.doorPrompt) {
      this.doorPrompt.destroy();
      this.doorPrompt = null;
    }
    
    if (!this.nearbyDoor || !this.player) return;
    
    const zone = this.nearbyDoor;
    const agentConfig = AGENTS[zone.agentType as keyof typeof AGENTS];
    
    // Create prompt above the door
    this.doorPrompt = this.add.container(
      zone.doorX + zone.doorWidth / 2,
      zone.doorY - 25
    );
    this.doorPrompt.setDepth(200);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-60, -14, 120, 28, 6);
    bg.lineStyle(1, 0x4a90d9);
    bg.strokeRoundedRect(-60, -14, 120, 28, 6);
    
    // Text
    const text = this.add.text(0, -2, `Press SPACE to enter`, {
      fontSize: '9px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    const nameText = this.add.text(0, 8, `${agentConfig?.emoji || ''} ${zone.name}`, {
      fontSize: '8px',
      color: '#4a90d9',
    }).setOrigin(0.5);
    
    this.doorPrompt.add([bg, text, nameText]);
    
    // Pulse animation
    this.tweens.add({
      targets: this.doorPrompt,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
  
  private handleEdgePanning(delta: number): void {
    // Don't pan if controls are disabled (e.g., typing in chat)
    if (this.areControlsDisabled()) return;
    
    const pointer = this.input.activePointer;
    const cam = this.cameras.main;
    
    // Get screen dimensions
    const screenWidth = this.game.scale.width;
    const screenHeight = this.game.scale.height;
    
    // Calculate pan speed based on delta time
    const panAmount = (this.edgePanSpeed * delta) / 1000;
    
    let panX = 0;
    let panY = 0;
    
    // Check horizontal edges
    if (pointer.x < this.edgeThreshold) {
      panX = -panAmount;
    } else if (pointer.x > screenWidth - this.edgeThreshold) {
      panX = panAmount;
    }
    
    // Check vertical edges
    if (pointer.y < this.edgeThreshold) {
      panY = -panAmount;
    } else if (pointer.y > screenHeight - this.edgeThreshold) {
      panY = panAmount;
    }
    
    // Apply panning (camera bounds will automatically clamp)
    if (panX !== 0 || panY !== 0) {
      cam.scrollX += panX;
      cam.scrollY += panY;
    }
  }

  private initMap(): void {
    this.map = this.make.tilemap({
      key: 'town',
      tileWidth: 16,
      tileHeight: 16,
    });
    
    console.log('[TownScene] Map created:', this.map.width, 'x', this.map.height, 'tiles');
    
    this.tileset = this.map.addTilesetImage('town', 'tiles')!;
    
    if (!this.tileset) {
      console.error('[TownScene] TILESET FAILED TO LOAD! Check if tiles texture exists:', this.textures.exists('tiles'));
    } else {
      console.log('[TownScene] Tileset loaded:', this.tileset.name);
    }
    
    // Create layers
    this.groundLayer = this.map.createLayer('ground', this.tileset, 0, 0)!;
    this.wallLayer = this.map.createLayer('wall', this.tileset, 0, 0)!;
    
    if (!this.groundLayer) {
      console.error('[TownScene] GROUND LAYER FAILED! Available layers:', this.map.layers.map(l => l.name));
    } else {
      console.log('[TownScene] Ground layer created, visible:', this.groundLayer.visible, 'alpha:', this.groundLayer.alpha);
    }
    
    // Try to create optional layers (may not exist in all tilemaps)
    try {
      const flowerLayer = this.map.createLayer('flower', this.tileset, 0, 0);
      if (flowerLayer) flowerLayer.setCollisionByProperty({ collides: true });
    } catch (e) { /* Layer doesn't exist */ }
    
    try {
      this.treeLayer = this.map.createLayer('tree', this.tileset, 0, 0)!;
      this.treeLayer.setCollisionByProperty({ collides: true });
    } catch (e) { /* Layer doesn't exist */ }
    
    try {
      this.houseLayer = this.map.createLayer('house', this.tileset, 0, 0)!;
      this.houseLayer.setCollisionByProperty({ collides: true });
    } catch (e) { /* Layer doesn't exist */ }

    this.wallLayer.setCollisionByProperty({ collides: true });
  }

  private initBoard(): void {
    const tileWidth = 16;
    const tileHeight = 16;
    const gridWidth = this.map.width;
    const gridHeight = this.map.height;

    // Create the board for pathfinding
    this.board = this.rexBoard.add.board({
      grid: {
        gridType: 'quadGrid',
        x: tileWidth / 2, // Center of first tile
        y: tileHeight / 2,
        cellWidth: tileWidth,
        cellHeight: tileHeight,
        type: 'orthogonal', // 4-direction movement
      },
      width: gridWidth,
      height: gridHeight,
    });

    // Build blocked tiles set from collision layers
    this.buildBlockedTiles();

    console.log(`Board created: ${gridWidth}x${gridHeight} tiles, ${this.blockedTiles.size} blocked`);
  }

  private buildBlockedTiles(): void {
    this.blockedTiles.clear();

    // Helper to add blocked tiles from a layer
    const addBlockedFromLayer = (layer: Tilemaps.TilemapLayer | null) => {
      if (!layer) return;
      
      layer.forEachTile((tile) => {
        if (tile && tile.index !== -1) {
          // Check if tile has collides property or is non-empty
          const props = tile.properties as { collides?: boolean };
          if (props?.collides || tile.collides) {
            this.blockedTiles.add(`${tile.x},${tile.y}`);
          }
        }
      });
    };

    // Add walls (always blocking)
    if (this.wallLayer) {
      this.wallLayer.forEachTile((tile) => {
        if (tile && tile.index !== -1) {
          this.blockedTiles.add(`${tile.x},${tile.y}`);
        }
      });
    }

    // Add other collision layers
    addBlockedFromLayer(this.treeLayer);
    addBlockedFromLayer(this.houseLayer);
  }

  // Helper to check if a tile is walkable
  public isTileWalkable(tileX: number, tileY: number): boolean {
    // Out of bounds check
    if (tileX < 0 || tileY < 0 || tileX >= this.map.width || tileY >= this.map.height) {
      return false;
    }
    // Check blocked tiles
    return !this.blockedTiles.has(`${tileX},${tileY}`);
  }

  // Convert world coordinates to tile coordinates
  public worldToTile(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / 16),
      y: Math.floor(worldY / 16),
    };
  }

  // Convert tile coordinates to world coordinates (center of tile)
  public tileToWorld(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: tileX * 16 + 8,
      y: tileY * 16 + 8,
    };
  }

  // Mark a tile as occupied by an agent
  public occupyTile(tileX: number, tileY: number): void {
    this.blockedTiles.add(`${tileX},${tileY}`);
  }

  // Unmark a tile
  public freeTile(tileX: number, tileY: number): void {
    // Only free if it's not a permanent obstacle
    const key = `${tileX},${tileY}`;
    // Re-check if it's a wall/tree/house before freeing
    const wallTile = this.wallLayer?.getTileAt(tileX, tileY);
    const treeTile = this.treeLayer?.getTileAt(tileX, tileY);
    const houseTile = this.houseLayer?.getTileAt(tileX, tileY);
    
    if (!wallTile && !treeTile && !houseTile) {
      this.blockedTiles.delete(key);
    }
  }

  private initAgents(): void {
    this.agentGroup = this.add.group();

    // Spawn agents at different positions around the town
    const spawnPositions = [
      { x: 200, y: 200 },  // Scout
      { x: 350, y: 200 },  // Sage
      { x: 200, y: 300 },  // Chronicle
      { x: 350, y: 300 },  // Trends
      { x: 275, y: 350 },  // Maven (center-ish)
      { x: 420, y: 280 },  // Gandalfius (near right side, like a wizard's corner)
    ];

    const agentTypes = Object.keys(AGENTS) as Array<keyof typeof AGENTS>;
    
    agentTypes.forEach((agentType, index) => {
      const pos = spawnPositions[index];
      const agent = new Agent(this, pos.x, pos.y, agentType, agentType);
      
      this.agents.set(agentType, agent);
      this.agentGroup.add(agent);

      // Add collisions
      if (this.wallLayer) this.physics.add.collider(agent, this.wallLayer);
      if (this.treeLayer) this.physics.add.collider(agent, this.treeLayer);
      if (this.houseLayer) this.physics.add.collider(agent, this.houseLayer);
    });

    // Agent-to-agent collision
    this.physics.add.collider(this.agentGroup, this.agentGroup);
    
    // Player-to-agent collision (if player exists)
    if (this.player) {
      this.physics.add.collider(this.player, this.agentGroup);
    }

    // Set world bounds using tilemap pixel dimensions
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    
    // Listen for agent click events
    eventsCenter.on('agent-clicked', (data: { agentType: string; agent: Agent }) => {
      this.onAgentClicked(data.agentType, data.agent);
    });
  }
  
  /**
   * Handle when an agent is clicked
   */
  private onAgentClicked(agentType: string, agent: Agent): void {
    console.log(`[TownScene] Agent clicked: ${agentType}`);
    
    // Set this agent as the nearby agent and start chat
    this.nearbyAgent = { type: agentType, agent };
    this.startAgentChat();
  }

  private initPlayer(): void {
    // Spawn player near the center of the map
    const spawnX = 275;
    const spawnY = 250;
    
    this.player = new Player(this, spawnX, spawnY, this.playerAvatar, this.playerName);
    this.player.setDepth(15); // Above agents but below UI
    
    // Add collisions with map layers
    if (this.wallLayer) this.physics.add.collider(this.player, this.wallLayer);
    if (this.treeLayer) this.physics.add.collider(this.player, this.treeLayer);
    if (this.houseLayer) this.physics.add.collider(this.player, this.houseLayer);
    
    // Set up position update callback for multiplayer
    this.player.onPositionChange = (x, y, direction, isMoving, animation) => {
      if (this.multiplayer) {
        this.multiplayer.sendPosition(x, y, direction, isMoving, animation);
      }
    };
    
    console.log(`[TownScene] Player spawned as ${this.playerName} with avatar ${this.playerAvatar}`);
  }

  private initMobileControls(): void {
    // Only create mobile controls on mobile devices
    if (!isMobileDevice()) return;
    
    this.mobileControls = new MobileControlsManager(this, true);
    
    // Pass to player for joystick input
    if (this.player) {
      this.player.setMobileControls(this.mobileControls);
    }
    
    // Set up action button callbacks
    this.mobileControls.setCallbacks({
      onActionA: () => {
        // A button = primary action (same as SPACE key)
        // Enter doors, start agent chats, confirm dialogs
        if (this.nearbyDoor) {
          this.enterBuilding(this.nearbyDoor);
        } else if (this.nearMeetingRoomEntrance) {
          this.enterMeetingRooms();
        } else if (this.nearbyAgent) {
          this.startAgentChat();
        }
      },
      onActionB: () => {
        // B button = secondary action (same as ESC key)
        // Cancel, close dialogs, exit conversations
        this.closeAllPrompts();
      },
    });
    
    console.log('[TownScene] Mobile controls initialized');
  }

  private initCamera(): void {
    // Use the tilemap's pixel dimensions for bounds
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;

    console.log('Map dimensions:', mapWidth, 'x', mapHeight);

    this.cameras.main.setSize(this.game.scale.width, this.game.scale.height);
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

    // Follow the player instead of centering on meeting point
    if (this.player) {
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    } else {
      this.cameras.main.centerOn(MEETING_POINT.x, MEETING_POINT.y);
    }
    this.cameras.main.setZoom(2);

    // Set default cursor
    this.input.manager.canvas.style.cursor = 'default';
  }
  
  private async initMultiplayer(): Promise<void> {
    // Check if we have an existing multiplayer connection from another scene
    if (GameBridge.multiplayerManager && GameBridge.multiplayerManager.isOnline()) {
      console.log('[TownScene] Reusing existing multiplayer connection');
      this.multiplayer = GameBridge.multiplayerManager;
      
      // Transfer to this scene (recreates sprites)
      this.multiplayer.transferToScene(this);
      
      // Change room to town if not already there
      if (this.multiplayer.getCurrentRoom() !== 'town') {
        this.multiplayer.changeRoom('town');
      }
      
      // Set up position update callback for the player
      if (this.player) {
        this.player.onPositionChange = (x, y, direction, isMoving, animation) => {
          if (this.multiplayer) {
            this.multiplayer.sendPosition(x, y, direction, isMoving, animation);
          }
        };
      }
      
      this.updatePlayerCount();
      GameBridge.updatePlayerCount(this.multiplayer.getPlayerCount());
      return;
    }
    
    // No existing connection - create new one
    this.multiplayer = new MultiplayerManager(this);
    
    // Expose to GameBridge for room chat integration
    GameBridge.multiplayerManager = this.multiplayer;
    
    // Try to connect to multiplayer server with player info
    const session = StorageService.getSessionCredentials();
    const connected = await this.multiplayer.connect('town', {
      displayName: this.playerName,
      avatarSprite: this.playerAvatar,
      userId: session?.userId,
    });
    
    if (connected) {
      console.log('[TownScene] Multiplayer connected!');
      this.updatePlayerCount();
      
      // Update the room chat player count via GameBridge
      GameBridge.updatePlayerCount(this.multiplayer.getPlayerCount());
    } else {
      console.log('[TownScene] Multiplayer offline - playing solo');
    }
  }
  
  private initJitsi(): void {
    // Initialize Jitsi manager for proximity voice/video chat
    this.jitsiManager = new JitsiManager({
      domain: JITSI_CONFIG.domain || undefined,
      freeServers: (JITSI_CONFIG as any).freeServers,
      fallbackDomain: JITSI_CONFIG.fallbackDomain,
      containerId: JITSI_CONFIG.containerId,
      playerName: this.playerName,
      startWithAudio: JITSI_CONFIG.startWithAudio,
      startWithVideo: JITSI_CONFIG.startWithVideo,
    });
    
    // Load zones from config
    this.jitsiZones = JITSI_ZONES.map(zone => ({
      ...zone,
      roomName: `${JITSI_CONFIG.roomPrefix}${zone.roomName}`,
    }));
    
    // Set up event listeners
    this.jitsiManager.on('joined', (data: unknown) => {
      const joinData = data as { roomName?: string };
      console.log('[TownScene] Joined Jitsi room:', joinData.roomName);
      this.updateJitsiUI(true, joinData.roomName);
    });
    
    this.jitsiManager.on('left', () => {
      console.log('[TownScene] Left Jitsi room');
      this.updateJitsiUI(false);
      this.currentJitsiZone = null;
    });
    
    this.jitsiManager.on('participantJoined', (data: unknown) => {
      const participantData = data as { displayName?: string };
      // Could show a notification or update UI
      console.log('[TownScene] Participant joined:', participantData.displayName);
    });
    
    // Set up UI button handlers
    this.setupJitsiUIHandlers();
    
    console.log('[TownScene] Jitsi initialized with', this.jitsiZones.length, 'zones');
  }
  
  private setupJitsiUIHandlers(): void {
    // Close button
    const closeBtn = document.getElementById('jitsi-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        this.jitsiManager?.leaveRoom();
      };
    }
    
    // Minimize button
    const minimizeBtn = document.getElementById('jitsi-minimize');
    if (minimizeBtn) {
      minimizeBtn.onclick = () => {
        const container = document.getElementById('jitsi-container');
        container?.classList.toggle('minimized');
      };
    }
    
    // Join prompt buttons
    const joinBtn = document.getElementById('jitsi-prompt-join');
    if (joinBtn) {
      joinBtn.onclick = () => {
        if (this.currentJitsiZone) {
          this.jitsiManager?.joinRoom(this.currentJitsiZone);
        }
        this.hideJitsiPrompt();
      };
    }
    
    const dismissBtn = document.getElementById('jitsi-prompt-dismiss');
    if (dismissBtn) {
      dismissBtn.onclick = () => {
        this.hideJitsiPrompt();
      };
    }
  }
  
  private checkJitsiProximity(): void {
    if (!this.player || !this.jitsiManager) return;
    
    const playerX = this.player.x;
    const playerY = this.player.y;
    
    // Find if player is in any Jitsi zone
    const inZone = this.jitsiZones.find(zone => 
      this.jitsiManager!.isInZone(playerX, playerY, zone)
    );
    
    if (inZone && inZone.id !== this.currentJitsiZone?.id) {
      // Entered a new zone
      this.currentJitsiZone = inZone;
      
      if (inZone.trigger === 'onenter') {
        // Auto-join
        this.jitsiManager.enterZone(inZone);
      } else {
        // Show prompt
        this.showJitsiPrompt(inZone);
      }
    } else if (!inZone && this.currentJitsiZone) {
      // Left the zone
      this.jitsiManager.exitZone(this.currentJitsiZone.id);
      this.currentJitsiZone = null;
      this.hideJitsiPrompt();
    }
  }
  
  /**
   * Create a visual sign for the meeting rooms entrance on the far right of the map
   */
  private createMeetingRoomSign(): void {
    const entrance = MEETING_ROOM_ENTRANCE;
    
    // Create a sign post container
    this.meetingRoomSign = this.add.container(entrance.x + entrance.width / 2, entrance.y - 20);
    this.meetingRoomSign.setDepth(50);
    
    // Sign background
    const signBg = this.add.graphics();
    signBg.fillStyle(0x8B4513, 1); // Wood brown
    signBg.fillRoundedRect(-40, -20, 80, 24, 4);
    signBg.fillStyle(0x654321, 1);
    signBg.fillRect(-2, 4, 4, 30); // Post
    
    // Sign text
    const signText = this.add.text(0, -8, 'Meeting Rooms', {
      fontSize: '7px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    // Arrow pointing right/into the area
    const arrow = this.add.text(0, 2, '>>>', {
      fontSize: '6px',
      color: '#4a90d9',
    }).setOrigin(0.5);
    
    this.meetingRoomSign.add([signBg, signText, arrow]);
    
    // Create a subtle floor indicator for the entrance zone
    const zoneIndicator = this.add.graphics();
    zoneIndicator.fillStyle(0x4a90d9, 0.15);
    zoneIndicator.fillRect(entrance.x, entrance.y, entrance.width, entrance.height);
    zoneIndicator.lineStyle(1, 0x4a90d9, 0.3);
    zoneIndicator.strokeRect(entrance.x, entrance.y, entrance.width, entrance.height);
    zoneIndicator.setDepth(1);
  }
  
  /**
   * Check if player is near the meeting room entrance
   */
  private checkMeetingRoomProximity(): void {
    if (!this.player) return;
    
    const entrance = MEETING_ROOM_ENTRANCE;
    const playerX = this.player.x;
    const playerY = this.player.y;
    
    const isNear = (
      playerX >= entrance.x &&
      playerX <= entrance.x + entrance.width &&
      playerY >= entrance.y &&
      playerY <= entrance.y + entrance.height
    );
    
    if (isNear !== this.nearMeetingRoomEntrance) {
      this.nearMeetingRoomEntrance = isNear;
      this.updateMeetingRoomPrompt();
    }
  }
  
  /**
   * Show/hide the meeting room entrance prompt
   */
  private updateMeetingRoomPrompt(): void {
    // Remove existing prompt
    if (this.meetingRoomPrompt) {
      this.meetingRoomPrompt.destroy();
      this.meetingRoomPrompt = null;
    }
    
    if (!this.nearMeetingRoomEntrance || !this.player) return;
    
    const entrance = MEETING_ROOM_ENTRANCE;
    
    // Create prompt above the entrance
    this.meetingRoomPrompt = this.add.container(
      entrance.x + entrance.width / 2,
      entrance.y - 40
    );
    this.meetingRoomPrompt.setDepth(200);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-70, -14, 140, 28, 6);
    bg.lineStyle(1, 0x4a90d9);
    bg.strokeRoundedRect(-70, -14, 140, 28, 6);
    
    // Text
    const text = this.add.text(0, -2, 'Press SPACE to enter', {
      fontSize: '9px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    const nameText = this.add.text(0, 8, 'Meeting Rooms', {
      fontSize: '8px',
      color: '#4a90d9',
    }).setOrigin(0.5);
    
    this.meetingRoomPrompt.add([bg, text, nameText]);
    
    // Pulse animation
    this.tweens.add({
      targets: this.meetingRoomPrompt,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
  
  /**
   * Check if player is near any agent for chat interaction
   */
  private checkAgentProximity(): void {
    if (!this.player) return;
    
    const playerX = this.player.x;
    const playerY = this.player.y;
    
    let closestAgentType: string | null = null;
    let closestAgent: Agent | null = null;
    let closestDistance = Infinity;
    
    // Find the closest agent within chat distance
    this.agents.forEach((agent, agentType) => {
      const dx = playerX - agent.x;
      const dy = playerY - agent.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= this.AGENT_CHAT_DISTANCE && distance < closestDistance) {
        closestAgentType = agentType;
        closestAgent = agent;
        closestDistance = distance;
      }
    });
    
    // Update nearby agent state
    const wasNearAgentType = this.nearbyAgent?.type;
    
    if (closestAgentType && closestAgent) {
      // Check if this is a different agent than before
      if (wasNearAgentType !== closestAgentType) {
        this.nearbyAgent = { type: closestAgentType, agent: closestAgent };
        this.updateAgentChatPrompt();
      }
    } else if (this.nearbyAgent) {
      this.nearbyAgent = null;
      this.updateAgentChatPrompt();
    }
  }
  
  /**
   * Show/hide the agent chat prompt
   */
  private updateAgentChatPrompt(): void {
    // Remove existing prompt
    if (this.agentChatPrompt) {
      this.agentChatPrompt.destroy();
      this.agentChatPrompt = null;
    }
    
    if (!this.nearbyAgent) return;
    
    const agent = this.nearbyAgent.agent;
    const agentConfig = AGENTS[this.nearbyAgent.type as keyof typeof AGENTS];
    
    // Create prompt above the agent
    this.agentChatPrompt = this.add.container(agent.x, agent.y - 45);
    this.agentChatPrompt.setDepth(200);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-65, -16, 130, 32, 6);
    bg.lineStyle(2, 0xe94560);
    bg.strokeRoundedRect(-65, -16, 130, 32, 6);
    
    // Key indicator
    const keyBg = this.add.graphics();
    keyBg.fillStyle(0xe94560, 1);
    keyBg.fillRoundedRect(-60, -12, 20, 20, 4);
    
    const keyText = this.add.text(-50, -2, 'C', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    // Chat text
    const text = this.add.text(5, -2, `Chat with ${agentConfig?.name || 'Agent'}`, {
      fontSize: '10px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    this.agentChatPrompt.add([bg, keyBg, keyText, text]);
    
    // Gentle pulse animation
    this.tweens.add({
      targets: this.agentChatPrompt,
      y: agent.y - 48,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
  
  /**
   * Start chatting with the nearby agent
   */
  private startAgentChat(): void {
    if (!this.nearbyAgent) return;
    
    const agentType = this.nearbyAgent.type;
    const agentConfig = AGENTS[agentType as keyof typeof AGENTS];
    
    console.log(`[TownScene] Starting chat with ${agentConfig?.name || agentType}`);
    
    // Select this agent in the UI via GameBridge
    GameBridge.selectAgentForChat(agentType);
    
    // Update UI to show selected agent
    const chatTitle = document.getElementById('chat-title');
    if (chatTitle && agentConfig) {
      // Escape user-controlled content to prevent XSS
      const safeName = escapeHtml(agentConfig.name);
      const safeEmoji = escapeHtml(agentConfig.emoji);
      chatTitle.innerHTML = `
        <span class="${safeEmoji}" style="color: #e94560;"></span>
        Chat with ${safeName}
        <button id="clear-agent-btn" onclick="clearAgentSelection()">x</button>
      `;
    }
    
    // Update input placeholder
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    if (chatInput && agentConfig) {
      chatInput.placeholder = `Ask ${agentConfig.name} something...`;
    }
    
    // Highlight the agent card in the sidebar
    document.querySelectorAll('.agent-card').forEach(card => {
      card.classList.remove('chat-selected');
      if ((card as HTMLElement).dataset.agent === agentType) {
        card.classList.add('chat-selected');
      }
    });
    
    // Switch to agent chat tab
    GameBridge.switchChatTab('agent');
    
    // Focus the chat input
    if (chatInput) {
      chatInput.focus();
    }
    
    // Have the agent greet the player
    const agent = this.nearbyAgent.agent;
    const greetings = [
      `Hello! How can I help you?`,
      `Hi there! What would you like to know?`,
      `Hey! I'm ready to assist.`,
      `Welcome! Ask me anything.`,
    ];
    agent.speak(greetings[Math.floor(Math.random() * greetings.length)]);
  }
  
  /**
   * Cleanup before transitioning to another scene
   * Keeps multiplayer connection alive but cleans up scene-specific resources
   */
  private cleanupBeforeSceneChange(targetRoom?: string): void {
    console.log('[TownScene] Cleaning up before scene change');
    
    // DON'T disconnect multiplayer - keep the connection alive!
    // Just tell the server we're changing rooms
    if (this.multiplayer && targetRoom) {
      this.multiplayer.changeRoom(targetRoom);
      // Keep the reference in GameBridge so other scenes can use it
    }
    
    // Clean up Jitsi if active
    if (this.jitsiManager) {
      this.jitsiManager.leaveRoom();
    }
    
    // Clean up mini-map
    if (this.miniMap) {
      this.miniMap.destroy();
      this.miniMap = null;
    }
    
    // Clean up mobile controls
    if (this.mobileControls) {
      this.mobileControls.destroy();
      this.mobileControls = null;
    }
  }

  /**
   * Enter the meeting rooms area
   */
  private enterMeetingRooms(): void {
    // Disable further input while transitioning
    this.input.enabled = false;
    
    // Change room but keep connection alive
    this.cleanupBeforeSceneChange('meetings');
    
    // Update URL
    window.history.pushState({}, '', '/town/meetings');
    
    // Show retro transition via GameBridge
    GameBridge.showTransition(
      `/assets/sprites/${this.playerAvatar}.png`,
      'Entering Meeting Rooms...',
      () => {
        this.scene.start('meeting-room-scene', {
          fromTown: true,
          playerAvatar: this.playerAvatar,
          playerName: this.playerName,
        });
      }
    );
  }
  
  private showJitsiPrompt(zone: JitsiZone): void {
    const prompt = document.getElementById('jitsi-prompt');
    const title = document.getElementById('jitsi-prompt-title');
    const desc = document.getElementById('jitsi-prompt-description');
    
    if (prompt && title && desc) {
      title.textContent = `Join ${zone.displayName || 'Video Chat'}`;
      desc.textContent = 'Press J to join voice chat with nearby players';
      prompt.classList.add('show');
    }
  }
  
  private hideJitsiPrompt(): void {
    const prompt = document.getElementById('jitsi-prompt');
    prompt?.classList.remove('show');
  }
  
  /**
   * Close all prompts/UI overlays (used by mobile B button and ESC key)
   */
  private closeAllPrompts(): void {
    // Door prompt
    if (this.doorPrompt) {
      this.doorPrompt.destroy();
      this.doorPrompt = null;
    }
    
    // Meeting room prompt
    if (this.meetingRoomPrompt) {
      this.meetingRoomPrompt.destroy();
      this.meetingRoomPrompt = null;
    }
    
    // Agent chat prompt
    if (this.agentChatPrompt) {
      this.agentChatPrompt.destroy();
      this.agentChatPrompt = null;
    }
    
    // Jitsi prompt
    this.hideJitsiPrompt();
    
    // Clear nearby states
    this.nearbyDoor = null;
    this.nearbyAgent = null;
    this.nearMeetingRoomEntrance = false;
  }
  
  private updateJitsiUI(inCall: boolean, roomName?: string): void {
    const container = document.getElementById('jitsi-container');
    const roomNameEl = document.getElementById('jitsi-room-name');
    
    if (container) {
      if (inCall) {
        container.classList.add('active');
      } else {
        container.classList.remove('active');
        container.classList.remove('minimized');
      }
    }
    
    if (roomNameEl && roomName) {
      // Remove prefix for display
      const displayName = roomName.replace(JITSI_CONFIG.roomPrefix, '');
      roomNameEl.textContent = displayName.charAt(0).toUpperCase() + displayName.slice(1).replace(/-/g, ' ');
    }
  }
  
  private updatePlayerCount(): void {
    if (!this.multiplayer) return;
    
    const count = this.multiplayer.getPlayerCount();
    
    if (this.playerCountText) {
      this.playerCountText.setText(`Players: ${count}`);
    }
  }
  
  private showWelcomeMessage(): void {
    const { width, height } = this.cameras.main;
    
    // Create welcome banner
    const banner = this.add.container(width / 2, 50);
    banner.setScrollFactor(0);
    banner.setDepth(1000);
    
    const bg = this.add.rectangle(0, 0, 300, 40, 0x000000, 0.8);
    bg.setStrokeStyle(2, 0x4a90d9);
    
    const text = this.add.text(0, 0, `Welcome, ${this.playerName}!`, {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    const subtext = this.add.text(0, 18, 'Use WASD or Arrow keys to move', {
      fontSize: '10px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    
    banner.add([bg, text, subtext]);
    
    // Animate in
    banner.setAlpha(0);
    banner.y = 30;
    
    this.tweens.add({
      targets: banner,
      alpha: 1,
      y: 50,
      duration: 500,
      ease: 'Back.easeOut',
    });
    
    // Fade out after 4 seconds
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: banner,
        alpha: 0,
        y: 30,
        duration: 500,
        onComplete: () => banner.destroy(),
      });
    });
  }

  private initUI(): void {
    // Set up the HTML chat panel
    this.setupChatPanel();
    
    // Create mini-map in bottom-left corner
    this.miniMap = new MiniMap(this, {
      x: 15,
      y: 600 - 120 - 15, // 15px from bottom
      width: 120,
      height: 120,
      worldWidth: this.map.widthInPixels,
      worldHeight: this.map.heightInPixels,
      currentLocation: 'ark-central',
    });
    
    // Player count indicator (top-right, fixed to camera)
    this.playerCountText = this.add.text(780, 10, 'Players: 1', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    
    // Player name indicator (top-left, fixed to camera)
    this.playerNameText = this.add.text(10, 10, this.playerName, {
      fontSize: '12px',
      color: '#4a90d9',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(100);
  }

  private setupChatPanel(): void {
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const chatSend = document.getElementById('chat-send') as HTMLButtonElement;
    
    if (!chatInput || !chatSend) {
      console.error('Chat panel elements not found');
      return;
    }

    // Handle send button click
    chatSend.onclick = () => {
      this.handleChatSubmit(chatInput);
    };

    // Handle Enter key
    chatInput.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleChatSubmit(chatInput);
      }
    };
  }

  private handleChatSubmit(chatInput: HTMLInputElement): void {
    const query = chatInput.value.trim();
    if (!query || this.isProcessing) return;

    // Clear input
    chatInput.value = '';
    
    // Add user message to chat
    this.addChatMessage('user', query);
    
    // Process the query
    this.processQuery(query);
  }

  private addChatMessage(type: 'user' | 'agent', content: string, agentType?: string): void {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    // Remove welcome message if present
    const welcome = chatMessages.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;

    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (type === 'user') {
      messageDiv.innerHTML = `
        <div class="bubble">
          <p>${escapeHtml(content)}</p>
        </div>
        <div class="timestamp">${timestamp}</div>
      `;
    } else {
      const agentConfig = agentType ? AGENTS[agentType as keyof typeof AGENTS] : null;
      const iconSpan = agentConfig ? getIconSpan(agentConfig.emoji, 14) : '';
      const agentName = agentConfig ? `${iconSpan} ${escapeHtml(agentConfig.name)}` : 'Agent';
      messageDiv.innerHTML = `
        <div class="agent-name">${agentName}</div>
        <div class="bubble">
          <p>${escapeHtml(content)}</p>
        </div>
        <div class="timestamp">${timestamp}</div>
      `;
    }

    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  private showTypingIndicator(): HTMLElement | null {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return null;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message agent';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return typingDiv;
  }

  private removeTypingIndicator(): void {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
  }

  private updateChatStatus(status: string): void {
    const statusEl = document.getElementById('chat-status');
    if (statusEl) statusEl.textContent = status;
  }

  private setChatInputEnabled(enabled: boolean): void {
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const chatSend = document.getElementById('chat-send') as HTMLButtonElement;
    if (chatInput) chatInput.disabled = !enabled;
    if (chatSend) chatSend.disabled = !enabled;
  }

  // Note: escapeHtml is now imported from utils.ts for XSS protection

  private async processQuery(query: string): Promise<void> {
    this.isProcessing = true;
    this.setChatInputEnabled(false);
    
    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: query });

    // Check if a specific agent is selected in the UI
    const selectedAgent = GameBridge.selectedChatAgent;
    
    // Route the query to determine which agents should respond
    // If an agent is selected, use that one; otherwise use automatic routing
    let relevantAgents: string[];
    if (selectedAgent && AGENTS[selectedAgent as keyof typeof AGENTS]) {
      relevantAgents = [selectedAgent];
      console.log(`Using selected agent: ${selectedAgent}`);
    } else {
      relevantAgents = routeQuery(query);
      console.log('Auto-routing to agents:', relevantAgents);
    }
    
    const mainAgentType = relevantAgents[0];
    const mainAgentConfig = AGENTS[mainAgentType as keyof typeof AGENTS];
    const iconSpan = mainAgentConfig ? getIconSpan(mainAgentConfig.emoji, 12) : '';
    this.updateChatStatus(`${iconSpan} ${mainAgentConfig?.name || 'Agent'} is thinking...`);

    // Phase 1: Agents think about the query (show thought bubbles)
    relevantAgents.forEach((agentType) => {
      const agent = this.agents.get(agentType);
      if (agent) {
        eventsCenter.emit(`${agentType}-think`, 'Thinking...');
      }
    });

    // Phase 2: Move relevant agents to meeting point
    await this.moveAgentsToMeeting(relevantAgents);

    // Phase 3: Show typing indicator in chat
    this.showTypingIndicator();
    this.updateChatStatus(`${mainAgentConfig?.emoji || ''} ${mainAgentConfig?.name || 'Agent'} is typing...`);

    // Phase 4: Call the API (streaming handles adding message to chat)
    try {
      const result = await this.callAgentAPI(query, mainAgentType);
      
      // Typing indicator is already removed by streaming
      // No need to call removeTypingIndicator() again
      
      // Phase 5: Show handoffs if multiple agents collaborated
      if (result.handoffs && result.handoffs.length > 1) {
        const handoffNames = result.handoffs.map(h => {
          const config = AGENTS[h as keyof typeof AGENTS];
          const iconSpan = config ? getIconSpan(config.emoji, 12) : '';
          return config ? `${iconSpan} ${config.name}` : h;
        }).join(' → ');
        this.updateChatStatus(`Collaborated: ${handoffNames}`);
        
        // Show collaboration in game - each agent in handoff chain speaks briefly
        result.handoffs.forEach((agentType, index) => {
          const agent = this.agents.get(agentType);
          if (agent && index < result.handoffs.length - 1) {
            this.time.delayedCall(index * 800, () => {
              agent.think('Passing to next...');
            });
          }
        });
      }
      
      // Phase 6: Show the response in game bubble (chat message already added by streaming)
      const respondingAgent = this.agents.get(result.agent);
      if (respondingAgent && result.response) {
        // Show truncated version in game bubble
        respondingAgent.speak(this.truncateText(result.response, 80));
        
        // Note: Chat message is already added by streaming in callAgentAPI
        // Only add if fallback was used (no streaming message exists)
        const existingStreamingMsg = document.querySelector('.chat-message.agent:last-child .streaming-content');
        if (!existingStreamingMsg) {
          this.addChatMessage('agent', result.response, result.agent);
        }
      }

      this.conversationHistory.push({
        role: 'assistant',
        content: result.response || 'No response',
        agent: result.agent,
      });

    } catch (error) {
      console.error('API Error:', error);
      this.removeTypingIndicator();
      
      const errorMessage = 'Sorry, I encountered an error processing your request.';
      this.addChatMessage('agent', errorMessage, mainAgentType);
      
      const mainAgent = this.agents.get(mainAgentType);
      if (mainAgent) {
        mainAgent.speak('Oops, something went wrong!');
      }
    }

    // Phase 6: Return agents to original positions after delay
    this.updateChatStatus('Ready');
    this.setChatInputEnabled(true);
    this.isProcessing = false;
    
    this.time.delayedCall(8000, () => {
      this.returnAgentsToPositions();
    });
  }

  private async moveAgentsToMeeting(agentTypes: string[]): Promise<void> {
    return new Promise((resolve) => {
      const offsets = [
        { x: -20, y: 0 },
        { x: 20, y: 0 },
        { x: 0, y: -20 },
        { x: 0, y: 20 },
        { x: 0, y: 0 },
      ];

      let arrivedCount = 0;
      const totalAgents = agentTypes.length;

      agentTypes.forEach((agentType, index) => {
        const agent = this.agents.get(agentType);
        if (agent) {
          const offset = offsets[index % offsets.length];
          const targetX = MEETING_POINT.x + offset.x;
          const targetY = MEETING_POINT.y + offset.y;

          // Listen for arrival
          const arrivalHandler = () => {
            arrivedCount++;
            eventsCenter.off(`${agentType}-arrived`, arrivalHandler);
            if (arrivedCount >= totalAgents) {
              resolve();
            }
          };
          eventsCenter.on(`${agentType}-arrived`, arrivalHandler);

          // Start movement
          eventsCenter.emit(`${agentType}-moveTo`, { x: targetX, y: targetY });
        }
      });

      // Timeout fallback
      this.time.delayedCall(5000, () => {
        resolve();
      });
    });
  }

  private returnAgentsToPositions(): void {
    const originalPositions: Record<string, { x: number; y: number }> = {
      scout: { x: 200, y: 200 },
      sage: { x: 350, y: 200 },
      chronicle: { x: 200, y: 300 },
      trends: { x: 350, y: 300 },
      maven: { x: 275, y: 350 },
      gandalfius: { x: 420, y: 280 },
    };

    this.agents.forEach((agent, agentType) => {
      const pos = originalPositions[agentType];
      if (pos) {
        eventsCenter.emit(`${agentType}-moveTo`, { x: pos.x, y: pos.y });
      }
    });
  }

  private async callAgentAPI(query: string, agentType: string): Promise<{
    response: string;
    agent: string;
    handoffs: string[];
  }> {
    try {
      // Get user's preferred AI model
      const userModel = GameBridge.userPreferredModel;
      
      // Use streaming endpoint for real-time response
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          agent: agentType,
          use_swarm: false,
          model_id: userModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';
      let respondingAgent = agentType;
      
      // Get the chat messages container for streaming updates
      const chatMessages = document.getElementById('chat-messages');
      let streamingMessageDiv: HTMLElement | null = null;
      
      // Create a streaming message bubble
      if (chatMessages) {
        // Remove typing indicator first
        this.removeTypingIndicator();
        
        const agentConfig = AGENTS[agentType as keyof typeof AGENTS];
        const iconSpan = agentConfig ? getIconSpan(agentConfig.emoji, 14) : '';
        const agentName = agentConfig ? `${iconSpan} ${escapeHtml(agentConfig.name)}` : 'Agent';
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        streamingMessageDiv = document.createElement('div');
        streamingMessageDiv.className = 'chat-message agent streaming';
        streamingMessageDiv.innerHTML = `
          <div class="agent-name">${agentName}</div>
          <div class="bubble">
            <p class="streaming-content"></p>
          </div>
          <div class="timestamp">${timestamp}</div>
        `;
        chatMessages.appendChild(streamingMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      
      const streamingContent = streamingMessageDiv?.querySelector('.streaming-content');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk' && data.data) {
                fullResponse += data.data;
                
                // Update streaming message in real-time
                if (streamingContent) {
                  streamingContent.textContent = fullResponse;
                  chatMessages!.scrollTop = chatMessages!.scrollHeight;
                }
              } else if (data.type === 'start') {
                respondingAgent = data.agent || agentType;
                console.log(`[Stream] Started with agent: ${respondingAgent}`);
              } else if (data.type === 'done') {
                respondingAgent = data.agent || agentType;
                if (data.response) {
                  fullResponse = data.response;
                }
                console.log(`[Stream] Completed: ${fullResponse.length} chars`);
              } else if (data.type === 'error') {
                console.error('[Stream] Error:', data.message);
                throw new Error(data.message);
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
              if (line.trim() && !line.includes('{"type"')) {
                console.warn('Failed to parse SSE:', line);
              }
            }
          }
        }
      }
      
      // Remove streaming class when done
      if (streamingMessageDiv) {
        streamingMessageDiv.classList.remove('streaming');
      }

      return {
        response: fullResponse || 'No response received',
        agent: respondingAgent,
        handoffs: [respondingAgent],
      };
    } catch (error) {
      console.error('API call failed:', error);
      // Fallback to non-streaming endpoint
      try {
        const fallbackResponse = await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            agent: agentType,
            use_swarm: false,
          }),
        });
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          return {
            response: data.response || 'No response received',
            agent: data.agent || agentType,
            handoffs: data.handoffs || [agentType],
          };
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
      
      // Return a mock response for demo purposes
      return {
        response: `[${AGENTS[agentType as keyof typeof AGENTS]?.name || agentType}] I'm ready to help! However, the backend server isn't running. Start it with: cd backend && source venv/bin/activate && python server.py`,
        agent: agentType,
        handoffs: [agentType],
      };
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Check if game controls are currently enabled
   * Controls are disabled when user is typing in chat sidebar
   */
  private areControlsDisabled(): boolean {
    return !GameBridge.areControlsUsable();
  }

  private setupEventListeners(): void {
    // Create interactive zones for building doors
    this.createDoorZones();
    
    // Configure Phaser keyboard to not interfere with HTML inputs
    // Best practice: Check focus before processing keyboard events
    // We already do this in areControlsDisabled(), but we also need to
    // prevent Phaser from capturing text input keys (letters, numbers, etc.)
    if (this.input.keyboard) {
      // Remove capture for common text input keys to allow normal typing
      // This prevents Phaser from intercepting keys that should go to HTML inputs
      const textInputKeys = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
        'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
        'ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'
      ];
      
      // Note: removeCapture is used to stop capturing keys that Phaser has already captured
      // For keys that haven't been captured yet, we rely on focus checking
      // The focus check in areControlsDisabled() handles this properly
    }
    
    // SPACE key to enter nearby building or meeting rooms
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.areControlsDisabled()) return; // Don't trigger when typing in chat
      
      if (this.nearbyDoor) {
        console.log(`[TownScene] Entering ${this.nearbyDoor.name} via SPACE key`);
        this.enterBuilding(this.nearbyDoor);
      } else if (this.nearMeetingRoomEntrance) {
        console.log('[TownScene] Entering Meeting Rooms via SPACE key');
        this.enterMeetingRooms();
      }
    });
    
    // E key as alternative
    this.input.keyboard?.on('keydown-E', () => {
      if (this.areControlsDisabled()) return; // Don't trigger when typing in chat
      
      if (this.nearbyDoor) {
        console.log(`[TownScene] Entering ${this.nearbyDoor.name} via E key`);
        this.enterBuilding(this.nearbyDoor);
      } else if (this.nearMeetingRoomEntrance) {
        console.log('[TownScene] Entering Meeting Rooms via E key');
        this.enterMeetingRooms();
      }
    });
    
    // J key to join/leave Jitsi voice chat
    this.input.keyboard?.on('keydown-J', () => {
      if (this.areControlsDisabled()) return; // Don't trigger when typing in chat
      
      if (this.currentJitsiZone && this.jitsiManager) {
        if (this.jitsiManager.isInRoom()) {
          // Already in room - leave
          this.jitsiManager.leaveRoom();
        } else {
          // Join the zone
          this.jitsiManager.joinRoom(this.currentJitsiZone);
          this.hideJitsiPrompt();
        }
      }
    });
    
    // C key to chat with nearby agent
    this.input.keyboard?.on('keydown-C', () => {
      if (this.areControlsDisabled()) return; // Don't trigger when typing in chat
      
      if (this.nearbyAgent) {
        console.log(`[TownScene] Starting chat with ${this.nearbyAgent.type} via C key`);
        this.startAgentChat();
      }
    });
    
    // Listen for pointer events on the scene
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Convert screen coordinates to world coordinates
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      
      console.log(`Click at screen (${pointer.x}, ${pointer.y}) -> world (${worldPoint.x.toFixed(0)}, ${worldPoint.y.toFixed(0)})`);
      
      // Check if click is on any building door
      const clickedZone = this.buildingZones.find((zone) => {
        const inZone = (
          worldPoint.x >= zone.doorX &&
          worldPoint.x <= zone.doorX + zone.doorWidth &&
          worldPoint.y >= zone.doorY &&
          worldPoint.y <= zone.doorY + zone.doorHeight
        );
        if (inZone) {
          console.log(`Matched zone: ${zone.name}`);
        }
        return inZone;
      });
      
      if (clickedZone) {
        console.log(`Entering building: ${clickedZone.name}`);
        this.enterBuilding(clickedZone);
      }
    });
  }

  // Visual door zone indicators (invisible by default, highlight on hover)
  private doorGraphics: Phaser.GameObjects.Graphics | null = null;
  private hoveredZone: typeof this.buildingZones[0] | null = null;

  private createDoorZones(): void {
    // Create graphics for door highlighting
    this.doorGraphics = this.add.graphics();
    this.doorGraphics.setDepth(100);
    
    // Track mouse movement for hover effects
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      
      // Find if hovering over any door
      const hoverZone = this.buildingZones.find((zone) => {
        return (
          worldPoint.x >= zone.doorX - 4 &&
          worldPoint.x <= zone.doorX + zone.doorWidth + 4 &&
          worldPoint.y >= zone.doorY - 4 &&
          worldPoint.y <= zone.doorY + zone.doorHeight + 4
        );
      });
      
      if (hoverZone !== this.hoveredZone) {
        this.hoveredZone = hoverZone || null;
        this.updateDoorHighlight();
        
        // Change cursor
        if (hoverZone) {
          this.input.manager.canvas.style.cursor = 'pointer';
        } else {
          this.input.manager.canvas.style.cursor = 'default';
        }
      }
    });
  }

  private updateDoorHighlight(): void {
    if (!this.doorGraphics) return;
    
    this.doorGraphics.clear();
    
    if (this.hoveredZone) {
      const zone = this.hoveredZone;
      const agentConfig = AGENTS[zone.agentType as keyof typeof AGENTS];
      const color = AGENT_COLORS[zone.agentType as keyof typeof AGENT_COLORS] || 0xffffff;
      
      // Draw highlight rectangle around door
      this.doorGraphics.lineStyle(2, color, 1);
      this.doorGraphics.strokeRect(
        zone.doorX - 2,
        zone.doorY - 2,
        zone.doorWidth + 4,
        zone.doorHeight + 4
      );
      
      // Draw pulsing effect (simple glow)
      this.doorGraphics.lineStyle(1, color, 0.5);
      this.doorGraphics.strokeRect(
        zone.doorX - 4,
        zone.doorY - 4,
        zone.doorWidth + 8,
        zone.doorHeight + 8
      );
      
      // Show building name tooltip above the door
      this.showDoorTooltip(zone);
    } else {
      this.hideDoorTooltip();
    }
  }

  private doorTooltip: Phaser.GameObjects.Container | null = null;

  private showDoorTooltip(zone: typeof this.buildingZones[0]): void {
    this.hideDoorTooltip();
    
    const agentConfig = AGENTS[zone.agentType as keyof typeof AGENTS];
    
    // Create tooltip container
    this.doorTooltip = this.add.container(
      zone.doorX + zone.doorWidth / 2,
      zone.doorY - 20
    );
    this.doorTooltip.setDepth(200);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-50, -10, 100, 20, 4);

    // Text (keeping emoji for now in Phaser text - will be replaced later)
    const text = this.add.text(0, 0, `${agentConfig.emoji} ${zone.name}`, {
      fontSize: '8px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    this.doorTooltip.add([bg, text]);
  }

  private hideDoorTooltip(): void {
    if (this.doorTooltip) {
      this.doorTooltip.destroy();
      this.doorTooltip = null;
    }
  }

  private enterBuilding(zone: typeof this.buildingZones[0]): void {
    const agentConfig = AGENTS[zone.agentType as keyof typeof AGENTS];
    
    // Disable further input while transitioning
    this.input.enabled = false;
    
    // Change room but keep connection alive
    const roomSlug = GameBridge.getAgentRoute(zone.agentType);
    this.cleanupBeforeSceneChange(roomSlug);
    
    // Update URL with room route
    window.history.pushState({}, '', `/town/${roomSlug}`);
    
    // Show retro transition (GameBridge handles fallback if not registered)
    GameBridge.showTransition(
      `/assets/sprites/${agentConfig.sprite}.png`,
      `Entering ${zone.name}...`,
      () => {
        // Start the room scene with the agent type
        this.scene.start('room-scene', {
          agentType: zone.agentType,
          fromTown: true,
        });
      }
    );
  }

  /**
   * Update player settings (name and avatar) from settings modal
   */
  updatePlayerSettings(displayName: string, avatarSprite: string): void {
    // Update local state
    this.playerName = displayName;
    this.playerAvatar = avatarSprite;
    
    // Update player display name
    if (this.player) {
      this.player.setDisplayName(displayName);
      
      // Update avatar texture if it changed
      if (this.player.texture.key !== avatarSprite) {
        const currentX = this.player.x;
        const currentY = this.player.y;
        const currentDepth = this.player.depth;
        
        // Remove old player
        this.player.destroy();
        
        // Create new player with new avatar
        this.player = new Player(this, currentX, currentY, avatarSprite, displayName);
        this.player.setDepth(currentDepth);
        
        // Re-add collisions
        if (this.wallLayer) this.physics.add.collider(this.player, this.wallLayer);
        if (this.treeLayer) this.physics.add.collider(this.player, this.treeLayer);
        if (this.houseLayer) this.physics.add.collider(this.player, this.houseLayer);
        
        // Re-setup position callback
        this.player.onPositionChange = (x, y, direction, isMoving, animation) => {
          if (this.multiplayer) {
            this.multiplayer.sendPosition(x, y, direction, isMoving, animation);
          }
        };
        
        // Restore camera follow
        if (this.cameras.main) {
          this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        }
      }
    }
    
    // Update multiplayer display name
    if (this.multiplayer) {
      this.multiplayer.setDisplayName(displayName);
    }
    
    // Update Jitsi display name
    if (this.jitsiManager) {
      this.jitsiManager.config.playerName = displayName;
    }
    
    // Update UI text (top-left player name indicator)
    if (this.playerNameText) {
      this.playerNameText.setText(displayName);
    }
    
    console.log(`[TownScene] Updated player settings: ${displayName} (${avatarSprite})`);
  }
}
