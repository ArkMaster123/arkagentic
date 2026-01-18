/**
 * Sage Agent - Strategic Analyst (Simple DO Version)
 * 
 * A simpler implementation using plain Durable Objects
 * without the agents SDK, for easier debugging.
 */

import { DurableObject } from "cloudflare:workers";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

// Sage's system prompt
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

interface Env {
  OPENROUTER_API_KEY: string;
  DEFAULT_MODEL: string;
}

interface ChatRequest {
  message: string;
  playerId?: string;
  modelId?: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface AgentState {
  conversationHistory: ConversationMessage[];
  interactionCount: number;
}

/**
 * Create an OpenRouter-compatible client using OpenAI SDK
 */
function createOpenRouterClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
}

export class SageAgentSimple extends DurableObject<Env> {
  private state: AgentState = {
    conversationHistory: [],
    interactionCount: 0,
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Load state from storage
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<AgentState>("state");
      if (stored) {
        this.state = stored;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
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

  private async handleChatRequest(request: Request): Promise<Response> {
    try {
      const body = await request.json() as ChatRequest;
      const { message, modelId } = body;

      const openrouter = createOpenRouterClient(this.env.OPENROUTER_API_KEY);
      const model = modelId || this.env.DEFAULT_MODEL;

      const messages = this.buildMessages(message);

      const result = await generateText({
        model: openrouter(model),
        system: SAGE_SYSTEM_PROMPT,
        messages,
      });

      // Update state
      await this.updateConversationHistory(message, result.text);

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

  private async handleStreamRequest(request: Request): Promise<Response> {
    const body = await request.json() as ChatRequest;
    const { message, modelId } = body;

    const openrouter = createOpenRouterClient(this.env.OPENROUTER_API_KEY);
    const model = modelId || this.env.DEFAULT_MODEL;
    const messages = this.buildMessages(message);

    // Create a TransformStream for SSE
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Helper to send SSE events
    const sendEvent = async (event: object) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    };

    // Process stream in background
    const streamPromise = (async () => {
      let fullResponse = "";

      try {
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

        await this.updateConversationHistory(message, fullResponse);
        await sendEvent({ type: "done", agent: "sage", data: fullResponse });
      } catch (error) {
        console.error("Stream error:", error);
        await sendEvent({ type: "error", message: String(error) });
      } finally {
        await writer.close();
      }
    })();

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

  private buildMessages(userMessage: string): Array<{ role: "user" | "assistant"; content: string }> {
    const recentHistory = this.state.conversationHistory.slice(-6);
    
    const messages: Array<{ role: "user" | "assistant"; content: string }> = recentHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({ role: "user", content: userMessage });
    
    return messages;
  }

  private async updateConversationHistory(userMessage: string, assistantResponse: string) {
    const now = Date.now();

    const newHistory = [
      ...this.state.conversationHistory,
      { role: "user" as const, content: userMessage, timestamp: now },
      { role: "assistant" as const, content: assistantResponse, timestamp: now },
    ].slice(-20);

    this.state = {
      conversationHistory: newHistory,
      interactionCount: this.state.interactionCount + 1,
    };

    await this.ctx.storage.put("state", this.state);
  }
}
