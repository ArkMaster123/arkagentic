import { Actor } from './Actor';
import { DIRECTION } from '../utils';
import { COLOR_PRIMARY, AGENT_COLORS, AGENTS } from '../constants';
import { getIconSpan } from '../icons';
import eventsCenter from './EventCenter';
import { IAgentScene, isAgentScene } from '../types/scenes';
import type RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';
import type Label from 'phaser3-rex-plugins/templates/ui/label/Label';

type AgentType = keyof typeof AGENTS;

// Simple A* pathfinder
interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to end
  f: number; // Total cost
  parent: PathNode | null;
}

export class Agent extends Actor {
  public id: string;
  public agentType: AgentType;
  public direction: number = DIRECTION.DOWN;
  
  private textBox: Label | undefined;
  private nameTag: Phaser.GameObjects.Text | undefined;
  private isSpeaking: boolean = false;
  private thoughtBubble: Label | undefined;
  
  // Typing indicator (animated "..." above head)
  private typingIndicator: Phaser.GameObjects.Text | undefined;
  private typingTimer: Phaser.Time.TimerEvent | null = null;
  private typingDots: number = 1;
  
  // Grid-based movement
  private tileX: number = 0;
  private tileY: number = 0;
  private path: { x: number; y: number }[] = [];
  private isMovingToTile: boolean = false;
  private moveSpeed: number = 80; // pixels per second
  private targetWorldX: number = 0;
  private targetWorldY: number = 0;
  
  // Wandering behavior
  private isWandering: boolean = true;
  private wanderTimer: Phaser.Time.TimerEvent | null = null;
  private homeTileX: number = 0;
  private homeTileY: number = 0;
  private wanderRadius: number = 5; // tiles
  private isBusy: boolean = false; // true when responding to a query
  private isDestroyed: boolean = false; // prevent double-destroy crashes

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    agentType: AgentType,
    id: string
  ) {
    const agentConfig = AGENTS[agentType];
    super(scene, x, y, agentConfig.sprite);

    this.id = id;
    this.agentType = agentType;
    this.setName(agentConfig.name);
    
    // Calculate initial tile position (scene must implement IAgentScene)
    const agentScene = scene as IAgentScene;
    const tilePos = agentScene.worldToTile(x, y);
    this.tileX = tilePos.x;
    this.tileY = tilePos.y;
    
    // Snap to tile center
    const worldPos = agentScene.tileToWorld(this.tileX, this.tileY);
    this.setPosition(worldPos.x, worldPos.y);
    
    // Mark initial tile as occupied
    agentScene.occupyTile(this.tileX, this.tileY);
    
    // Store home position for wandering
    this.homeTileX = this.tileX;
    this.homeTileY = this.tileY;
    
    // Physics setup (minimal - just for sprite handling)
    this.getBody().setSize(14, 16);
    this.getBody().setOffset(0, 4);
    this.getBody().setImmovable(true); // Don't use physics for movement
    this.setOrigin(0.5, 0.5);

    this.initAnimations();
    this.createNameTag();
    this.listenToEvents();
    
    // Make agent interactive (clickable)
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      this.onClicked();
    });
    
    // Start wandering after a random delay
    this.scheduleNextWander();
  }
  
  /**
   * Called when the agent is clicked
   */
  private onClicked(): void {
    console.log(`[Agent] ${this.agentType} clicked`);
    
    // Emit event for scene to handle
    eventsCenter.emit('agent-clicked', { agentType: this.agentType, agent: this });
  }

  private createNameTag(): void {
    const agentConfig = AGENTS[this.agentType];
    this.nameTag = this.scene.add.text(
      this.x,
      this.y - 14,
      `${agentConfig.emoji} ${agentConfig.name}`,
      {
        fontSize: '8px',
        color: '#ffffff',
        backgroundColor: '#' + AGENT_COLORS[this.agentType].toString(16).padStart(6, '0'),
        padding: { x: 2, y: 1 },
      }
    ).setOrigin(0.5, 1);
  }

  private listenToEvents(): void {
    // Listen for movement commands (now expects tile coordinates or world coordinates)
    eventsCenter.on(`${this.id}-moveTo`, (target: { x: number; y: number }) => {
      this.moveToWorld(target.x, target.y);
    });

    // Listen for speak commands
    eventsCenter.on(`${this.id}-speak`, (text: string) => {
      this.speak(text);
    });

    // Listen for think commands
    eventsCenter.on(`${this.id}-think`, (text: string) => {
      this.think(text);
    });

    // Listen for direction changes
    eventsCenter.on(`${this.id}-up`, () => this.changeDirection(DIRECTION.UP));
    eventsCenter.on(`${this.id}-down`, () => this.changeDirection(DIRECTION.DOWN));
    eventsCenter.on(`${this.id}-left`, () => this.changeDirection(DIRECTION.LEFT));
    eventsCenter.on(`${this.id}-right`, () => this.changeDirection(DIRECTION.RIGHT));
  }

  update(): void {
    // Skip update if destroyed or scene is shutting down
    if (this.isDestroyed || !this.scene?.sys?.isActive()) {
      return;
    }
    
    // Handle grid-based movement
    if (this.isMovingToTile) {
      this.updateMovement();
    } else if (this.path.length > 0) {
      // Start moving to next tile in path
      this.moveToNextTile();
    }

    // Update animation based on movement state
    this.updateAnimation();

    // Update name tag position
    if (this.nameTag) {
      this.nameTag.setPosition(this.x, this.y - 14);
      this.nameTag.setDepth(this.y + 100);
    }

    // Update text box position
    this.updateTextBox();
    this.updateThoughtBubble();
    this.updateTypingIndicator();

    // Set depth for proper layering
    this.depth = this.y + 50;
  }

  private updateMovement(): void {
    const dx = this.targetWorldX - this.x;
    const dy = this.targetWorldY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      // Arrived at tile center
      this.x = this.targetWorldX;
      this.y = this.targetWorldY;
      this.isMovingToTile = false;
      
      // Check if we have more path to follow
      if (this.path.length === 0) {
        eventsCenter.emit(`${this.id}-arrived`);
      }
    } else {
      // Move towards target
      const speed = this.moveSpeed / 60; // Assuming 60fps, adjust as needed
      const moveX = (dx / dist) * Math.min(speed, dist);
      const moveY = (dy / dist) * Math.min(speed, dist);
      this.x += moveX;
      this.y += moveY;

      // Update direction based on movement
      if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT;
      } else {
        this.direction = dy > 0 ? DIRECTION.DOWN : DIRECTION.UP;
      }
    }
  }

  private moveToNextTile(): void {
    if (this.path.length === 0) return;

    const agentScene = this.scene as IAgentScene;
    const nextTile = this.path.shift()!;
    
    // Free current tile
    agentScene.freeTile(this.tileX, this.tileY);
    
    // Check if next tile is still walkable (another agent might have moved there)
    if (!agentScene.isTileWalkable(nextTile.x, nextTile.y)) {
      // Recalculate path
      if (this.path.length > 0) {
        const finalTarget = this.path[this.path.length - 1];
        this.path = [];
        this.moveToTile(finalTarget.x, finalTarget.y);
      }
      // Re-occupy current tile since we're not moving
      agentScene.occupyTile(this.tileX, this.tileY);
      return;
    }
    
    // Update tile position
    this.tileX = nextTile.x;
    this.tileY = nextTile.y;
    
    // Occupy new tile
    agentScene.occupyTile(this.tileX, this.tileY);
    
    // Set target world position
    const worldPos = agentScene.tileToWorld(this.tileX, this.tileY);
    this.targetWorldX = worldPos.x;
    this.targetWorldY = worldPos.y;
    this.isMovingToTile = true;
  }

  private updateAnimation(): void {
    const dirText = this.getDirectionText();
    const animKey = `${this.name}-walk-${dirText}`;
    
    if (this.isMovingToTile || this.path.length > 0) {
      this.anims.play(animKey, true);
    } else {
      // Idle - show first frame of walk animation
      if (this.anims.currentAnim?.key !== animKey) {
        this.anims.play(animKey, true);
      }
      if (this.anims.isPlaying) {
        this.anims.setCurrentFrame(this.anims.currentAnim!.frames[0]);
      }
    }
  }

  private getDirectionText(): string {
    switch (this.direction) {
      case DIRECTION.UP: return 'up';
      case DIRECTION.DOWN: return 'down';
      case DIRECTION.LEFT: return 'left';
      case DIRECTION.RIGHT: return 'right';
      default: return 'down';
    }
  }

  public changeDirection(direction: number): void {
    if (direction !== undefined) {
      this.direction = direction;
    }
  }

  // Move to a world position (converts to tile and pathfinds)
  public moveToWorld(worldX: number, worldY: number): void {
    const agentScene = this.scene as IAgentScene;
    const targetTile = agentScene.worldToTile(worldX, worldY);
    this.moveToTile(targetTile.x, targetTile.y);
  }

  // Move to a specific tile using A* pathfinding
  public moveToTile(targetTileX: number, targetTileY: number): void {
    const agentScene = this.scene as IAgentScene;
    
    // Don't pathfind if already at destination
    if (this.tileX === targetTileX && this.tileY === targetTileY) {
      eventsCenter.emit(`${this.id}-arrived`);
      return;
    }

    // Find path using A*
    this.path = this.findPath(
      this.tileX, this.tileY,
      targetTileX, targetTileY,
      agentScene
    );

    if (this.path.length === 0) {
      console.log(`${this.id}: No path found to (${targetTileX}, ${targetTileY})`);
      // Try to find nearest walkable tile
      const nearestWalkable = this.findNearestWalkable(targetTileX, targetTileY, agentScene);
      if (nearestWalkable) {
        this.path = this.findPath(
          this.tileX, this.tileY,
          nearestWalkable.x, nearestWalkable.y,
          agentScene
        );
      }
    }

    // Remove the starting tile from path (we're already there)
    if (this.path.length > 0 && this.path[0].x === this.tileX && this.path[0].y === this.tileY) {
      this.path.shift();
    }
  }

  // A* pathfinding implementation
  private findPath(
    startX: number, startY: number,
    endX: number, endY: number,
    scene: IAgentScene
  ): { x: number; y: number }[] {
    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();
    
    const heuristic = (x: number, y: number) => {
      return Math.abs(x - endX) + Math.abs(y - endY); // Manhattan distance
    };

    const startNode: PathNode = {
      x: startX,
      y: startY,
      g: 0,
      h: heuristic(startX, startY),
      f: heuristic(startX, startY),
      parent: null,
    };

    openSet.push(startNode);

    const directions = [
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 },  // Right
    ];

    let iterations = 0;
    const maxIterations = 1000; // Prevent infinite loops

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;
      
      // Find node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      
      // Check if we reached the goal
      if (current.x === endX && current.y === endY) {
        // Reconstruct path
        const path: { x: number; y: number }[] = [];
        let node: PathNode | null = current;
        while (node) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        return path;
      }

      closedSet.add(`${current.x},${current.y}`);

      // Check neighbors
      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const key = `${nx},${ny}`;

        if (closedSet.has(key)) continue;
        
        // Check if walkable (or is the destination - agents can pathfind TO occupied tiles)
        const isDestination = nx === endX && ny === endY;
        if (!scene.isTileWalkable(nx, ny) && !isDestination) continue;

        const g = current.g + 1;
        const h = heuristic(nx, ny);
        const f = g + h;

        // Check if already in open set with better score
        const existingIndex = openSet.findIndex(n => n.x === nx && n.y === ny);
        if (existingIndex !== -1) {
          if (openSet[existingIndex].g <= g) continue;
          openSet.splice(existingIndex, 1);
        }

        openSet.push({
          x: nx,
          y: ny,
          g,
          h,
          f,
          parent: current,
        });
      }
    }

    // No path found
    return [];
  }

  // Find nearest walkable tile to target
  private findNearestWalkable(
    targetX: number, targetY: number,
    scene: IAgentScene
  ): { x: number; y: number } | null {
    const maxRadius = 10;
    
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          
          const nx = targetX + dx;
          const ny = targetY + dy;
          
          if (scene.isTileWalkable(nx, ny)) {
            return { x: nx, y: ny };
          }
        }
      }
    }
    
    return null;
  }

  public stopMoving(): void {
    this.path = [];
    this.isMovingToTile = false;
  }

  public getIsMoving(): boolean {
    return this.isMovingToTile || this.path.length > 0;
  }

  public getTilePosition(): { x: number; y: number } {
    return { x: this.tileX, y: this.tileY };
  }

  // ========== Wandering Behavior ==========
  
  private scheduleNextWander(): void {
    if (this.wanderTimer) {
      this.wanderTimer.destroy();
    }
    
    // Random delay between 2-6 seconds
    const delay = 2000 + Math.random() * 4000;
    
    this.wanderTimer = this.scene.time.delayedCall(delay, () => {
      if (this.isWandering && !this.isBusy && !this.getIsMoving()) {
        this.wanderToRandomTile();
      }
      // Schedule next wander
      this.scheduleNextWander();
    });
  }

  private wanderToRandomTile(): void {
    const agentScene = this.scene as IAgentScene;
    
    // Pick a random tile within wander radius of home
    const attempts = 10;
    for (let i = 0; i < attempts; i++) {
      const offsetX = Math.floor(Math.random() * (this.wanderRadius * 2 + 1)) - this.wanderRadius;
      const offsetY = Math.floor(Math.random() * (this.wanderRadius * 2 + 1)) - this.wanderRadius;
      
      const targetX = this.homeTileX + offsetX;
      const targetY = this.homeTileY + offsetY;
      
      // Check if tile is walkable and not current position
      if (agentScene.isTileWalkable(targetX, targetY) && 
          (targetX !== this.tileX || targetY !== this.tileY)) {
        this.moveToTile(targetX, targetY);
        return;
      }
    }
    // Couldn't find a valid tile, will try again next cycle
  }

  // Called when agent is needed for a task
  public summon(): void {
    this.isBusy = true;
    this.isWandering = false;
    this.stopMoving();
  }

  // Called when agent is done with task
  public release(): void {
    this.isBusy = false;
    // Return home first, then resume wandering
    this.moveToTile(this.homeTileX, this.homeTileY);
    
    // Resume wandering after returning home
    this.scene.time.delayedCall(3000, () => {
      this.isWandering = true;
    });
  }

  // Update home position (for when agent moves to new area)
  public setHomePosition(tileX: number, tileY: number): void {
    this.homeTileX = tileX;
    this.homeTileY = tileY;
  }

  public speak(text: string): void {
    this.destroyTextBox();
    this.isSpeaking = true;

    const agentScene = this.scene as IAgentScene;
    const rexUI = agentScene.rexUI as RexUIPlugin;
    const scale = this.scene.cameras.main.zoom;

    this.textBox = rexUI.add
      .label({
        x: this.x,
        y: this.y - 20,
        width: 120,
        orientation: 'x',
        background: rexUI.add.roundRectangle(
          0, 0, 2, 2, 10,
          AGENT_COLORS[this.agentType],
          0.9
        ),
        text: rexUI.wrapExpandText(
          agentScene.add.text(0, 0, text, {
            fontSize: '10px',
            wordWrap: { width: 100 },
          })
        ),
        expandTextWidth: true,
        space: { left: 8, right: 8, top: 6, bottom: 6 },
      })
      .setOrigin(0.5, 1)
      .setScale(1 / scale)
      .layout();

    // Auto-hide after a while
    this.scene.time.delayedCall(5000, () => {
      this.destroyTextBox();
    });
  }

  public think(text: string): void {
    this.destroyThoughtBubble();

    const agentScene = this.scene as IAgentScene;
    const rexUI = agentScene.rexUI as RexUIPlugin;
    const scale = this.scene.cameras.main.zoom;

    this.thoughtBubble = rexUI.add
      .label({
        x: this.x,
        y: this.y - 16,
        width: 80,
        background: rexUI.add.roundRectangle(
          0, 0, 2, 2, 8,
          0x333333,
          0.7
        ),
        text: agentScene.add.text(0, 0, `💭 ${text}`, {
          fontSize: '8px',
          color: '#ffffff',
        }),
        space: { left: 4, right: 4, top: 4, bottom: 4 },
      })
      .setOrigin(0.5, 1)
      .setScale(1 / scale)
      .layout();

    // Auto-hide after a while
    this.scene.time.delayedCall(3000, () => {
      this.destroyThoughtBubble();
    });
  }

  private updateTextBox(): void {
    if (!this.textBox) return;
    this.textBox.setPosition(this.x, this.y - 20);
    this.textBox.setDepth(this.y + 200);
  }

  private updateThoughtBubble(): void {
    if (!this.thoughtBubble) return;
    this.thoughtBubble.setPosition(this.x, this.y - 16);
    this.thoughtBubble.setDepth(this.y + 200);
  }

  public destroyTextBox(): void {
    if (this.textBox) {
      this.textBox.destroy();
      this.textBox = undefined;
    }
    this.isSpeaking = false;
  }

  public destroyThoughtBubble(): void {
    if (this.thoughtBubble) {
      this.thoughtBubble.destroy();
      this.thoughtBubble = undefined;
    }
  }

  // ========== Typing Indicator (animated "...") ==========
  
  /**
   * Show animated typing indicator above agent's head
   * Classic RPG style "..." that animates while AI is thinking
   */
  public showTypingIndicator(): void {
    // Clean up existing indicator if any
    this.hideTypingIndicator();
    
    const agentColor = AGENT_COLORS[this.agentType];
    
    // Create the typing indicator text
    this.typingIndicator = this.scene.add.text(
      this.x,
      this.y - 24,
      '.',
      {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#' + agentColor.toString(16).padStart(6, '0'),
        padding: { x: 8, y: 4 },
      }
    ).setOrigin(0.5, 1);
    
    this.typingDots = 1;
    
    // Animate the dots: . → .. → ... → . (loop)
    this.typingTimer = this.scene.time.addEvent({
      delay: 400,
      callback: () => {
        if (!this.typingIndicator) return;
        
        this.typingDots = (this.typingDots % 3) + 1;
        this.typingIndicator.setText('.'.repeat(this.typingDots));
      },
      loop: true,
    });
  }
  
  /**
   * Hide the typing indicator
   */
  public hideTypingIndicator(): void {
    if (this.typingTimer) {
      this.typingTimer.destroy();
      this.typingTimer = null;
    }
    
    if (this.typingIndicator) {
      this.typingIndicator.destroy();
      this.typingIndicator = undefined;
    }
  }
  
  /**
   * Check if typing indicator is showing
   */
  public isTyping(): boolean {
    return this.typingIndicator !== undefined;
  }
  
  private updateTypingIndicator(): void {
    if (!this.typingIndicator) return;
    this.typingIndicator.setPosition(this.x, this.y - 24);
    this.typingIndicator.setDepth(this.y + 200);
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  destroy(fromScene?: boolean): void {
    // Prevent double-destroy which can happen when scene shuts down
    if (this.isDestroyed) {
      return;
    }
    this.isDestroyed = true;
    
    // Free the tile we're occupying (only if scene is still valid and implements IAgentScene)
    // Check scene.sys exists to ensure scene hasn't started shutting down
    if (this.scene?.sys?.isActive() && isAgentScene(this.scene)) {
      try {
        this.scene.freeTile(this.tileX, this.tileY);
      } catch (e) {
        // Scene may be in partial shutdown state, ignore errors
      }
    }
    
    // Stop wandering timer
    if (this.wanderTimer) {
      this.wanderTimer.destroy();
      this.wanderTimer = null;
    }
    
    this.destroyTextBox();
    this.destroyThoughtBubble();
    this.hideTypingIndicator();
    if (this.nameTag) {
      this.nameTag.destroy();
    }
    // Clean up ALL event listeners (must match those registered in constructor)
    eventsCenter.off(`${this.id}-moveTo`);
    eventsCenter.off(`${this.id}-speak`);
    eventsCenter.off(`${this.id}-think`);
    eventsCenter.off(`${this.id}-up`);
    eventsCenter.off(`${this.id}-down`);
    eventsCenter.off(`${this.id}-left`);
    eventsCenter.off(`${this.id}-right`);
    super.destroy(fromScene);
  }
}
