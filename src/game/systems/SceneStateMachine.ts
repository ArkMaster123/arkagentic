/**
 * SceneStateMachine - Finite State Machine for scene state management
 * 
 * Replaces the 20+ boolean flags in TownScene with a proper state machine.
 * Based on Phaser best practices: "Use finite state machines rather than 
 * a state variable with a big if/else statement."
 */

import { eventBus, GameEvent } from '../../core/events/EventBus';

// ============================================
// State Definitions
// ============================================

/**
 * Possible states for the Town scene
 */
export enum TownState {
  /** Normal gameplay - player can move freely */
  EXPLORING = 'exploring',
  
  /** Player is chatting with an agent */
  CHATTING = 'chatting',
  
  /** A menu or modal is open */
  IN_MENU = 'in_menu',
  
  /** Transitioning to another scene */
  TRANSITIONING = 'transitioning',
  
  /** In a Jitsi video call */
  IN_JITSI = 'in_jitsi',
  
  /** Processing an AI query */
  PROCESSING_QUERY = 'processing_query',
  
  /** Paused state */
  PAUSED = 'paused',
}

/**
 * Valid state transitions
 * Each key is a state, and the value is an array of states it can transition to
 */
const VALID_TRANSITIONS: Record<TownState, TownState[]> = {
  [TownState.EXPLORING]: [
    TownState.CHATTING,
    TownState.IN_MENU,
    TownState.TRANSITIONING,
    TownState.IN_JITSI,
    TownState.PROCESSING_QUERY,
    TownState.PAUSED,
  ],
  [TownState.CHATTING]: [
    TownState.EXPLORING,
    TownState.PROCESSING_QUERY,
    TownState.PAUSED,
  ],
  [TownState.IN_MENU]: [
    TownState.EXPLORING,
    TownState.PAUSED,
  ],
  [TownState.TRANSITIONING]: [
    // Transitioning is a terminal state - scene will be destroyed
  ],
  [TownState.IN_JITSI]: [
    TownState.EXPLORING,
    TownState.CHATTING,
    TownState.PAUSED,
  ],
  [TownState.PROCESSING_QUERY]: [
    TownState.CHATTING,
    TownState.EXPLORING,
  ],
  [TownState.PAUSED]: [
    TownState.EXPLORING,
    TownState.CHATTING,
    TownState.IN_MENU,
    TownState.IN_JITSI,
    TownState.PROCESSING_QUERY,
  ],
};

// ============================================
// State Machine Class
// ============================================

export class SceneStateMachine {
  private currentState: TownState;
  private previousState: TownState | null = null;
  private stateData: Map<string, unknown> = new Map();
  private listeners: Map<TownState, Set<() => void>> = new Map();
  
  constructor(initialState: TownState = TownState.EXPLORING) {
    this.currentState = initialState;
  }
  
  // ============================================
  // State Access
  // ============================================
  
  /**
   * Get the current state
   */
  getState(): TownState {
    return this.currentState;
  }
  
  /**
   * Get the previous state (if any)
   */
  getPreviousState(): TownState | null {
    return this.previousState;
  }
  
  /**
   * Check if current state matches
   */
  is(state: TownState): boolean {
    return this.currentState === state;
  }
  
  /**
   * Check if current state is one of the given states
   */
  isOneOf(...states: TownState[]): boolean {
    return states.includes(this.currentState);
  }
  
  // ============================================
  // State Transitions
  // ============================================
  
  /**
   * Transition to a new state
   * @returns true if transition was successful, false if invalid
   */
  transition(newState: TownState, data?: Record<string, unknown>): boolean {
    // Check if transition is valid
    const validTransitions = VALID_TRANSITIONS[this.currentState];
    if (!validTransitions.includes(newState)) {
      console.warn(
        `[StateMachine] Invalid transition: ${this.currentState} -> ${newState}`
      );
      return false;
    }
    
    // Store previous state
    this.previousState = this.currentState;
    
    // Update state
    this.currentState = newState;
    
    // Store any associated data
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        this.stateData.set(key, value);
      });
    }
    
    // Notify listeners
    this.notifyListeners(newState);
    
    console.log(`[StateMachine] ${this.previousState} -> ${newState}`);
    return true;
  }
  
  /**
   * Force a state change (bypasses validation)
   * Use sparingly - mainly for initialization or error recovery
   */
  forceState(newState: TownState): void {
    this.previousState = this.currentState;
    this.currentState = newState;
    this.notifyListeners(newState);
  }
  
  /**
   * Return to the previous state
   */
  goBack(): boolean {
    if (!this.previousState) return false;
    return this.transition(this.previousState);
  }
  
  // ============================================
  // State Data
  // ============================================
  
  /**
   * Get state-associated data
   */
  getData<T>(key: string): T | undefined {
    return this.stateData.get(key) as T | undefined;
  }
  
  /**
   * Set state-associated data
   */
  setData(key: string, value: unknown): void {
    this.stateData.set(key, value);
  }
  
  /**
   * Clear all state data
   */
  clearData(): void {
    this.stateData.clear();
  }
  
  // ============================================
  // Listeners
  // ============================================
  
  /**
   * Add a listener for when a specific state is entered
   */
  onEnterState(state: TownState, callback: () => void): void {
    if (!this.listeners.has(state)) {
      this.listeners.set(state, new Set());
    }
    this.listeners.get(state)!.add(callback);
  }
  
  /**
   * Remove a state listener
   */
  offEnterState(state: TownState, callback: () => void): void {
    this.listeners.get(state)?.delete(callback);
  }
  
  /**
   * Notify all listeners for a state
   */
  private notifyListeners(state: TownState): void {
    const callbacks = this.listeners.get(state);
    if (callbacks) {
      callbacks.forEach(cb => cb());
    }
  }
  
  // ============================================
  // Convenience Checks
  // ============================================
  
  /**
   * Can the player move?
   */
  canPlayerMove(): boolean {
    return this.isOneOf(
      TownState.EXPLORING,
      TownState.IN_JITSI
    );
  }
  
  /**
   * Can the player interact with objects?
   */
  canInteract(): boolean {
    return this.is(TownState.EXPLORING);
  }
  
  /**
   * Are game controls enabled?
   */
  areControlsEnabled(): boolean {
    return !this.isOneOf(
      TownState.IN_MENU,
      TownState.TRANSITIONING,
      TownState.PAUSED
    );
  }
  
  /**
   * Is the scene in a "busy" state (can't accept new queries)?
   */
  isBusy(): boolean {
    return this.isOneOf(
      TownState.PROCESSING_QUERY,
      TownState.TRANSITIONING
    );
  }
  
  /**
   * Can we start a chat?
   */
  canStartChat(): boolean {
    return this.isOneOf(
      TownState.EXPLORING,
      TownState.IN_JITSI
    );
  }
  
  // ============================================
  // Cleanup
  // ============================================
  
  /**
   * Clean up state machine
   */
  destroy(): void {
    this.listeners.clear();
    this.stateData.clear();
  }
}

// Export singleton for simple use cases
export const sceneStateMachine = new SceneStateMachine();

export default SceneStateMachine;
