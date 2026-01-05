/**
 * Core Module - Barrel Export
 * 
 * Exports all core services, events, and utilities.
 * Import from '@/core' or '../core' for clean imports.
 */

// Events
export { eventBus, GameEvent } from './events/EventBus';
export type { EventPayloads } from './events/EventBus';

// Services
export { ApiService } from './services/ApiService';
export type { 
  User, 
  CreateUserDto, 
  UpdateUserDto, 
  ChatRequest, 
  ChatResponse, 
  SessionValidation, 
  StreamChunk 
} from './services/ApiService';

export { StorageService, STORAGE_KEYS } from './services/StorageService';
export type { 
  StorageKey, 
  StoredUser, 
  SessionCredentials, 
  OfflineCredentials 
} from './services/StorageService';

export { GameBridge } from './services/GameBridge';
export type { GameBridgeCallbacks } from './services/GameBridge';

// Utils
export { TIMING, DISTANCE, SPEED, FRAME_RATES } from './utils/timing';
export type { TimingKey, DistanceKey, SpeedKey } from './utils/timing';
