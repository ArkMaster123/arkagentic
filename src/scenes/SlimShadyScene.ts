import { Scene, GameObjects, Physics, Math as PhaserMath } from 'phaser';
import { GameBridge } from '../core';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';
import BoardPlugin from 'phaser3-rex-plugins/plugins/board-plugin';

interface SlimShadyData {
  fromTown: boolean;
  playerAvatar?: string;
  playerName?: string;
}

interface Clone {
  sprite: Physics.Arcade.Sprite;
  nameLabel: GameObjects.Text;
  targetX: number;
  targetY: number;
  isMoving: boolean;
  direction: string;
}

/**
 * SlimShadyScene - The Real Slim Shady Easter Egg Room
 * 
 * When a player enters, they get duplicated into lots of clones
 * that wander around randomly and periodically do synchronized dances.
 * Reference: Eminem's "The Real Slim Shady" music video
 */
export class SlimShadyScene extends Scene {
  // Room dimensions
  private readonly ROOM_WIDTH = 600;
  private readonly ROOM_HEIGHT = 400;
  private readonly CLONE_COUNT = 25;
  
  // Player
  private player!: Physics.Arcade.Sprite;
  private playerAvatar: string = 'brendan';
  private playerName: string = 'Player';
  private playerNameLabel!: GameObjects.Text;
  
  // Clones
  private clones: Clone[] = [];
  
  // Dance sync
  private danceTimer!: Phaser.Time.TimerEvent;
  private isDancing: boolean = false;
  private dancePhase: number = 0;
  
  // Speech bubble
  private speechBubble: GameObjects.Container | null = null;
  
  // UI
  public rexUI!: UIPlugin;
  public rexBoard!: BoardPlugin;
  
  // Player movement
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private playerDirection: string = 'down';
  private playerIsMoving: boolean = false;

  constructor() {
    super('slimshady-scene');
  }

  init(data: SlimShadyData): void {
    if (data?.playerAvatar) {
      this.playerAvatar = data.playerAvatar;
      this.playerName = data.playerName || 'Player';
    } else {
      const storedUser = localStorage.getItem('arkagentic_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        this.playerAvatar = user.avatar_sprite || 'brendan';
        this.playerName = user.display_name || 'Player';
      }
    }
  }

  create(): void {
    this.createRoom();
    this.createPlayer();
    this.spawnClones();
    this.createUI();
    this.setupInput();
    this.startDanceTimer();
    this.showWelcomeBubble();
    
    // Hide transition after room is ready
    this.time.delayedCall(500, () => {
      GameBridge.hideTransition();
    });
  }

  private createRoom(): void {
    // Dark disco floor background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRect(0, 0, 800, 600);
    
    // Create a disco floor pattern
    const floorTileSize = 40;
    const colors = [0x16213e, 0x0f3460, 0x1a1a2e, 0x252550];
    
    for (let x = 0; x < 800; x += floorTileSize) {
      for (let y = 50; y < 600; y += floorTileSize) {
        const colorIndex = ((x / floorTileSize) + (y / floorTileSize)) % colors.length;
        const tile = this.add.graphics();
        tile.fillStyle(colors[colorIndex], 1);
        tile.fillRect(x, y, floorTileSize - 2, floorTileSize - 2);
        tile.setDepth(0);
      }
    }
    
    // Add some disco lights effect (pulsing colored circles)
    this.createDiscoLights();
    
    // Room boundary walls (invisible but for physics)
    const wallThickness = 20;
    
    // Create boundary walls
    const walls = this.physics.add.staticGroup();
    
    // Top wall
    const topWall = this.add.rectangle(400, 50 + wallThickness/2, 800, wallThickness, 0x333355);
    walls.add(topWall);
    
    // Bottom wall
    const bottomWall = this.add.rectangle(400, 600 - wallThickness/2, 800, wallThickness, 0x333355);
    walls.add(bottomWall);
    
    // Left wall
    const leftWall = this.add.rectangle(wallThickness/2, 325, wallThickness, 500, 0x333355);
    walls.add(leftWall);
    
    // Right wall
    const rightWall = this.add.rectangle(800 - wallThickness/2, 325, wallThickness, 500, 0x333355);
    walls.add(rightWall);
    
    // Store walls for collision
    (this as any).walls = walls;
    
    // Set camera
    this.cameras.main.setBounds(0, 0, 800, 600);
  }

  private createDiscoLights(): void {
    // Create pulsing disco lights
    const lightColors = [0xff00ff, 0x00ffff, 0xffff00, 0xff0000, 0x00ff00];
    const lights: GameObjects.Arc[] = [];
    
    for (let i = 0; i < 5; i++) {
      const x = 100 + i * 150;
      const y = 100;
      const light = this.add.circle(x, y, 30, lightColors[i], 0.3);
      light.setDepth(1);
      lights.push(light);
      
      // Pulse animation
      this.tweens.add({
        targets: light,
        alpha: { from: 0.1, to: 0.5 },
        scale: { from: 0.8, to: 1.2 },
        duration: 500 + i * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createPlayer(): void {
    // Spawn player in center
    const spawnX = 400;
    const spawnY = 350;
    
    this.player = this.physics.add.sprite(spawnX, spawnY, this.playerAvatar, 0);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    
    // Set body size
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(12, 12);
    (this.player.body as Phaser.Physics.Arcade.Body).setOffset(2, 4);
    
    // Add collision with walls
    const walls = (this as any).walls;
    if (walls) {
      this.physics.add.collider(this.player, walls);
    }
    
    // Create name label
    this.playerNameLabel = this.add.text(spawnX, spawnY - 18, this.playerName, {
      fontSize: '8px',
      color: '#00ff00',
      backgroundColor: '#000000cc',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1).setDepth(100);
    
    // Initialize animations
    this.initPlayerAnimations();
    this.player.anims.play('slim-idle-down', true);
  }

  private initPlayerAnimations(): void {
    const textureKey = this.playerAvatar;
    
    // Only create if they don't exist
    if (!this.anims.exists('slim-walk-down')) {
      // Walk animations
      this.anims.create({
        key: 'slim-walk-down',
        frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: 2 }),
        frameRate: 8,
        repeat: -1,
      });
      
      this.anims.create({
        key: 'slim-walk-up',
        frames: this.anims.generateFrameNumbers(textureKey, { start: 3, end: 5 }),
        frameRate: 8,
        repeat: -1,
      });
      
      this.anims.create({
        key: 'slim-walk-left',
        frames: this.anims.generateFrameNumbers(textureKey, { start: 6, end: 8 }),
        frameRate: 8,
        repeat: -1,
      });
      
      this.anims.create({
        key: 'slim-walk-right',
        frames: this.anims.generateFrameNumbers(textureKey, { start: 9, end: 11 }),
        frameRate: 8,
        repeat: -1,
      });
      
      // Idle animations
      this.anims.create({
        key: 'slim-idle-down',
        frames: [{ key: textureKey, frame: 0 }],
        frameRate: 1,
      });
      
      this.anims.create({
        key: 'slim-idle-up',
        frames: [{ key: textureKey, frame: 3 }],
        frameRate: 1,
      });
      
      this.anims.create({
        key: 'slim-idle-left',
        frames: [{ key: textureKey, frame: 6 }],
        frameRate: 1,
      });
      
      this.anims.create({
        key: 'slim-idle-right',
        frames: [{ key: textureKey, frame: 9 }],
        frameRate: 1,
      });
    }
  }

  private spawnClones(): void {
    const textureKey = this.playerAvatar;
    const roomBounds = {
      minX: 50,
      maxX: 750,
      minY: 100,
      maxY: 550,
    };
    
    for (let i = 0; i < this.CLONE_COUNT; i++) {
      // Random position within room
      const x = PhaserMath.Between(roomBounds.minX, roomBounds.maxX);
      const y = PhaserMath.Between(roomBounds.minY, roomBounds.maxY);
      
      // Create clone sprite
      const sprite = this.physics.add.sprite(x, y, textureKey, 0);
      sprite.setDepth(5);
      sprite.setCollideWorldBounds(true);
      sprite.setAlpha(0.85); // Slightly transparent to distinguish from player
      
      // Set body
      (sprite.body as Phaser.Physics.Arcade.Body).setSize(12, 12);
      (sprite.body as Phaser.Physics.Arcade.Body).setOffset(2, 4);
      
      // Create name label for clone
      const nameLabel = this.add.text(x, y - 18, this.playerName, {
        fontSize: '7px',
        color: '#aaaaaa',
        backgroundColor: '#00000088',
        padding: { x: 2, y: 1 },
      }).setOrigin(0.5, 1).setDepth(50);
      
      // Random initial direction
      const directions = ['up', 'down', 'left', 'right'];
      const direction = directions[PhaserMath.Between(0, 3)];
      
      // Create clone object
      const clone: Clone = {
        sprite,
        nameLabel,
        targetX: x,
        targetY: y,
        isMoving: false,
        direction,
      };
      
      this.clones.push(clone);
      
      // Add collision with walls
      const walls = (this as any).walls;
      if (walls) {
        this.physics.add.collider(sprite, walls);
      }
      
      // Start wandering after a random delay
      this.time.delayedCall(PhaserMath.Between(100, 2000), () => {
        this.startCloneWander(clone);
      });
    }
  }

  private startCloneWander(clone: Clone): void {
    // Pick a random target position
    const roomBounds = {
      minX: 50,
      maxX: 750,
      minY: 100,
      maxY: 550,
    };
    
    clone.targetX = PhaserMath.Between(roomBounds.minX, roomBounds.maxX);
    clone.targetY = PhaserMath.Between(roomBounds.minY, roomBounds.maxY);
    clone.isMoving = true;
    
    // Determine direction
    const dx = clone.targetX - clone.sprite.x;
    const dy = clone.targetY - clone.sprite.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      clone.direction = dx > 0 ? 'right' : 'left';
    } else {
      clone.direction = dy > 0 ? 'down' : 'up';
    }
    
    // Move to target
    const distance = Phaser.Math.Distance.Between(
      clone.sprite.x, clone.sprite.y,
      clone.targetX, clone.targetY
    );
    const duration = distance * 15; // Speed factor
    
    this.tweens.add({
      targets: clone.sprite,
      x: clone.targetX,
      y: clone.targetY,
      duration: Math.max(duration, 500),
      ease: 'Linear',
      onUpdate: () => {
        // Update name label position
        clone.nameLabel.setPosition(clone.sprite.x, clone.sprite.y - 18);
        
        // Play walk animation
        if (!this.isDancing && clone.isMoving) {
          clone.sprite.anims.play(`slim-walk-${clone.direction}`, true);
        }
      },
      onComplete: () => {
        clone.isMoving = false;
        if (!this.isDancing) {
          clone.sprite.anims.play(`slim-idle-${clone.direction}`, true);
        }
        
        // Wait a bit then wander again
        this.time.delayedCall(PhaserMath.Between(500, 3000), () => {
          if (!this.isDancing) {
            this.startCloneWander(clone);
          }
        });
      },
    });
  }

  private startDanceTimer(): void {
    // Every 8-12 seconds, trigger synchronized dance
    this.danceTimer = this.time.addEvent({
      delay: PhaserMath.Between(8000, 12000),
      callback: () => this.triggerSyncDance(),
      loop: true,
    });
  }

  private triggerSyncDance(): void {
    if (this.isDancing) return;
    
    this.isDancing = true;
    this.dancePhase = 0;
    
    // Stop all clones from wandering
    this.tweens.killTweensOf(this.clones.map(c => c.sprite));
    
    // Show dance announcement
    this.showDanceBubble();
    
    // Move clones into letter formation first!
    this.formLetterShape();
    
    // Start dance sequence after clones are in position
    this.time.delayedCall(1500, () => {
      this.doDanceSequence();
    });
  }

  private formLetterShape(): void {
    // Letter patterns - each letter is defined as grid positions
    // We'll spell "HI" with the clones
    // Grid is roughly 5 wide x 7 tall per letter, spaced out
    
    const letterH = [
      // Left vertical bar
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 },
      // Right vertical bar  
      { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 },
      // Middle horizontal bar
      { x: 1, y: 2 },
    ];
    
    const letterI = [
      // Top horizontal
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      // Vertical bar
      { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 },
      // Bottom horizontal
      { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 },
    ];
    
    // Combine letters with offset for "HI"
    const letterSpacing = 4; // Grid units between letters
    const allPositions: { x: number; y: number }[] = [];
    
    // Add H positions
    letterH.forEach(pos => {
      allPositions.push({ x: pos.x, y: pos.y });
    });
    
    // Add I positions (offset by letter spacing)
    letterI.forEach(pos => {
      allPositions.push({ x: pos.x + letterSpacing, y: pos.y });
    });
    
    // Convert grid to screen positions
    const gridSize = 35; // Pixels per grid cell
    const startX = 250; // Starting X position
    const startY = 200; // Starting Y position
    
    // Assign positions to clones
    this.clones.forEach((clone, index) => {
      if (index < allPositions.length) {
        const gridPos = allPositions[index];
        const targetX = startX + gridPos.x * gridSize;
        const targetY = startY + gridPos.y * gridSize;
        
        // Animate clone to position
        this.tweens.add({
          targets: clone.sprite,
          x: targetX,
          y: targetY,
          duration: 1000,
          ease: 'Back.easeOut',
          onUpdate: () => {
            clone.nameLabel.setPosition(clone.sprite.x, clone.sprite.y - 18);
          },
        });
      } else {
        // Extra clones gather below the letters
        const extraIndex = index - allPositions.length;
        const targetX = 300 + (extraIndex % 5) * 40;
        const targetY = 420 + Math.floor(extraIndex / 5) * 30;
        
        this.tweens.add({
          targets: clone.sprite,
          x: targetX,
          y: targetY,
          duration: 1000,
          ease: 'Back.easeOut',
          onUpdate: () => {
            clone.nameLabel.setPosition(clone.sprite.x, clone.sprite.y - 18);
          },
        });
      }
    });
  }

  private doDanceSequence(): void {
    // Dance sequence - 4 beats
    const danceSequence = ['down', 'left', 'up', 'right'];
    let beatIndex = 0;
    
    const danceEvent = this.time.addEvent({
      delay: 400,
      repeat: 7,
      callback: () => {
        const direction = danceSequence[beatIndex % 4];
        
        // Make all clones and player face the same direction
        this.clones.forEach(clone => {
          clone.direction = direction;
          clone.sprite.anims.play(`slim-idle-${direction}`, true);
          
          // Add a little bounce
          this.tweens.add({
            targets: clone.sprite,
            y: clone.sprite.y - 8,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut',
          });
        });
        
        // Player too
        this.playerDirection = direction;
        this.player.anims.play(`slim-idle-${direction}`, true);
        this.tweens.add({
          targets: this.player,
          y: this.player.y - 8,
          duration: 100,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
        
        beatIndex++;
      },
    });
    
    // End dance after sequence
    this.time.delayedCall(3500, () => {
      this.isDancing = false;
      this.hideDanceBubble();
      
      // Resume wandering for clones
      this.clones.forEach(clone => {
        this.time.delayedCall(PhaserMath.Between(100, 1000), () => {
          this.startCloneWander(clone);
        });
      });
      
      // Reset dance timer with new random interval
      this.danceTimer.reset({
        delay: PhaserMath.Between(8000, 12000),
        callback: () => this.triggerSyncDance(),
        loop: true,
      });
    });
  }

  private showWelcomeBubble(): void {
    // Show the iconic line
    const bubble = this.add.container(400, 200);
    bubble.setDepth(1000);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-180, -30, 360, 60, 12);
    bg.lineStyle(2, 0xff00ff);
    bg.strokeRoundedRect(-180, -30, 360, 60, 12);
    
    const text = this.add.text(0, -10, `Will the real ${this.playerName}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    const text2 = this.add.text(0, 10, 'please stand up?', {
      fontSize: '14px',
      color: '#ff00ff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    bubble.add([bg, text, text2]);
    
    // Fade out after a few seconds
    this.tweens.add({
      targets: bubble,
      alpha: 0,
      y: 180,
      duration: 1000,
      delay: 4000,
      onComplete: () => bubble.destroy(),
    });
  }

  private showDanceBubble(): void {
    if (this.speechBubble) return;
    
    this.speechBubble = this.add.container(400, 80);
    this.speechBubble.setDepth(1000);
    
    const bg = this.add.graphics();
    bg.fillStyle(0xff00ff, 0.9);
    bg.fillRoundedRect(-80, -15, 160, 30, 8);
    
    const text = this.add.text(0, 0, 'DANCE TIME!', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    this.speechBubble.add([bg, text]);
    
    // Pulse animation
    this.tweens.add({
      targets: this.speechBubble,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      yoyo: true,
      repeat: -1,
    });
  }

  private hideDanceBubble(): void {
    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }
  }

  private createUI(): void {
    // Title bar
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x000000, 0.9);
    titleBg.fillRect(0, 0, 800, 50);
    titleBg.fillStyle(0xff00ff, 1);
    titleBg.fillRect(0, 0, 800, 4);
    titleBg.setScrollFactor(0);
    titleBg.setDepth(3000);
    
    // Title
    this.add.text(400, 15, 'The Real Slim Shady Room', {
      fontSize: '16px',
      color: '#ff00ff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3001);
    
    this.add.text(400, 33, 'Please stand up, please stand up...', {
      fontSize: '10px',
      color: '#888888',
      fontStyle: 'italic',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3001);
    
    // Back button
    const backBtnBg = this.add.graphics();
    backBtnBg.fillStyle(0xe94560, 1);
    backBtnBg.fillRoundedRect(15, 10, 110, 30, 6);
    backBtnBg.setScrollFactor(0);
    backBtnBg.setDepth(3001);
    
    const backBtnText = this.add.text(70, 25, '< Back to Town', {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3002);
    
    const backHitArea = this.add.rectangle(70, 25, 110, 30, 0x000000, 0);
    backHitArea.setScrollFactor(0);
    backHitArea.setDepth(3003);
    backHitArea.setInteractive({ useHandCursor: true });
    
    backHitArea.on('pointerover', () => {
      backBtnBg.clear();
      backBtnBg.fillStyle(0xff6b8a, 1);
      backBtnBg.fillRoundedRect(15, 10, 110, 30, 6);
    });
    
    backHitArea.on('pointerout', () => {
      backBtnBg.clear();
      backBtnBg.fillStyle(0xe94560, 1);
      backBtnBg.fillRoundedRect(15, 10, 110, 30, 6);
    });
    
    backHitArea.on('pointerdown', () => this.exitRoom());
    
    // Clone counter
    this.add.text(700, 15, `Clones: ${this.CLONE_COUNT}`, {
      fontSize: '12px',
      color: '#00ff00',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3001);
    
    // Footer
    const footerBg = this.add.graphics();
    footerBg.fillStyle(0x000000, 0.6);
    footerBg.fillRect(0, 570, 800, 30);
    footerBg.setScrollFactor(0);
    footerBg.setDepth(3000);
    
    this.add.text(400, 585, 'WASD to move  |  Watch for the synchronized dance!  |  ESC to exit', {
      fontSize: '11px',
      color: '#888888',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3001);
  }

  private setupInput(): void {
    // Keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    
    // ESC to exit
    this.input.keyboard?.on('keydown-ESC', () => {
      this.exitRoom();
    });
  }

  update(): void {
    // Check if controls are disabled (typing in chat)
    if (!GameBridge.gameControlsEnabled) {
      this.player.setVelocity(0, 0);
      return;
    }
    
    // Don't allow movement during dance
    if (this.isDancing) {
      this.player.setVelocity(0, 0);
      return;
    }
    
    // Handle player movement
    const speed = 100;
    let velocityX = 0;
    let velocityY = 0;
    
    // Check input
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    
    if (left) {
      velocityX = -speed;
      this.playerDirection = 'left';
    } else if (right) {
      velocityX = speed;
      this.playerDirection = 'right';
    }
    
    if (up) {
      velocityY = -speed;
      this.playerDirection = 'up';
    } else if (down) {
      velocityY = speed;
      this.playerDirection = 'down';
    }
    
    // Apply velocity
    this.player.setVelocity(velocityX, velocityY);
    
    // Update animation
    const isMoving = velocityX !== 0 || velocityY !== 0;
    if (isMoving !== this.playerIsMoving) {
      this.playerIsMoving = isMoving;
    }
    
    if (isMoving) {
      this.player.anims.play(`slim-walk-${this.playerDirection}`, true);
    } else {
      this.player.anims.play(`slim-idle-${this.playerDirection}`, true);
    }
    
    // Update name label position
    this.playerNameLabel.setPosition(this.player.x, this.player.y - 18);
    
    // Update clone name labels
    this.clones.forEach(clone => {
      clone.nameLabel.setPosition(clone.sprite.x, clone.sprite.y - 18);
    });
  }

  private exitRoom(): void {
    // Clean up
    if (this.danceTimer) {
      this.danceTimer.destroy();
    }
    
    // Kill all tweens
    this.tweens.killAll();
    
    // Update URL
    window.history.pushState({}, '', '/town');
    
    // Transition back to town
    GameBridge.showTransition(
      `/assets/sprites/${this.playerAvatar}.png`,
      'Returning to town...',
      () => {
        this.scene.start('town-scene');
      }
    );
  }
}
