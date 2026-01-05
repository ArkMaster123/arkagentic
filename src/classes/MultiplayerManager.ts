import { Client, Room, getStateCallbacks } from 'colyseus.js';
import { Scene, GameObjects } from 'phaser';
import { GameBridge } from '../core';

// Type definitions matching server schema
interface PlayerState {
  sessionId: string;
  userId: string;
  displayName: string;
  avatarSprite: string;
  x: number;
  y: number;
  direction: string;
  isMoving: boolean;
  animation: string;
  currentRoom: string;
  lastUpdate: number;
}

// Room slug for filtering players by scene
type RoomSlug = 'town' | 'meetings' | string;

interface PlayersMap {
  forEach: (callback: (player: PlayerState, sessionId: string) => void) => void;
  get: (sessionId: string) => PlayerState | undefined;
}

interface GameRoomState {
  players: PlayersMap;
  roomSlug: string;
  roomName: string;
  maxPlayers: number;
}

// Message types from server
interface ChatMessageData {
  sessionId: string;
  displayName: string;
  message: string;
}

interface PlayerNotificationData {
  sessionId: string;
  displayName: string;
}

interface RemotePlayerSprite extends GameObjects.Sprite {
  targetX: number;
  targetY: number;
  displayNameText?: GameObjects.Text;
}

/**
 * MultiplayerManager - Handles Colyseus connection and remote player rendering
 */
export class MultiplayerManager {
  private client: Client;
  private room: Room<GameRoomState> | null = null;
  private scene: Scene;
  private remotePlayers: Map<string, RemotePlayerSprite> = new Map();
  private isConnected: boolean = false;
  
  // State callbacks helper (Colyseus 0.16+)
  private $: ReturnType<typeof getStateCallbacks> | null = null;
  
  // Player info
  private displayName: string = 'Anonymous';
  private avatarSprite: string = 'brendan';
  private userId: string = '';
  
  // Current room slug for filtering players
  private currentRoomSlug: RoomSlug = 'town';
  
  // Interpolation settings
  private interpolationSpeed: number = 0.15;
  
  // Heartbeat interval (keep-alive)
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds

  constructor(scene: Scene) {
    this.scene = scene;
    
    // Determine WebSocket URL based on environment
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const wsPort = window.location.hostname === 'localhost' ? 2567 : 443;
    const wsPath = window.location.hostname === 'localhost' ? '' : '/ws';
    
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}${wsPath}`;
    console.log('[Multiplayer] Connecting to:', wsUrl);
    
    this.client = new Client(wsUrl);
  }

  /**
   * Connect to the multiplayer server
   * @param roomSlug - The room to join (e.g., 'town')
   * @param playerInfo - Optional player info (name, avatar) to use instead of localStorage
   */
  async connect(roomSlug: string = 'town', playerInfo?: { displayName?: string; avatarSprite?: string; userId?: string }): Promise<boolean> {
    try {
      // Use provided player info or load from localStorage
      if (playerInfo?.displayName) {
        this.displayName = playerInfo.displayName;
        this.avatarSprite = playerInfo.avatarSprite || 'brendan';
        this.userId = playerInfo.userId || `user-${Date.now()}`;
        console.log(`[Multiplayer] Using provided player info: ${this.displayName}`);
      } else {
        await this.loadOrCreateUser();
      }
      
      console.log(`[Multiplayer] Joining room: ${roomSlug} as ${this.displayName}`);
      
      // Store current room slug for filtering
      this.currentRoomSlug = roomSlug;
      
      this.room = await this.client.joinOrCreate<GameRoomState>('game', {
        userId: this.userId,
        displayName: this.displayName,
        avatarSprite: this.avatarSprite,
        roomSlug: roomSlug,
      });
      
      this.isConnected = true;
      console.log(`[Multiplayer] Connected! Session ID: ${this.room.sessionId}`);
      
      // Set up state listeners
      this.setupStateListeners();
      
      // Start heartbeat to keep connection alive
      this.startHeartbeat();
      
      return true;
    } catch (error) {
      console.error('[Multiplayer] Connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Load user from localStorage (already created in CharacterSelectScene)
   */
  private async loadOrCreateUser(): Promise<void> {
    // Get user ID from localStorage
    const userId = localStorage.getItem('arkagentic_user_id');
    
    // Check for offline mode credentials first (most common case after CharacterSelect)
    const offlineName = localStorage.getItem('arkagentic_offline_name');
    const offlineAvatar = localStorage.getItem('arkagentic_offline_avatar');
    
    if (offlineName && offlineAvatar) {
      this.userId = userId || `offline-${Date.now()}`;
      this.displayName = offlineName;
      this.avatarSprite = offlineAvatar;
      console.log(`[Multiplayer] Using offline credentials: ${this.displayName}`);
      return;
    }
    
    // Check for legacy cached user (backwards compatibility)
    const cachedUser = localStorage.getItem('arkagentic_user');
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      this.userId = user.id || userId || `offline-${Date.now()}`;
      this.displayName = user.display_name || 'Player';
      this.avatarSprite = user.avatar_sprite || 'brendan';
      console.log(`[Multiplayer] Using cached user: ${this.displayName}`);
      return;
    }
    
    // If we have a userId, try to fetch from API
    if (userId && !userId.startsWith('offline-')) {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (response.ok) {
          const user = await response.json();
          this.userId = user.id;
          this.displayName = user.display_name || 'Player';
          this.avatarSprite = user.avatar_sprite || 'brendan';
          console.log(`[Multiplayer] Fetched user from API: ${this.displayName}`);
          return;
        }
      } catch (error) {
        console.warn('[Multiplayer] Failed to fetch user from API:', error);
      }
    }
    
    // Fallback - generate anonymous user
    console.warn('[Multiplayer] No user found - using anonymous guest');
    this.userId = `anon-${Date.now()}`;
    this.displayName = `Guest${Math.floor(Math.random() * 9999)}`;
    this.avatarSprite = 'brendan';
  }

  /**
   * Set up listeners for state changes using Colyseus 0.16+ getStateCallbacks API
   */
  private setupStateListeners(): void {
    if (!this.room || !this.room.state) {
      console.error('[Multiplayer] Room or state not available');
      return;
    }
    
    // Initialize state callbacks helper (Colyseus 0.16+ API for real-time sync)
    this.$ = getStateCallbacks(this.room);
    const $ = this.$;
    
    console.log('[Multiplayer] Setting up state listeners with getStateCallbacks API');
    console.log('[Multiplayer] Room state:', this.room.state);
    console.log('[Multiplayer] Players map:', this.room.state.players);
    
    // Process existing players first (in case we joined a room with players already in it)
    if (this.room.state.players && typeof this.room.state.players.forEach === 'function') {
      this.room.state.players.forEach((player: PlayerState, sessionId: string) => {
        console.log(`[Multiplayer] Existing player found: ${player.displayName} (${sessionId}) in room ${player.currentRoom}`);
        
        if (sessionId !== this.room?.sessionId) {
          // Only create sprite if player is in same room as us
          if (player.currentRoom === this.currentRoomSlug) {
            this.createRemotePlayer(sessionId, player);
          }
          
          // Listen for position changes on this player using $ wrapper
          $(player).onChange(() => {
            this.updateRemotePlayerWithRoomCheck(sessionId, player);
          });
        }
      });
    }
    
    // Listen for NEW player additions using Colyseus 0.16+ API
    ($(this.room.state).players as any).onAdd((player: PlayerState, sessionId: string) => {
      console.log(`[Multiplayer] Player joined (onAdd): ${player.displayName} (${sessionId}) in room ${player.currentRoom}`);
      
      // Don't render ourselves as a remote player
      if (sessionId === this.room?.sessionId) {
        console.log('[Multiplayer] Skipping local player');
        return;
      }
      
      // Skip if we already created this player (from forEach above)
      if (this.remotePlayers.has(sessionId)) {
        console.log('[Multiplayer] Player already exists, skipping');
        return;
      }
      
      // Only create sprite if player is in same room as us
      if (player.currentRoom === this.currentRoomSlug) {
        this.createRemotePlayer(sessionId, player);
      }
      
      // Listen for position/state changes on this player using $ wrapper
      $(player).onChange(() => {
        this.updateRemotePlayerWithRoomCheck(sessionId, player);
      });
    });
    
    // Listen for player removals
    ($(this.room.state).players as any).onRemove((player: PlayerState, sessionId: string) => {
      console.log(`[Multiplayer] Player left (onRemove): ${player.displayName} (${sessionId})`);
      this.removeRemotePlayer(sessionId);
    });
    
    // Listen for chat messages
    this.room.onMessage('chat', (data: ChatMessageData) => {
      console.log(`[Chat] ${data.displayName}: ${data.message}`);
      
      // Don't show our own messages again (we add them optimistically)
      const isSelf = data.sessionId === this.room?.sessionId;
      if (!isSelf) {
        // Add to room chat UI
        GameBridge.addRoomChatMessage(data.displayName, data.message, false);
        
        // Show chat bubble over the player's sprite
        const sprite = this.remotePlayers.get(data.sessionId);
        if (sprite) {
          this.showChatBubble(sprite, data.message);
        }
      }
    });
    
    // Listen for player joined messages (backup notification)
    this.room.onMessage('playerJoined', (data: PlayerNotificationData) => {
      console.log(`[Multiplayer] Player joined notification: ${data.displayName} (${data.sessionId})`);
      
      GameBridge.addRoomChatMessage('', `${data.displayName} joined the room`, false, true);
      this.updatePlayerCountUI();
    });
    
    // Listen for player left messages
    this.room.onMessage('playerLeft', (data: PlayerNotificationData) => {
      console.log(`[Multiplayer] Player left notification: ${data.displayName}`);
      GameBridge.addRoomChatMessage('', `${data.displayName} left the room`, false, true);
      this.updatePlayerCountUI();
    });
    
    // Handle disconnection
    this.room.onLeave((code: number) => {
      console.log(`[Multiplayer] Disconnected (code: ${code})`);
      this.isConnected = false;
      this.stopHeartbeat();
      this.cleanup();
    });
  }

  /**
   * Create a sprite for a remote player
   */
  private createRemotePlayer(sessionId: string, player: PlayerState): void {
    // Use player position, but if it's 0,0 or default server position, use a reasonable spawn
    let spawnX = player.x;
    let spawnY = player.y;
    
    // If position is default/unset, spawn near center of town
    if ((spawnX === 0 && spawnY === 0) || (spawnX === 400 && spawnY === 300)) {
      spawnX = 384 + Math.random() * 50 - 25; // Random offset near town center
      spawnY = 280 + Math.random() * 50 - 25;
    }
    
    console.log(`[Multiplayer] Creating remote player sprite: ${player.displayName} at (${spawnX}, ${spawnY}) with avatar ${player.avatarSprite}`);
    
    // Check if texture exists
    if (!this.scene.textures.exists(player.avatarSprite)) {
      console.warn(`[Multiplayer] Texture ${player.avatarSprite} not found, using brendan`);
    }
    
    // Create sprite using the player's avatar
    const sprite = this.scene.add.sprite(
      spawnX,
      spawnY,
      player.avatarSprite || 'brendan'
    ) as RemotePlayerSprite;
    
    sprite.setScale(1);
    sprite.setDepth(15); // Same depth as local player
    sprite.targetX = spawnX;
    sprite.targetY = spawnY;
    
    // Create name label above player - make it more visible
    sprite.displayNameText = this.scene.add.text(
      spawnX,
      spawnY - 24,
      player.displayName,
      {
        fontSize: '11px',
        color: '#00ff00', // Bright green for visibility
        backgroundColor: '#000000dd',
        padding: { x: 6, y: 3 },
        fontStyle: 'bold',
      }
    );
    sprite.displayNameText.setOrigin(0.5);
    sprite.displayNameText.setDepth(100); // High depth to ensure visibility
    
    console.log(`[Multiplayer] Remote player sprite created for ${player.displayName}. Sprite visible: ${sprite.visible}, position: (${sprite.x}, ${sprite.y})`);
    
    this.remotePlayers.set(sessionId, sprite);
    
    // Play initial animation
    this.playRemoteAnimation(sprite, player.avatarSprite, player.animation);
  }

  /**
   * Update a remote player's position (with interpolation)
   */
  private updateRemotePlayer(sessionId: string, player: PlayerState): void {
    const sprite = this.remotePlayers.get(sessionId);
    if (!sprite) return;
    
    // Set target position for interpolation
    sprite.targetX = player.x;
    sprite.targetY = player.y;
    
    // Update animation
    this.playRemoteAnimation(sprite, player.avatarSprite, player.animation);
  }
  
  /**
   * Update a remote player with room filtering
   * Shows/hides player based on whether they're in the same room as us
   */
  private updateRemotePlayerWithRoomCheck(sessionId: string, player: PlayerState): void {
    const isInSameRoom = player.currentRoom === this.currentRoomSlug;
    const sprite = this.remotePlayers.get(sessionId);
    
    if (isInSameRoom) {
      // Player is in our room - create sprite if needed, update position
      if (!sprite) {
        console.log(`[Multiplayer] Player ${player.displayName} entered our room ${this.currentRoomSlug}`);
        this.createRemotePlayer(sessionId, player);
      } else {
        sprite.setVisible(true);
        sprite.displayNameText?.setVisible(true);
        this.updateRemotePlayer(sessionId, player);
      }
    } else {
      // Player is in different room - hide or remove sprite
      if (sprite) {
        console.log(`[Multiplayer] Player ${player.displayName} left our room (now in ${player.currentRoom})`);
        sprite.setVisible(false);
        sprite.displayNameText?.setVisible(false);
      }
    }
  }

  /**
   * Remove a remote player
   */
  private removeRemotePlayer(sessionId: string): void {
    const sprite = this.remotePlayers.get(sessionId);
    if (sprite) {
      sprite.displayNameText?.destroy();
      sprite.destroy();
      this.remotePlayers.delete(sessionId);
    }
  }

  /**
   * Play animation on remote player sprite
   */
  private playRemoteAnimation(sprite: RemotePlayerSprite, avatarKey: string, animation: string): void {
    // Convert animation name to use avatar key (e.g., 'player-walk-down' -> 'brendan-walk-down')
    const animKey = animation.replace('player-', `${avatarKey}-`);
    
    // Check if animation exists, create if not
    if (!this.scene.anims.exists(animKey)) {
      this.createRemoteAnimations(avatarKey);
    }
    
    if (this.scene.anims.exists(animKey)) {
      sprite.anims.play(animKey, true);
    }
  }

  /**
   * Create animations for a remote player's avatar
   */
  private createRemoteAnimations(avatarKey: string): void {
    const directions = ['down', 'up', 'left', 'right'];
    const frameRanges: Record<string, [number, number]> = {
      'down': [0, 2],
      'up': [3, 5],
      'left': [6, 8],
      'right': [9, 11],
    };
    
    directions.forEach((dir) => {
      const [start, end] = frameRanges[dir];
      
      // Walk animation
      if (!this.scene.anims.exists(`${avatarKey}-walk-${dir}`)) {
        this.scene.anims.create({
          key: `${avatarKey}-walk-${dir}`,
          frames: this.scene.anims.generateFrameNumbers(avatarKey, { start, end }),
          frameRate: 8,
          repeat: -1,
        });
      }
      
      // Idle animation
      if (!this.scene.anims.exists(`${avatarKey}-idle-${dir}`)) {
        this.scene.anims.create({
          key: `${avatarKey}-idle-${dir}`,
          frames: [{ key: avatarKey, frame: start }],
          frameRate: 1,
        });
      }
    });
  }

  /**
   * Update - call this in scene update loop for interpolation
   */
  update(): void {
    this.remotePlayers.forEach((sprite) => {
      // Interpolate position
      sprite.x += (sprite.targetX - sprite.x) * this.interpolationSpeed;
      sprite.y += (sprite.targetY - sprite.y) * this.interpolationSpeed;
      
      // Update name label position
      if (sprite.displayNameText) {
        sprite.displayNameText.setPosition(sprite.x, sprite.y - 20);
      }
    });
  }

  /**
   * Update display name (for settings changes)
   */
  setDisplayName(name: string): void {
    this.displayName = name;
    
    // If connected, update the server
    if (this.room && this.isConnected && this.room.state.players.get(this.room.sessionId)) {
      const playerState = this.room.state.players.get(this.room.sessionId);
      if (playerState) {
        playerState.displayName = name;
      }
    }
  }

  /**
   * Send local player position to server
   */
  sendPosition(x: number, y: number, direction: string, isMoving: boolean, animation: string): void {
    if (!this.room || !this.isConnected) return;
    
    this.room.send('move', {
      x,
      y,
      direction,
      isMoving,
      animation,
    });
  }

  /**
   * Send chat message
   */
  sendChat(message: string): void {
    if (!this.room || !this.isConnected) return;
    
    this.room.send('chat', { message });
  }

  /**
   * Change room (for scene transitions)
   * This keeps the connection alive but updates which room the player is in
   */
  changeRoom(roomSlug: RoomSlug): void {
    if (!this.room || !this.isConnected) return;
    
    console.log(`[Multiplayer] Changing room from ${this.currentRoomSlug} to ${roomSlug}`);
    this.currentRoomSlug = roomSlug;
    
    // Tell server we changed rooms
    this.room.send('changeRoom', { roomSlug });
    
    // Hide all remote players (they'll be shown again if in same room)
    this.remotePlayers.forEach((sprite, sessionId) => {
      sprite.setVisible(false);
      sprite.displayNameText?.setVisible(false);
    });
  }
  
  /**
   * Get current room slug
   */
  getCurrentRoom(): RoomSlug {
    return this.currentRoomSlug;
  }
  
  /**
   * Transfer this manager to a new scene
   * Called when transitioning between scenes to keep the connection alive
   */
  transferToScene(newScene: Scene): void {
    console.log(`[Multiplayer] Transferring to new scene`);
    
    // Clean up sprites from old scene (they belong to old scene's display list)
    this.remotePlayers.forEach((sprite, sessionId) => {
      sprite.displayNameText?.destroy();
      sprite.destroy();
    });
    this.remotePlayers.clear();
    
    // Update scene reference
    this.scene = newScene;
    
    // Recreate sprites for existing players in the new scene
    if (this.room && this.room.state && this.room.state.players) {
      this.room.state.players.forEach((player: PlayerState, sessionId: string) => {
        if (sessionId !== this.room?.sessionId) {
          // Only create sprite if player is in same room
          if (player.currentRoom === this.currentRoomSlug) {
            this.createRemotePlayer(sessionId, player);
          }
        }
      });
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing interval
    
    this.heartbeatInterval = setInterval(() => {
      if (this.room && this.isConnected) {
        this.room.send('heartbeat', {});
      }
    }, this.HEARTBEAT_INTERVAL_MS);
    
    console.log('[Multiplayer] Heartbeat started (every 10s)');
  }
  
  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.isConnected = false;
    this.cleanup();
  }

  /**
   * Clean up all remote players
   */
  private cleanup(): void {
    this.remotePlayers.forEach((sprite) => {
      sprite.displayNameText?.destroy();
      sprite.destroy();
    });
    this.remotePlayers.clear();
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.room?.sessionId || null;
  }

  /**
   * Check if connected
   */
  isOnline(): boolean {
    return this.isConnected;
  }

  /**
   * Get player count
   */
  getPlayerCount(): number {
    return this.remotePlayers.size + (this.isConnected ? 1 : 0);
  }
  
  /**
   * Get all remote players with their positions
   * Used for proximity-based features like voice chat volume
   */
  getRemotePlayers(): Map<string, { x: number; y: number; name: string }> {
    const players = new Map<string, { x: number; y: number; name: string }>();
    
    this.remotePlayers.forEach((sprite, sessionId) => {
      players.set(sessionId, {
        x: sprite.x,
        y: sprite.y,
        name: sprite.displayNameText?.text || 'Player',
      });
    });
    
    return players;
  }
  
  /**
   * Show a chat bubble above a player sprite
   */
  private showChatBubble(sprite: RemotePlayerSprite, message: string): void {
    // Create a temporary text bubble above the player
    const bubble = this.scene.add.text(
      sprite.x,
      sprite.y - 35,
      message.length > 40 ? message.substring(0, 37) + '...' : message,
      {
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#1a1a28',
        padding: { x: 6, y: 4 },
        wordWrap: { width: 120 },
      }
    );
    bubble.setOrigin(0.5);
    bubble.setDepth(100);
    
    // Animate and remove after delay
    this.scene.tweens.add({
      targets: bubble,
      y: bubble.y - 10,
      alpha: 0,
      duration: 4000,
      ease: 'Power2',
      onComplete: () => {
        bubble.destroy();
      }
    });
  }
  
  /**
   * Update the player count in the UI
   */
  private updatePlayerCountUI(): void {
    GameBridge.updatePlayerCount(this.getPlayerCount());
  }
}
