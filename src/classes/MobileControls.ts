import { Scene, GameObjects } from 'phaser';
import VirtualJoyStick from 'phaser3-rex-plugins/plugins/virtualjoystick';

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
  const isSmallScreen = window.innerWidth <= 768;
  
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
  
  // Virtual joystick
  private joystick: VirtualJoyStick | null = null;
  private joystickBase: GameObjects.Arc | null = null;
  private joystickThumb: GameObjects.Arc | null = null;
  
  // Action buttons
  private buttonA: GameObjects.Container | null = null;
  private buttonB: GameObjects.Container | null = null;
  private callbacks: MobileControlsCallbacks = {};
  
  // Layout constants
  private readonly JOYSTICK_RADIUS = 60;
  private readonly JOYSTICK_MARGIN = 30;
  private readonly BUTTON_SIZE = 50;
  private readonly BUTTON_MARGIN = 20;
  private readonly BUTTON_SPACING = 70;
  
  constructor(scene: Scene, autoEnable: boolean = true) {
    this.scene = scene;
    
    if (autoEnable && isMobileDevice()) {
      this.enable();
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
   * Create the virtual joystick
   */
  private createJoystick(): void {
    const { width, height } = this.scene.cameras.main;
    
    // Position in bottom-left
    const x = this.JOYSTICK_MARGIN + this.JOYSTICK_RADIUS;
    const y = height - this.JOYSTICK_MARGIN - this.JOYSTICK_RADIUS;
    
    // Create base circle (outer ring)
    this.joystickBase = this.scene.add.arc(x, y, this.JOYSTICK_RADIUS, 0, 360, false, 0x000000, 0.5);
    this.joystickBase.setStrokeStyle(3, 0x4a90d9, 0.8);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setDepth(5000);
    
    // Create thumb circle (inner movable)
    this.joystickThumb = this.scene.add.arc(x, y, 25, 0, 360, false, 0x4a90d9, 0.9);
    this.joystickThumb.setStrokeStyle(2, 0xffffff, 1);
    this.joystickThumb.setScrollFactor(0);
    this.joystickThumb.setDepth(5001);
    
    // Create virtual joystick
    this.joystick = new VirtualJoyStick(this.scene, {
      x: x,
      y: y,
      radius: this.JOYSTICK_RADIUS,
      base: this.joystickBase,
      thumb: this.joystickThumb,
      dir: '8dir',
      fixed: true,
      enable: true,
    });
  }
  
  /**
   * Create action buttons (A and B)
   */
  private createActionButtons(): void {
    const { width, height } = this.scene.cameras.main;
    
    // Button A (primary - green) - bottom-right
    const aX = width - this.BUTTON_MARGIN - this.BUTTON_SIZE / 2;
    const aY = height - this.BUTTON_MARGIN - this.BUTTON_SIZE / 2 - this.BUTTON_SPACING / 2;
    this.buttonA = this.createButton(aX, aY, 'A', 0x4ade80, () => {
      this.callbacks.onActionA?.();
    });
    
    // Button B (secondary - red) - to the left of A
    const bX = aX - this.BUTTON_SPACING;
    const bY = aY + this.BUTTON_SPACING / 2;
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
    container.setDepth(5000);
    
    // Button background
    const bg = this.scene.add.arc(0, 0, this.BUTTON_SIZE / 2, 0, 360, false, color, 0.9);
    bg.setStrokeStyle(3, 0xffffff, 1);
    
    // Button label
    const text = this.scene.add.text(0, 0, label, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    container.add([bg, text]);
    
    // Make interactive
    bg.setInteractive({ useHandCursor: true });
    
    // Touch/click handlers
    bg.on('pointerdown', () => {
      bg.setScale(0.9);
      onPress();
    });
    
    bg.on('pointerup', () => {
      bg.setScale(1);
    });
    
    bg.on('pointerout', () => {
      bg.setScale(1);
    });
    
    return container;
  }
  
  /**
   * Handle window resize / orientation change
   */
  private handleResize = (): void => {
    if (!this.enabled) return;
    
    // Recreate controls with new positions
    this.destroyJoystick();
    this.destroyActionButtons();
    this.createJoystick();
    this.createActionButtons();
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
