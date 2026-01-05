/**
 * Game Systems - Barrel Export
 * 
 * ECS-like systems for game logic.
 * These systems handle specific aspects of gameplay and can be
 * composed together in scenes.
 */

export { ProximitySystem } from './ProximitySystem';
export type { BuildingZone, RectZone, ProximityState } from './ProximitySystem';

export { SceneStateMachine, TownState } from './SceneStateMachine';

export { AgentManager } from './AgentManager';
export type { AgentAPIResponse, AgentManagerConfig } from './AgentManager';

export { ChatSystem } from './ChatSystem';
export type { ChatMessage, ConversationMessage, ChatSystemConfig } from './ChatSystem';

export { UIManager } from './UIManager';
export type { PromptConfig, BannerConfig } from './UIManager';
