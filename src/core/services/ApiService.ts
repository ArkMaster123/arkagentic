/**
 * ApiService - Centralized HTTP request handling
 * 
 * Extracts all API calls from scenes into a dedicated service layer.
 * Provides type-safe methods for all backend endpoints.
 */

import { API_BASE_URL, AGENTS } from '../../constants';
import { StorageService } from './StorageService';

// ============================================
// Type Definitions
// ============================================

export interface User {
  id: string;
  display_name: string;
  avatar_sprite: string;
  created_at: string;
}

export interface CreateUserDto {
  display_name: string;
  avatar_sprite: string;
  session_token: string;
}

export interface UpdateUserDto {
  display_name?: string;
  avatar_sprite?: string;
}

export interface ChatRequest {
  message: string;
  agent: string;
  use_swarm?: boolean;
  model_id?: string;
}

export interface ChatResponse {
  response: string;
  agent: string;
  handoffs: string[];
}

export interface SessionValidation {
  valid: boolean;
  user_id?: string;
  message?: string;
}

export interface StreamChunk {
  type: 'start' | 'chunk' | 'done' | 'error';
  data?: string;
  agent?: string;
  response?: string;
  message?: string;
}

// ============================================
// ApiService Class
// ============================================

class ApiServiceClass {
  private baseUrl: string;
  
  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }
  
  // ============================================
  // User Management
  // ============================================
  
  /**
   * Create a new user
   */
  async createUser(data: CreateUserDto): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get user: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Update user profile
   */
  async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.status}`);
    }
    
    return response.json();
  }
  
  // ============================================
  // Authentication
  // ============================================
  
  /**
   * Validate session token
   */
  async validateSession(userId: string, sessionToken: string): Promise<SessionValidation> {
    const response = await fetch(
      `${this.baseUrl}/auth/validate?user_id=${userId}&session_token=${sessionToken}`,
      { method: 'POST' }
    );
    
    if (!response.ok) {
      return { valid: false, message: `Validation failed: ${response.status}` };
    }
    
    return response.json();
  }
  
  // ============================================
  // Chat / Agent Communication
  // ============================================
  
  /**
   * Send a chat message (non-streaming)
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const modelId = request.model_id || StorageService.getPreferredModel();
    
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        model_id: modelId,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Send a chat message with streaming response
   * Returns an async generator that yields chunks as they arrive
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const modelId = request.model_id || StorageService.getPreferredModel();
    
    const response = await fetch(`${this.baseUrl}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        model_id: modelId,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }
    
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as StreamChunk;
              yield data;
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  /**
   * Helper method that collects streaming response into a full response
   */
  async chatStreamCollect(request: ChatRequest): Promise<ChatResponse> {
    let fullResponse = '';
    let respondingAgent = request.agent;
    
    for await (const chunk of this.chatStream(request)) {
      if (chunk.type === 'chunk' && chunk.data) {
        fullResponse += chunk.data;
      } else if (chunk.type === 'start' && chunk.agent) {
        respondingAgent = chunk.agent;
      } else if (chunk.type === 'done') {
        if (chunk.response) {
          fullResponse = chunk.response;
        }
        if (chunk.agent) {
          respondingAgent = chunk.agent;
        }
      } else if (chunk.type === 'error') {
        throw new Error(chunk.message || 'Stream error');
      }
    }
    
    return {
      response: fullResponse || 'No response received',
      agent: respondingAgent,
      handoffs: [respondingAgent],
    };
  }
  
  // ============================================
  // Health Check
  // ============================================
  
  /**
   * Check if the backend is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // ============================================
  // Helper Methods
  // ============================================
  
  /**
   * Get a mock response when the server is unavailable
   * Used for demo/offline mode
   */
  getMockResponse(agentType: string, query: string): ChatResponse {
    const agentConfig = AGENTS[agentType as keyof typeof AGENTS];
    const agentName = agentConfig?.name || agentType;
    
    return {
      response: `[${agentName}] I'm ready to help! However, the backend server isn't running. Start it with: cd backend && source venv/bin/activate && python server.py`,
      agent: agentType,
      handoffs: [agentType],
    };
  }
}

// Export singleton instance
export const ApiService = new ApiServiceClass();

// Also export the class for testing or custom instances
export { ApiServiceClass };

// Default export for convenience
export default ApiService;
