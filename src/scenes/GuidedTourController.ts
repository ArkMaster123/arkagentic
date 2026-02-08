import { GameObjects, Scene } from 'phaser';

/** Tour stop definition */
interface TourStop {
  name: string;
  walkX: number;
  walkY: number;
  facing: string;
  title: string;
  narration: string;
  pauseMs: number;
}

/** Pathfinding node */
interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

enum TourState {
  IDLE,
  WALKING,
  NARRATING,
}

/** Scene interface — ChatbotRuinsScene public methods we need */
interface ITourScene extends Scene {
  isTileWalkable(tileX: number, tileY: number): boolean;
  worldToTile(worldX: number, worldY: number): { x: number; y: number };
  tileToWorld(tileX: number, tileY: number): { x: number; y: number };
  playerRef: Phaser.GameObjects.Sprite | null;
}

// Tour stops: ordered bottom-to-top (entrance → top of museum)
const TOUR_STOPS: TourStop[] = [
  {
    name: 'intro',
    walkX: 320, walkY: 4352,
    facing: 'up',
    title: 'Museum Guide',
    narration: "Wonderful! Follow me — I'll walk you through the entire history of large language models. Let's begin!",
    pauseMs: 5000,
  },
  {
    name: 'welcome',
    walkX: 304, walkY: 3984,
    facing: 'left',
    title: 'Museum Guide',
    narration: "Welcome to the Chatbot Ruins — a museum dedicated to the models that learned to speak. Each exhibit marks a milestone from simple word prediction to human-level reasoning.",
    pauseMs: 7000,
  },
  {
    name: 'transformers',
    walkX: 256, walkY: 3696,
    facing: 'left',
    title: 'Museum Guide',
    narration: '"Attention Is All You Need" — eight Google researchers published a paper that would reshape AI forever. The Transformer replaced sequential processing with parallel self-attention.',
    pauseMs: 7000,
  },
  {
    name: 'bert',
    walkX: 352, walkY: 3696,
    facing: 'right',
    title: 'Museum Guide',
    narration: "Google's BERT proved that pre-training on massive text, then fine-tuning for tasks, could crush every NLP benchmark. Bidirectional understanding was the key breakthrough.",
    pauseMs: 6000,
  },
  {
    name: 'gpt2',
    walkX: 256, walkY: 3408,
    facing: 'left',
    title: 'Museum Guide',
    narration: 'OpenAI trained a 1.5 billion parameter model and initially refused to release it — calling it "too dangerous." The debate about AI safety began here.',
    pauseMs: 6000,
  },
  {
    name: 't5',
    walkX: 352, walkY: 3408,
    facing: 'right',
    title: 'Museum Guide',
    narration: "Google's T5 unified every NLP task into text-to-text format. Translation, summarization, Q&A — everything became 'give me text, I'll give you text back.'",
    pauseMs: 6000,
  },
  {
    name: 'gpt3',
    walkX: 256, walkY: 3120,
    facing: 'left',
    title: 'Museum Guide',
    narration: "175 billion parameters. Few-shot learning emerged — you could teach the model new tasks with just a few examples. The scaling era had begun.",
    pauseMs: 6000,
  },
  {
    name: 'dalle',
    walkX: 352, walkY: 3120,
    facing: 'right',
    title: 'Museum Guide',
    narration: "Named after Dali and WALL-E, DALL-E proved language models could generate images from text descriptions. AI creativity entered a new dimension.",
    pauseMs: 6000,
  },
  {
    name: 'chatgpt',
    walkX: 304, walkY: 2768,
    facing: 'up',
    title: 'Museum Guide',
    narration: "The tipping point. 100 million users in two months. ChatGPT brought AI out of research labs and into everyone's daily life. Nothing would be the same again.",
    pauseMs: 8000,
  },
  {
    name: 'llama',
    walkX: 256, walkY: 2480,
    facing: 'left',
    title: 'Museum Guide',
    narration: "Meta released LLaMA's weights to researchers, and soon the whole world had them. The open-source AI revolution was unstoppable.",
    pauseMs: 6000,
  },
  {
    name: 'gpt4',
    walkX: 352, walkY: 2480,
    facing: 'right',
    title: 'Museum Guide',
    narration: "Multimodal reasoning arrived. GPT-4 could understand images, pass the bar exam, and write production code. The gap between AI and human narrowed dramatically.",
    pauseMs: 7000,
  },
  {
    name: 'claude',
    walkX: 256, walkY: 2192,
    facing: 'left',
    title: 'Museum Guide',
    narration: "Anthropic introduced Constitutional AI — teaching models to be helpful, harmless, and honest through self-critique. A different philosophy for safe intelligence.",
    pauseMs: 6000,
  },
  {
    name: 'gemini',
    walkX: 352, walkY: 2192,
    facing: 'right',
    title: 'Museum Guide',
    narration: "Google merged Brain and DeepMind to create Gemini — natively multimodal from the ground up. Text, images, audio, and video in a single model.",
    pauseMs: 6000,
  },
  {
    name: 'mistral',
    walkX: 256, walkY: 1904,
    facing: 'left',
    title: 'Museum Guide',
    narration: "From Paris, Mistral proved European AI could compete with giants. Their efficient open-weights models punched far above their parameter count.",
    pauseMs: 6000,
  },
  {
    name: 'grok',
    walkX: 352, walkY: 1904,
    facing: 'right',
    title: 'Museum Guide',
    narration: "Elon Musk's xAI built Grok with real-time access to Twitter/X data. A different approach: an AI that's up-to-the-minute current.",
    pauseMs: 6000,
  },
  {
    name: 'deepseek',
    walkX: 256, walkY: 1616,
    facing: 'left',
    title: 'Museum Guide',
    narration: "Chinese innovation showed that frontier performance didn't require frontier budgets. DeepSeek's efficient training methods surprised the world.",
    pauseMs: 6000,
  },
  {
    name: 'llama3',
    walkX: 352, walkY: 1616,
    facing: 'right',
    title: 'Museum Guide',
    narration: "Meta went all-in with a 405 billion parameter model released freely. The largest open-weights model ever, rivaling proprietary systems.",
    pauseMs: 6000,
  },
  {
    name: 'reasoning',
    walkX: 304, walkY: 1264,
    facing: 'up',
    title: 'Museum Guide',
    narration: "Claude 3.5, GPT-4o, Gemini Ultra — models that think, plan, and reason. We stand at the frontier. What comes next is up to all of us.",
    pauseMs: 8000,
  },
];

export class GuidedTourController {
  private scene: ITourScene;
  private guide!: GameObjects.Sprite;
  private guideNameTag!: GameObjects.Text;
  private state: TourState = TourState.IDLE;
  private currentStopIndex: number = -1;
  private narrationPanel: GameObjects.Container | null = null;
  private autoAdvanceTimer: Phaser.Time.TimerEvent | null = null;
  private exitButton: GameObjects.Container | null = null;
  private choicePanel: GameObjects.Container | null = null;
  private choiceKeyboardHandler: ((event: KeyboardEvent) => void) | null = null;

  // A* pathfinding
  private path: { x: number; y: number }[] = [];
  private isMovingToTile: boolean = false;
  private targetWorldX: number = 0;
  private targetWorldY: number = 0;
  private tileX: number = 0;
  private tileY: number = 0;
  private readonly MOVE_SPEED = 90;
  private readonly TILE_SIZE = 32;
  private guideDirection: string = 'down';

  // Callbacks
  public onTourEnd: (() => void) | null = null;
  public onTourDeclined: (() => void) | null = null;

  constructor(scene: ITourScene) {
    this.scene = scene;
  }

  /** Get current camera viewport in world coordinates using getWorldPoint for accuracy at any zoom */
  private getViewport() {
    const cam = this.scene.cameras.main;
    const tl = cam.getWorldPoint(0, 0);
    const br = cam.getWorldPoint(cam.width, cam.height);
    return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
  }

  /**
   * Spawn the guide NPC standing near the player at the entrance.
   * Called immediately in create() — guide is visible before any choice.
   */
  spawnGuide(): void {
    // Spawn guide just above the player spawn, facing down toward the player
    const guideX = 320;
    const guideY = 4352; // one tile above player spawn (4384)

    this.guide = this.scene.add.sprite(guideX, guideY, 'joseph', 0);
    this.guide.setDepth(15);

    // Create guide animations
    const dirs = ['down', 'up', 'left', 'right'];
    const frameStarts = [0, 3, 6, 9];
    dirs.forEach((dir, i) => {
      const walkKey = `guide-walk-${dir}`;
      if (!this.scene.anims.exists(walkKey)) {
        this.scene.anims.create({
          key: walkKey,
          frames: this.scene.anims.generateFrameNumbers('joseph', {
            start: frameStarts[i],
            end: frameStarts[i] + 2,
          }),
          frameRate: 8,
          repeat: -1,
        });
      }
    });

    // Name tag
    this.guideNameTag = this.scene.add.text(guideX, guideY - 18, 'Museum Guide', {
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: '#8e44adcc',
      padding: { x: 3, y: 1 },
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5, 1).setDepth(20);

    // Track tile position
    const tile = this.scene.worldToTile(guideX, guideY);
    this.tileX = tile.x;
    this.tileY = tile.y;
  }

  /**
   * Show Pokemon-style dialogue box at the bottom of the screen.
   * Guide asks if the player wants a tour, with Yes/No options.
   */
  showChoiceDialog(): void {
    const vp = this.getViewport();

    // Full-width bottom panel in world coords
    const panelH = 60;
    const panelTop = vp.y + vp.h - panelH;
    const panelLeft = vp.x;
    const panelW = vp.w;

    this.choicePanel = this.scene.add.container(0, 0);
    this.choicePanel.setDepth(3000);

    // Background — full-width dark RPG dialogue box at bottom
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f0f23, 0.95);
    bg.fillRect(panelLeft, panelTop, panelW, panelH);
    bg.lineStyle(2, 0x9b59b6, 0.8);
    bg.strokeRect(panelLeft, panelTop, panelW, panelH);

    // Speaker name tab (floats above the panel, left side)
    const nameTabW = 90;
    const nameTabH = 16;
    const nameTab = this.scene.add.graphics();
    nameTab.fillStyle(0x0f0f23, 0.95);
    nameTab.fillRoundedRect(panelLeft + 8, panelTop - nameTabH + 2, nameTabW, nameTabH, { tl: 4, tr: 4, bl: 0, br: 0 });
    nameTab.lineStyle(2, 0x9b59b6, 0.8);
    nameTab.strokeRoundedRect(panelLeft + 8, panelTop - nameTabH + 2, nameTabW, nameTabH, { tl: 4, tr: 4, bl: 0, br: 0 });
    nameTab.fillStyle(0x0f0f23, 0.95);
    nameTab.fillRect(panelLeft + 10, panelTop, nameTabW - 4, 3);

    const nameText = this.scene.add.text(panelLeft + 8 + nameTabW / 2, panelTop - nameTabH / 2 + 2, 'Museum Guide', {
      fontSize: '9px',
      color: '#e0c0f0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Dialogue text
    const msgText = this.scene.add.text(panelLeft + 14, panelTop + 10, "Hello there, traveler! Welcome to the\nChatbot Ruins Museum.\nWould you like a guided tour?", {
      fontSize: '9px',
      color: '#e8eaed',
      lineSpacing: 4,
      wordWrap: { width: panelW - 90 },
    });

    this.choicePanel.add([bg, nameTab, nameText, msgText]);

    // Yes/No choice box (top-right, floats above panel — Pokemon-style)
    const choiceW = 60;
    const choiceH = 40;
    const choiceX = panelLeft + panelW - choiceW / 2 - 8;
    const choiceTopY = panelTop - choiceH + 2;

    const choiceBg = this.scene.add.graphics();
    choiceBg.fillStyle(0x0f0f23, 0.95);
    choiceBg.fillRoundedRect(choiceX - choiceW / 2, choiceTopY, choiceW, choiceH, 4);
    choiceBg.lineStyle(2, 0x9b59b6, 0.8);
    choiceBg.strokeRoundedRect(choiceX - choiceW / 2, choiceTopY, choiceW, choiceH, 4);

    // Yes option
    const yesY = choiceTopY + 12;
    const yesText = this.scene.add.text(choiceX + 4, yesY, 'Yes', {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const yesCursor = this.scene.add.text(choiceX - 18, yesY, '\u25B6', {
      fontSize: '8px',
      color: '#ffd700',
    }).setOrigin(0.5);

    const yesHit = this.scene.add.rectangle(choiceX, yesY, choiceW - 4, 16, 0x000000, 0);
    yesHit.setInteractive({ useHandCursor: true });

    // No option
    const noY = choiceTopY + 28;
    const noText = this.scene.add.text(choiceX + 4, noY, 'No', {
      fontSize: '10px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    const noCursor = this.scene.add.text(choiceX - 18, noY, '\u25B6', {
      fontSize: '8px',
      color: '#ffd700',
    }).setOrigin(0.5).setAlpha(0);

    const noHit = this.scene.add.rectangle(choiceX, noY, choiceW - 4, 16, 0x000000, 0);
    noHit.setInteractive({ useHandCursor: true });

    // Hover effects — move cursor arrow
    yesHit.on('pointerover', () => {
      yesCursor.setAlpha(1);
      noCursor.setAlpha(0);
      yesText.setColor('#ffffff');
      noText.setColor('#aaaaaa');
    });
    noHit.on('pointerover', () => {
      yesCursor.setAlpha(0);
      noCursor.setAlpha(1);
      yesText.setColor('#aaaaaa');
      noText.setColor('#ffffff');
    });

    // Click handlers
    const selectYes = () => {
      this.removeChoiceKeyboardListeners();
      this.choicePanel?.destroy();
      this.choicePanel = null;
      this.beginTour();
    };
    const selectNo = () => {
      this.removeChoiceKeyboardListeners();
      this.choicePanel?.destroy();
      this.choicePanel = null;
      this.declineTour();
    };

    yesHit.on('pointerdown', selectYes);
    noHit.on('pointerdown', selectNo);

    this.choicePanel.add([choiceBg, yesText, yesCursor, yesHit, noText, noCursor, noHit]);

    // Blinking cursor animation
    this.scene.tweens.add({
      targets: yesCursor,
      alpha: { from: 1, to: 0.3 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Keyboard support — arrow keys to select, Enter/Space to confirm
    let selectedIndex = 0; // 0 = Yes, 1 = No

    const updateSelection = () => {
      if (selectedIndex === 0) {
        yesCursor.setAlpha(1);
        noCursor.setAlpha(0);
        yesText.setColor('#ffffff');
        noText.setColor('#aaaaaa');
      } else {
        yesCursor.setAlpha(0);
        noCursor.setAlpha(1);
        yesText.setColor('#aaaaaa');
        noText.setColor('#ffffff');
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
        selectedIndex = 0;
        updateSelection();
      } else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
        selectedIndex = 1;
        updateSelection();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (selectedIndex === 0) selectYes();
        else selectNo();
      }
    };

    this.scene.input.keyboard?.on('keydown', onKeyDown);
    this.choiceKeyboardHandler = onKeyDown;

    // Fade in
    this.choicePanel.setAlpha(0);
    this.scene.tweens.add({
      targets: this.choicePanel,
      alpha: 1,
      duration: 400,
      ease: 'Power2',
    });
  }

  private removeChoiceKeyboardListeners(): void {
    if (this.choiceKeyboardHandler) {
      this.scene.input.keyboard?.off('keydown', this.choiceKeyboardHandler);
      this.choiceKeyboardHandler = null;
    }
  }

  private declineTour(): void {
    // Guide says goodbye, then disappears
    this.showDialogueBox('Museum Guide', "No worries! Feel free to explore on your own. Enjoy the museum!", () => {
      this.cleanupGuide();
      if (this.onTourDeclined) this.onTourDeclined();
    });
  }

  private beginTour(): void {
    // Switch camera to guide
    this.switchCameraToGuide();

    // Create exit tour button
    this.createExitTourButton();

    // Start the tour
    this.state = TourState.IDLE;
    this.advanceToNextStop();
  }

  /** Show a simple Pokemon-style dialogue box at screen bottom. Closes on click or Enter. */
  private showDialogueBox(speaker: string, text: string, onClose: () => void): void {
    const vp = this.getViewport();

    const panelH = 56;
    const panelTop = vp.y + vp.h - panelH;
    const panelLeft = vp.x;
    const panelW = vp.w;

    const panel = this.scene.add.container(0, 0);
    panel.setDepth(3000);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f0f23, 0.95);
    bg.fillRect(panelLeft, panelTop, panelW, panelH);
    bg.lineStyle(2, 0x9b59b6, 0.8);
    bg.strokeRect(panelLeft, panelTop, panelW, panelH);

    // Speaker name tab
    const nameTabW = 90;
    const nameTabH = 16;
    const nameTab = this.scene.add.graphics();
    nameTab.fillStyle(0x0f0f23, 0.95);
    nameTab.fillRoundedRect(panelLeft + 8, panelTop - nameTabH + 2, nameTabW, nameTabH, { tl: 4, tr: 4, bl: 0, br: 0 });
    nameTab.lineStyle(2, 0x9b59b6, 0.8);
    nameTab.strokeRoundedRect(panelLeft + 8, panelTop - nameTabH + 2, nameTabW, nameTabH, { tl: 4, tr: 4, bl: 0, br: 0 });
    nameTab.fillStyle(0x0f0f23, 0.95);
    nameTab.fillRect(panelLeft + 10, panelTop, nameTabW - 4, 3);

    const nameText = this.scene.add.text(panelLeft + 8 + nameTabW / 2, panelTop - nameTabH / 2 + 2, speaker, {
      fontSize: '9px',
      color: '#e0c0f0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const msgText = this.scene.add.text(panelLeft + 14, panelTop + 10, text, {
      fontSize: '9px',
      color: '#e8eaed',
      wordWrap: { width: panelW - 28 },
      lineSpacing: 4,
    });

    // Blinking advance indicator
    const advanceIndicator = this.scene.add.text(panelLeft + panelW - 14, vp.y + vp.h - 12, '\u25BC', {
      fontSize: '8px',
      color: '#9b59b6',
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: advanceIndicator,
      y: vp.y + vp.h - 8,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    panel.add([bg, nameTab, nameText, msgText, advanceIndicator]);

    panel.setAlpha(0);
    this.scene.tweens.add({
      targets: panel,
      alpha: 1,
      duration: 300,
    });

    // Click or Enter to dismiss
    const dismiss = () => {
      this.scene.input.keyboard?.off('keydown', keyDismiss);
      panel.destroy();
      onClose();
    };
    const keyDismiss = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.scene.input.off('pointerdown', dismiss);
        dismiss();
      }
    };
    this.scene.time.delayedCall(300, () => {
      this.scene.input.once('pointerdown', dismiss);
      this.scene.input.keyboard?.on('keydown', keyDismiss);
    });
  }

  update(): void {
    if (this.state === TourState.IDLE) return;

    if (this.state === TourState.WALKING) {
      this.updateGuideMovement();
    }

    // Keep name tag synced
    if (this.guide && this.guideNameTag && this.guide.active) {
      this.guideNameTag.setPosition(this.guide.x, this.guide.y - 18);
    }

    // Reposition exit button to follow camera
    if (this.exitButton) {
      const vp = this.getViewport();
      const btnX = vp.x + vp.w - 34;
      const btnY = vp.y + 30;
      this.exitButton.setPosition(btnX, btnY);
    }
  }

  private advanceToNextStop(): void {
    this.hideNarration();
    this.currentStopIndex++;

    if (this.currentStopIndex >= TOUR_STOPS.length) {
      this.showTourComplete();
      return;
    }

    const stop = TOUR_STOPS[this.currentStopIndex];

    // First stop — narrate immediately (guide is already standing there)
    if (this.currentStopIndex === 0) {
      this.guide.setFrame(3); // face up
      this.guideDirection = 'up';
      this.state = TourState.NARRATING;
      this.scene.time.delayedCall(500, () => {
        this.showNarration(stop);
      });
      return;
    }

    // Find path to next stop
    const currentTile = this.scene.worldToTile(this.guide.x, this.guide.y);
    const targetTile = this.scene.worldToTile(stop.walkX, stop.walkY);

    this.path = this.findPath(currentTile.x, currentTile.y, targetTile.x, targetTile.y);

    if (this.path.length > 0 && this.path[0].x === currentTile.x && this.path[0].y === currentTile.y) {
      this.path.shift();
    }

    if (this.path.length === 0) {
      this.onGuideArrived(stop);
      return;
    }

    this.state = TourState.WALKING;
  }

  private updateGuideMovement(): void {
    if (!this.isMovingToTile) {
      if (this.path.length === 0) {
        const stop = TOUR_STOPS[this.currentStopIndex];
        this.onGuideArrived(stop);
        return;
      }

      const nextTile = this.path.shift()!;
      this.tileX = nextTile.x;
      this.tileY = nextTile.y;
      const worldPos = this.scene.tileToWorld(this.tileX, this.tileY);
      this.targetWorldX = worldPos.x;
      this.targetWorldY = worldPos.y;
      this.isMovingToTile = true;
    }

    const dx = this.targetWorldX - this.guide.x;
    const dy = this.targetWorldY - this.guide.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      this.guide.x = this.targetWorldX;
      this.guide.y = this.targetWorldY;
      this.isMovingToTile = false;
    } else {
      const speed = this.MOVE_SPEED / 60;
      const moveX = (dx / dist) * Math.min(speed, dist);
      const moveY = (dy / dist) * Math.min(speed, dist);
      this.guide.x += moveX;
      this.guide.y += moveY;

      if (Math.abs(dx) > Math.abs(dy)) {
        this.guideDirection = dx > 0 ? 'right' : 'left';
      } else {
        this.guideDirection = dy > 0 ? 'down' : 'up';
      }

      const animKey = `guide-walk-${this.guideDirection}`;
      if (this.guide.anims.currentAnim?.key !== animKey) {
        this.guide.anims.play(animKey, true);
      }
    }

    this.guide.setDepth(this.guide.y + 1);
  }

  private onGuideArrived(stop: TourStop): void {
    this.state = TourState.NARRATING;
    this.isMovingToTile = false;

    this.guideDirection = stop.facing;
    const frameMap: Record<string, number> = { down: 0, up: 3, left: 6, right: 9 };
    this.guide.anims.stop();
    this.guide.setFrame(frameMap[stop.facing] || 0);

    this.scene.time.delayedCall(300, () => {
      if (this.state === TourState.NARRATING) {
        this.showNarration(stop);
      }
    });
  }

  private showNarration(stop: TourStop): void {
    this.hideNarration();

    const vp = this.getViewport();

    const panelH = 60;
    const panelTop = vp.y + vp.h - panelH;
    const panelLeft = vp.x;
    const panelW = vp.w;

    this.narrationPanel = this.scene.add.container(0, 0);
    this.narrationPanel.setDepth(3000);

    // Background — full-width bottom panel
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f0f23, 0.95);
    bg.fillRect(panelLeft, panelTop, panelW, panelH);
    bg.lineStyle(2, 0x9b59b6, 0.8);
    bg.strokeRect(panelLeft, panelTop, panelW, panelH);

    // Speaker name tab
    const nameTabW = 90;
    const nameTabH = 16;
    const nameTab = this.scene.add.graphics();
    nameTab.fillStyle(0x0f0f23, 0.95);
    nameTab.fillRoundedRect(panelLeft + 8, panelTop - nameTabH + 2, nameTabW, nameTabH, { tl: 4, tr: 4, bl: 0, br: 0 });
    nameTab.lineStyle(2, 0x9b59b6, 0.8);
    nameTab.strokeRoundedRect(panelLeft + 8, panelTop - nameTabH + 2, nameTabW, nameTabH, { tl: 4, tr: 4, bl: 0, br: 0 });
    nameTab.fillStyle(0x0f0f23, 0.95);
    nameTab.fillRect(panelLeft + 10, panelTop, nameTabW - 4, 3);

    const nameText = this.scene.add.text(panelLeft + 8 + nameTabW / 2, panelTop - nameTabH / 2 + 2, stop.title, {
      fontSize: '9px',
      color: '#e0c0f0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Progress indicator (top-right of panel)
    const progress = `${this.currentStopIndex + 1} / ${TOUR_STOPS.length}`;
    const progressText = this.scene.add.text(panelLeft + panelW - 12, panelTop - nameTabH / 2 + 2, progress, {
      fontSize: '8px',
      color: '#777777',
    }).setOrigin(1, 0.5);

    // Narration text
    const msgText = this.scene.add.text(panelLeft + 14, panelTop + 10, stop.narration, {
      fontSize: '9px',
      color: '#e8eaed',
      wordWrap: { width: panelW - 28 },
      lineSpacing: 3,
    });

    // Blinking advance indicator (down arrow)
    const advanceIndicator = this.scene.add.text(panelLeft + panelW - 14, vp.y + vp.h - 12, '\u25BC', {
      fontSize: '8px',
      color: '#9b59b6',
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: advanceIndicator,
      y: vp.y + vp.h - 8,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    this.narrationPanel.add([bg, nameTab, nameText, progressText, msgText, advanceIndicator]);

    // Fade in
    this.narrationPanel.setAlpha(0);
    this.scene.tweens.add({
      targets: this.narrationPanel,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });

    // Click or key press to advance
    const advance = () => {
      if (this.state === TourState.NARRATING) {
        this.scene.input.off('pointerdown', advance);
        this.scene.input.keyboard?.off('keydown', keyAdvance);
        this.advanceToNextStop();
      }
    };
    const keyAdvance = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        advance();
      }
    };
    this.scene.input.once('pointerdown', advance);
    this.scene.input.keyboard?.on('keydown', keyAdvance);

    // Auto-advance timer
    this.autoAdvanceTimer = this.scene.time.delayedCall(stop.pauseMs, () => {
      if (this.state === TourState.NARRATING) {
        this.scene.input.off('pointerdown', advance);
        this.scene.input.keyboard?.off('keydown', keyAdvance);
        this.advanceToNextStop();
      }
    });
  }

  private hideNarration(): void {
    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.destroy();
      this.autoAdvanceTimer = null;
    }
    if (this.narrationPanel) {
      this.narrationPanel.destroy();
      this.narrationPanel = null;
    }
  }

  private switchCameraToGuide(): void {
    const cam = this.scene.cameras.main;
    cam.stopFollow();
    cam.startFollow(this.guide, true, 0.1, 0.1);
  }

  private switchCameraToPlayer(): void {
    const cam = this.scene.cameras.main;
    cam.stopFollow();
    const player = this.scene.playerRef;
    if (player) {
      cam.startFollow(player, true, 0.1, 0.1);
    }
  }

  private createExitTourButton(): void {
    const vp = this.getViewport();

    // Container positioned at button location; children use local (0,0) coords
    this.exitButton = this.scene.add.container(vp.x + vp.w - 34, vp.y + 30);
    this.exitButton.setDepth(3001);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0xcc2233, 0.9);
    bg.fillRoundedRect(-28, -7, 56, 14, 3);

    const text = this.scene.add.text(0, 0, 'Exit Tour', {
      fontSize: '9px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const hitArea = this.scene.add.rectangle(0, 0, 56, 14, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xff3344, 1);
      bg.fillRoundedRect(-28, -7, 56, 14, 3);
    });
    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0xcc2233, 0.9);
      bg.fillRoundedRect(-28, -7, 56, 14, 3);
    });
    hitArea.on('pointerdown', () => this.exitTour());

    this.exitButton.add([bg, text, hitArea]);
  }

  private showTourComplete(): void {
    this.state = TourState.IDLE;

    this.guide.anims.stop();
    this.guide.setFrame(0); // face down toward camera

    this.showDialogueBox('Museum Guide',
      "And that concludes our tour! You've walked through the full history of LLMs. Feel free to explore on your own!",
      () => {
        this.finishTour();
      }
    );
  }

  private finishTour(): void {
    this.hideNarration();
    this.switchCameraToPlayer();
    this.cleanupGuide();
    this.state = TourState.IDLE;
    if (this.onTourEnd) this.onTourEnd();
  }

  exitTour(): void {
    this.hideNarration();
    this.removeChoiceKeyboardListeners();
    if (this.choicePanel) {
      this.choicePanel.destroy();
      this.choicePanel = null;
    }
    this.switchCameraToPlayer();
    this.cleanupGuide();
    this.state = TourState.IDLE;
    if (this.onTourEnd) this.onTourEnd();
  }

  private cleanupGuide(): void {
    if (this.exitButton) {
      this.exitButton.destroy();
      this.exitButton = null;
    }
    if (this.guide) {
      this.guide.destroy();
    }
    if (this.guideNameTag) {
      this.guideNameTag.destroy();
    }
  }

  destroy(): void {
    this.hideNarration();
    this.removeChoiceKeyboardListeners();
    if (this.choicePanel) {
      this.choicePanel.destroy();
      this.choicePanel = null;
    }
    this.cleanupGuide();
    this.state = TourState.IDLE;
  }

  // --- A* Pathfinding (adapted from Agent.ts) ---

  private findPath(
    startX: number, startY: number,
    endX: number, endY: number,
  ): { x: number; y: number }[] {
    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();

    const heuristic = (x: number, y: number) => {
      return Math.abs(x - endX) + Math.abs(y - endY);
    };

    const startNode: PathNode = {
      x: startX, y: startY,
      g: 0,
      h: heuristic(startX, startY),
      f: heuristic(startX, startY),
      parent: null,
    };

    openSet.push(startNode);

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    let iterations = 0;
    const maxIterations = 2000;

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;

      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.x === endX && current.y === endY) {
        const path: { x: number; y: number }[] = [];
        let node: PathNode | null = current;
        while (node) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        return path;
      }

      closedSet.add(`${current.x},${current.y}`);

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const key = `${nx},${ny}`;

        if (closedSet.has(key)) continue;

        const isDestination = nx === endX && ny === endY;
        if (!this.scene.isTileWalkable(nx, ny) && !isDestination) continue;

        const g = current.g + 1;
        const h = heuristic(nx, ny);
        const f = g + h;

        const existingIndex = openSet.findIndex(n => n.x === nx && n.y === ny);
        if (existingIndex !== -1) {
          if (openSet[existingIndex].g <= g) continue;
          openSet.splice(existingIndex, 1);
        }

        openSet.push({ x: nx, y: ny, g, h, f, parent: current });
      }
    }

    return [];
  }
}
