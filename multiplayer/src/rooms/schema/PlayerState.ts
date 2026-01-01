import { Schema, type, MapSchema } from "@colyseus/schema";

/**
 * Player state synchronized across all clients
 */
export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") userId: string = "";
  @type("string") displayName: string = "Anonymous";
  @type("string") avatarSprite: string = "brendan";
  
  // Position
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  
  // Movement state
  @type("string") direction: string = "down"; // up, down, left, right
  @type("boolean") isMoving: boolean = false;
  
  // Animation state
  @type("string") animation: string = "idle-down";
  
  // Current room/map
  @type("string") currentRoom: string = "town";
  
  // Timestamp for interpolation
  @type("number") lastUpdate: number = 0;
}

/**
 * Room state containing all players
 */
export class GameRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  
  // Room metadata
  @type("string") roomSlug: string = "town";
  @type("string") roomName: string = "ArkAgentic Town";
  @type("number") maxPlayers: number = 50;
}
