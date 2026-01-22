import Phaser from 'phaser';

/**
 * Typed event names for the game
 * Using const enum for better tree-shaking and type safety
 */
export enum GameEvent {
  // Player events
  PLAYER_MOVED = 'player:moved',
  PLAYER_STOPPED = 'player:stopped',
  PLAYER_ENTERED_ZONE = 'player:enteredZone',
  PLAYER_LEFT_ZONE = 'player:leftZone',
  
  // Agent events
  AGENT_CLICKED = 'agent:clicked',
  AGENT_SPEAK = 'agent:speak',
  AGENT_THINK = 'agent:think',
  AGENT_MOVE_TO = 'agent:moveTo',
  AGENT_ARRIVED = 'agent:arrived',
  AGENT_DIRECTION_CHANGE = 'agent:directionChange',
  AGENTS_GATHER = 'agents:gather',
  AGENTS_WORKING = 'agents:working',
  AGENTS_DISPERSE = 'agents:disperse',
  
  // Chat events
  CHAT_MESSAGE_SENT = 'chat:messageSent',
  CHAT_MESSAGE_RECEIVED = 'chat:messageReceived',
  CHAT_AGENT_SELECTED = 'chat:agentSelected',
  CHAT_AGENT_CLEARED = 'chat:agentCleared',
  CHAT_STREAMING_START = 'chat:streamingStart',
  CHAT_STREAMING_CHUNK = 'chat:streamingChunk',
  CHAT_STREAMING_END = 'chat:streamingEnd',
  
  // Scene events
  SCENE_READY = 'scene:ready',
  SCENE_TRANSITION_START = 'scene:transitionStart',
  SCENE_TRANSITION_END = 'scene:transitionEnd',
  
  // Multiplayer events
  MULTIPLAYER_CONNECTED = 'multiplayer:connected',
  MULTIPLAYER_DISCONNECTED = 'multiplayer:disconnected',
  MULTIPLAYER_PLAYER_JOINED = 'multiplayer:playerJoined',
  MULTIPLAYER_PLAYER_LEFT = 'multiplayer:playerLeft',
  MULTIPLAYER_PLAYER_COUNT_CHANGED = 'multiplayer:playerCountChanged',
  
  // Jitsi events
  JITSI_JOINED = 'jitsi:joined',
  JITSI_LEFT = 'jitsi:left',
  JITSI_PARTICIPANT_JOINED = 'jitsi:participantJoined',
  JITSI_PARTICIPANT_LEFT = 'jitsi:participantLeft',
  
  // UI events
  UI_CONTROLS_ENABLED = 'ui:controlsEnabled',
  UI_CONTROLS_DISABLED = 'ui:controlsDisabled',
  UI_SETTINGS_CHANGED = 'ui:settingsChanged',
}

/**
 * Type definitions for event payloads
 * Provides type safety when emitting and listening to events
 */
export interface EventPayloads {
  // Player events
  [GameEvent.PLAYER_MOVED]: { x: number; y: number; direction: string; isMoving: boolean };
  [GameEvent.PLAYER_STOPPED]: { x: number; y: number; direction: string };
  [GameEvent.PLAYER_ENTERED_ZONE]: { zoneId: string; zoneName: string };
  [GameEvent.PLAYER_LEFT_ZONE]: { zoneId: string };
  
  // Agent events
  [GameEvent.AGENT_CLICKED]: { agentType: string; agentId: string };
  [GameEvent.AGENT_SPEAK]: { agentId: string; text: string };
  [GameEvent.AGENT_THINK]: { agentId: string; text: string };
  [GameEvent.AGENT_MOVE_TO]: { agentId: string; x: number; y: number };
  [GameEvent.AGENT_ARRIVED]: { agentId: string };
  [GameEvent.AGENT_DIRECTION_CHANGE]: { agentId: string; direction: number };
  [GameEvent.AGENTS_GATHER]: { agentTypes: string[]; centerX: number; centerY: number };
  [GameEvent.AGENTS_WORKING]: { agentTypes: string[]; task?: string };
  [GameEvent.AGENTS_DISPERSE]: Record<string, never>;
  
  // Chat events
  [GameEvent.CHAT_MESSAGE_SENT]: { message: string; agentType?: string };
  [GameEvent.CHAT_MESSAGE_RECEIVED]: { message: string; agentType: string };
  [GameEvent.CHAT_AGENT_SELECTED]: { agentType: string };
  [GameEvent.CHAT_AGENT_CLEARED]: Record<string, never>;
  [GameEvent.CHAT_STREAMING_START]: { agentType: string };
  [GameEvent.CHAT_STREAMING_CHUNK]: { chunk: string };
  [GameEvent.CHAT_STREAMING_END]: { fullResponse: string; agentType: string };
  
  // Scene events
  [GameEvent.SCENE_READY]: { sceneName: string };
  [GameEvent.SCENE_TRANSITION_START]: { from: string; to: string };
  [GameEvent.SCENE_TRANSITION_END]: { sceneName: string };
  
  // Multiplayer events
  [GameEvent.MULTIPLAYER_CONNECTED]: { roomId: string; sessionId: string };
  [GameEvent.MULTIPLAYER_DISCONNECTED]: { reason?: string };
  [GameEvent.MULTIPLAYER_PLAYER_JOINED]: { sessionId: string; displayName: string };
  [GameEvent.MULTIPLAYER_PLAYER_LEFT]: { sessionId: string };
  [GameEvent.MULTIPLAYER_PLAYER_COUNT_CHANGED]: { count: number };
  
  // Jitsi events
  [GameEvent.JITSI_JOINED]: { roomName: string };
  [GameEvent.JITSI_LEFT]: Record<string, never>;
  [GameEvent.JITSI_PARTICIPANT_JOINED]: { participantId: string; displayName: string };
  [GameEvent.JITSI_PARTICIPANT_LEFT]: { participantId: string };
  
  // UI events
  [GameEvent.UI_CONTROLS_ENABLED]: Record<string, never>;
  [GameEvent.UI_CONTROLS_DISABLED]: Record<string, never>;
  [GameEvent.UI_SETTINGS_CHANGED]: { displayName?: string; avatarSprite?: string };
}

/**
 * Typed EventBus class that extends Phaser's EventEmitter
 * Provides type-safe event emission and subscription
 */
class TypedEventBus extends Phaser.Events.EventEmitter {
  /**
   * Emit a typed event with payload
   */
  emitTyped<K extends GameEvent>(event: K, payload: EventPayloads[K]): boolean {
    return super.emit(event, payload);
  }
  
  /**
   * Subscribe to a typed event
   */
  onTyped<K extends GameEvent>(
    event: K,
    fn: (payload: EventPayloads[K]) => void,
    context?: object
  ): this {
    return super.on(event, fn, context);
  }
  
  /**
   * Subscribe to a typed event once
   */
  onceTyped<K extends GameEvent>(
    event: K,
    fn: (payload: EventPayloads[K]) => void,
    context?: object
  ): this {
    return super.once(event, fn, context);
  }
  
  /**
   * Unsubscribe from a typed event
   */
  offTyped<K extends GameEvent>(
    event: K,
    fn?: (payload: EventPayloads[K]) => void,
    context?: object
  ): this {
    return super.off(event, fn, context);
  }
  
  // ============================================
  // Legacy support for agent-specific events
  // These use dynamic event names like `${agentId}-moveTo`
  // ============================================
  
  /**
   * Emit agent-specific event (legacy pattern)
   * @deprecated Use emitTyped with AGENT_* events instead
   */
  emitAgentEvent(agentId: string, action: string, payload?: unknown): boolean {
    return super.emit(`${agentId}-${action}`, payload);
  }
  
  /**
   * Subscribe to agent-specific event (legacy pattern)
   * @deprecated Use onTyped with AGENT_* events instead
   */
  onAgentEvent(
    agentId: string,
    action: string,
    fn: (payload: unknown) => void,
    context?: object
  ): this {
    return super.on(`${agentId}-${action}`, fn, context);
  }
  
  /**
   * Unsubscribe from agent-specific event (legacy pattern)
   * @deprecated Use offTyped with AGENT_* events instead
   */
  offAgentEvent(agentId: string, action: string): this {
    return super.off(`${agentId}-${action}`);
  }
}

/**
 * Global event bus instance
 * Use this for cross-scene and cross-object communication
 */
export const eventBus = new TypedEventBus();

/**
 * Legacy export for backward compatibility
 * @deprecated Use eventBus instead
 */
export default eventBus;
