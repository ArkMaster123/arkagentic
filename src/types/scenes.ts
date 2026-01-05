/**
 * Scene Type Definitions
 * 
 * Interfaces for scenes that support various game features.
 * These decouple entities (like Agent) from specific scene implementations.
 */

import Phaser from 'phaser';
import type UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';
import type BoardPlugin from 'phaser3-rex-plugins/plugins/board-plugin';

/**
 * Interface for scenes that support agent tile-based movement
 * Decouples Agent from TownScene
 */
export interface IAgentScene extends Phaser.Scene {
  /** Convert world coordinates to tile coordinates */
  worldToTile(worldX: number, worldY: number): { x: number; y: number };
  
  /** Convert tile coordinates to world coordinates (center of tile) */
  tileToWorld(tileX: number, tileY: number): { x: number; y: number };
  
  /** Check if a tile is walkable */
  isTileWalkable(tileX: number, tileY: number): boolean;
  
  /** Mark a tile as occupied by an agent */
  occupyTile(tileX: number, tileY: number): void;
  
  /** Unmark a tile (agent moved away) */
  freeTile(tileX: number, tileY: number): void;
  
  /** RexUI plugin for speech bubbles */
  rexUI: UIPlugin;
}

/**
 * Interface for scenes that support the board plugin
 */
export interface IBoardScene extends Phaser.Scene {
  /** RexBoard plugin for grid/pathfinding */
  rexBoard: BoardPlugin;
}

/**
 * Interface for scenes that support multiplayer
 */
export interface IMultiplayerScene extends Phaser.Scene {
  /** Send position update to server */
  sendPositionUpdate(x: number, y: number, direction: string, isMoving: boolean): void;
  
  /** Get list of remote players */
  getRemotePlayers(): Map<string, { x: number; y: number; name: string }>;
}

/**
 * Type guard to check if a scene implements IAgentScene
 */
export function isAgentScene(scene: Phaser.Scene): scene is IAgentScene {
  return (
    typeof (scene as IAgentScene).worldToTile === 'function' &&
    typeof (scene as IAgentScene).tileToWorld === 'function' &&
    typeof (scene as IAgentScene).isTileWalkable === 'function' &&
    typeof (scene as IAgentScene).occupyTile === 'function' &&
    typeof (scene as IAgentScene).freeTile === 'function' &&
    'rexUI' in scene
  );
}

/**
 * Scene data passed when starting TownScene
 */
export interface TownSceneData {
  playerAvatar?: string;
  playerName?: string;
  userId?: string;
  sessionToken?: string;
  isNewPlayer?: boolean;
  isOffline?: boolean;
}

/**
 * Scene data passed when starting RoomScene
 */
export interface RoomSceneData {
  agentType: string;
  fromTown: boolean;
  playerAvatar?: string;
  playerName?: string;
}

/**
 * Scene data passed when starting MeetingRoomScene
 */
export interface MeetingRoomSceneData {
  fromTown: boolean;
  playerAvatar?: string;
  playerName?: string;
  roomId?: string;
}
