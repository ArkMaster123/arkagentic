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

    // Load tilemaps
    this.load.tilemapTiledJSON('town', 'assets/tilemaps/json/town.json');
    this.load.image('tiles', 'assets/tilemaps/tiles/tileset.png');
    
    // Load room tilemaps for each agent
    this.load.tilemapTiledJSON('room-scout', 'assets/tilemaps/json/room-scout.json');
    this.load.tilemapTiledJSON('room-sage', 'assets/tilemaps/json/room-sage.json');
    this.load.tilemapTiledJSON('room-chronicle', 'assets/tilemaps/json/room-chronicle.json');
    this.load.tilemapTiledJSON('room-trends', 'assets/tilemaps/json/room-trends.json');
    this.load.tilemapTiledJSON('room-maven', 'assets/tilemaps/json/room-maven.json');

    // Load all agent sprites (Pokemon-style characters)
    // Sprites are horizontal strips with 12 frames (4 directions x 3 frames each)
    // Frame order: Down (0-2), Left (3-5), Right (6-8), Up (9-11)
    const spriteSizes: Record<string, { width: number; height: number }> = {
      archie: { width: 16, height: 20 },   // 192x20 / 12 = 16x20
      birch: { width: 16, height: 20 },    // 192x20 / 12 = 16x20
      maxie: { width: 16, height: 20 },    // 192x20 / 12 = 16x20
      steven: { width: 16, height: 21 },   // 192x21 / 12 = 16x21
      may: { width: 14, height: 20 },      // 168x20 / 12 = 14x20
      brendan: { width: 14, height: 21 },  // 168x21 / 12 = 14x21
      joseph: { width: 14, height: 21 },   // 168x21 / 12 = 14x21
    };

    Object.values(AGENTS).forEach((agent) => {
      const size = spriteSizes[agent.sprite] || { width: 16, height: 20 };
      this.load.spritesheet(agent.sprite, `assets/sprites/${agent.sprite}.png`, {
        frameWidth: size.width,
        frameHeight: size.height,
      });
    });

    // Load player sprite (brendan)
    this.load.spritesheet('player', 'assets/sprites/brendan.png', {
      frameWidth: 14,
      frameHeight: 21,
    });
  }

  create(): void {
    this.scene.start('town-scene');
  }
}
