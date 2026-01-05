import { Scene } from 'phaser';

/**
 * Mobile detection utilities
 */
export function isMobileDevice(): boolean {
  // Check for touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check user agent for mobile devices
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);
  
  // Check screen size (typical mobile breakpoint)
  const isSmallScreen = window.innerWidth <= 1024;
  
  // Consider it mobile if it has touch AND (mobile UA OR small screen)
  return hasTouch && (isMobileUA || isSmallScreen);
}

/**
 * Check if device is in portrait orientation
 */
export function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth;
}

/**
 * Action button types
 */
export type ActionButtonType = 'A' | 'B';

/**
 * Mobile controls callback interface
 */
export interface MobileControlsCallbacks {
  onActionA?: () => void;  // Primary action (interact/confirm)
  onActionB?: () => void;  // Secondary action (cancel/back)
}

/**
 * Direction state for D-pad
 */
interface DirectionState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

// Extend window to include mobile direction state
declare global {
  interface Window {
    mobileDirection?: DirectionState;
    mobileActionA?: () => void;
    mobileActionB?: () => void;
  }
}

/**
 * MobileControlsManager - Bridges HTML mobile controls with Phaser game
 * 
 * The actual D-pad and action buttons are rendered in HTML (index.html)
 * for better touch responsiveness. This class:
 * - Reads direction state from window.mobileDirection
 * - Sets up action button callbacks via window.mobileActionA/B
 * - Auto-enables on mobile devices
 */
export class MobileControlsManager {
  private scene: Scene;
  private enabled: boolean = false;
  private callbacks: MobileControlsCallbacks = {};
  
  constructor(scene: Scene, autoEnable: boolean = true) {
    this.scene = scene;
    
    if (autoEnable && isMobileDevice()) {
      // Delay slightly to ensure HTML is ready
      this.scene.time.delayedCall(100, () => {
        this.enable();
      });
    }
  }
  
  /**
   * Enable mobile controls
   */
  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    
    // Initialize direction state if not exists
    if (!window.mobileDirection) {
      window.mobileDirection = { up: false, down: false, left: false, right: false };
    }
    
    // Set up action button callbacks
    this.setupActionCallbacks();
    
    console.log('[MobileControls] Enabled - reading from HTML controls');
  }
  
  /**
   * Disable mobile controls
   */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    
    // Clear callbacks
    window.mobileActionA = undefined;
    window.mobileActionB = undefined;
    
    console.log('[MobileControls] Disabled');
  }
  
  /**
   * Toggle mobile controls
   */
  toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }
  
  /**
   * Check if mobile controls are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Set action button callbacks
   */
  setCallbacks(callbacks: MobileControlsCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.setupActionCallbacks();
  }
  
  /**
   * Set up global action button callbacks
   */
  private setupActionCallbacks(): void {
    // Set up A button callback
    window.mobileActionA = () => {
      if (this.enabled && this.callbacks.onActionA) {
        this.callbacks.onActionA();
      }
    };
    
    // Set up B button callback
    window.mobileActionB = () => {
      if (this.enabled && this.callbacks.onActionB) {
        this.callbacks.onActionB();
      }
    };
  }
  
  /**
   * Get direction state (compatible with keyboard input)
   * Reads from window.mobileDirection set by HTML D-pad buttons
   */
  getDirection(): DirectionState {
    if (!this.enabled || !window.mobileDirection) {
      return { left: false, right: false, up: false, down: false };
    }
    return { ...window.mobileDirection };
  }
  
  /**
   * Clean up all resources
   */
  destroy(): void {
    this.disable();
    this.callbacks = {};
  }
  
  /**
   * Update - not needed since HTML handles input
   */
  update(): void {
    // No-op: HTML handles all touch input
  }
}
