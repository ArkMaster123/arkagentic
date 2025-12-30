import { Actor } from './Actor';
import { DIRECTION } from '../utils';
import { COLOR_PRIMARY, AGENT_COLORS, AGENTS } from '../constants';
import eventsCenter from './EventCenter';
import type { TownScene } from '../scenes/TownScene';
import type RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';

type AgentType = keyof typeof AGENTS;

export class Agent extends Actor {
  public id: string;
  public agentType: AgentType;
  public direction: number = DIRECTION.DOWN;
  
  private textBox: any = undefined;
  private nameTag: Phaser.GameObjects.Text | undefined;
  private isMoving: boolean = false;
  private targetX: number = 0;
  private targetY: number = 0;
  private moveSpeed: number = 60;
  private isSpeaking: boolean = false;
  private thoughtBubble: any = undefined;

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
    
    // Physics setup
    this.getBody().setSize(14, 16);
    this.getBody().setOffset(0, 4);
    this.getBody().setImmovable(false);
    this.setOrigin(0, 0.2);

    this.initAnimations();
    this.createNameTag();
    this.listenToEvents();
  }

  private createNameTag(): void {
    const agentConfig = AGENTS[this.agentType];
    this.nameTag = this.scene.add.text(
      this.x + this.width / 2,
      this.y - 10,
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
    // Listen for movement commands
    eventsCenter.on(`${this.id}-moveTo`, (x: number, y: number) => {
      this.moveTo(x, y);
    });

    // Listen for speak commands
    eventsCenter.on(`${this.id}-speak`, (text: string) => {
      this.speak(text);
    });

    // Listen for think commands (smaller bubble)
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
    // Handle movement
    if (this.isMoving) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        // Arrived at destination
        this.isMoving = false;
        this.setVelocity(0, 0);
        eventsCenter.emit(`${this.id}-arrived`);
      } else {
        // Move towards target
        const vx = (dx / dist) * this.moveSpeed;
        const vy = (dy / dist) * this.moveSpeed;
        this.setVelocity(vx, vy);

        // Update direction based on movement
        if (Math.abs(dx) > Math.abs(dy)) {
          this.changeDirection(dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT);
        } else {
          this.changeDirection(dy > 0 ? DIRECTION.DOWN : DIRECTION.UP);
        }
      }
    }

    // Update animation
    const dirText = this.getDirectionText();
    this.anims.play(`${this.name}-walk-${dirText}`, true);
    
    if (this.anims.isPlaying && !this.isMoving) {
      // Stop on first frame when idle
      this.anims.setCurrentFrame(this.anims.currentAnim!.frames[0]);
    }

    // Update name tag position
    if (this.nameTag) {
      this.nameTag.setPosition(this.x + this.width / 2, this.y - 10);
      this.nameTag.setDepth(this.y + this.height * 0.8 + 1);
    }

    // Update text box position
    this.updateTextBox();
    this.updateThoughtBubble();

    // Set depth for proper layering
    this.depth = this.y + this.height * 0.8;
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

  public moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    this.isMoving = true;
  }

  public stopMoving(): void {
    this.isMoving = false;
    this.setVelocity(0, 0);
  }

  public getIsMoving(): boolean {
    return this.isMoving;
  }

  public speak(text: string): void {
    this.destroyTextBox();
    this.isSpeaking = true;

    const scene = this.scene as TownScene;
    const rexUI = scene.rexUI as RexUIPlugin;
    const scale = this.scene.cameras.main.zoom;

    this.textBox = rexUI.add
      .label({
        x: this.x + this.width / 2,
        y: this.y - this.height * 0.3,
        width: 120,
        orientation: 'x',
        background: rexUI.add.roundRectangle(
          0, 0, 2, 2, 10,
          AGENT_COLORS[this.agentType],
          0.9
        ),
        text: rexUI.wrapExpandText(
          scene.add.text(0, 0, text, {
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

    const scene = this.scene as TownScene;
    const rexUI = scene.rexUI as RexUIPlugin;
    const scale = this.scene.cameras.main.zoom;

    this.thoughtBubble = rexUI.add
      .label({
        x: this.x + this.width / 2,
        y: this.y - this.height * 0.2,
        width: 80,
        background: rexUI.add.roundRectangle(
          0, 0, 2, 2, 8,
          0x333333,
          0.7
        ),
        text: scene.add.text(0, 0, `💭 ${text}`, {
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
    const scale = this.scene.cameras.main.zoom;
    this.textBox.setPosition(this.x + this.width / 2, this.y - this.height * 0.3);
    this.textBox.setDepth(this.y + this.height * 0.8 + 2);
  }

  private updateThoughtBubble(): void {
    if (!this.thoughtBubble) return;
    const scale = this.scene.cameras.main.zoom;
    this.thoughtBubble.setPosition(this.x + this.width / 2, this.y - this.height * 0.2);
    this.thoughtBubble.setDepth(this.y + this.height * 0.8 + 2);
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

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  destroy(fromScene?: boolean): void {
    this.destroyTextBox();
    this.destroyThoughtBubble();
    if (this.nameTag) {
      this.nameTag.destroy();
    }
    eventsCenter.off(`${this.id}-moveTo`);
    eventsCenter.off(`${this.id}-speak`);
    eventsCenter.off(`${this.id}-think`);
    super.destroy(fromScene);
  }
}
