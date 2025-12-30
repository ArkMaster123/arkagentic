import { Scene, Tilemaps, GameObjects, Physics, Math as PhaserMath } from 'phaser';
import { Agent } from '../classes/Agent';
import eventsCenter from '../classes/EventCenter';
import { AGENTS, MEETING_POINT, COLOR_PRIMARY, COLOR_LIGHT, COLOR_DARK, API_BASE_URL } from '../constants';
import { DIRECTION, routeQuery } from '../utils';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
}

export class TownScene extends Scene {
  private map!: Tilemaps.Tilemap;
  private tileset!: Tilemaps.Tileset;
  private groundLayer!: Tilemaps.TilemapLayer;
  private wallLayer!: Tilemaps.TilemapLayer;
  private treeLayer!: Tilemaps.TilemapLayer;
  private houseLayer!: Tilemaps.TilemapLayer;

  private agents: Map<string, Agent> = new Map();
  private agentGroup!: GameObjects.Group;
  
  public rexUI!: UIPlugin;
  
  private inputBox: any = null;
  private conversationHistory: ConversationMessage[] = [];
  private isProcessing: boolean = false;

  constructor() {
    super('town-scene');
  }

  create(): void {
    this.initMap();
    this.initAgents();
    this.initCamera();
    this.initUI();
    
    // Listen for global events
    this.setupEventListeners();
  }

  update(): void {
    // Update all agents
    this.agents.forEach((agent) => {
      agent.update();
    });
  }

  private initMap(): void {
    this.map = this.make.tilemap({
      key: 'town',
      tileWidth: 16,
      tileHeight: 16,
    });
    
    this.tileset = this.map.addTilesetImage('town', 'tiles')!;
    
    // Create layers
    this.groundLayer = this.map.createLayer('ground', this.tileset, 0, 0)!;
    this.wallLayer = this.map.createLayer('wall', this.tileset, 0, 0)!;
    
    // Try to create optional layers (may not exist in all tilemaps)
    try {
      const flowerLayer = this.map.createLayer('flower', this.tileset, 0, 0);
      if (flowerLayer) flowerLayer.setCollisionByProperty({ collides: true });
    } catch (e) { /* Layer doesn't exist */ }
    
    try {
      this.treeLayer = this.map.createLayer('tree', this.tileset, 0, 0)!;
      this.treeLayer.setCollisionByProperty({ collides: true });
    } catch (e) { /* Layer doesn't exist */ }
    
    try {
      this.houseLayer = this.map.createLayer('house', this.tileset, 0, 0)!;
      this.houseLayer.setCollisionByProperty({ collides: true });
    } catch (e) { /* Layer doesn't exist */ }

    this.wallLayer.setCollisionByProperty({ collides: true });
  }

  private initAgents(): void {
    this.agentGroup = this.add.group();

    // Spawn agents at different positions around the town
    const spawnPositions = [
      { x: 200, y: 200 },  // Scout
      { x: 350, y: 200 },  // Sage
      { x: 200, y: 300 },  // Chronicle
      { x: 350, y: 300 },  // Trends
      { x: 275, y: 350 },  // Maven (center-ish)
    ];

    const agentTypes = Object.keys(AGENTS) as Array<keyof typeof AGENTS>;
    
    agentTypes.forEach((agentType, index) => {
      const pos = spawnPositions[index];
      const agent = new Agent(this, pos.x, pos.y, agentType, agentType);
      
      this.agents.set(agentType, agent);
      this.agentGroup.add(agent);

      // Add collisions
      if (this.wallLayer) this.physics.add.collider(agent, this.wallLayer);
      if (this.treeLayer) this.physics.add.collider(agent, this.treeLayer);
      if (this.houseLayer) this.physics.add.collider(agent, this.houseLayer);
    });

    // Agent-to-agent collision
    this.physics.add.collider(this.agentGroup, this.agentGroup);

    // Set world bounds
    this.physics.world.setBounds(0, 0, this.groundLayer.width, this.groundLayer.height);
  }

  private initCamera(): void {
    this.cameras.main.setSize(this.game.scale.width, this.game.scale.height);
    this.cameras.main.setBounds(0, 0, this.groundLayer.width, this.groundLayer.height);
    
    // Start centered on meeting point
    this.cameras.main.centerOn(MEETING_POINT.x, MEETING_POINT.y);
    this.cameras.main.setZoom(3);
  }

  private initUI(): void {
    // Create input prompt at bottom of screen
    this.createInputPrompt();
  }

  private createInputPrompt(): void {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    
    // Create a fixed UI container
    const inputY = screenHeight - 60;
    
    // Background for input area
    const bg = this.add.rectangle(
      screenWidth / 2,
      inputY,
      screenWidth - 40,
      80,
      0x000000,
      0.7
    ).setScrollFactor(0).setDepth(1000);

    // Instructions text
    const instructions = this.add.text(
      screenWidth / 2,
      inputY - 20,
      'Press ENTER to ask the agents a question',
      {
        fontSize: '14px',
        color: '#ffffff',
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    // Status text
    const status = this.add.text(
      screenWidth / 2,
      inputY + 10,
      'Agents are idle - waiting for your question!',
      {
        fontSize: '12px',
        color: '#888888',
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    // Listen for Enter key
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (!this.isProcessing && !this.inputBox) {
        this.showInputDialog();
      }
    });
  }

  private showInputDialog(): void {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;

    // Create modal overlay
    const overlay = this.add.rectangle(
      screenWidth / 2,
      screenHeight / 2,
      screenWidth,
      screenHeight,
      0x000000,
      0.5
    ).setScrollFactor(0).setDepth(2000).setInteractive();

    // Create input box using rex UI
    const scale = 1;
    
    this.inputBox = this.rexUI.add.dialog({
      x: screenWidth / 2,
      y: screenHeight / 2,
      background: this.rexUI.add.roundRectangle(0, 0, 100, 100, 20, COLOR_PRIMARY),
      title: this.add.text(0, 0, 'Ask the Agents', {
        fontSize: '18px',
        color: '#ffffff',
      }),
      content: this.rexUI.add.inputText({
        width: 400,
        height: 100,
        type: 'textarea',
        text: '',
        placeholder: 'Type your question here...',
        color: '#ffffff',
        backgroundColor: '#' + COLOR_DARK.toString(16),
        border: 2,
        borderColor: '#' + COLOR_LIGHT.toString(16),
      }),
      actions: [
        this.createButton('Submit'),
        this.createButton('Cancel'),
      ],
      space: {
        title: 20,
        content: 20,
        action: 15,
        left: 20,
        right: 20,
        top: 20,
        bottom: 20,
      },
      align: {
        actions: 'center',
      },
    })
    .setScrollFactor(0)
    .setDepth(2001)
    .layout()
    .popUp(300);

    // Handle button clicks
    this.inputBox.on('button.click', (button: any, _groupName: string, index: number) => {
      if (index === 0) {
        // Submit
        const inputText = this.inputBox.getElement('content') as any;
        const query = inputText.text;
        if (query.trim()) {
          this.processQuery(query.trim());
        }
      }
      // Close dialog
      this.inputBox.scaleDownDestroy(300);
      this.inputBox = null;
      overlay.destroy();
    });
  }

  private createButton(text: string): any {
    return this.rexUI.add.label({
      background: this.rexUI.add.roundRectangle(0, 0, 0, 0, 10, COLOR_LIGHT),
      text: this.add.text(0, 0, text, {
        fontSize: '14px',
        color: '#ffffff',
      }),
      space: {
        left: 15,
        right: 15,
        top: 10,
        bottom: 10,
      },
    });
  }

  private async processQuery(query: string): Promise<void> {
    this.isProcessing = true;
    
    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: query });

    // Route the query to determine which agents should respond
    const relevantAgents = routeQuery(query);
    console.log('Routing to agents:', relevantAgents);

    // Phase 1: Agents think about the query (show thought bubbles)
    relevantAgents.forEach((agentType) => {
      const agent = this.agents.get(agentType);
      if (agent) {
        eventsCenter.emit(`${agentType}-think`, 'Thinking...');
      }
    });

    // Phase 2: Move relevant agents to meeting point
    await this.moveAgentsToMeeting(relevantAgents);

    // Phase 3: Agents discuss (show speech bubbles while waiting for API)
    relevantAgents.forEach((agentType, index) => {
      const agent = this.agents.get(agentType);
      if (agent) {
        this.time.delayedCall(index * 500, () => {
          agent.speak(`Let me help with that...`);
        });
      }
    });

    // Phase 4: Call the API
    try {
      const response = await this.callAgentAPI(query, relevantAgents[0]);
      
      // Phase 5: Show the response
      const mainAgent = this.agents.get(relevantAgents[0]);
      if (mainAgent && response) {
        mainAgent.speak(this.truncateText(response, 100));
        
        // Show full response in a dialog
        this.showResponseDialog(relevantAgents[0], response);
      }

      this.conversationHistory.push({
        role: 'assistant',
        content: response || 'No response',
        agent: relevantAgents[0],
      });

    } catch (error) {
      console.error('API Error:', error);
      const mainAgent = this.agents.get(relevantAgents[0]);
      if (mainAgent) {
        mainAgent.speak('Sorry, I encountered an error!');
      }
    }

    // Phase 6: Return agents to original positions after delay
    this.time.delayedCall(10000, () => {
      this.returnAgentsToPositions();
      this.isProcessing = false;
    });
  }

  private async moveAgentsToMeeting(agentTypes: string[]): Promise<void> {
    return new Promise((resolve) => {
      const offsets = [
        { x: -20, y: 0 },
        { x: 20, y: 0 },
        { x: 0, y: -20 },
        { x: 0, y: 20 },
        { x: 0, y: 0 },
      ];

      let arrivedCount = 0;
      const totalAgents = agentTypes.length;

      agentTypes.forEach((agentType, index) => {
        const agent = this.agents.get(agentType);
        if (agent) {
          const offset = offsets[index % offsets.length];
          const targetX = MEETING_POINT.x + offset.x;
          const targetY = MEETING_POINT.y + offset.y;

          // Listen for arrival
          const arrivalHandler = () => {
            arrivedCount++;
            eventsCenter.off(`${agentType}-arrived`, arrivalHandler);
            if (arrivedCount >= totalAgents) {
              resolve();
            }
          };
          eventsCenter.on(`${agentType}-arrived`, arrivalHandler);

          // Start movement
          eventsCenter.emit(`${agentType}-moveTo`, targetX, targetY);
        }
      });

      // Timeout fallback
      this.time.delayedCall(5000, () => {
        resolve();
      });
    });
  }

  private returnAgentsToPositions(): void {
    const originalPositions: Record<string, { x: number; y: number }> = {
      scout: { x: 200, y: 200 },
      sage: { x: 350, y: 200 },
      chronicle: { x: 200, y: 300 },
      trends: { x: 350, y: 300 },
      maven: { x: 275, y: 350 },
    };

    this.agents.forEach((agent, agentType) => {
      const pos = originalPositions[agentType];
      if (pos) {
        eventsCenter.emit(`${agentType}-moveTo`, pos.x, pos.y);
      }
    });
  }

  private async callAgentAPI(query: string, agentType: string): Promise<string> {
    try {
      // Try the AI SDK endpoint from arena
      const response = await fetch(`${API_BASE_URL}/api/aisdk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          agent: agentType,
          history: this.conversationHistory.slice(-10),
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      return data.response || data.text || 'No response received';
    } catch (error) {
      console.error('API call failed:', error);
      // Return a mock response for demo purposes
      return `[${AGENTS[agentType as keyof typeof AGENTS]?.name || agentType}] I'm ready to help! However, the backend server isn't running. Start it with: cd prototypes/arena && npm run server`;
    }
  }

  private showResponseDialog(agentType: string, response: string): void {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    const agentConfig = AGENTS[agentType as keyof typeof AGENTS];

    const dialog = this.rexUI.add.dialog({
      x: screenWidth / 2,
      y: screenHeight / 2,
      background: this.rexUI.add.roundRectangle(0, 0, 100, 100, 20, COLOR_PRIMARY),
      title: this.add.text(0, 0, `${agentConfig?.emoji || ''} ${agentConfig?.name || agentType}`, {
        fontSize: '16px',
        color: '#ffffff',
      }),
      content: this.rexUI.add.textArea({
        width: 450,
        height: 250,
        text: response,
        style: {
          fontSize: '12px',
          color: '#ffffff',
          wordWrap: { width: 430 },
        },
      }),
      actions: [this.createButton('Close')],
      space: {
        title: 15,
        content: 15,
        action: 15,
        left: 20,
        right: 20,
        top: 20,
        bottom: 20,
      },
    })
    .setScrollFactor(0)
    .setDepth(2001)
    .layout()
    .popUp(300);

    dialog.on('button.click', () => {
      dialog.scaleDownDestroy(300);
    });
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private setupEventListeners(): void {
    // Global event handlers can be set up here
  }
}
