import { Physics, Scene, Input, Types, GameObjects } from 'phaser';
import { Actor } from './Actor';

/**
 * Player - The user-controlled character
 * Handles WASD/Arrow movement and syncs position to multiplayer
 */
export class Player extends Actor {
  private cursors!: Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Input.Keyboard.Key; A: Input.Keyboard.Key; S: Input.Keyboard.Key; D: Input.Keyboard.Key };
  private speed: number = 100;
  
  // Current movement state
  public direction: string = 'down';
  public isMoving: boolean = false;
  
  // Name label above player
  private nameLabel: GameObjects.Text | null = null;
  private playerDisplayName: string = 'Player';
  
  // Callback for position updates (used by multiplayer)
  public onPositionChange?: (x: number, y: number, direction: string, isMoving: boolean, animation: string) => void;
  
  // Last sent position (to avoid spamming updates)
  private lastSentX: number = 0;
  private lastSentY: number = 0;
  private lastSentDirection: string = 'down';
  private lastSentMoving: boolean = false;

  constructor(scene: Scene, x: number, y: number, texture: string, displayName: string = 'Player') {
    super(scene, x, y, texture, 0);
    
    this.name = 'player';
    this.playerDisplayName = displayName;
    this.setScale(1);
    this.getBody().setSize(12, 12);
    this.getBody().setOffset(2, 4);
    
    this.initAnimations();
    this.initInput();
    this.createNameLabel();
    
    // Start with idle animation
    this.anims.play('player-idle-down', true);
    
    this.lastSentX = x;
    this.lastSentY = y;
  }
  
  private createNameLabel(): void {
    // Create name label above player
    this.nameLabel = this.scene.add.text(this.x, this.y - 18, this.playerDisplayName, {
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 3, y: 1 },
      fontFamily: 'Arial, sans-serif',
    });
    this.nameLabel.setOrigin(0.5, 1);
    this.nameLabel.setDepth(20);
  }
  
  /**
   * Update the display name
   */
  setDisplayName(name: string): void {
    this.playerDisplayName = name;
    if (this.nameLabel) {
      this.nameLabel.setText(name);
    }
  }

  private initInput(): void {
    // Arrow keys
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    
    // WASD keys
    this.wasd = {
      W: this.scene.input.keyboard!.addKey(Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard!.addKey(Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard!.addKey(Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard!.addKey(Input.Keyboard.KeyCodes.D),
    };
  }

  override initAnimations(): void {
    // Create animations if they don't exist
    if (!this.scene.anims.exists('player-walk-down')) {
      // Walk animations
      this.scene.anims.create({
        key: 'player-walk-down',
        frames: this.scene.anims.generateFrameNumbers(this.texture.key, { start: 0, end: 2 }),
        frameRate: 8,
        repeat: -1,
      });

      this.scene.anims.create({
        key: 'player-walk-up',
        frames: this.scene.anims.generateFrameNumbers(this.texture.key, { start: 3, end: 5 }),
        frameRate: 8,
        repeat: -1,
      });

      this.scene.anims.create({
        key: 'player-walk-left',
        frames: this.scene.anims.generateFrameNumbers(this.texture.key, { start: 6, end: 8 }),
        frameRate: 8,
        repeat: -1,
      });

      this.scene.anims.create({
        key: 'player-walk-right',
        frames: this.scene.anims.generateFrameNumbers(this.texture.key, { start: 9, end: 11 }),
        frameRate: 8,
        repeat: -1,
      });

      // Idle animations (using first frame of each direction)
      this.scene.anims.create({
        key: 'player-idle-down',
        frames: [{ key: this.texture.key, frame: 0 }],
        frameRate: 1,
      });

      this.scene.anims.create({
        key: 'player-idle-up',
        frames: [{ key: this.texture.key, frame: 3 }],
        frameRate: 1,
      });

      this.scene.anims.create({
        key: 'player-idle-left',
        frames: [{ key: this.texture.key, frame: 6 }],
        frameRate: 1,
      });

      this.scene.anims.create({
        key: 'player-idle-right',
        frames: [{ key: this.texture.key, frame: 9 }],
        frameRate: 1,
      });
    }
  }

  update(): void {
    const body = this.getBody();
    body.setVelocity(0);

    // Check movement input (WASD or Arrow keys)
    const moveLeft = this.cursors.left?.isDown || this.wasd.A?.isDown;
    const moveRight = this.cursors.right?.isDown || this.wasd.D?.isDown;
    const moveUp = this.cursors.up?.isDown || this.wasd.W?.isDown;
    const moveDown = this.cursors.down?.isDown || this.wasd.S?.isDown;

    let velocityX = 0;
    let velocityY = 0;

    if (moveLeft) {
      velocityX = -this.speed;
      this.direction = 'left';
    } else if (moveRight) {
      velocityX = this.speed;
      this.direction = 'right';
    }

    if (moveUp) {
      velocityY = -this.speed;
      this.direction = 'up';
    } else if (moveDown) {
      velocityY = this.speed;
      this.direction = 'down';
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707; // 1/sqrt(2)
      velocityY *= 0.707;
    }

    body.setVelocity(velocityX, velocityY);

    // Update animation
    this.isMoving = velocityX !== 0 || velocityY !== 0;
    
    if (this.isMoving) {
      this.anims.play(`player-walk-${this.direction}`, true);
    } else {
      this.anims.play(`player-idle-${this.direction}`, true);
    }
    
    // Update name label position to follow player
    if (this.nameLabel) {
      this.nameLabel.setPosition(this.x, this.y - 18);
    }

    // Send position updates if changed significantly
    this.checkAndSendPositionUpdate();
  }

  private checkAndSendPositionUpdate(): void {
    if (!this.onPositionChange) return;

    const dx = Math.abs(this.x - this.lastSentX);
    const dy = Math.abs(this.y - this.lastSentY);
    const directionChanged = this.direction !== this.lastSentDirection;
    const movingChanged = this.isMoving !== this.lastSentMoving;

    // Send update if position changed by more than 2 pixels, or state changed
    if (dx > 2 || dy > 2 || directionChanged || movingChanged) {
      const animation = this.isMoving 
        ? `player-walk-${this.direction}` 
        : `player-idle-${this.direction}`;
      
      this.onPositionChange(this.x, this.y, this.direction, this.isMoving, animation);
      
      this.lastSentX = this.x;
      this.lastSentY = this.y;
      this.lastSentDirection = this.direction;
      this.lastSentMoving = this.isMoving;
    }
  }

  /**
   * Set position from server (used for reconciliation)
   */
  setServerPosition(x: number, y: number): void {
    // Only snap if too far from server position (lag compensation)
    const dx = Math.abs(this.x - x);
    const dy = Math.abs(this.y - y);
    
    if (dx > 50 || dy > 50) {
      this.setPosition(x, y);
    }
  }
}
