/**
 * GameBridge - Handles communication between Phaser game and HTML UI
 * 
 * Replaces scattered (window as any).xxx calls with a centralized,
 * type-safe bridge. This provides:
 * - Type safety for all game-to-UI communication
 * - Single point of control for debugging
 * - Easy mocking for tests
 * - Clear documentation of the interface contract
 */

import { eventBus, GameEvent } from '../events/EventBus';
import type { MultiplayerManager } from '../../classes/MultiplayerManager';

// ============================================
// Type Definitions for UI Callbacks
// ============================================

export interface GameBridgeCallbacks {
  // Transition effects
  showTransition?: (spriteUrl: string, message: string, onComplete: () => void) => void;
  hideTransition?: () => void;
  
  // Player count display
  updatePlayerCount?: (count: number) => void;
  
  // Chat functions
  addRoomChatMessage?: (displayName: string, message: string, isOwn: boolean, isSystem?: boolean) => void;
  selectAgentForChat?: (agentId: string) => void;
  switchChatTab?: (tab: 'agent' | 'room') => void;
  
  // Route mappings (set by index.ts)
  AGENT_TO_ROUTE?: Record<string, string>;
  ROOM_ROUTES?: Record<string, string>;
}

// ============================================
// GameBridge Class
// ============================================

class GameBridgeClass {
  // ============================================
  // State
  // ============================================
  
  private _gameControlsEnabled: boolean = true;
  private _selectedChatAgent: string | null = null;
  private _userPreferredModel: string = 'mistralai/mistral-nemo';
  private _multiplayerManager: MultiplayerManager | null = null;
  
  // ============================================
  // Game Controls
  // ============================================
  
  /**
   * Check if game controls are enabled
   * Controls are disabled when user is typing in chat
   */
  get gameControlsEnabled(): boolean {
    return this._gameControlsEnabled;
  }
  
  set gameControlsEnabled(value: boolean) {
    this._gameControlsEnabled = value;
    if (value) {
      eventBus.emitTyped(GameEvent.UI_CONTROLS_ENABLED, {});
    } else {
      eventBus.emitTyped(GameEvent.UI_CONTROLS_DISABLED, {});
    }
  }
  
  /**
   * Check if controls are currently usable (not disabled AND no input focused)
   */
  areControlsUsable(): boolean {
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      (activeElement instanceof HTMLElement && activeElement.isContentEditable)
    );
    
    return this._gameControlsEnabled && !isInputFocused;
  }
  
  // ============================================
  // Chat Agent Selection
  // ============================================
  
  get selectedChatAgent(): string | null {
    return this._selectedChatAgent;
  }
  
  set selectedChatAgent(agentType: string | null) {
    this._selectedChatAgent = agentType;
    if (agentType) {
      eventBus.emitTyped(GameEvent.CHAT_AGENT_SELECTED, { agentType });
    } else {
      eventBus.emitTyped(GameEvent.CHAT_AGENT_CLEARED, {});
    }
  }
  
  // ============================================
  // User Preferences
  // ============================================
  
  get userPreferredModel(): string {
    return this._userPreferredModel;
  }
  
  set userPreferredModel(modelId: string) {
    this._userPreferredModel = modelId;
  }
  
  // ============================================
  // Multiplayer Manager Reference
  // ============================================
  
  get multiplayerManager(): MultiplayerManager | null {
    return this._multiplayerManager;
  }
  
  set multiplayerManager(manager: MultiplayerManager | null) {
    this._multiplayerManager = manager;
  }
  
  // ============================================
  // UI Callbacks (set by HTML/React)
  // ============================================
  
  private callbacks: GameBridgeCallbacks = {};
  
  /**
   * Register UI callbacks from HTML/React
   */
  registerCallbacks(callbacks: Partial<GameBridgeCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
  
  /**
   * Show transition overlay
   */
  showTransition(spriteUrl: string, message: string, onComplete: () => void): void {
    if (this.callbacks.showTransition) {
      this.callbacks.showTransition(spriteUrl, message, onComplete);
    } else {
      // Fallback: just call onComplete immediately
      console.warn('[GameBridge] showTransition not registered, skipping transition');
      onComplete();
    }
  }
  
  /**
   * Hide transition overlay
   */
  hideTransition(): void {
    if (this.callbacks.hideTransition) {
      this.callbacks.hideTransition();
    }
  }
  
  /**
   * Update player count display
   */
  updatePlayerCount(count: number): void {
    if (this.callbacks.updatePlayerCount) {
      this.callbacks.updatePlayerCount(count);
    }
    eventBus.emitTyped(GameEvent.MULTIPLAYER_PLAYER_COUNT_CHANGED, { count });
  }
  
  /**
   * Add a message to room chat
   */
  addRoomChatMessage(displayName: string, message: string, isOwn: boolean, isSystem: boolean = false): void {
    if (this.callbacks.addRoomChatMessage) {
      this.callbacks.addRoomChatMessage(displayName, message, isOwn, isSystem);
    }
  }
  
  /**
   * Select an agent for chat
   */
  selectAgentForChat(agentId: string): void {
    this._selectedChatAgent = agentId;
    
    // Dispatch custom event for HTML listeners
    const event = new CustomEvent('selectAgentForChat', { detail: { agentId } });
    window.dispatchEvent(event);
    
    if (this.callbacks.selectAgentForChat) {
      this.callbacks.selectAgentForChat(agentId);
    }
  }
  
  /**
   * Switch chat tab
   */
  switchChatTab(tab: 'agent' | 'room'): void {
    if (this.callbacks.switchChatTab) {
      this.callbacks.switchChatTab(tab);
    }
  }
  
  // ============================================
  // Route Mappings
  // ============================================
  
  private _agentToRoute: Record<string, string> = {};
  private _roomRoutes: Record<string, string> = {};
  
  get agentToRoute(): Record<string, string> {
    return this._agentToRoute;
  }
  
  set agentToRoute(mapping: Record<string, string>) {
    this._agentToRoute = mapping;
  }
  
  get roomRoutes(): Record<string, string> {
    return this._roomRoutes;
  }
  
  set roomRoutes(routes: Record<string, string>) {
    this._roomRoutes = routes;
  }
  
  /**
   * Get route for an agent type
   */
  getAgentRoute(agentType: string): string {
    return this._agentToRoute[agentType] || agentType;
  }
  
  // ============================================
  // Legacy Window Global Support
  // ============================================
  
  /**
   * Install on window for backward compatibility during migration
   * Call this once at startup
   */
  installOnWindow(): void {
    const win = window as any;
    
    // Getters/setters for state
    Object.defineProperty(win, 'gameControlsEnabled', {
      get: () => this._gameControlsEnabled,
      set: (v: boolean) => { this.gameControlsEnabled = v; },
      configurable: true,
    });
    
    Object.defineProperty(win, 'selectedChatAgent', {
      get: () => this._selectedChatAgent,
      set: (v: string | null) => { this.selectedChatAgent = v; },
      configurable: true,
    });
    
    Object.defineProperty(win, 'userPreferredModel', {
      get: () => this._userPreferredModel,
      set: (v: string) => { this.userPreferredModel = v; },
      configurable: true,
    });
    
    Object.defineProperty(win, 'multiplayerManager', {
      get: () => this._multiplayerManager,
      set: (v: MultiplayerManager | null) => { this._multiplayerManager = v; },
      configurable: true,
    });
    
    // Functions
    win.showTransition = this.showTransition.bind(this);
    win.hideTransition = this.hideTransition.bind(this);
    win.updatePlayerCount = this.updatePlayerCount.bind(this);
    win.addRoomChatMessage = this.addRoomChatMessage.bind(this);
    win.selectAgentForChat = this.selectAgentForChat.bind(this);
    win.switchChatTab = this.switchChatTab.bind(this);
    
    // Route mappings
    Object.defineProperty(win, 'AGENT_TO_ROUTE', {
      get: () => this._agentToRoute,
      set: (v: Record<string, string>) => { this._agentToRoute = v; },
      configurable: true,
    });
    
    Object.defineProperty(win, 'ROOM_ROUTES', {
      get: () => this._roomRoutes,
      set: (v: Record<string, string>) => { this._roomRoutes = v; },
      configurable: true,
    });
    
    console.log('[GameBridge] Installed on window for backward compatibility');
  }
}

// Export singleton instance
export const GameBridge = new GameBridgeClass();

// Default export
export default GameBridge;
