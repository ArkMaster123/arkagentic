import { Scene } from 'phaser';
import { AGENTS } from '../constants';

export class LoadingScene extends Scene {
  constructor() {
    super('loading-scene');
  }

  preload(): void {
    // Show loading progress
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    
    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading AgentVerse...', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      percentText.setText(`${Math.round(value * 100)}%`);
      progressBar.clear();
      progressBar.fillStyle(0x4e342e, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Load tilemap
    this.load.tilemapTiledJSON('town', 'assets/tilemaps/json/town.json');
    this.load.image('tiles', 'assets/tilemaps/tiles/tileset.png');

    // Load all agent sprites (Pokemon-style characters)
    // Each sprite sheet is 14x20 pixels per frame, 12 frames (4 directions x 3 frames each)
    Object.values(AGENTS).forEach((agent) => {
      this.load.spritesheet(agent.sprite, `assets/sprites/${agent.sprite}.png`, {
        frameWidth: 14,
        frameHeight: 20,
      });
    });

    // Load player sprite (brendan)
    this.load.spritesheet('player', 'assets/sprites/brendan.png', {
      frameWidth: 14,
      frameHeight: 20,
    });
  }

  create(): void {
    this.scene.start('town-scene');
  }
}
