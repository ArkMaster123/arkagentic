/**
 * ProximitySystem - Handles proximity detection for doors, agents, and zones
 * 
 * Extracted from TownScene to reduce god object anti-pattern.
 * Manages all proximity-based interactions in the game.
 */

import Phaser from 'phaser';
import { DISTANCE } from '../../core/utils/timing';
import { eventBus, GameEvent } from '../../core/events/EventBus';
import type { Agent } from '../../classes/Agent';

// ============================================
// Types
// ============================================

export interface BuildingZone {
  name: string;
  agentType: string;
  doorX: number;
  doorY: number;
  doorWidth: number;
  doorHeight: number;
}

export interface RectZone {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProximityState {
  nearbyDoor: BuildingZone | null;
  nearbyAgent: { type: string; agent: Agent } | null;
  inMeetingRoomEntrance: boolean;
  inJitsiZone: string | null;
}

// ============================================
// ProximitySystem Class
// ============================================

export class ProximitySystem {
  private scene: Phaser.Scene;
  private state: ProximityState;
  private buildingZones: BuildingZone[];
  private meetingRoomEntrance: RectZone | null;
  private agents: Map<string, Agent>;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.agents = new Map();
    this.buildingZones = [];
    this.meetingRoomEntrance = null;
    
    this.state = {
      nearbyDoor: null,
      nearbyAgent: null,
      inMeetingRoomEntrance: false,
      inJitsiZone: null,
    };
  }
  
  // ============================================
  // Configuration
  // ============================================
  
  /**
   * Set the building zones for door proximity detection
   */
  setBuildingZones(zones: BuildingZone[]): void {
    this.buildingZones = zones;
  }
  
  /**
   * Set the meeting room entrance zone
   */
  setMeetingRoomEntrance(zone: RectZone | null): void {
    this.meetingRoomEntrance = zone;
  }
  
  /**
   * Set the agents map for agent proximity detection
   */
  setAgents(agents: Map<string, Agent>): void {
    this.agents = agents;
  }
  
  // ============================================
  // State Access
  // ============================================
  
  /**
   * Get current proximity state
   */
  getState(): ProximityState {
    return { ...this.state };
  }
  
  /**
   * Get nearby door if any
   */
  getNearbyDoor(): BuildingZone | null {
    return this.state.nearbyDoor;
  }
  
  /**
   * Get nearby agent if any
   */
  getNearbyAgent(): { type: string; agent: Agent } | null {
    return this.state.nearbyAgent;
  }
  
  /**
   * Check if near meeting room entrance
   */
  isNearMeetingRoom(): boolean {
    return this.state.inMeetingRoomEntrance;
  }
  
  // ============================================
  // Update Methods
  // ============================================
  
  /**
   * Update all proximity checks for a given position
   */
  update(playerX: number, playerY: number): void {
    this.checkDoorProximity(playerX, playerY);
    this.checkAgentProximity(playerX, playerY);
    this.checkMeetingRoomProximity(playerX, playerY);
  }
  
  /**
   * Check proximity to building doors
   */
  private checkDoorProximity(playerX: number, playerY: number): void {
    const proximityDistance = DISTANCE.DOOR_PROXIMITY;
    
    // Find nearby door
    const nearDoor = this.buildingZones.find((zone) => {
      const doorCenterX = zone.doorX + zone.doorWidth / 2;
      const doorCenterY = zone.doorY + zone.doorHeight / 2;
      const distance = Phaser.Math.Distance.Between(
        playerX, playerY,
        doorCenterX, doorCenterY
      );
      return distance < proximityDistance;
    });
    
    // Emit event if state changed
    if (nearDoor !== this.state.nearbyDoor) {
      const oldDoor = this.state.nearbyDoor;
      this.state.nearbyDoor = nearDoor || null;
      
      if (nearDoor) {
        eventBus.emitTyped(GameEvent.PLAYER_ENTERED_ZONE, {
          zoneId: `door-${nearDoor.agentType}`,
          zoneName: nearDoor.name,
        });
      } else if (oldDoor) {
        eventBus.emitTyped(GameEvent.PLAYER_LEFT_ZONE, {
          zoneId: `door-${oldDoor.agentType}`,
        });
      }
    }
  }
  
  /**
   * Check proximity to agents for chat interaction
   */
  private checkAgentProximity(playerX: number, playerY: number): void {
    const chatDistance = DISTANCE.AGENT_CHAT_PROXIMITY;
    
    let closestAgentType: string | null = null;
    let closestAgent: Agent | null = null;
    let closestDistance = Infinity;
    
    // Find the closest agent within chat distance
    this.agents.forEach((agent, agentType) => {
      const distance = Phaser.Math.Distance.Between(
        playerX, playerY,
        agent.x, agent.y
      );
      
      if (distance <= chatDistance && distance < closestDistance) {
        closestAgentType = agentType;
        closestAgent = agent;
        closestDistance = distance;
      }
    });
    
    // Update state and emit events if changed
    const wasNearAgentType = this.state.nearbyAgent?.type;
    
    if (closestAgentType && closestAgent) {
      if (wasNearAgentType !== closestAgentType) {
        this.state.nearbyAgent = { type: closestAgentType, agent: closestAgent };
        
        eventBus.emitTyped(GameEvent.PLAYER_ENTERED_ZONE, {
          zoneId: `agent-${closestAgentType}`,
          zoneName: `Near ${closestAgentType}`,
        });
      }
    } else if (this.state.nearbyAgent) {
      eventBus.emitTyped(GameEvent.PLAYER_LEFT_ZONE, {
        zoneId: `agent-${this.state.nearbyAgent.type}`,
      });
      this.state.nearbyAgent = null;
    }
  }
  
  /**
   * Check proximity to meeting room entrance
   */
  private checkMeetingRoomProximity(playerX: number, playerY: number): void {
    if (!this.meetingRoomEntrance) return;
    
    const entrance = this.meetingRoomEntrance;
    const isNear = (
      playerX >= entrance.x &&
      playerX <= entrance.x + entrance.width &&
      playerY >= entrance.y &&
      playerY <= entrance.y + entrance.height
    );
    
    // Emit event if state changed
    if (isNear !== this.state.inMeetingRoomEntrance) {
      this.state.inMeetingRoomEntrance = isNear;
      
      if (isNear) {
        eventBus.emitTyped(GameEvent.PLAYER_ENTERED_ZONE, {
          zoneId: 'meeting-room-entrance',
          zoneName: entrance.name,
        });
      } else {
        eventBus.emitTyped(GameEvent.PLAYER_LEFT_ZONE, {
          zoneId: 'meeting-room-entrance',
        });
      }
    }
  }
  
  // ============================================
  // Utility Methods
  // ============================================
  
  /**
   * Check if a point is inside a rectangular zone
   */
  isInZone(x: number, y: number, zone: RectZone): boolean {
    return (
      x >= zone.x &&
      x <= zone.x + zone.width &&
      y >= zone.y &&
      y <= zone.y + zone.height
    );
  }
  
  /**
   * Get distance from point to zone center
   */
  distanceToZone(x: number, y: number, zone: RectZone): number {
    const centerX = zone.x + zone.width / 2;
    const centerY = zone.y + zone.height / 2;
    return Phaser.Math.Distance.Between(x, y, centerX, centerY);
  }
  
  /**
   * Find the closest zone from a list
   */
  findClosestZone(x: number, y: number, zones: RectZone[]): RectZone | null {
    let closest: RectZone | null = null;
    let closestDist = Infinity;
    
    for (const zone of zones) {
      const dist = this.distanceToZone(x, y, zone);
      if (dist < closestDist) {
        closestDist = dist;
        closest = zone;
      }
    }
    
    return closest;
  }
  
  /**
   * Clean up when system is no longer needed
   */
  destroy(): void {
    this.buildingZones = [];
    this.agents = new Map();
    this.meetingRoomEntrance = null;
    this.state = {
      nearbyDoor: null,
      nearbyAgent: null,
      inMeetingRoomEntrance: false,
      inJitsiZone: null,
    };
  }
}

export default ProximitySystem;
