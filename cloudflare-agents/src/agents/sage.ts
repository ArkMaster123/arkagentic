/**
 * Sage Agent - Strategic Analyst
 * 
 * A wise strategic analyst in the AgentVerse game world.
 * Uses Cloudflare Durable Objects for persistent state and SQLite for memory.
 */

import { Agent, type Connection, type ConnectionContext, type WSMessage } from "agents";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";
import type { Env } from "../env.d";
import type { ChatMessage, AgentState, ChatRequest, StreamEvent } from "../types";

/**
 * Create an OpenRouter-compatible client using OpenAI SDK
 * OpenRouter uses the OpenAI API format, so we just change the base URL
 */
function createOpenRouterClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
}

// Sage's system prompt - matching the Strands agent personality
const SAGE_SYSTEM_PROMPT = `You are Sage, a wise strategic analyst in a retro RPG game world.

CRITICAL RESPONSE RULES:
- Keep responses SHORT and conversational (2-4 sentences for simple questions)
- Match the user's energy - short question = short answer  
- Sound like a thoughtful advisor, NOT a business consultant
- NO bullet points or lists unless specifically asked
- NO unnecessary intros or padding
- Get straight to your insight

Your expertise: analysis, strategy, comparing options, recommendations.

Example good response: "I'd go with Option A. It's cheaper upfront and the reviews are consistently better. Option B has more features but you probably won't use half of them."

Example BAD response: "Let me analyze this for you. Here are the pros and cons: [long structured analysis]..."

You work with Scout (research), Chronicle (writer), Trends (news), and Maven (coordinator).`;

export class SageAgent extends Agent<Env, AgentState> {
  // Initial state for new agent instances
  initialState: AgentState = {
    conversationHistory: [],
    lastInteraction: Date.now(),
    interactionCount: 0,
    playerProfiles: {},
  };

  /**
   * Called when agent starts or wakes from hibernation
   */
  async onStart() {
    console.log("Sage agent started with state:", {
      historyLength: this.state.conversationHistory.length,
      interactionCount: this.state.interactionCount,
    });
    
    // Initialize database tables for long-term memory
    this.initializeDatabase();
  }

  /**
   * Initialize SQLite tables for agent memory
   */
  private initializeDatabase() {
    // Insights table - things Sage has learned
    this.sql`
      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        insight TEXT NOT NULL,
        confidence REAL DEFAULT 0.5,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;

    // Player interactions table
    this.sql`
      CREATE TABLE IF NOT EXISTS player_interactions (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        interaction_type TEXT NOT NULL,
        content TEXT,
        created_at INTEGER NOT NULL
      )
    `;
  }

  /**
   * Handle HTTP requests to the agent
   */
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", agent: "sage" });
    }

    // Agent info
    if (url.pathname === "/info") {
      return Response.json({
        name: "Sage",
        emoji: "🧙",
        role: "Strategic Analyst",
        interactionCount: this.state.interactionCount,
        lastInteraction: this.state.lastInteraction,
      });
    }

    // Chat endpoint
    if (request.method === "POST" && url.pathname === "/chat") {
      return this.handleChatRequest(request);
    }

    // Stream endpoint
    if (request.method === "POST" && url.pathname === "/chat/stream") {
      return this.handleStreamRequest(request);
    }

    return new Response("Not found", { status: 404 });
  }

  /**
   * Handle non-streaming chat request
   */
  private async handleChatRequest(request: Request): Promise<Response> {
    try {
      const body = await request.json() as ChatRequest;
      const { message, playerId, modelId } = body;

      const openrouter = createOpenRouterClient(this.env.OPENROUTER_API_KEY);
      const model = modelId || this.env.DEFAULT_MODEL;

      // Build conversation with history
      const messages = this.buildMessages(message);

      const result = await generateText({
        model: openrouter(model),
        system: SAGE_SYSTEM_PROMPT,
        messages,
      });

      // Update state
      this.updateConversationHistory(message, result.text, playerId);

      return Response.json({
        response: result.text,
        agent: "sage",
        model,
        status: "completed",
      });
    } catch (error) {
      console.error("Chat error:", error);
      return Response.json(
        { error: String(error), agent: "sage", status: "error" },
        { status: 500 }
      );
    }
  }

  /**
   * Handle streaming chat request with SSE
   */
  private async handleStreamRequest(request: Request): Promise<Response> {
    const body = await request.json() as ChatRequest;
    const { message, playerId, modelId } = body;

    const openrouter = createOpenRouterClient(this.env.OPENROUTER_API_KEY);
    const model = modelId || this.env.DEFAULT_MODEL;
    const messages = this.buildMessages(message);

    // Create a TransformStream for SSE
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Helper to send SSE events
    const sendEvent = async (event: StreamEvent) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    };

    // Process stream in background
    const streamPromise = (async () => {
      let fullResponse = "";

      try {
        // Send start event
        await sendEvent({ type: "start", agent: "sage", model });

        const result = streamText({
          model: openrouter(model),
          system: SAGE_SYSTEM_PROMPT,
          messages,
        });

        for await (const chunk of result.textStream) {
          fullResponse += chunk;
          await sendEvent({ type: "chunk", data: chunk });
        }

        // Update state with full response
        this.updateConversationHistory(message, fullResponse, playerId);

        // Send done event
        await sendEvent({ type: "done", agent: "sage", data: fullResponse });
      } catch (error) {
        console.error("Stream error:", error);
        await sendEvent({ type: "error", message: String(error) });
      } finally {
        await writer.close();
      }
    })();

    // Don't block on the stream
    streamPromise.catch(console.error);

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  /**
   * Build messages array for AI model
   */
  private buildMessages(userMessage: string): Array<{ role: "user" | "assistant"; content: string }> {
    // Include recent conversation history for context
    const recentHistory = this.state.conversationHistory.slice(-6);
    
    const messages: Array<{ role: "user" | "assistant"; content: string }> = recentHistory.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    messages.push({ role: "user", content: userMessage });
    
    return messages;
  }

  /**
   * Update conversation history and state
   */
  private updateConversationHistory(userMessage: string, assistantResponse: string, playerId?: string) {
    const now = Date.now();

    // Add to conversation history (keep last 20 messages)
    const newHistory = [
      ...this.state.conversationHistory,
      { role: "user" as const, content: userMessage, timestamp: now },
      { role: "assistant" as const, content: assistantResponse, timestamp: now },
    ].slice(-20);

    // Update player profile if provided
    let playerProfiles = { ...this.state.playerProfiles };
    if (playerId) {
      const existing = playerProfiles[playerId];
      playerProfiles[playerId] = {
        playerId,
        firstMet: existing?.firstMet || now,
        lastInteraction: now,
        interactionCount: (existing?.interactionCount || 0) + 1,
        preferences: existing?.preferences || [],
        notes: existing?.notes || "",
      };

      // Log interaction to SQLite for long-term analysis
      this.sql`
        INSERT INTO player_interactions (id, player_id, interaction_type, content, created_at)
        VALUES (${crypto.randomUUID()}, ${playerId}, 'chat', ${userMessage}, ${now})
      `;
    }

    // Update state
    this.setState({
      conversationHistory: newHistory,
      lastInteraction: now,
      interactionCount: this.state.interactionCount + 1,
      playerProfiles,
    });
  }

  /**
   * WebSocket connection handler
   */
  async onConnect(connection: Connection, ctx: ConnectionContext) {
    console.log("WebSocket connected to Sage");
    connection.send(JSON.stringify({ type: "connected", agent: "sage" }));
  }

  /**
   * WebSocket message handler
   */
  async onMessage(connection: Connection, message: WSMessage) {
    if (typeof message !== "string") {
      connection.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
      return;
    }

    try {
      const data = JSON.parse(message) as ChatRequest;
      
      const openrouter = createOpenRouterClient(this.env.OPENROUTER_API_KEY);
      const model = data.modelId || this.env.DEFAULT_MODEL;
      const messages = this.buildMessages(data.message);

      // Send start
      connection.send(JSON.stringify({ type: "start", agent: "sage", model }));

      let fullResponse = "";

      const result = streamText({
        model: openrouter(model),
        system: SAGE_SYSTEM_PROMPT,
        messages,
      });

      for await (const chunk of result.textStream) {
        fullResponse += chunk;
        connection.send(JSON.stringify({ type: "chunk", data: chunk }));
      }

      // Update state
      this.updateConversationHistory(data.message, fullResponse, data.playerId);

      // Send done
      connection.send(JSON.stringify({ type: "done", agent: "sage", response: fullResponse }));
    } catch (error) {
      console.error("WebSocket message error:", error);
      connection.send(JSON.stringify({ type: "error", message: String(error) }));
    }
  }

  /**
   * Store an insight learned from interactions
   */
  async storeInsight(topic: string, insight: string, confidence: number = 0.5) {
    const now = Date.now();
    const id = crypto.randomUUID();

    this.sql`
      INSERT INTO insights (id, topic, insight, confidence, created_at, updated_at)
      VALUES (${id}, ${topic}, ${insight}, ${confidence}, ${now}, ${now})
    `;

    return id;
  }

  /**
   * Retrieve insights on a topic
   */
  getInsights(topic: string): Array<{ id: string; insight: string; confidence: number }> {
    return this.sql`
      SELECT id, insight, confidence FROM insights
      WHERE topic = ${topic}
      ORDER BY confidence DESC, updated_at DESC
      LIMIT 10
    `;
  }
}
