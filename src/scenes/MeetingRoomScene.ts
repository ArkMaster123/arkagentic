import { Scene, Tilemaps, GameObjects } from 'phaser';
import { Player } from '../classes/Player';
import { JitsiManager, JitsiZone } from '../classes/JitsiManager';
import { MiniMap } from '../classes/MiniMap';
import { JITSI_CONFIG } from '../constants';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';
import BoardPlugin from 'phaser3-rex-plugins/plugins/board-plugin';

interface MeetingRoomData {
  fromTown: boolean;
  playerAvatar?: string;
  playerName?: string;
}

interface MeetingZoneObject {
  zone: JitsiZone;
  indicator: GameObjects.Container;
  isActive: boolean;
}

export class MeetingRoomScene extends Scene {
  private map!: Tilemaps.Tilemap;
  private player!: Player;
  private playerAvatar: string = 'brendan';
  private playerName: string = 'Player';
  
  // Jitsi integration
  private jitsiManager: JitsiManager | null = null;
  private jitsiZones: MeetingZoneObject[] = [];
  private currentJitsiZone: JitsiZone | null = null;
  
  // UI elements
  private miniMap: MiniMap | null = null;
  private zoneIndicator: GameObjects.Container | null = null;
  
  public rexUI!: UIPlugin;
  public rexBoard!: BoardPlugin;

  constructor() {
    super('meeting-room-scene');
  }

  init(data: MeetingRoomData): void {
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
  }

  create(): void {
    this.createRoomFromTilemap();
    this.createPlayer();
    this.setupJitsiZones();
    this.initJitsi();
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
    this.map = this.make.tilemap({ key: 'room-meeting' });
    
    // Add tileset - using dungeon tileset
    const tileset = this.map.addTilesetImage('dungeon', 'dungeon-tiles');
    
    if (!tileset) {
      console.error('[MeetingRoomScene] Failed to load tileset');
      return;
    }

    // Create layers
    const floorLayer = this.map.createLayer('floor', tileset, 0, 0);
    const wallsLayer = this.map.createLayer('walls', tileset, 0, 0);
    const furnitureLayer = this.map.createLayer('furniture', tileset, 0, 0);

    // Set depth for proper layering
    if (floorLayer) floorLayer.setDepth(0);
    if (wallsLayer) {
      wallsLayer.setDepth(1);
      // Set collision more selectively - only collide with actual wall tiles
      // Exclude empty tiles (0), invalid tiles (-1), and some edge cases
      // This allows walking through doorways which are empty tiles (0) in the walls layer
      wallsLayer.setCollisionByExclusion([-1, 0]);
      
      // Additionally, make sure we can walk through any tiles that are 0 or near zone entrances
      // This is a workaround for tilemaps that might not have perfect doorways
      wallsLayer.forEachTile((tile) => {
        if (tile && tile.index === 0) {
          // Empty tiles are doorways - make sure they're not collidable
          tile.setCollision(false);
        }
      });
    }
    if (furnitureLayer) {
      furnitureLayer.setDepth(2);
      // Furniture collision - only collide with actual furniture tiles (not empty)
      furnitureLayer.setCollisionByExclusion([-1, 0]);
    }

    // Set up camera
    const roomWidth = this.map.widthInPixels;   // 30 * 16 = 480
    const roomHeight = this.map.heightInPixels; // 20 * 16 = 320
    
    const availableHeight = 600 - 100; // Leave room for UI
    const availableWidth = 800;
    
    const zoomX = availableWidth / roomWidth;
    const zoomY = availableHeight / roomHeight;
    const zoom = Math.min(zoomX, zoomY, 1.5); // Cap at 1.5x zoom
    
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(0, 0, roomWidth, roomHeight);
    this.cameras.main.setViewport(0, 50, 800, 550);

    console.log(`[MeetingRoomScene] Room: ${roomWidth}x${roomHeight}, Zoom: ${zoom.toFixed(2)}`);
  }

  private createPlayer(): void {
    // Get spawn point from tilemap or use default
    let spawnX = this.map.widthInPixels / 2;
    let spawnY = this.map.heightInPixels - 40;

    const objectLayer = this.map.getObjectLayer('objects');
    if (objectLayer) {
      const spawn = objectLayer.objects.find((obj) => obj.type === 'spawn');
      if (spawn && spawn.x !== undefined && spawn.y !== undefined) {
        spawnX = spawn.x;
        spawnY = spawn.y;
      }
    }

    this.player = new Player(this, spawnX, spawnY, this.playerAvatar, this.playerName);
    this.player.setDepth(10);
    
    // Make player body slightly smaller to fit through doorways easier
    const playerBody = this.player.getBody();
    if (playerBody) {
      playerBody.setSize(10, 10);
      playerBody.setOffset(3, 5);
    }

    // Add collision with walls and furniture
    const wallsLayer = this.map.getLayer('walls')?.tilemapLayer;
    const furnitureLayer = this.map.getLayer('furniture')?.tilemapLayer;
    
    // Wall collision - empty tiles (0) in walls layer are doorways
    // The collision is set to exclude 0 tiles, so doorways should be walkable
    if (wallsLayer) {
      this.physics.add.collider(this.player, wallsLayer);
    }
    
    // Furniture collision for tables
    if (furnitureLayer) {
      this.physics.add.collider(this.player, furnitureLayer);
    }
    
    // Debug: Log zone positions to verify they're accessible
    console.log('[MeetingRoomScene] Jitsi zones:', this.jitsiZones.map(z => ({
      name: z.zone.displayName,
      x: z.zone.x,
      y: z.zone.y,
      width: z.zone.width,
      height: z.zone.height
    })));

    // Camera follows player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private setupJitsiZones(): void {
    const objectLayer = this.map.getObjectLayer('objects');
    if (!objectLayer) {
      console.error('[MeetingRoomScene] No objects layer found in tilemap!');
      return;
    }

    console.log(`[MeetingRoomScene] Found ${objectLayer.objects.length} objects in layer`);

    objectLayer.objects.forEach((obj) => {
      console.log(`[MeetingRoomScene] Object: ${obj.name}, type: ${obj.type}`);
      
      if (obj.type === 'jitsi-zone' && obj.x !== undefined && obj.y !== undefined) {
        // Extract properties
        const roomNameProp = obj.properties?.find((p: any) => p.name === 'roomName');
        const displayNameProp = obj.properties?.find((p: any) => p.name === 'displayName');
        const triggerProp = obj.properties?.find((p: any) => p.name === 'trigger');

        const zone: JitsiZone = {
          id: `meeting-${obj.id}`,
          roomName: `${JITSI_CONFIG.roomPrefix}${roomNameProp?.value || obj.name}`,
          displayName: displayNameProp?.value || obj.name,
          trigger: (triggerProp?.value as 'onenter' | 'onaction') || 'onenter',
          x: obj.x,
          y: obj.y,
          width: obj.width || 64,
          height: obj.height || 64,
        };

        console.log(`[MeetingRoomScene] Created Jitsi zone: ${zone.displayName} at (${zone.x}, ${zone.y}) size ${zone.width}x${zone.height}`);

        // Create visual indicator for the zone
        const indicator = this.createZoneIndicator(zone);
        
        this.jitsiZones.push({
          zone,
          indicator,
          isActive: false,
        });
      }
    });

    console.log(`[MeetingRoomScene] Set up ${this.jitsiZones.length} Jitsi zones total`);
  }

  private createZoneIndicator(zone: JitsiZone): GameObjects.Container {
    const container = this.add.container(
      zone.x + zone.width / 2,
      zone.y + zone.height / 2
    );
    container.setDepth(5);

    // Subtle floor highlight
    const highlight = this.add.graphics();
    highlight.fillStyle(0x4a90d9, 0.15);
    highlight.fillRect(-zone.width / 2, -zone.height / 2, zone.width, zone.height);
    highlight.lineStyle(1, 0x4a90d9, 0.4);
    highlight.strokeRect(-zone.width / 2, -zone.height / 2, zone.width, zone.height);

    // Zone name label
    const label = this.add.text(0, -zone.height / 2 - 8, zone.displayName || zone.roomName, {
      fontSize: '8px',
      color: '#4a90d9',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 1);

    container.add([highlight, label]);
    return container;
  }

  private initJitsi(): void {
    this.jitsiManager = new JitsiManager({
      domain: JITSI_CONFIG.domain || undefined,
      freeServers: (JITSI_CONFIG as any).freeServers,
      fallbackDomain: JITSI_CONFIG.fallbackDomain,
      containerId: JITSI_CONFIG.containerId,
      playerName: this.playerName,
      startWithAudio: JITSI_CONFIG.startWithAudio,
      startWithVideo: JITSI_CONFIG.startWithVideo,
    });

    // Set up event listeners
    this.jitsiManager.on('joined', (data) => {
      console.log('[MeetingRoomScene] Joined Jitsi room:', data.roomName);
      this.updateZoneUI(true);
    });

    this.jitsiManager.on('left', () => {
      console.log('[MeetingRoomScene] Left Jitsi room');
      this.updateZoneUI(false);
      this.currentJitsiZone = null;
    });

    this.jitsiManager.on('participantJoined', (data) => {
      this.showNotification(`${data.displayName} joined the meeting`);
    });

    this.jitsiManager.on('participantLeft', (data) => {
      this.showNotification(`Someone left the meeting`);
    });

    // Set up UI button handlers
    this.setupJitsiUIHandlers();
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

  private createUI(): void {
    // Title bar
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x000000, 0.8);
    titleBg.fillRect(0, 0, 800, 50);
    titleBg.fillStyle(0x4a90d9, 1);
    titleBg.fillRect(0, 0, 800, 4);
    titleBg.setScrollFactor(0);
    titleBg.setDepth(3000);

    // Title text
    const titleText = this.add.text(400, 15, 'Meeting Rooms', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3001);

    const descText = this.add.text(400, 33, 'Walk into a room to join the video call', {
      fontSize: '11px',
      color: '#aaaaaa',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3001);

    // Back button
    const backBtnBg = this.add.graphics();
    backBtnBg.fillStyle(0xe94560, 1);
    backBtnBg.fillRoundedRect(15, 10, 110, 30, 6);
    backBtnBg.setScrollFactor(0);
    backBtnBg.setDepth(3001);

    const backBtnText = this.add.text(70, 25, '< Back to Town', {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3002);

    const backHitArea = this.add.rectangle(70, 25, 110, 30, 0x000000, 0);
    backHitArea.setScrollFactor(0);
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

    // Footer instructions
    const footerBg = this.add.graphics();
    footerBg.fillStyle(0x000000, 0.6);
    footerBg.fillRect(0, 570, 800, 30);
    footerBg.setScrollFactor(0);
    footerBg.setDepth(3000);

    this.add.text(400, 585, 'WASD to move  |  Walk into zones to join meetings  |  ESC to exit', {
      fontSize: '11px',
      color: '#888888',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

    // Mini-map
    this.miniMap = new MiniMap(this, {
      x: 15,
      y: 600 - 100 - 45,
      width: 100,
      height: 100,
      worldWidth: this.map.widthInPixels,
      worldHeight: this.map.heightInPixels,
      currentLocation: 'meeting-rooms',
    });
  }

  private setupInput(): void {
    // ESC to exit
    this.input.keyboard?.on('keydown-ESC', () => {
      this.exitRoom();
    });

    // J to manually join/leave Jitsi
    this.input.keyboard?.on('keydown-J', () => {
      if (this.currentJitsiZone && this.jitsiManager) {
        if (this.jitsiManager.isInRoom()) {
          this.jitsiManager.leaveRoom();
        } else {
          this.jitsiManager.joinRoom(this.currentJitsiZone);
          this.hideJitsiPrompt();
        }
      }
    });
  }

  update(): void {
    if (this.player) {
      this.player.update();
      this.checkJitsiProximity();
    }
  }

  private checkJitsiProximity(): void {
    if (!this.player || !this.jitsiManager) return;

    const playerX = this.player.x;
    const playerY = this.player.y;

    // Find if player is in any Jitsi zone
    let inZone: MeetingZoneObject | undefined;
    
    for (const zoneObj of this.jitsiZones) {
      const zone = zoneObj.zone;
      const isInside = (
        playerX >= zone.x &&
        playerX <= zone.x + zone.width &&
        playerY >= zone.y &&
        playerY <= zone.y + zone.height
      );

      // Debug logging for zone detection
      if (zone.displayName === 'Meeting Room Alpha' || zone.displayName === 'Meeting Room Beta' || zone.displayName === 'Main Conference Room') {
        const distanceX = Math.abs(playerX - (zone.x + zone.width / 2));
        const distanceY = Math.abs(playerY - (zone.y + zone.height / 2));
        if (distanceX < 100 && distanceY < 100) {
          console.log(`[MeetingRoomScene] Player near ${zone.displayName}: player(${playerX.toFixed(1)}, ${playerY.toFixed(1)}), zone(${zone.x}, ${zone.y}) size ${zone.width}x${zone.height}, inside: ${isInside}`);
        }
      }

      // Update visual indicator
      if (isInside && !zoneObj.isActive) {
        zoneObj.isActive = true;
        this.highlightZone(zoneObj, true);
        console.log(`[MeetingRoomScene] ✅ Entered zone: ${zone.displayName} at (${zone.x}, ${zone.y}) size ${zone.width}x${zone.height}, player at (${playerX.toFixed(1)}, ${playerY.toFixed(1)})`);
      } else if (!isInside && zoneObj.isActive) {
        zoneObj.isActive = false;
        this.highlightZone(zoneObj, false);
        console.log(`[MeetingRoomScene] Left zone: ${zone.displayName}`);
      }

      if (isInside) {
        inZone = zoneObj;
      }
    }

    if (inZone && inZone.zone.id !== this.currentJitsiZone?.id) {
      // Entered a new zone
      this.currentJitsiZone = inZone.zone;
      console.log(`[MeetingRoomScene] 🎯 Triggering Jitsi for zone: ${inZone.zone.displayName}, trigger: ${inZone.zone.trigger}`);

      if (inZone.zone.trigger === 'onenter') {
        // Auto-join
        console.log(`[MeetingRoomScene] Auto-joining Jitsi room: ${inZone.zone.roomName}`);
        this.jitsiManager.enterZone(inZone.zone);
      } else {
        // Show prompt
        this.showJitsiPrompt(inZone.zone);
      }
    } else if (!inZone && this.currentJitsiZone) {
      // Left the zone
      this.jitsiManager.exitZone(this.currentJitsiZone.id);
      this.currentJitsiZone = null;
      this.hideJitsiPrompt();
    }
  }

  private highlightZone(zoneObj: MeetingZoneObject, active: boolean): void {
    const graphics = zoneObj.indicator.list[0] as GameObjects.Graphics;
    if (!graphics) return;

    graphics.clear();
    
    const zone = zoneObj.zone;
    if (active) {
      graphics.fillStyle(0x4a90d9, 0.3);
      graphics.fillRect(-zone.width / 2, -zone.height / 2, zone.width, zone.height);
      graphics.lineStyle(2, 0x4a90d9, 0.8);
      graphics.strokeRect(-zone.width / 2, -zone.height / 2, zone.width, zone.height);
    } else {
      graphics.fillStyle(0x4a90d9, 0.15);
      graphics.fillRect(-zone.width / 2, -zone.height / 2, zone.width, zone.height);
      graphics.lineStyle(1, 0x4a90d9, 0.4);
      graphics.strokeRect(-zone.width / 2, -zone.height / 2, zone.width, zone.height);
    }
  }

  private showJitsiPrompt(zone: JitsiZone): void {
    const prompt = document.getElementById('jitsi-prompt');
    const title = document.getElementById('jitsi-prompt-title');
    const desc = document.getElementById('jitsi-prompt-description');

    if (prompt && title && desc) {
      title.textContent = `Join ${zone.displayName || 'Meeting'}`;
      desc.textContent = 'Press J to join the video call';
      prompt.classList.add('show');
    }
  }

  private hideJitsiPrompt(): void {
    const prompt = document.getElementById('jitsi-prompt');
    prompt?.classList.remove('show');
  }

  private updateZoneUI(inCall: boolean): void {
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

    if (roomNameEl && this.currentJitsiZone) {
      roomNameEl.textContent = this.currentJitsiZone.displayName || 'Meeting Room';
    }
  }

  private showNotification(message: string): void {
    // Create a temporary notification
    const notification = this.add.text(400, 100, message, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#4a90d9',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4000);

    this.tweens.add({
      targets: notification,
      alpha: 0,
      y: 80,
      duration: 2000,
      delay: 2000,
      onComplete: () => notification.destroy(),
    });
  }

  private exitRoom(): void {
    // Leave any active Jitsi room
    if (this.jitsiManager) {
      this.jitsiManager.leaveRoom();
      this.jitsiManager.dispose();
    }

    // Cleanup mini-map
    if (this.miniMap) {
      this.miniMap.destroy();
      this.miniMap = null;
    }

    // Update URL
    window.history.pushState({}, '', '/town');

    // Show transition and go back to town
    if ((window as any).showTransition) {
      (window as any).showTransition(
        `/assets/sprites/${this.playerAvatar}.png`,
        'Returning to town...',
        () => {
          this.scene.start('town-scene');
        }
      );
    } else {
      this.scene.start('town-scene');
    }
  }
}
