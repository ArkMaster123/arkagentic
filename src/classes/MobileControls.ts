import { Scene, GameObjects } from 'phaser';
import VirtualJoystick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';

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
 * MobileControlsManager - Provides touch controls for mobile devices
 * 
 * Features:
 * - Virtual joystick (bottom-left) for movement
 * - A/B action buttons (bottom-right) for interactions
 * - Auto-enables on mobile devices
 * - Can be manually toggled for testing
 */
export class MobileControlsManager {
  private scene: Scene;
  private enabled: boolean = false;
  
  // Virtual joystick (using rex plugin direct import)
  private joystick: VirtualJoystick | null = null;
  private joystickBase: GameObjects.Graphics | null = null;
  private joystickThumb: GameObjects.Graphics | null = null;
  
  // Action buttons
  private buttonA: GameObjects.Container | null = null;
  private buttonB: GameObjects.Container | null = null;
  private callbacks: MobileControlsCallbacks = {};
  
  // Layout constants
  private readonly JOYSTICK_RADIUS = 50;
  private readonly JOYSTICK_MARGIN = 20;
  private readonly BUTTON_SIZE = 44;
  private readonly BUTTON_MARGIN = 15;
  private readonly BUTTON_SPACING = 60;
  
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
    
    this.createJoystick();
    this.createActionButtons();
    
    // Listen for orientation changes
    window.addEventListener('resize', this.handleResize);
    
    console.log('[MobileControls] Enabled');
  }
  
  /**
   * Disable mobile controls
   */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    
    this.destroyJoystick();
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
   * Get joystick direction state (compatible with keyboard input)
   */
  getDirection(): { left: boolean; right: boolean; up: boolean; down: boolean } {
    if (!this.joystick || !this.enabled) {
      return { left: false, right: false, up: false, down: false };
    }
    
    return {
      left: this.joystick.left,
      right: this.joystick.right,
      up: this.joystick.up,
      down: this.joystick.down,
    };
  }
  
  /**
   * Get joystick force (0-1 range)
   */
  getForce(): number {
    if (!this.joystick || !this.enabled) return 0;
    return Math.min(1, this.joystick.force / this.JOYSTICK_RADIUS);
  }
  
  /**
   * Get joystick angle in radians
   */
  getAngle(): number {
    if (!this.joystick || !this.enabled) return 0;
    return this.joystick.rotation;
  }
  
  /**
   * Create the virtual joystick using direct class instantiation
   */
  private createJoystick(): void {
    const camera = this.scene.cameras.main;
    const gameWidth = camera.width;
    const gameHeight = camera.height;
    
    // Position in bottom-left (in screen coordinates)
    const x = this.JOYSTICK_MARGIN + this.JOYSTICK_RADIUS;
    const y = gameHeight - this.JOYSTICK_MARGIN - this.JOYSTICK_RADIUS;
    
    // Create base circle (outer ring) using Graphics
    this.joystickBase = this.scene.add.graphics();
    this.joystickBase.lineStyle(3, 0x4a90d9, 0.8);
    this.joystickBase.fillStyle(0x000000, 0.4);
    this.joystickBase.fillCircle(0, 0, this.JOYSTICK_RADIUS);
    this.joystickBase.strokeCircle(0, 0, this.JOYSTICK_RADIUS);
    this.joystickBase.setPosition(x, y);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setDepth(10000);
    
    // Create thumb circle (inner movable) using Graphics
    this.joystickThumb = this.scene.add.graphics();
    this.joystickThumb.lineStyle(2, 0xffffff, 1);
    this.joystickThumb.fillStyle(0x4a90d9, 0.9);
    this.joystickThumb.fillCircle(0, 0, 20);
    this.joystickThumb.strokeCircle(0, 0, 20);
    this.joystickThumb.setPosition(x, y);
    this.joystickThumb.setScrollFactor(0);
    this.joystickThumb.setDepth(10001);
    
    // Create joystick using direct class instantiation
    try {
      this.joystick = new VirtualJoystick(this.scene, {
        x: x,
        y: y,
        radius: this.JOYSTICK_RADIUS,
        base: this.joystickBase,
        thumb: this.joystickThumb,
        dir: '8dir',
        fixed: true,
        enable: true,
      });
      console.log('[MobileControls] Joystick created successfully');
    } catch (err) {
      console.error('[MobileControls] Failed to create joystick:', err);
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
    
    // Button B (secondary - red) - to the left of A, slightly higher
    const bX = aX - this.BUTTON_SPACING;
    const bY = aY - this.BUTTON_SPACING / 3;
    this.buttonB = this.createButton(bX, bY, 'B', 0xe94560, () => {
      this.callbacks.onActionB?.();
    });
  }
  
  /**
   * Create a single action button
   */
  private createButton(x: number, y: number, label: string, color: number, onPress: () => void): GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(10000);
    
    // Button background using Graphics for better rendering
    const bg = this.scene.add.graphics();
    bg.lineStyle(3, 0xffffff, 1);
    bg.fillStyle(color, 0.9);
    bg.fillCircle(0, 0, this.BUTTON_SIZE / 2);
    bg.strokeCircle(0, 0, this.BUTTON_SIZE / 2);
    
    // Button label
    const text = this.scene.add.text(0, 0, label, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
    
    container.add([bg, text]);
    
    // Create an invisible hit area for interaction
    const hitArea = this.scene.add.circle(0, 0, this.BUTTON_SIZE / 2, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);
    
    // Touch/click handlers
    hitArea.on('pointerdown', () => {
      container.setScale(0.9);
      onPress();
    });
    
    hitArea.on('pointerup', () => {
      container.setScale(1);
    });
    
    hitArea.on('pointerout', () => {
      container.setScale(1);
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
      this.destroyJoystick();
      this.destroyActionButtons();
      this.createJoystick();
      this.createActionButtons();
    });
  };
  
  /**
   * Destroy joystick
   */
  private destroyJoystick(): void {
    if (this.joystick) {
      this.joystick.destroy();
      this.joystick = null;
    }
    if (this.joystickBase) {
      this.joystickBase.destroy();
      this.joystickBase = null;
    }
    if (this.joystickThumb) {
      this.joystickThumb.destroy();
      this.joystickThumb = null;
    }
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
   * Update - call this from scene update loop
   * Not strictly necessary but can be used for animations
   */
  update(): void {
    // Currently no per-frame updates needed
    // Joystick input is read directly via getDirection()
  }
}
