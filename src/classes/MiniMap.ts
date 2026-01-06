import { Scene, GameObjects, Cameras } from 'phaser';

interface MiniMapConfig {
  x: number;           // Screen X position (bottom-left corner)
  y: number;           // Screen Y position
  width: number;       // Mini-map width
  height: number;      // Mini-map height
  worldWidth: number;  // Full world width
  worldHeight: number; // Full world height
  zoom?: number;       // Zoom level for mini-map camera
  borderColor?: number;
  borderWidth?: number;
  backgroundColor?: number;
  currentLocation?: string; // Name of current location
}

interface LocationMarker {
  id: string;
  name: string;
  x: number;        // Percentage position (0-100)
  y: number;
  color: number;
  icon?: string;
  available: boolean;
}

// World map locations (matching map.html)
const WORLD_LOCATIONS: LocationMarker[] = [
  { id: 'ark-central', name: 'Ark Central Village', x: 38, y: 42, color: 0xe94560, icon: '🏘️', available: true },
  { id: 'whimsy-woods', name: 'Whimsy Woods', x: 52, y: 18, color: 0x27ae60, icon: '🌲', available: false },
  { id: 'productivity-plaza', name: 'Productivity Plaza', x: 72, y: 18, color: 0xe94560, icon: '🏗️', available: false },
  { id: 'proving-fields', name: 'Proving Fields', x: 62, y: 30, color: 0x27ae60, icon: '⚔️', available: false },
  { id: 'glitch-mire', name: 'Glitch Mire', x: 78, y: 45, color: 0x9b59b6, icon: '💀', available: false },
  { id: 'echo-canyons', name: 'Echo Canyons', x: 58, y: 68, color: 0xf39c12, icon: '🏜️', available: false },
  { id: 'data-stream', name: 'Data Stream', x: 38, y: 72, color: 0x3498db, icon: '💧', available: false },
  { id: 'chatbot-ruins', name: 'Chatbot Ruins', x: 20, y: 68, color: 0x9b59b6, icon: '🏚️', available: false },
  { id: 'agent-drydocks', name: 'Agent Drydocks', x: 8, y: 45, color: 0x3498db, icon: '⚓', available: false },
  { id: 'ecosystem-frontier', name: 'Ecosystem Frontier', x: 15, y: 15, color: 0xf39c12, icon: '❓', available: false },
];

export class MiniMap {
  private scene: Scene;
  private container: GameObjects.Container;
  private config: MiniMapConfig;
  private miniMapCamera: Cameras.Scene2D.Camera | null = null;
  private playerMarker: GameObjects.Graphics | null = null;
  private locationMarkers: GameObjects.Container[] = [];
  private currentLocationId: string = 'ark-central';
  private isModalOpen: boolean = false;
  private modalElements: GameObjects.GameObject[] = [];
  
  // UI elements
  private background: GameObjects.Graphics;
  private border: GameObjects.Graphics;
  private mapImage: GameObjects.Image | null = null;
  private titleText: GameObjects.Text;
  private locationDot: GameObjects.Graphics;

  constructor(scene: Scene, config: MiniMapConfig) {
    this.scene = scene;
    this.config = {
      zoom: 0.15,
      borderColor: 0xe94560,
      borderWidth: 2,
      backgroundColor: 0x0d0d14,
      ...config
    };

    // Create container at screen position
    this.container = scene.add.container(config.x, config.y);
    this.container.setDepth(2000);
    this.container.setScrollFactor(0); // Fixed to screen

    // Create background
    this.background = scene.add.graphics();
    this.background.fillStyle(this.config.backgroundColor!, 0.9);
    this.background.fillRoundedRect(0, 0, config.width, config.height, 8);
    
    // Create border
    this.border = scene.add.graphics();
    this.border.lineStyle(this.config.borderWidth!, this.config.borderColor!, 1);
    this.border.strokeRoundedRect(0, 0, config.width, config.height, 8);

    // Create title
    this.titleText = scene.add.text(config.width / 2, 8, '🗺️ World Map', {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Create current location dot (pulsing)
    this.locationDot = scene.add.graphics();
    this.updateLocationDot();

    // Add elements to container
    this.container.add([this.background, this.border, this.titleText, this.locationDot]);

    // Create the mini world map preview
    this.createWorldMapPreview();

    // Make interactive (click to open modal)
    this.makeInteractive();

    // Start pulsing animation for current location
    this.startPulseAnimation();
  }

  private createWorldMapPreview(): void {
    const mapWidth = this.config.width - 16;
    const mapHeight = this.config.height - 30;
    const offsetX = 8;
    const offsetY = 22;

    // Create a small preview of the world map using graphics
    const mapPreview = this.scene.add.graphics();
    
    // Dark background for map area
    mapPreview.fillStyle(0x1a1a28, 1);
    mapPreview.fillRoundedRect(offsetX, offsetY, mapWidth, mapHeight, 4);

    // Draw simplified terrain hints
    mapPreview.fillStyle(0x2d4a3e, 0.5); // Greenish areas
    mapPreview.fillCircle(offsetX + mapWidth * 0.5, offsetY + mapHeight * 0.2, 8);
    mapPreview.fillCircle(offsetX + mapWidth * 0.6, offsetY + mapHeight * 0.3, 6);
    
    mapPreview.fillStyle(0x3d2d1a, 0.5); // Brown/canyon areas
    mapPreview.fillCircle(offsetX + mapWidth * 0.6, offsetY + mapHeight * 0.7, 10);
    
    this.container.add(mapPreview);

    // Draw location markers
    WORLD_LOCATIONS.forEach((loc) => {
      const markerX = offsetX + (loc.x / 100) * mapWidth;
      const markerY = offsetY + (loc.y / 100) * mapHeight;

      const marker = this.scene.add.graphics();
      
      if (loc.id === this.currentLocationId) {
        // Current location - larger, pulsing (handled separately)
      } else if (loc.available) {
        // Available location - normal dot
        marker.fillStyle(loc.color, 0.8);
        marker.fillCircle(markerX, markerY, 3);
      } else {
        // Locked/coming soon - dimmed dot
        marker.fillStyle(loc.color, 0.3);
        marker.fillCircle(markerX, markerY, 2);
      }

      this.container.add(marker);
    });
  }

  private updateLocationDot(): void {
    this.locationDot.clear();
    
    const mapWidth = this.config.width - 16;
    const mapHeight = this.config.height - 30;
    const offsetX = 8;
    const offsetY = 22;

    const currentLoc = WORLD_LOCATIONS.find(l => l.id === this.currentLocationId);
    if (currentLoc) {
      const markerX = offsetX + (currentLoc.x / 100) * mapWidth;
      const markerY = offsetY + (currentLoc.y / 100) * mapHeight;

      // Outer glow
      this.locationDot.fillStyle(currentLoc.color, 0.3);
      this.locationDot.fillCircle(markerX, markerY, 8);
      
      // Inner dot
      this.locationDot.fillStyle(currentLoc.color, 1);
      this.locationDot.fillCircle(markerX, markerY, 4);
      
      // White center
      this.locationDot.fillStyle(0xffffff, 1);
      this.locationDot.fillCircle(markerX, markerY, 2);
    }
  }

  private startPulseAnimation(): void {
    // Pulse animation for current location
    this.scene.tweens.add({
      targets: this.locationDot,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private makeInteractive(): void {
    // Create an invisible hit area over the entire minimap
    const hitArea = this.scene.add.rectangle(
      this.config.width / 2,
      this.config.height / 2,
      this.config.width,
      this.config.height,
      0x000000,
      0
    );
    hitArea.setInteractive({ useHandCursor: true });
    
    // Hover effects
    hitArea.on('pointerover', () => {
      this.border.clear();
      this.border.lineStyle(this.config.borderWidth! + 1, 0xff6b8a, 1);
      this.border.strokeRoundedRect(0, 0, this.config.width, this.config.height, 8);
      
      this.titleText.setColor('#ff6b8a');
    });

    hitArea.on('pointerout', () => {
      this.border.clear();
      this.border.lineStyle(this.config.borderWidth!, this.config.borderColor!, 1);
      this.border.strokeRoundedRect(0, 0, this.config.width, this.config.height, 8);
      
      this.titleText.setColor('#ffffff');
    });

    hitArea.on('pointerdown', () => {
      this.openModal();
    });

    this.container.add(hitArea);
  }

  private openModal(): void {
    if (this.isModalOpen) return;
    this.isModalOpen = true;

    // Create modal overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, 800, 600);
    overlay.setScrollFactor(0);
    overlay.setDepth(3000);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, 800, 600), Phaser.Geom.Rectangle.Contains);
    
    // Click overlay to close
    overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only close if clicking outside the modal content
      const modalBounds = { x: 50, y: 50, width: 700, height: 500 };
      if (
        pointer.x < modalBounds.x || pointer.x > modalBounds.x + modalBounds.width ||
        pointer.y < modalBounds.y || pointer.y > modalBounds.y + modalBounds.height
      ) {
        this.closeModal();
      }
    });

    this.modalElements.push(overlay);

    // Modal container
    const modalBg = this.scene.add.graphics();
    modalBg.fillStyle(0x1a1a28, 1);
    modalBg.fillRoundedRect(50, 50, 700, 500, 16);
    modalBg.lineStyle(3, 0xe94560, 1);
    modalBg.strokeRoundedRect(50, 50, 700, 500, 16);
    modalBg.setScrollFactor(0);
    modalBg.setDepth(3001);
    this.modalElements.push(modalBg);

    // Modal title
    const title = this.scene.add.text(400, 70, '🗺️ AgentVerse World Map', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3002);
    this.modalElements.push(title);

    // Subtitle with current location
    const currentLoc = WORLD_LOCATIONS.find(l => l.id === this.currentLocationId);
    const subtitle = this.scene.add.text(400, 100, `📍 Current Location: ${currentLoc?.name || 'Unknown'}`, {
      fontSize: '14px',
      color: '#e94560',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3002);
    this.modalElements.push(subtitle);

    // Close button
    const closeBtn = this.scene.add.text(720, 65, '✕', {
      fontSize: '24px',
      color: '#666666',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3003);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#e94560'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#666666'));
    closeBtn.on('pointerdown', () => this.closeModal());
    this.modalElements.push(closeBtn);

    // Map container area
    const mapAreaX = 80;
    const mapAreaY = 130;
    const mapAreaWidth = 640;
    const mapAreaHeight = 350;

    // Map background
    const mapBg = this.scene.add.graphics();
    mapBg.fillStyle(0x0d0d14, 1);
    mapBg.fillRoundedRect(mapAreaX, mapAreaY, mapAreaWidth, mapAreaHeight, 8);
    mapBg.setScrollFactor(0).setDepth(3002);
    this.modalElements.push(mapBg);

    // Try to load the world map image, otherwise draw stylized version
    try {
      const worldMapImg = this.scene.add.image(mapAreaX + mapAreaWidth / 2, mapAreaY + mapAreaHeight / 2, 'worldmap');
      worldMapImg.setDisplaySize(mapAreaWidth, mapAreaHeight);
      worldMapImg.setScrollFactor(0).setDepth(3003);
      worldMapImg.setAlpha(0.8);
      this.modalElements.push(worldMapImg);
    } catch (e) {
      // Draw stylized fallback map
      this.drawStylizedMap(mapAreaX, mapAreaY, mapAreaWidth, mapAreaHeight);
    }

    // Draw location markers on the map
    this.drawModalLocationMarkers(mapAreaX, mapAreaY, mapAreaWidth, mapAreaHeight);

    // Legend at bottom
    this.drawLegend(mapAreaX, mapAreaY + mapAreaHeight + 15);

    // Instructions
    const instructions = this.scene.add.text(400, 530, 'Click anywhere outside to close  |  Press ESC to close', {
      fontSize: '11px',
      color: '#666666',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3002);
    this.modalElements.push(instructions);

    // ESC to close
    const escHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  private drawStylizedMap(x: number, y: number, width: number, height: number): void {
    const mapGfx = this.scene.add.graphics();
    mapGfx.setScrollFactor(0).setDepth(3003);

    // Draw terrain regions
    // Green forest areas
    mapGfx.fillStyle(0x2d4a3e, 0.6);
    mapGfx.fillCircle(x + width * 0.52, y + height * 0.18, 40);
    mapGfx.fillCircle(x + width * 0.62, y + height * 0.30, 30);

    // Brown canyon/desert areas
    mapGfx.fillStyle(0x4a3d2d, 0.6);
    mapGfx.fillCircle(x + width * 0.58, y + height * 0.68, 50);

    // Blue water/stream areas
    mapGfx.fillStyle(0x2d3d4a, 0.6);
    mapGfx.fillCircle(x + width * 0.38, y + height * 0.72, 35);
    mapGfx.fillCircle(x + width * 0.08, y + height * 0.45, 40);

    // Purple ruins areas
    mapGfx.fillStyle(0x3d2d4a, 0.6);
    mapGfx.fillCircle(x + width * 0.78, y + height * 0.45, 35);
    mapGfx.fillCircle(x + width * 0.20, y + height * 0.68, 35);

    this.modalElements.push(mapGfx);
  }

  private drawModalLocationMarkers(mapX: number, mapY: number, mapWidth: number, mapHeight: number): void {
    WORLD_LOCATIONS.forEach((loc) => {
      const markerX = mapX + (loc.x / 100) * mapWidth;
      const markerY = mapY + (loc.y / 100) * mapHeight;

      const isCurrentLocation = loc.id === this.currentLocationId;
      
      // Marker container
      const markerContainer = this.scene.add.container(markerX, markerY);
      markerContainer.setScrollFactor(0).setDepth(3010);

      // Draw marker based on status
      const marker = this.scene.add.graphics();
      
      if (isCurrentLocation) {
        // Current location - large pulsing marker
        marker.fillStyle(loc.color, 0.4);
        marker.fillCircle(0, 0, 20);
        marker.fillStyle(loc.color, 0.7);
        marker.fillCircle(0, 0, 12);
        marker.fillStyle(loc.color, 1);
        marker.fillCircle(0, 0, 8);
        marker.fillStyle(0xffffff, 1);
        marker.fillCircle(0, 0, 4);

        // Add "YOU ARE HERE" label
        const youAreHere = this.scene.add.text(0, -30, '📍 YOU ARE HERE', {
          fontSize: '10px',
          color: '#e94560',
          fontStyle: 'bold',
          backgroundColor: '#000000',
          padding: { x: 4, y: 2 },
        }).setOrigin(0.5);
        markerContainer.add(youAreHere);

        // Pulse animation
        this.scene.tweens.add({
          targets: marker,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else if (loc.available) {
        // Available location
        marker.fillStyle(loc.color, 0.8);
        marker.fillCircle(0, 0, 8);
        marker.lineStyle(2, 0xffffff, 0.5);
        marker.strokeCircle(0, 0, 8);
      } else {
        // Locked/coming soon
        marker.fillStyle(loc.color, 0.3);
        marker.fillCircle(0, 0, 6);
        marker.lineStyle(1, loc.color, 0.5);
        marker.strokeCircle(0, 0, 6);
      }

      markerContainer.add(marker);

      // Location name on hover
      const nameLabel = this.scene.add.text(0, 18, loc.name, {
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5, 0).setVisible(false);
      markerContainer.add(nameLabel);

      // Status label
      if (!loc.available && !isCurrentLocation) {
        const statusLabel = this.scene.add.text(0, 32, '🔒 Coming Soon', {
          fontSize: '8px',
          color: '#888888',
        }).setOrigin(0.5, 0).setVisible(false);
        markerContainer.add(statusLabel);
      }

      // Make interactive
      const hitArea = this.scene.add.circle(0, 0, 15, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: loc.available || isCurrentLocation });
      
      hitArea.on('pointerover', () => {
        nameLabel.setVisible(true);
        if (!loc.available && !isCurrentLocation) {
          const statusLabel = markerContainer.getAt(3) as GameObjects.Text;
          if (statusLabel) statusLabel.setVisible(true);
        }
      });
      
      hitArea.on('pointerout', () => {
        nameLabel.setVisible(false);
        if (!loc.available && !isCurrentLocation) {
          const statusLabel = markerContainer.getAt(3) as GameObjects.Text;
          if (statusLabel) statusLabel.setVisible(false);
        }
      });

      hitArea.on('pointerdown', () => {
        if (loc.available && loc.id === 'ark-central') {
          // Navigate to town
          this.closeModal();
        }
      });

      markerContainer.add(hitArea);
      this.modalElements.push(markerContainer);
    });
  }

  private drawLegend(x: number, y: number): void {
    const legendItems = [
      { color: 0xe94560, label: 'Village' },
      { color: 0x27ae60, label: 'Fields' },
      { color: 0x9b59b6, label: 'Ruins' },
      { color: 0x3498db, label: 'Drydocks' },
      { color: 0xf39c12, label: 'Frontier' },
    ];

    const spacing = 100;
    const startX = x + 60;

    legendItems.forEach((item, index) => {
      const itemX = startX + index * spacing;
      
      const dot = this.scene.add.graphics();
      dot.fillStyle(item.color, 1);
      dot.fillCircle(itemX, y + 5, 5);
      dot.setScrollFactor(0).setDepth(3002);
      this.modalElements.push(dot);

      const label = this.scene.add.text(itemX + 12, y, item.label, {
        fontSize: '10px',
        color: '#aaaaaa',
      }).setScrollFactor(0).setDepth(3002);
      this.modalElements.push(label);
    });
  }

  private closeModal(): void {
    if (!this.isModalOpen) return;
    
    // Destroy all modal elements
    this.modalElements.forEach(el => el.destroy());
    this.modalElements = [];
    
    this.isModalOpen = false;
  }

  // Update current location (called when entering different areas)
  public setCurrentLocation(locationId: string): void {
    this.currentLocationId = locationId;
    this.updateLocationDot();
  }

  // Update player position indicator (for town view)
  public updatePlayerPosition(worldX: number, worldY: number): void {
    // This could be used to show exact player position within the current area
    // For now, we just show the area-level location
  }

  // Clean up
  public destroy(): void {
    this.closeModal();
    this.container?.destroy();
    if (this.miniMapCamera && this.scene?.cameras) {
      this.scene.cameras.remove(this.miniMapCamera);
    }
  }

  // Show/hide the minimap
  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
