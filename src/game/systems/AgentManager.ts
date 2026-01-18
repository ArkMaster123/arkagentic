/**
 * AgentManager - Manages all AI agents in the game
 * 
 * Responsibilities:
 * - Agent creation and initialization
 * - Agent positioning and movement coordination
 * - API communication for agent responses
 * - Agent state management (busy, wandering, etc.)
 * 
 * Extracted from TownScene to reduce scene complexity.
 */

import { Scene, GameObjects, Physics } from 'phaser';
import { Agent } from '../../classes/Agent';
import eventsCenter from '../../classes/EventCenter';
import { AGENTS, MEETING_POINT, API_BASE_URL, CF_AGENTS_URL, CF_AGENTS } from '../../constants';
import { GameBridge } from '../../core';

// Agent spawn positions in the town
const AGENT_SPAWN_POSITIONS: Record<string, { x: number; y: number }> = {
  scout: { x: 200, y: 200 },
  sage: { x: 350, y: 200 },
  chronicle: { x: 200, y: 300 },
  trends: { x: 350, y: 300 },
  maven: { x: 275, y: 350 },
  gandalfius: { x: 420, y: 280 },
};

// Meeting point offsets for multiple agents
const MEETING_OFFSETS = [
  { x: -20, y: 0 },
  { x: 20, y: 0 },
  { x: 0, y: -20 },
  { x: 0, y: 20 },
  { x: 0, y: 0 },
];

export interface AgentAPIResponse {
  response: string;
  agent: string;
  handoffs: string[];
}

export interface AgentManagerConfig {
  scene: Scene;
  collisionLayers?: {
    wall?: Physics.Arcade.StaticGroup | Phaser.Tilemaps.TilemapLayer;
    tree?: Physics.Arcade.StaticGroup | Phaser.Tilemaps.TilemapLayer;
    house?: Physics.Arcade.StaticGroup | Phaser.Tilemaps.TilemapLayer;
  };
  player?: Physics.Arcade.Sprite;
}

export class AgentManager {
  private scene: Scene;
  private agents: Map<string, Agent> = new Map();
  private agentGroup: GameObjects.Group;
  private collisionLayers: AgentManagerConfig['collisionLayers'];
  
  // Event cleanup - using Function type for event handlers stored for cleanup
  // eslint-disable-next-line @typescript-eslint/ban-types
  private eventHandlers: { event: string; handler: Function }[] = [];

  constructor(config: AgentManagerConfig) {
    this.scene = config.scene;
    this.collisionLayers = config.collisionLayers;
    this.agentGroup = this.scene.add.group();
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Create all agents at their spawn positions
   */
  initAgents(): void {
    const agentTypes = Object.keys(AGENTS) as Array<keyof typeof AGENTS>;

    agentTypes.forEach((agentType) => {
      const pos = AGENT_SPAWN_POSITIONS[agentType] || { x: 275, y: 275 };
      const agent = new Agent(this.scene, pos.x, pos.y, agentType, agentType);

      this.agents.set(agentType, agent);
      this.agentGroup.add(agent);

      // Add collisions with map layers
      if (this.collisionLayers?.wall) {
        this.scene.physics.add.collider(agent, this.collisionLayers.wall);
      }
      if (this.collisionLayers?.tree) {
        this.scene.physics.add.collider(agent, this.collisionLayers.tree);
      }
      if (this.collisionLayers?.house) {
        this.scene.physics.add.collider(agent, this.collisionLayers.house);
      }
    });

    // Agent-to-agent collision
    this.scene.physics.add.collider(this.agentGroup, this.agentGroup);

    // Listen for agent click events
    const clickHandler = (data: { agentType: string; agent: Agent }) => {
      eventsCenter.emit('agent-manager:agent-clicked', data);
    };
    eventsCenter.on('agent-clicked', clickHandler);
    this.eventHandlers.push({ event: 'agent-clicked', handler: clickHandler });
  }

  /**
   * Add player collision with agents
   */
  addPlayerCollision(player: Physics.Arcade.Sprite): void {
    this.scene.physics.add.collider(player, this.agentGroup);
  }

  // ============================================
  // Agent Access
  // ============================================

  /**
   * Get an agent by type
   */
  getAgent(agentType: string): Agent | undefined {
    return this.agents.get(agentType);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Map<string, Agent> {
    return this.agents;
  }

  /**
   * Get the agent group for physics/rendering
   */
  getAgentGroup(): GameObjects.Group {
    return this.agentGroup;
  }

  /**
   * Find the nearest agent to a position within a max distance
   */
  findNearestAgent(x: number, y: number, maxDistance: number): { type: string; agent: Agent } | null {
    let nearestType: string | null = null;
    let nearestAgent: Agent | null = null;
    let nearestDistance = Infinity;

    this.agents.forEach((agent, type) => {
      const distance = Phaser.Math.Distance.Between(x, y, agent.x, agent.y);
      if (distance <= maxDistance && distance < nearestDistance) {
        nearestType = type;
        nearestAgent = agent;
        nearestDistance = distance;
      }
    });

    return nearestType && nearestAgent ? { type: nearestType, agent: nearestAgent } : null;
  }

  // ============================================
  // Movement Coordination
  // ============================================

  /**
   * Move multiple agents to the meeting point
   * Returns a promise that resolves when all agents have arrived
   */
  async moveAgentsToMeeting(agentTypes: string[]): Promise<void> {
    return new Promise((resolve) => {
      let arrivedCount = 0;
      const totalAgents = agentTypes.length;

      agentTypes.forEach((agentType, index) => {
        const agent = this.agents.get(agentType);
        if (agent) {
          const offset = MEETING_OFFSETS[index % MEETING_OFFSETS.length];
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
          eventsCenter.emit(`${agentType}-moveTo`, { x: targetX, y: targetY });
        }
      });

      // Timeout fallback
      this.scene.time.delayedCall(5000, () => {
        resolve();
      });
    });
  }

  /**
   * Return all agents to their original spawn positions
   */
  returnAgentsToPositions(): void {
    this.agents.forEach((agent, agentType) => {
      const pos = AGENT_SPAWN_POSITIONS[agentType];
      if (pos) {
        eventsCenter.emit(`${agentType}-moveTo`, { x: pos.x, y: pos.y });
      }
    });
  }

  /**
   * Summon an agent (stop wandering, prepare for task)
   */
  summonAgent(agentType: string): void {
    const agent = this.agents.get(agentType);
    if (agent) {
      agent.summon();
    }
  }

  /**
   * Release an agent (resume wandering)
   */
  releaseAgent(agentType: string): void {
    const agent = this.agents.get(agentType);
    if (agent) {
      agent.release();
    }
  }

  // ============================================
  // API Communication
  // ============================================

  /**
   * Call the agent API with streaming support
   * Routes to Cloudflare Workers for migrated agents (sage)
   * @param query The user's query
   * @param agentType The agent to respond
   * @param onChunk Optional callback for streaming chunks
   * @returns The complete response
   */
  async callAgentAPI(
    query: string,
    agentType: string,
    onChunk?: (chunk: string, fullText: string) => void
  ): Promise<AgentAPIResponse> {
    // Check if this agent has been migrated to Cloudflare
    const useCloudflare = CF_AGENTS.includes(agentType);
    const baseUrl = useCloudflare ? CF_AGENTS_URL : API_BASE_URL;
    
    if (useCloudflare) {
      console.log(`[AgentManager] Using Cloudflare agent for: ${agentType}`);
    }

    try {
      // Get user's preferred AI model
      const userModel = GameBridge.userPreferredModel;

      // Use streaming endpoint for real-time response
      // Cloudflare agents use /api/chat/stream, Python backend uses /chat/stream
      const streamPath = useCloudflare ? '/api/chat/stream' : '/chat/stream';
      const response = await fetch(`${baseUrl}${streamPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          agent: agentType,
          use_swarm: false,
          model_id: userModel,
          modelId: userModel, // Cloudflare uses modelId
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';
      let respondingAgent = agentType;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'chunk' && data.data) {
                fullResponse += data.data;
                if (onChunk) {
                  onChunk(data.data, fullResponse);
                }
              } else if (data.type === 'start') {
                respondingAgent = data.agent || agentType;
                console.log(`[AgentManager] Stream started with agent: ${respondingAgent}`);
              } else if (data.type === 'done') {
                respondingAgent = data.agent || agentType;
                if (data.response) {
                  fullResponse = data.response;
                }
                console.log(`[AgentManager] Stream completed: ${fullResponse.length} chars`);
              } else if (data.type === 'error') {
                console.error('[AgentManager] Stream error:', data.message);
                throw new Error(data.message);
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
              if (line.trim() && !line.includes('{"type"')) {
                console.warn('[AgentManager] Failed to parse SSE:', line);
              }
            }
          }
        }
      }

      return {
        response: fullResponse || 'No response received',
        agent: respondingAgent,
        handoffs: [respondingAgent],
      };
    } catch (error) {
      console.error('[AgentManager] API call failed:', error);
      return this.callAgentAPIFallback(query, agentType);
    }
  }

  /**
   * Fallback to non-streaming API
   */
  private async callAgentAPIFallback(query: string, agentType: string): Promise<AgentAPIResponse> {
    // Check if this agent has been migrated to Cloudflare
    const useCloudflare = CF_AGENTS.includes(agentType);
    const baseUrl = useCloudflare ? CF_AGENTS_URL : API_BASE_URL;
    const chatPath = useCloudflare ? '/api/chat' : '/chat';

    try {
      const response = await fetch(`${baseUrl}${chatPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          agent: agentType,
          use_swarm: false,
          modelId: GameBridge.userPreferredModel, // For Cloudflare agents
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          response: data.response || 'No response received',
          agent: data.agent || agentType,
          handoffs: data.handoffs || [agentType],
        };
      }
    } catch (fallbackError) {
      console.error('[AgentManager] Fallback also failed:', fallbackError);
    }

    // Return mock response for demo
    const agentConfig = AGENTS[agentType as keyof typeof AGENTS];
    const serverHint = useCloudflare 
      ? 'Start it with: cd cloudflare-agents && npm run dev'
      : 'Start it with: cd backend && source venv/bin/activate && python server.py';
    return {
      response: `[${agentConfig?.name || agentType}] I'm ready to help! However, the backend server isn't running. ${serverHint}`,
      agent: agentType,
      handoffs: [agentType],
    };
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Clean up all agents and event listeners
   */
  destroy(): void {
    // Remove event listeners
    this.eventHandlers.forEach(({ event, handler }) => {
      eventsCenter.off(event, handler);
    });
    this.eventHandlers = [];

    // Destroy all agents
    this.agents.forEach((agent) => {
      agent.destroy();
    });
    this.agents.clear();

    // Destroy group
    this.agentGroup.destroy(true);
  }
}
