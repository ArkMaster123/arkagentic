import { Scene, GameObjects } from 'phaser';

interface CharacterOption {
  key: string;
  name: string;
  frameWidth: number;
  frameHeight: number;
}

/**
 * Character Selection Scene - Shown on first visit
 * Allows players to choose their avatar and enter a display name
 */
export class CharacterSelectScene extends Scene {
  private characters: CharacterOption[] = [
    { key: 'brendan', name: 'Brendan', frameWidth: 14, frameHeight: 21 },
    { key: 'may', name: 'May', frameWidth: 14, frameHeight: 20 },
    { key: 'steven', name: 'Steven', frameWidth: 16, frameHeight: 21 },
    { key: 'archie', name: 'Archie', frameWidth: 16, frameHeight: 20 },
    { key: 'maxie', name: 'Maxie', frameWidth: 16, frameHeight: 20 },
    { key: 'joseph', name: 'Joseph', frameWidth: 14, frameHeight: 21 },
    { key: 'birch', name: 'Birch', frameWidth: 16, frameHeight: 20 },
  ];

  private selectedIndex: number = 0;
  private characterSprites: GameObjects.Sprite[] = [];
  private selectionBox!: GameObjects.Rectangle;
  private nameText!: GameObjects.Text;
  private inputElement: HTMLInputElement | null = null;
  private displayName: string = '';

  constructor() {
    super('character-select-scene');
  }

  create(): void {
    const { width, height } = this.cameras.main;
    
    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, width, height);
    
    // Starry background effect
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 1;
      const alpha = Math.random() * 0.5 + 0.3;
      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      
      // Twinkle animation
      this.tweens.add({
        targets: star,
        alpha: alpha * 0.3,
        duration: 1000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    
    // Title with glow effect
    const title = this.add.text(width / 2, 60, 'Welcome to ArkAgentic!', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#4a90d9',
      strokeThickness: 2,
    }).setOrigin(0.5);
    
    // Subtle title animation
    this.tweens.add({
      targets: title,
      y: 65,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    
    // Subtitle
    this.add.text(width / 2, 100, 'Choose your character to begin your adventure', {
      fontSize: '14px',
      color: '#a0a0a0',
    }).setOrigin(0.5);
    
    // Character selection area
    this.createCharacterGrid(width, height);
    
    // Name input area
    this.createNameInput(width, height);
    
    // Start button
    this.createStartButton(width, height);
    
    // Instructions
    this.add.text(width / 2, height - 40, 'Use arrow keys or click to select  |  Press ENTER to start', {
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(0.5);
    
    // Keyboard navigation
    this.setupKeyboardControls();
  }

  private createCharacterGrid(width: number, height: number): void {
    const gridStartX = width / 2 - ((this.characters.length - 1) * 50) / 2;
    const gridY = 200;
    
    // Selection box (behind sprites)
    this.selectionBox = this.add.rectangle(0, 0, 44, 50, 0x4a90d9, 0.3);
    this.selectionBox.setStrokeStyle(2, 0x4a90d9);
    this.selectionBox.setDepth(0);
    
    this.characters.forEach((char, index) => {
      const x = gridStartX + index * 50;
      
      // Character platform
      const platform = this.add.ellipse(x, gridY + 20, 36, 12, 0x000000, 0.3);
      
      // Character sprite
      const sprite = this.add.sprite(x, gridY, char.key, 0);
      sprite.setScale(2);
      sprite.setInteractive({ useHandCursor: true });
      
      // Create idle animation for this character
      this.createCharacterAnims(char.key);
      
      // Play idle animation
      sprite.play(`${char.key}-idle-down`);
      
      // Click to select
      sprite.on('pointerdown', () => {
        this.selectCharacter(index);
      });
      
      // Hover effect
      sprite.on('pointerover', () => {
        if (index !== this.selectedIndex) {
          sprite.setTint(0xcccccc);
        }
      });
      
      sprite.on('pointerout', () => {
        if (index !== this.selectedIndex) {
          sprite.clearTint();
        }
      });
      
      this.characterSprites.push(sprite);
    });
    
    // Character name display
    this.nameText = this.add.text(width / 2, gridY + 55, this.characters[0].name, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    // Initial selection
    this.updateSelection();
  }

  private createCharacterAnims(key: string): void {
    // Only create if doesn't exist
    if (this.anims.exists(`${key}-idle-down`)) return;
    
    const char = this.characters.find(c => c.key === key);
    if (!char) return;
    
    // Idle animation (first frame of down direction)
    this.anims.create({
      key: `${key}-idle-down`,
      frames: [{ key: key, frame: 0 }],
      frameRate: 1,
    });
    
    // Walk animation for preview
    this.anims.create({
      key: `${key}-walk-down`,
      frames: this.anims.generateFrameNumbers(key, { start: 0, end: 2 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  private createNameInput(width: number, height: number): void {
    // Label
    this.add.text(width / 2, 290, 'Enter your name:', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    // Create HTML input element
    const inputX = width / 2 - 100;
    const inputY = 310;
    
    // Input background in Phaser
    const inputBg = this.add.rectangle(width / 2, inputY + 15, 200, 30, 0x2a2a4a);
    inputBg.setStrokeStyle(1, 0x4a90d9);
    
    // Create DOM input
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.maxLength = 20;
    this.inputElement.placeholder = 'Your display name...';
    this.inputElement.style.cssText = `
      position: absolute;
      left: ${inputX}px;
      top: ${inputY}px;
      width: 200px;
      height: 30px;
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 14px;
      text-align: center;
      outline: none;
      font-family: Arial, sans-serif;
    `;
    
    // Generate random default name
    const adjectives = ['Swift', 'Brave', 'Clever', 'Noble', 'Mystic', 'Shadow', 'Storm', 'Fire', 'Ice', 'Thunder'];
    const nouns = ['Explorer', 'Wanderer', 'Seeker', 'Ranger', 'Knight', 'Mage', 'Scout', 'Hero', 'Champion', 'Sage'];
    const randomName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
    this.inputElement.value = randomName;
    this.displayName = randomName;
    
    this.inputElement.addEventListener('input', (e) => {
      this.displayName = (e.target as HTMLInputElement).value;
    });
    
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.startGame();
      }
    });
    
    document.body.appendChild(this.inputElement);
    
    // Clean up on scene shutdown
    this.events.on('shutdown', () => {
      if (this.inputElement) {
        this.inputElement.remove();
        this.inputElement = null;
      }
    });
  }

  private createStartButton(width: number, height: number): void {
    const buttonY = 400;
    
    // Button background
    const button = this.add.rectangle(width / 2, buttonY, 180, 45, 0x4a90d9);
    button.setStrokeStyle(2, 0x6ab0f9);
    button.setInteractive({ useHandCursor: true });
    
    // Button text
    const buttonText = this.add.text(width / 2, buttonY, 'Start Adventure!', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    // Button hover effects
    button.on('pointerover', () => {
      button.setFillStyle(0x5aa0e9);
      this.tweens.add({
        targets: [button, buttonText],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });
    
    button.on('pointerout', () => {
      button.setFillStyle(0x4a90d9);
      this.tweens.add({
        targets: [button, buttonText],
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });
    
    button.on('pointerdown', () => {
      button.setFillStyle(0x3a80c9);
    });
    
    button.on('pointerup', () => {
      this.startGame();
    });
  }

  private setupKeyboardControls(): void {
    // Arrow keys for character selection
    this.input.keyboard?.on('keydown-LEFT', () => {
      this.selectCharacter(Math.max(0, this.selectedIndex - 1));
    });
    
    this.input.keyboard?.on('keydown-RIGHT', () => {
      this.selectCharacter(Math.min(this.characters.length - 1, this.selectedIndex + 1));
    });
    
    this.input.keyboard?.on('keydown-ENTER', () => {
      // Only start if input is not focused
      if (document.activeElement !== this.inputElement) {
        this.startGame();
      }
    });
  }

  private selectCharacter(index: number): void {
    // Clear previous selection tint
    this.characterSprites[this.selectedIndex]?.clearTint();
    
    this.selectedIndex = index;
    this.updateSelection();
    
    // Play walk animation briefly on selection
    const sprite = this.characterSprites[index];
    sprite.play(`${this.characters[index].key}-walk-down`);
    
    this.time.delayedCall(500, () => {
      sprite.play(`${this.characters[index].key}-idle-down`);
    });
  }

  private updateSelection(): void {
    const char = this.characters[this.selectedIndex];
    const sprite = this.characterSprites[this.selectedIndex];
    
    if (sprite && this.selectionBox) {
      // Animate selection box to new position
      this.tweens.add({
        targets: this.selectionBox,
        x: sprite.x,
        y: sprite.y + 5,
        duration: 150,
        ease: 'Cubic.easeOut',
      });
      
      // Highlight selected sprite
      sprite.setTint(0xffffff);
      
      // Update name text
      this.nameText.setText(char.name);
    }
  }

  private startGame(): void {
    const selectedChar = this.characters[this.selectedIndex];
    const name = this.displayName.trim() || `Player${Math.floor(Math.random() * 9999)}`;
    
    // Save to localStorage
    const userData = {
      avatar_sprite: selectedChar.key,
      display_name: name,
      created_locally: true,
    };
    localStorage.setItem('arkagentic_user', JSON.stringify(userData));
    
    console.log(`[CharacterSelect] Starting game as ${name} with avatar ${selectedChar.key}`);
    
    // Remove input element
    if (this.inputElement) {
      this.inputElement.remove();
      this.inputElement = null;
    }
    
    // Fade out and start town scene
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('town-scene', {
        playerAvatar: selectedChar.key,
        playerName: name,
        isNewPlayer: true,
      });
    });
  }
}
