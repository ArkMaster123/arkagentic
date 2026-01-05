import { Scene, GameObjects } from 'phaser';

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

/**
 * MobileControlsManager - Provides touch controls for mobile devices
 * 
 * Features:
 * - D-pad directional buttons (bottom-left) for movement - more reliable than joystick
 * - A/B action buttons (bottom-right) for interactions
 * - Semi-transparent, touch-friendly design
 * - Auto-enables on mobile devices
 */
export class MobileControlsManager {
  private scene: Scene;
  private enabled: boolean = false;
  
  // D-pad container and buttons
  private dpadContainer: GameObjects.Container | null = null;
  private dpadButtons: Map<string, GameObjects.Container> = new Map();
  
  // Direction state (which buttons are pressed)
  private directionState: DirectionState = {
    left: false,
    right: false,
    up: false,
    down: false,
  };
  
  // Action buttons
  private buttonA: GameObjects.Container | null = null;
  private buttonB: GameObjects.Container | null = null;
  private callbacks: MobileControlsCallbacks = {};
  
  // Layout constants - larger for better touch targets
  private readonly DPAD_SIZE = 140; // Total D-pad area size
  private readonly DPAD_BUTTON_SIZE = 44; // Individual button size
  private readonly DPAD_MARGIN = 20;
  private readonly BUTTON_SIZE = 50;
  private readonly BUTTON_MARGIN = 20;
  private readonly BUTTON_SPACING = 65;
  
  constructor(scene: Scene, autoEnable: boolean = true) {
    this.scene = scene;
    
    if (autoEnable && isMobileDevice()) {
      // Delay slightly to ensure scene is fully ready
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
    
    this.createDpad();
    this.createActionButtons();
    
    // Listen for orientation changes
    window.addEventListener('resize', this.handleResize);
    
    console.log('[MobileControls] Enabled - D-pad and action buttons created');
  }
  
  /**
   * Disable mobile controls
   */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    
    this.destroyDpad();
    this.destroyActionButtons();
    
    window.removeEventListener('resize', this.handleResize);
    
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
  }
  
  /**
   * Get direction state (compatible with keyboard input)
   */
  getDirection(): DirectionState {
    if (!this.enabled) {
      return { left: false, right: false, up: false, down: false };
    }
    return { ...this.directionState };
  }
  
  /**
   * Create the D-pad control (4 directional buttons in a cross pattern)
   */
  private createDpad(): void {
    const camera = this.scene.cameras.main;
    const gameHeight = camera.height;
    
    // Position in bottom-left
    const centerX = this.DPAD_MARGIN + this.DPAD_SIZE / 2;
    const centerY = gameHeight - this.DPAD_MARGIN - this.DPAD_SIZE / 2;
    
    // Create container for D-pad
    this.dpadContainer = this.scene.add.container(centerX, centerY);
    this.dpadContainer.setScrollFactor(0);
    this.dpadContainer.setDepth(10000);
    
    // Create background circle for D-pad area
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.3);
    bg.fillCircle(0, 0, this.DPAD_SIZE / 2);
    this.dpadContainer.add(bg);
    
    // Create directional buttons
    const buttonOffset = 42; // Distance from center
    
    // Up button
    this.createDpadButton('up', 0, -buttonOffset, '\u25B2'); // Triangle up
    
    // Down button  
    this.createDpadButton('down', 0, buttonOffset, '\u25BC'); // Triangle down
    
    // Left button
    this.createDpadButton('left', -buttonOffset, 0, '\u25C0'); // Triangle left
    
    // Right button
    this.createDpadButton('right', buttonOffset, 0, '\u25B6'); // Triangle right
    
    // Center indicator (optional - shows D-pad center)
    const centerDot = this.scene.add.graphics();
    centerDot.fillStyle(0x4a90d9, 0.5);
    centerDot.fillCircle(0, 0, 12);
    this.dpadContainer.add(centerDot);
    
    console.log('[MobileControls] D-pad created at', centerX, centerY);
  }
  
  /**
   * Create a single D-pad directional button
   */
  private createDpadButton(direction: string, offsetX: number, offsetY: number, symbol: string): void {
    if (!this.dpadContainer) return;
    
    const container = this.scene.add.container(offsetX, offsetY);
    
    // Button background - semi-transparent with blue tint
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x4a90d9, 0.7);
    bg.fillCircle(0, 0, this.DPAD_BUTTON_SIZE / 2);
    bg.lineStyle(2, 0xffffff, 0.8);
    bg.strokeCircle(0, 0, this.DPAD_BUTTON_SIZE / 2);
    
    // Direction symbol
    const text = this.scene.add.text(0, 0, symbol, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    container.add([bg, text]);
    
    // Create invisible hit area for better touch detection
    const hitArea = this.scene.add.circle(0, 0, this.DPAD_BUTTON_SIZE / 2 + 5, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: false });
    container.add(hitArea);
    
    // Touch handlers
    hitArea.on('pointerdown', () => {
      this.setDirection(direction, true);
      bg.clear();
      bg.fillStyle(0x6ab0f9, 1); // Brighter when pressed
      bg.fillCircle(0, 0, this.DPAD_BUTTON_SIZE / 2);
      bg.lineStyle(2, 0xffffff, 1);
      bg.strokeCircle(0, 0, this.DPAD_BUTTON_SIZE / 2);
    });
    
    hitArea.on('pointerup', () => {
      this.setDirection(direction, false);
      bg.clear();
      bg.fillStyle(0x4a90d9, 0.7);
      bg.fillCircle(0, 0, this.DPAD_BUTTON_SIZE / 2);
      bg.lineStyle(2, 0xffffff, 0.8);
      bg.strokeCircle(0, 0, this.DPAD_BUTTON_SIZE / 2);
    });
    
    hitArea.on('pointerout', () => {
      this.setDirection(direction, false);
      bg.clear();
      bg.fillStyle(0x4a90d9, 0.7);
      bg.fillCircle(0, 0, this.DPAD_BUTTON_SIZE / 2);
      bg.lineStyle(2, 0xffffff, 0.8);
      bg.strokeCircle(0, 0, this.DPAD_BUTTON_SIZE / 2);
    });
    
    this.dpadContainer.add(container);
    this.dpadButtons.set(direction, container);
  }
  
  /**
   * Set direction state
   */
  private setDirection(direction: string, pressed: boolean): void {
    switch (direction) {
      case 'up':
        this.directionState.up = pressed;
        break;
      case 'down':
        this.directionState.down = pressed;
        break;
      case 'left':
        this.directionState.left = pressed;
        break;
      case 'right':
        this.directionState.right = pressed;
        break;
    }
  }
  
  /**
   * Create action buttons (A and B)
   */
  private createActionButtons(): void {
    const camera = this.scene.cameras.main;
    const gameWidth = camera.width;
    const gameHeight = camera.height;
    
    // Button A (primary - green) - bottom-right, lower position
    const aX = gameWidth - this.BUTTON_MARGIN - this.BUTTON_SIZE / 2;
    const aY = gameHeight - this.BUTTON_MARGIN - this.BUTTON_SIZE / 2;
    this.buttonA = this.createButton(aX, aY, 'A', 0x4ade80, () => {
      this.callbacks.onActionA?.();
    });
    
    // Button B (secondary - red/orange) - to the left of A, slightly higher
    const bX = aX - this.BUTTON_SPACING;
    const bY = aY - this.BUTTON_SPACING / 3;
    this.buttonB = this.createButton(bX, bY, 'B', 0xe94560, () => {
      this.callbacks.onActionB?.();
    });
    
    console.log('[MobileControls] Action buttons created - A at', aX, aY, '- B at', bX, bY);
  }
  
  /**
   * Create a single action button
   */
  private createButton(x: number, y: number, label: string, color: number, onPress: () => void): GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(10000);
    
    // Button background using Graphics
    const bg = this.scene.add.graphics();
    bg.lineStyle(3, 0xffffff, 1);
    bg.fillStyle(color, 0.9);
    bg.fillCircle(0, 0, this.BUTTON_SIZE / 2);
    bg.strokeCircle(0, 0, this.BUTTON_SIZE / 2);
    
    // Button label
    const text = this.scene.add.text(0, 0, label, {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
    
    container.add([bg, text]);
    
    // Create an invisible hit area for interaction
    const hitArea = this.scene.add.circle(0, 0, this.BUTTON_SIZE / 2 + 5, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: false });
    container.add(hitArea);
    
    // Touch/click handlers
    hitArea.on('pointerdown', () => {
      container.setScale(0.9);
      // Brighten on press
      bg.clear();
      bg.lineStyle(3, 0xffffff, 1);
      bg.fillStyle(color, 1);
      bg.fillCircle(0, 0, this.BUTTON_SIZE / 2);
      bg.strokeCircle(0, 0, this.BUTTON_SIZE / 2);
      onPress();
    });
    
    hitArea.on('pointerup', () => {
      container.setScale(1);
      bg.clear();
      bg.lineStyle(3, 0xffffff, 1);
      bg.fillStyle(color, 0.9);
      bg.fillCircle(0, 0, this.BUTTON_SIZE / 2);
      bg.strokeCircle(0, 0, this.BUTTON_SIZE / 2);
    });
    
    hitArea.on('pointerout', () => {
      container.setScale(1);
      bg.clear();
      bg.lineStyle(3, 0xffffff, 1);
      bg.fillStyle(color, 0.9);
      bg.fillCircle(0, 0, this.BUTTON_SIZE / 2);
      bg.strokeCircle(0, 0, this.BUTTON_SIZE / 2);
    });
    
    return container;
  }
  
  /**
   * Handle window resize / orientation change
   */
  private handleResize = (): void => {
    if (!this.enabled) return;
    
    // Debounce the resize
    this.scene.time.delayedCall(100, () => {
      if (!this.enabled) return;
      // Recreate controls with new positions
      this.destroyDpad();
      this.destroyActionButtons();
      this.createDpad();
      this.createActionButtons();
    });
  };
  
  /**
   * Destroy D-pad
   */
  private destroyDpad(): void {
    if (this.dpadContainer) {
      this.dpadContainer.destroy();
      this.dpadContainer = null;
    }
    this.dpadButtons.clear();
    this.directionState = { left: false, right: false, up: false, down: false };
  }
  
  /**
   * Destroy action buttons
   */
  private destroyActionButtons(): void {
    if (this.buttonA) {
      this.buttonA.destroy();
      this.buttonA = null;
    }
    if (this.buttonB) {
      this.buttonB.destroy();
      this.buttonB = null;
    }
  }
  
  /**
   * Clean up all resources
   */
  destroy(): void {
    this.disable();
    this.callbacks = {};
  }
  
  /**
   * Update - call this from scene update loop (optional)
   */
  update(): void {
    // Currently no per-frame updates needed
    // Direction state is updated via touch events
  }
}
