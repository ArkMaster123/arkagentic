/**
 * UIManager - Manages in-game UI elements
 * 
 * Responsibilities:
 * - Prompts (door prompts, agent chat prompts, etc.)
 * - Banners and notifications
 * - Player count and status displays
 * - Tooltips
 * 
 * Extracted from TownScene to reduce scene complexity.
 */

import { Scene, GameObjects } from 'phaser';
import { AGENTS } from '../../constants';
import { getIconSpan } from '../../icons';
import { escapeHtml } from '../../utils';

export interface PromptConfig {
  x: number;
  y: number;
  text: string;
  subtext?: string;
  keyHint?: string;
  color?: number;
  pulseAnimation?: boolean;
}

export interface BannerConfig {
  text: string;
  subtext?: string;
  duration?: number;
  color?: string;
}

export class UIManager {
  private scene: Scene;
  
  // Active UI elements
  private prompts: Map<string, GameObjects.Container> = new Map();
  private activeBanner: GameObjects.Container | null = null;
  private playerCountText: GameObjects.Text | null = null;
  private playerNameText: GameObjects.Text | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  // ============================================
  // Prompts
  // ============================================

  /**
   * Create an interaction prompt
   */
  createPrompt(id: string, config: PromptConfig): GameObjects.Container {
    // Remove existing prompt with same id
    this.removePrompt(id);

    const container = this.scene.add.container(config.x, config.y);
    container.setDepth(200);

    // Background
    const width = config.subtext ? 140 : 120;
    const height = config.subtext ? 32 : 28;
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    bg.lineStyle(1, config.color || 0x4a90d9);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    container.add(bg);

    // Key hint if provided
    if (config.keyHint) {
      const keyBg = this.scene.add.graphics();
      keyBg.fillStyle(config.color || 0x4a90d9, 1);
      keyBg.fillRoundedRect(-width / 2 + 5, -10, 20, 20, 4);
      container.add(keyBg);

      const keyText = this.scene.add.text(-width / 2 + 15, 0, config.keyHint, {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(keyText);
    }

    // Main text
    const textX = config.keyHint ? 5 : 0;
    const text = this.scene.add.text(textX, config.subtext ? -5 : 0, config.text, {
      fontSize: '10px',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(text);

    // Subtext if provided
    if (config.subtext) {
      const subtext = this.scene.add.text(textX, 7, config.subtext, {
        fontSize: '8px',
        color: '#aaaaaa',
      }).setOrigin(0.5);
      container.add(subtext);
    }

    // Pulse animation if requested
    if (config.pulseAnimation) {
      this.scene.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.prompts.set(id, container);
    return container;
  }

  /**
   * Create an agent chat prompt
   */
  createAgentChatPrompt(agentType: string, x: number, y: number): GameObjects.Container {
    const agentConfig = AGENTS[agentType as keyof typeof AGENTS];
    
    return this.createPrompt(`agent-chat-${agentType}`, {
      x,
      y,
      text: `Chat with ${agentConfig?.name || 'Agent'}`,
      keyHint: 'C',
      color: 0xe94560,
      pulseAnimation: true,
    });
  }

  /**
   * Create a door prompt
   */
  createDoorPrompt(zoneName: string, x: number, y: number): GameObjects.Container {
    return this.createPrompt('door-prompt', {
      x,
      y,
      text: 'Press SPACE to enter',
      subtext: zoneName,
      color: 0x4a90d9,
      pulseAnimation: true,
    });
  }

  /**
   * Remove a prompt by id
   */
  removePrompt(id: string): void {
    const prompt = this.prompts.get(id);
    if (prompt) {
      prompt.destroy();
      this.prompts.delete(id);
    }
  }

  /**
   * Remove all prompts
   */
  removeAllPrompts(): void {
    this.prompts.forEach((prompt) => prompt.destroy());
    this.prompts.clear();
  }

  /**
   * Check if a prompt exists
   */
  hasPrompt(id: string): boolean {
    return this.prompts.has(id);
  }

  // ============================================
  // Banners
  // ============================================

  /**
   * Show a welcome banner
   */
  showWelcomeBanner(playerName: string): void {
    this.showBanner({
      text: `Welcome, ${playerName}!`,
      subtext: 'Use WASD or Arrow keys to move',
      duration: 4000,
    });
  }

  /**
   * Show a banner notification
   */
  showBanner(config: BannerConfig): void {
    // Remove existing banner
    this.hideBanner();

    // Create banner container (fixed to camera)
    this.activeBanner = this.scene.add.container(400, 30);
    this.activeBanner.setScrollFactor(0);
    this.activeBanner.setDepth(1000);

    // Background
    const bgWidth = 200;
    const bgHeight = config.subtext ? 45 : 30;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 8);
    bg.lineStyle(2, 0x4a90d9);
    bg.strokeRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 8);
    this.activeBanner.add(bg);

    // Main text
    const text = this.scene.add.text(0, config.subtext ? -8 : 0, config.text, {
      fontSize: '16px',
      color: config.color || '#ffffff',
    }).setOrigin(0.5);
    this.activeBanner.add(text);

    // Subtext if provided
    if (config.subtext) {
      const subtext = this.scene.add.text(0, 10, config.subtext, {
        fontSize: '10px',
        color: '#aaaaaa',
      }).setOrigin(0.5);
      this.activeBanner.add(subtext);
    }

    // Animate in
    this.activeBanner.setAlpha(0);
    this.activeBanner.y = 10;

    this.scene.tweens.add({
      targets: this.activeBanner,
      alpha: 1,
      y: 30,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Auto-hide after duration
    if (config.duration) {
      this.scene.time.delayedCall(config.duration, () => {
        this.hideBanner();
      });
    }
  }

  /**
   * Hide the active banner
   */
  hideBanner(): void {
    if (this.activeBanner) {
      this.scene.tweens.add({
        targets: this.activeBanner,
        alpha: 0,
        y: 10,
        duration: 500,
        onComplete: () => {
          if (this.activeBanner) {
            this.activeBanner.destroy();
            this.activeBanner = null;
          }
        },
      });
    }
  }

  // ============================================
  // Player Info
  // ============================================

  /**
   * Create player count display
   */
  createPlayerCountDisplay(x: number, y: number): GameObjects.Text {
    this.playerCountText = this.scene.add.text(x, y, 'Players: 1', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    return this.playerCountText;
  }

  /**
   * Update player count display
   */
  updatePlayerCount(count: number): void {
    if (this.playerCountText) {
      this.playerCountText.setText(`Players: ${count}`);
    }
  }

  /**
   * Create player name display
   */
  createPlayerNameDisplay(x: number, y: number, name: string): GameObjects.Text {
    this.playerNameText = this.scene.add.text(x, y, name, {
      fontSize: '12px',
      color: '#4a90d9',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(100);

    return this.playerNameText;
  }

  /**
   * Update player name display
   */
  updatePlayerName(name: string): void {
    if (this.playerNameText) {
      this.playerNameText.setText(name);
    }
  }

  // ============================================
  // Agent Chat UI Integration
  // ============================================

  /**
   * Update the HTML chat title for an agent
   */
  updateChatTitleForAgent(agentType: string): void {
    const agentConfig = AGENTS[agentType as keyof typeof AGENTS];
    const chatTitle = document.getElementById('chat-title');
    
    if (chatTitle && agentConfig) {
      const safeName = escapeHtml(agentConfig.name);
      const iconSpan = getIconSpan(agentConfig.emoji, 16);
      chatTitle.innerHTML = `
        ${iconSpan}
        Chat with ${safeName}
        <button id="clear-agent-btn" onclick="clearAgentSelection()">x</button>
      `;
    }
  }

  /**
   * Update the chat input placeholder
   */
  updateChatInputPlaceholder(agentType: string): void {
    const agentConfig = AGENTS[agentType as keyof typeof AGENTS];
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    
    if (chatInput && agentConfig) {
      chatInput.placeholder = `Ask ${agentConfig.name} something...`;
    }
  }

  /**
   * Highlight an agent card in the sidebar
   */
  highlightAgentCard(agentType: string): void {
    document.querySelectorAll('.agent-card').forEach((card) => {
      card.classList.remove('chat-selected');
      if ((card as HTMLElement).dataset.agent === agentType) {
        card.classList.add('chat-selected');
      }
    });
  }

  /**
   * Clear agent card highlights
   */
  clearAgentCardHighlights(): void {
    document.querySelectorAll('.agent-card').forEach((card) => {
      card.classList.remove('chat-selected');
    });
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Clean up all UI elements
   */
  destroy(): void {
    this.removeAllPrompts();
    
    if (this.activeBanner) {
      this.activeBanner.destroy();
      this.activeBanner = null;
    }
    
    if (this.playerCountText) {
      this.playerCountText.destroy();
      this.playerCountText = null;
    }
    
    if (this.playerNameText) {
      this.playerNameText.destroy();
      this.playerNameText = null;
    }
  }
}
