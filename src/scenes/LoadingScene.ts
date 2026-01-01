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
    
    // Load world map image for mini-map
    this.load.image('worldmap', 'assets/worldmap.jpg');
    
    // Load dungeon tileset for rooms (0x72 DungeonTileset II)
    this.load.image('dungeon-tiles', 'assets/tilemaps/tiles/dungeon/0x72_DungeonTilesetII_v1.7.png');
    
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

    // Load all character sprites for player selection
    // These will be used for both NPCs and player avatars
    const allCharacters: Record<string, { width: number; height: number }> = {
      archie: { width: 16, height: 20 },
      birch: { width: 16, height: 20 },
      maxie: { width: 16, height: 20 },
      steven: { width: 16, height: 21 },
      may: { width: 14, height: 20 },
      brendan: { width: 14, height: 21 },
      joseph: { width: 14, height: 21 },
    };
    
    Object.entries(allCharacters).forEach(([key, size]) => {
      // Only load if not already loaded (some may be loaded as agent sprites)
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, `assets/sprites/${key}.png`, {
          frameWidth: size.width,
          frameHeight: size.height,
        });
      }
    });
  }

  async create(): Promise<void> {
    const userId = localStorage.getItem('arkagentic_user_id');
    const sessionToken = localStorage.getItem('arkagentic_session_token');
    
    // Check for offline mode credentials
    const offlineName = localStorage.getItem('arkagentic_offline_name');
    const offlineAvatar = localStorage.getItem('arkagentic_offline_avatar');
    
    if (userId && sessionToken) {
      // We have credentials - validate session and fetch user from DB
      try {
        // Step 1: Validate the session token
        const validateResponse = await fetch(
          `/api/auth/validate?user_id=${userId}&session_token=${sessionToken}`,
          { method: 'POST' }
        );
        const validation = await validateResponse.json();
        
        if (!validation.valid) {
          console.warn('[Loading] Session invalid - clearing credentials');
          this.clearCredentials();
          this.scene.start('character-select-scene');
          return;
        }
        
        // Step 2: Fetch fresh user data from database
        const userResponse = await fetch(`/api/users/${userId}`);
        if (!userResponse.ok) {
          console.warn('[Loading] User not found in database');
          this.clearCredentials();
          this.scene.start('character-select-scene');
          return;
        }
        
        const user = await userResponse.json();
        console.log(`[Loading] Welcome back, ${user.display_name}!`);
        
        this.scene.start('town-scene', {
          playerAvatar: user.avatar_sprite || 'brendan',
          playerName: user.display_name || 'Player',
          userId: user.id,
          sessionToken: sessionToken,
          isNewPlayer: false,
        });
        return;
        
      } catch (error) {
        console.error('[Loading] Failed to validate session:', error);
        // Network error - could be offline, try to continue with offline mode
        if (offlineName && offlineAvatar) {
          console.log('[Loading] Network unavailable - using offline mode');
          this.scene.start('town-scene', {
            playerAvatar: offlineAvatar,
            playerName: offlineName,
            isNewPlayer: false,
            isOffline: true,
          });
          return;
        }
      }
    }
    
    // Check for offline-created user that needs to be synced
    if (userId?.startsWith('offline-') && offlineName && offlineAvatar) {
      console.log('[Loading] Offline user found - attempting to sync...');
      try {
        // Try to create a real account now that we might be online
        const sessionToken = this.generateSessionToken();
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            display_name: offlineName,
            avatar_sprite: offlineAvatar,
            session_token: sessionToken,
          }),
        });
        
        if (response.ok) {
          const user = await response.json();
          console.log('[Loading] Offline user synced to database:', user.id);
          
          // Update credentials with real user
          localStorage.setItem('arkagentic_user_id', user.id);
          localStorage.setItem('arkagentic_session_token', sessionToken);
          localStorage.removeItem('arkagentic_offline_name');
          localStorage.removeItem('arkagentic_offline_avatar');
          
          this.scene.start('town-scene', {
            playerAvatar: user.avatar_sprite,
            playerName: user.display_name,
            userId: user.id,
            sessionToken: sessionToken,
            isNewPlayer: false,
          });
          return;
        }
      } catch (error) {
        console.log('[Loading] Still offline - continuing in offline mode');
      }
      
      // Still offline - continue with offline credentials
      this.scene.start('town-scene', {
        playerAvatar: offlineAvatar,
        playerName: offlineName,
        isNewPlayer: false,
        isOffline: true,
      });
      return;
    }
    
    // No valid credentials - show character selection
    console.log('[Loading] New player - showing character select');
    this.scene.start('character-select-scene');
  }
  
  /**
   * Clear all stored credentials
   */
  private clearCredentials(): void {
    localStorage.removeItem('arkagentic_user_id');
    localStorage.removeItem('arkagentic_session_token');
    localStorage.removeItem('arkagentic_offline_name');
    localStorage.removeItem('arkagentic_offline_avatar');
    // Also remove legacy cached user data
    localStorage.removeItem('arkagentic_user');
  }
  
  /**
   * Generate a secure random session token
   */
  private generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
}
