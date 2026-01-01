import { Scene, GameObjects } from 'phaser';
import { API_BASE_URL } from '../constants';

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
  private displayName: string = '';
  private nameInputText!: GameObjects.Text;
  private isTyping: boolean = false;
  private cursorVisible: boolean = true;
  private cursorTimer?: Phaser.Time.TimerEvent;
  private isLoading: boolean = false;
  private errorText!: GameObjects.Text;

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
    this.createStars(width, height);
    
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
    
    // Name input area (using Phaser text, not DOM)
    this.createNameInput(width, height);
    
    // Start button
    this.createStartButton(width, height);
    
    // Error text (hidden by default)
    this.errorText = this.add.text(width / 2, 450, '', {
      fontSize: '12px',
      color: '#ff6b6b',
    }).setOrigin(0.5);
    
    // Instructions
    this.add.text(width / 2, height - 40, 'Click name box to type  |  Arrow keys to select character  |  ENTER to start', {
      fontSize: '11px',
      color: '#666666',
    }).setOrigin(0.5);
    
    // Keyboard navigation
    this.setupKeyboardControls();
    
    // Generate random default name
    this.generateRandomName();
  }

  private createStars(width: number, height: number): void {
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 1;
      const alpha = Math.random() * 0.5 + 0.3;
      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      
      this.tweens.add({
        targets: star,
        alpha: alpha * 0.3,
        duration: 1000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
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
      this.add.ellipse(x, gridY + 20, 36, 12, 0x000000, 0.3);
      
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
    if (this.anims.exists(`${key}-idle-down`)) return;
    
    this.anims.create({
      key: `${key}-idle-down`,
      frames: [{ key: key, frame: 0 }],
      frameRate: 1,
    });
    
    this.anims.create({
      key: `${key}-walk-down`,
      frames: this.anims.generateFrameNumbers(key, { start: 0, end: 2 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  private createNameInput(width: number, height: number): void {
    // Label
    this.add.text(width / 2, 290, 'Your Name:', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    // Input box background
    const inputBg = this.add.rectangle(width / 2, 325, 220, 36, 0x2a2a4a);
    inputBg.setStrokeStyle(2, 0x4a90d9);
    inputBg.setInteractive({ useHandCursor: true });
    
    // Name text display
    this.nameInputText = this.add.text(width / 2, 325, '', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
    
    // Click to focus
    inputBg.on('pointerdown', () => {
      this.startTyping();
    });
    
    // Click elsewhere to unfocus
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, targets: GameObjects.GameObject[]) => {
      if (!targets.includes(inputBg)) {
        this.stopTyping();
      }
    });
  }

  private startTyping(): void {
    this.isTyping = true;
    this.cursorVisible = true;
    this.updateNameDisplay();
    
    // Blink cursor
    this.cursorTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        this.cursorVisible = !this.cursorVisible;
        this.updateNameDisplay();
      },
      loop: true,
    });
  }

  private stopTyping(): void {
    this.isTyping = false;
    if (this.cursorTimer) {
      this.cursorTimer.remove();
      this.cursorTimer = undefined;
    }
    this.updateNameDisplay();
  }

  private updateNameDisplay(): void {
    const cursor = this.isTyping && this.cursorVisible ? '|' : '';
    const displayText = this.displayName || (this.isTyping ? '' : 'Click to enter name...');
    this.nameInputText.setText(displayText + cursor);
    this.nameInputText.setColor(this.displayName ? '#ffffff' : '#888888');
  }

  private generateRandomName(): void {
    const adjectives = ['Swift', 'Brave', 'Clever', 'Noble', 'Mystic', 'Shadow', 'Storm', 'Fire', 'Ice', 'Thunder'];
    const nouns = ['Explorer', 'Wanderer', 'Seeker', 'Ranger', 'Knight', 'Mage', 'Scout', 'Hero', 'Champion', 'Sage'];
    this.displayName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
    this.updateNameDisplay();
  }

  private createStartButton(width: number, height: number): void {
    const buttonY = 400;
    
    const button = this.add.rectangle(width / 2, buttonY, 180, 45, 0x4a90d9);
    button.setStrokeStyle(2, 0x6ab0f9);
    button.setInteractive({ useHandCursor: true });
    
    const buttonText = this.add.text(width / 2, buttonY, 'Start Adventure!', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
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
    // Handle text input when typing
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isTyping) {
        if (event.key === 'Backspace') {
          this.displayName = this.displayName.slice(0, -1);
          this.updateNameDisplay();
        } else if (event.key === 'Enter') {
          this.stopTyping();
          this.startGame();
        } else if (event.key === 'Escape') {
          this.stopTyping();
        } else if (event.key.length === 1 && this.displayName.length < 20) {
          // Single character - add to name
          this.displayName += event.key;
          this.updateNameDisplay();
        }
        return;
      }
      
      // Character selection when not typing
      if (event.key === 'ArrowLeft') {
        this.selectCharacter(Math.max(0, this.selectedIndex - 1));
      } else if (event.key === 'ArrowRight') {
        this.selectCharacter(Math.min(this.characters.length - 1, this.selectedIndex + 1));
      } else if (event.key === 'Enter') {
        this.startGame();
      }
    });
  }

  private selectCharacter(index: number): void {
    this.characterSprites[this.selectedIndex]?.clearTint();
    this.selectedIndex = index;
    this.updateSelection();
    
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
      this.tweens.add({
        targets: this.selectionBox,
        x: sprite.x,
        y: sprite.y + 5,
        duration: 150,
        ease: 'Cubic.easeOut',
      });
      
      sprite.setTint(0xffffff);
      this.nameText.setText(char.name);
    }
  }

  private async startGame(): Promise<void> {
    if (this.isLoading) return;
    
    const selectedChar = this.characters[this.selectedIndex];
    const name = this.displayName.trim() || `Player${Math.floor(Math.random() * 9999)}`;
    
    this.isLoading = true;
    this.errorText.setText('Creating your character...');
    this.errorText.setColor('#4a90d9');
    
    try {
      // Create user in database via API
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: name,
          avatar_sprite: selectedChar.key,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create user: ${response.status}`);
      }
      
      const user = await response.json();
      console.log(`[CharacterSelect] Created user in database:`, user);
      
      // Store only the user ID in localStorage for future sessions
      localStorage.setItem('arkagentic_user_id', user.id);
      
      // Also cache the full user data for immediate use
      localStorage.setItem('arkagentic_user', JSON.stringify(user));
      
      this.errorText.setText('');
      
      // Fade out and start town scene
      this.cameras.main.fadeOut(500, 0, 0, 0);
      
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('town-scene', {
          playerAvatar: selectedChar.key,
          playerName: name,
          odyseus: user.id,
          isNewPlayer: true,
        });
      });
      
    } catch (error) {
      console.error('[CharacterSelect] Failed to create user:', error);
      this.errorText.setText('Connection failed - starting offline...');
      this.errorText.setColor('#ffaa00');
      
      // Fallback: Store locally and continue anyway
      const offlineUser = {
        id: `offline-${Date.now()}`,
        display_name: name,
        avatar_sprite: selectedChar.key,
        is_offline: true,
      };
      localStorage.setItem('arkagentic_user', JSON.stringify(offlineUser));
      
      this.time.delayedCall(1500, () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('town-scene', {
            playerAvatar: selectedChar.key,
            playerName: name,
            isNewPlayer: true,
          });
        });
      });
    }
    
    this.isLoading = false;
  }
}
