/**
 * ChatSystem - Manages the chat UI and message handling
 * 
 * Responsibilities:
 * - Chat panel setup and event handling
 * - Message display (user and agent messages)
 * - Typing indicators and status updates
 * - Streaming message display
 * 
 * Extracted from TownScene to reduce scene complexity.
 */

import { AGENTS } from '../../constants';
import { escapeHtml } from '../../utils';
import { getIconSpan } from '../../icons';
import { GameBridge } from '../../core';

export interface ChatMessage {
  type: 'user' | 'agent';
  content: string;
  agentType?: string;
  timestamp: Date;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
}

export interface ChatSystemConfig {
  chatMessagesId?: string;
  chatInputId?: string;
  chatSendId?: string;
  chatStatusId?: string;
  onSubmit?: (query: string) => void;
}

export class ChatSystem {
  private config: ChatSystemConfig;
  private conversationHistory: ConversationMessage[] = [];
  private isProcessing: boolean = false;
  
  // DOM element references (cached)
  private chatMessages: HTMLElement | null = null;
  private chatInput: HTMLInputElement | null = null;
  private chatSend: HTMLButtonElement | null = null;
  private chatStatus: HTMLElement | null = null;
  
  // Streaming message element
  private streamingMessageDiv: HTMLElement | null = null;

  constructor(config: ChatSystemConfig = {}) {
    this.config = {
      chatMessagesId: 'chat-messages',
      chatInputId: 'chat-input',
      chatSendId: 'chat-send',
      chatStatusId: 'chat-status',
      ...config,
    };
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize the chat system and set up event listeners
   */
  init(): boolean {
    // Cache DOM references
    this.chatMessages = document.getElementById(this.config.chatMessagesId!);
    this.chatInput = document.getElementById(this.config.chatInputId!) as HTMLInputElement;
    this.chatSend = document.getElementById(this.config.chatSendId!) as HTMLButtonElement;
    this.chatStatus = document.getElementById(this.config.chatStatusId!);

    if (!this.chatInput || !this.chatSend) {
      console.error('[ChatSystem] Chat panel elements not found');
      return false;
    }

    // Handle send button click
    this.chatSend.onclick = () => {
      this.handleSubmit();
    };

    // Handle Enter key
    this.chatInput.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSubmit();
      }
    };

    console.log('[ChatSystem] Initialized');
    return true;
  }

  // ============================================
  // Message Handling
  // ============================================

  /**
   * Handle chat submission
   */
  private handleSubmit(): void {
    if (!this.chatInput) return;
    
    const query = this.chatInput.value.trim();
    if (!query || this.isProcessing) return;

    // Clear input
    this.chatInput.value = '';

    // Add user message to chat
    this.addMessage('user', query);

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: query });

    // Notify listener
    if (this.config.onSubmit) {
      this.config.onSubmit(query);
    }
  }

  /**
   * Add a message to the chat
   */
  addMessage(type: 'user' | 'agent', content: string, agentType?: string): void {
    if (!this.chatMessages) return;

    // Remove welcome message if present
    const welcome = this.chatMessages.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;

    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (type === 'user') {
      messageDiv.innerHTML = `
        <div class="bubble">
          <p>${escapeHtml(content)}</p>
        </div>
        <div class="timestamp">${timestamp}</div>
      `;
    } else {
      const agentConfig = agentType ? AGENTS[agentType as keyof typeof AGENTS] : null;
      const iconSpan = agentConfig ? getIconSpan(agentConfig.emoji, 14) : '';
      const agentName = agentConfig ? `${iconSpan} ${escapeHtml(agentConfig.name)}` : 'Agent';
      messageDiv.innerHTML = `
        <div class="agent-name">${agentName}</div>
        <div class="bubble">
          <p>${escapeHtml(content)}</p>
        </div>
        <div class="timestamp">${timestamp}</div>
      `;

      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content,
        agent: agentType,
      });
    }

    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  // ============================================
  // Streaming Support
  // ============================================

  /**
   * Start a streaming message from an agent
   * Returns the content element for updates
   */
  startStreamingMessage(agentType: string): HTMLElement | null {
    if (!this.chatMessages) return null;

    // Remove typing indicator first
    this.removeTypingIndicator();

    const agentConfig = AGENTS[agentType as keyof typeof AGENTS];
    const iconSpan = agentConfig ? getIconSpan(agentConfig.emoji, 14) : '';
    const agentName = agentConfig ? `${iconSpan} ${escapeHtml(agentConfig.name)}` : 'Agent';
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.streamingMessageDiv = document.createElement('div');
    this.streamingMessageDiv.className = 'chat-message agent streaming';
    this.streamingMessageDiv.innerHTML = `
      <div class="agent-name">${agentName}</div>
      <div class="bubble">
        <p class="streaming-content"></p>
      </div>
      <div class="timestamp">${timestamp}</div>
    `;
    this.chatMessages.appendChild(this.streamingMessageDiv);
    this.scrollToBottom();

    return this.streamingMessageDiv.querySelector('.streaming-content');
  }

  /**
   * Update the streaming message content
   */
  updateStreamingMessage(content: string): void {
    const streamingContent = this.streamingMessageDiv?.querySelector('.streaming-content');
    if (streamingContent) {
      streamingContent.textContent = content;
      this.scrollToBottom();
    }
  }

  /**
   * Finish the streaming message
   */
  finishStreamingMessage(finalContent: string, agentType: string): void {
    if (this.streamingMessageDiv) {
      this.streamingMessageDiv.classList.remove('streaming');
      
      // Update content if provided
      const streamingContent = this.streamingMessageDiv.querySelector('.streaming-content');
      if (streamingContent && finalContent) {
        streamingContent.textContent = finalContent;
      }

      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: finalContent,
        agent: agentType,
      });

      this.streamingMessageDiv = null;
    }
  }

  /**
   * Check if there's an active streaming message
   */
  hasStreamingMessage(): boolean {
    return this.streamingMessageDiv !== null;
  }

  // ============================================
  // Typing Indicator
  // ============================================

  /**
   * Show typing indicator
   */
  showTypingIndicator(): HTMLElement | null {
    if (!this.chatMessages) return null;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message agent';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    `;
    this.chatMessages.appendChild(typingDiv);
    this.scrollToBottom();

    return typingDiv;
  }

  /**
   * Remove typing indicator
   */
  removeTypingIndicator(): void {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
  }

  // ============================================
  // Status Updates
  // ============================================

  /**
   * Update the chat status text
   */
  updateStatus(status: string): void {
    if (this.chatStatus) {
      this.chatStatus.textContent = status;
    }
  }

  /**
   * Update status with agent info
   */
  updateStatusWithAgent(agentType: string, statusText: string): void {
    const agentConfig = AGENTS[agentType as keyof typeof AGENTS];
    const iconSpan = agentConfig ? getIconSpan(agentConfig.emoji, 12) : '';
    const agentName = agentConfig?.name || 'Agent';
    this.updateStatus(`${iconSpan} ${agentName} ${statusText}`);
  }

  // ============================================
  // Input Control
  // ============================================

  /**
   * Enable or disable the chat input
   */
  setInputEnabled(enabled: boolean): void {
    if (this.chatInput) this.chatInput.disabled = !enabled;
    if (this.chatSend) this.chatSend.disabled = !enabled;
  }

  /**
   * Set processing state
   */
  setProcessing(processing: boolean): void {
    this.isProcessing = processing;
    this.setInputEnabled(!processing);
  }

  /**
   * Check if currently processing
   */
  getProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Focus the chat input
   */
  focusInput(): void {
    if (this.chatInput) {
      this.chatInput.focus();
    }
  }

  // ============================================
  // Conversation History
  // ============================================

  /**
   * Get conversation history
   */
  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearConversationHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Add to conversation history
   */
  addToHistory(message: ConversationMessage): void {
    this.conversationHistory.push(message);
  }

  // ============================================
  // Helpers
  // ============================================

  /**
   * Scroll chat to bottom
   */
  private scrollToBottom(): void {
    if (this.chatMessages) {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    if (this.chatMessages) {
      this.chatMessages.innerHTML = '';
    }
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Clean up event listeners
   */
  destroy(): void {
    if (this.chatInput) {
      this.chatInput.onkeydown = null;
    }
    if (this.chatSend) {
      this.chatSend.onclick = null;
    }
    
    this.chatMessages = null;
    this.chatInput = null;
    this.chatSend = null;
    this.chatStatus = null;
    this.streamingMessageDiv = null;
  }
}
