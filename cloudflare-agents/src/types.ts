/**
 * Shared types for AgentVerse Cloudflare Agents
 */

// Chat message format matching the game's existing format
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

// Agent state persisted in SQLite
export interface AgentState {
  conversationHistory: ChatMessage[];
  lastInteraction: number;
  interactionCount: number;
  playerProfiles: Record<string, PlayerProfile>;
}

// Player profile for personalization
export interface PlayerProfile {
  playerId: string;
  firstMet: number;
  lastInteraction: number;
  interactionCount: number;
  preferences: string[];
  notes: string;
}

// Request/Response types for the HTTP API
export interface ChatRequest {
  message: string;
  playerId?: string;
  modelId?: string;
  stream?: boolean;
}

export interface ChatResponse {
  response: string;
  agent: string;
  model: string;
  status: "completed" | "error";
}

// SSE event types for streaming
export interface StreamEvent {
  type: "start" | "chunk" | "done" | "error";
  data?: string;
  agent?: string;
  model?: string;
  message?: string;
}
