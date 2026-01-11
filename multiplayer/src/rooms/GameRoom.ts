import { Room, Client } from "@colyseus/core";
import { GameRoomState, Player } from "./schema/PlayerState.js";

interface JoinOptions {
  userId?: string;
  displayName?: string;
  avatarSprite?: string;
  roomSlug?: string;
}

interface MoveMessage {
  x: number;
  y: number;
  direction: string;
  isMoving: boolean;
  animation: string;
}

/**
 * GameRoom handles real-time player synchronization for a map/room.
 * Each Phaser room (town, room-scout, etc.) corresponds to one GameRoom instance.
 */
export class GameRoom extends Room<GameRoomState> {
  maxClients = 50;
  
  onCreate(options: JoinOptions) {
    const roomSlug = options.roomSlug || "town";
    
    this.setState(new GameRoomState());
    this.state.roomSlug = roomSlug;
    this.state.roomName = this.getRoomName(roomSlug);
    
    console.log(`[GameRoom] Created room: ${roomSlug}`);
    
    // Handle player movement updates
    this.onMessage("move", (client: Client, data: MoveMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      
      // Update player position and state
      player.x = data.x;
      player.y = data.y;
      player.direction = data.direction;
      player.isMoving = data.isMoving;
      player.animation = data.animation;
      player.lastUpdate = Date.now();
    });
    
    // Handle heartbeat (keep-alive ping)
    this.onMessage("heartbeat", (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      
      player.lastUpdate = Date.now();
    });
    
    // Handle player changing rooms (for room transitions)
    this.onMessage("changeRoom", (client: Client, data: { roomSlug: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      
      player.currentRoom = data.roomSlug;
      console.log(`[GameRoom] ${player.displayName} changing to room: ${data.roomSlug}`);
    });
    
    // Handle chat messages (broadcast to nearby players)
    this.onMessage("chat", (client: Client, data: { message: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      
      // Broadcast chat to all clients in the room
      this.broadcast("chat", {
        sessionId: client.sessionId,
        displayName: player.displayName,
        message: data.message,
        x: player.x,
        y: player.y,
        timestamp: Date.now()
      });
    });
    
    // Periodic cleanup of stale players (optional, for robustness)
    this.setSimulationInterval(() => this.cleanupStalePlayers(), 30000);
  }
  
  onJoin(client: Client, options: JoinOptions) {
    const displayName = options.displayName || 'Anonymous';
    const userId = options.userId || "";
    
    // Check for duplicate userId - kick existing player with same userId
    if (userId) {
      this.state.players.forEach((existingPlayer, existingSessionId) => {
        if (existingPlayer.userId === userId && existingSessionId !== client.sessionId) {
          console.log(`[GameRoom] Removing duplicate player: ${existingPlayer.displayName} (userId: ${userId})`);
          this.state.players.delete(existingSessionId);
          this.broadcast("playerLeft", {
            sessionId: existingSessionId,
            displayName: existingPlayer.displayName
          });
        }
      });
    }
    
    console.log(`[GameRoom] ${client.sessionId} joined (${displayName})`);
    
    const player = new Player();
    player.sessionId = client.sessionId;
    player.userId = userId;
    player.displayName = displayName;
    player.avatarSprite = options.avatarSprite || "brendan";
    player.currentRoom = this.state.roomSlug;
    player.lastUpdate = Date.now();
    
    // Set spawn position (will be overwritten by client's first move)
    player.x = 400;
    player.y = 300;
    player.direction = "down";
    player.animation = "idle-down";
    
    this.state.players.set(client.sessionId, player);
    
    // Notify others that a player joined
    this.broadcast("playerJoined", {
      sessionId: client.sessionId,
      displayName: player.displayName,
      avatarSprite: player.avatarSprite
    }, { except: client });
  }
  
  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    const displayName = player?.displayName || "Unknown";
    
    console.log(`[GameRoom] ${client.sessionId} left (${displayName}, consented: ${consented})`);
    
    // Remove player from state
    this.state.players.delete(client.sessionId);
    
    // Notify others that a player left
    this.broadcast("playerLeft", {
      sessionId: client.sessionId,
      displayName
    });
  }
  
  onDispose() {
    console.log(`[GameRoom] Room ${this.state.roomSlug} disposed`);
  }
  
  /**
   * Get human-readable room name from slug
   */
  private getRoomName(slug: string): string {
    const names: Record<string, string> = {
      "town": "ArkAgentic Town",
      "room-scout": "Scout's Research Lab",
      "room-sage": "Sage's Strategy Room", 
      "room-chronicle": "Chronicle's Archive",
      "room-trends": "Trends' Observatory",
      "room-maven": "Maven's Workshop"
    };
    return names[slug] || slug;
  }
  
  /**
   * Clean up players that haven't sent updates in a while
   * Note: With heartbeat every 10s, 120s threshold gives 12 missed heartbeats before removal
   */
  private cleanupStalePlayers() {
    const now = Date.now();
    const staleThreshold = 120000; // 2 minutes (was 60s, increased for reliability)
    
    this.state.players.forEach((player, sessionId) => {
      if (now - player.lastUpdate > staleThreshold) {
        console.log(`[GameRoom] Removing stale player: ${player.displayName} (no update for ${Math.round((now - player.lastUpdate) / 1000)}s)`);
        this.state.players.delete(sessionId);
        
        // Notify others
        this.broadcast("playerLeft", {
          sessionId,
          displayName: player.displayName
        });
      }
    });
  }
}
