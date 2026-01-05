/**
 * Timing Constants
 * 
 * Centralized timing values to replace magic numbers throughout the codebase.
 * All values are in milliseconds unless otherwise noted.
 */

export const TIMING = {
  // ============================================
  // Agent Behavior
  // ============================================
  
  /** Delay before agent returns to home position after query */
  AGENT_RETURN_DELAY: 8000,
  
  /** Delay for agent pathfinding timeout */
  AGENT_PATHFIND_TIMEOUT: 5000,
  
  /** Handoff animation delay between agents */
  AGENT_HANDOFF_DELAY: 800,
  
  /** Minimum wandering delay (random range start) */
  AGENT_WANDER_MIN_DELAY: 2000,
  
  /** Maximum wandering delay (random range = min + this) */
  AGENT_WANDER_RANDOM_RANGE: 4000,
  
  /** Delay before resuming wandering after release */
  AGENT_RESUME_WANDER_DELAY: 3000,
  
  // ============================================
  // Speech & UI
  // ============================================
  
  /** Speech bubble auto-hide duration */
  SPEECH_BUBBLE_DURATION: 5000,
  
  /** Thought bubble auto-hide duration */
  THOUGHT_BUBBLE_DURATION: 3000,
  
  /** Welcome banner display duration */
  WELCOME_BANNER_DURATION: 4000,
  
  /** Welcome banner fade animation duration */
  WELCOME_BANNER_FADE_DURATION: 500,
  
  // ============================================
  // Scene Transitions
  // ============================================
  
  /** Hide transition overlay delay after scene change */
  TRANSITION_HIDE_DELAY: 500,
  
  /** Room setup delay (for async initialization) */
  ROOM_SETUP_DELAY: 100,
  
  // ============================================
  // Animations
  // ============================================
  
  /** Door prompt pulse animation duration */
  DOOR_PROMPT_PULSE_DURATION: 500,
  
  /** Agent chat prompt float animation duration */
  AGENT_PROMPT_FLOAT_DURATION: 800,
  
  // ============================================
  // Multiplayer
  // ============================================
  
  /** Position update throttle (minimum ms between updates) */
  POSITION_UPDATE_THROTTLE: 50,
  
  /** Reconnection attempt delay */
  RECONNECT_DELAY: 2000,
  
  /** Maximum reconnection attempts */
  MAX_RECONNECT_ATTEMPTS: 5,
  
  // ============================================
  // Performance
  // ============================================
  
  /** Target frame rate for movement calculations */
  TARGET_FPS: 60,
  
  /** Maximum pathfinding iterations to prevent infinite loops */
  MAX_PATHFIND_ITERATIONS: 1000,
} as const;

/**
 * Distance Constants
 * All values are in pixels unless otherwise noted.
 */
export const DISTANCE = {
  /** Proximity distance for door interaction */
  DOOR_PROXIMITY: 24,
  
  /** Proximity distance for agent chat */
  AGENT_CHAT_PROXIMITY: 50,
  
  /** Position update threshold (minimum pixel change to send update) */
  POSITION_UPDATE_THRESHOLD: 2,
  
  /** Server reconciliation snap distance (teleport if too far off) */
  SERVER_RECONCILE_DISTANCE: 50,
  
  /** Agent wander radius in tiles */
  AGENT_WANDER_RADIUS: 5,
  
  /** Maximum search radius for finding walkable tiles */
  MAX_WALKABLE_SEARCH_RADIUS: 10,
} as const;

/**
 * Speed Constants
 * All values are in pixels per second unless otherwise noted.
 */
export const SPEED = {
  /** Player movement speed */
  PLAYER_MOVEMENT: 100,
  
  /** Agent movement speed */
  AGENT_MOVEMENT: 80,
  
  /** Camera edge panning speed */
  CAMERA_EDGE_PAN: 300,
} as const;

/**
 * Animation frame rates
 */
export const FRAME_RATES = {
  /** Walking animation frame rate */
  WALK: 8,
  
  /** Idle animation frame rate */
  IDLE: 1,
} as const;

// Type exports for use in other files
export type TimingKey = keyof typeof TIMING;
export type DistanceKey = keyof typeof DISTANCE;
export type SpeedKey = keyof typeof SPEED;
