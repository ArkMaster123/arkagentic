/**
 * AgentVerse Cloudflare Agents - Main Entry Point
 * 
 * This worker routes requests to the appropriate agent Durable Object.
 * Each agent (Sage, Scout, etc.) runs as its own persistent Durable Object
 * with embedded SQLite for memory and state management.
 */

import type { Env } from "./env.d";

// Re-export the agent classes so Cloudflare can instantiate them
export { SageAgentSimple as SageAgent } from "./agents/sage-simple";

/**
 * Available agents and their metadata
 */
const AGENTS = {
  sage: {
    name: "Sage",
    emoji: "🧙",
    role: "Strategic Analyst",
    binding: "SageAgent",
  },
  // Future agents will be added here:
  // scout: { name: "Scout", emoji: "🔍", role: "Research Specialist", binding: "ScoutAgent" },
  // chronicle: { name: "Chronicle", emoji: "✍️", role: "Newsroom Editor", binding: "ChronicleAgent" },
  // trends: { name: "Trends", emoji: "📈", role: "Intelligence Analyst", binding: "TrendsAgent" },
  // maven: { name: "Maven", emoji: "👋", role: "General Assistant", binding: "MavenAgent" },
  // gandalfius: { name: "Gandalfius", emoji: "🧙‍♂️", role: "Freelancing Wizard", binding: "GandalfiusAgent" },
} as const;

type AgentType = keyof typeof AGENTS;

/**
 * Main worker fetch handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Root health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({
        status: "ok",
        service: "agentverse-cloudflare-agents",
        agents: Object.keys(AGENTS),
      });
    }

    // API routes - our custom endpoints
    if (url.pathname.startsWith("/api/")) {
      return addCorsHeaders(await handleApiRoute(request, env, url));
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handle API routes
 */
async function handleApiRoute(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace("/api/", "");

  // List available agents
  if (path === "agents" && request.method === "GET") {
    return Response.json({
      agents: Object.entries(AGENTS).map(([id, info]) => ({
        id,
        ...info,
      })),
    });
  }

  // Route to specific agent
  const agentMatch = path.match(/^agent\/(\w+)(\/.*)?$/);
  if (agentMatch) {
    const [, agentType, subPath] = agentMatch;
    return routeToAgent(request, env, agentType as AgentType, subPath || "/");
  }

  // Chat endpoint - routes to the appropriate agent
  if (path === "chat" || path === "chat/stream") {
    return handleChatRoute(request, env, path.includes("stream"));
  }

  return Response.json({ error: "Unknown API route" }, { status: 404 });
}

/**
 * Route request to a specific agent Durable Object
 * This bypasses the agents SDK routing and calls the DO directly
 */
async function routeToAgent(
  request: Request,
  env: Env,
  agentType: AgentType,
  subPath: string,
  body?: object
): Promise<Response> {
  const agentInfo = AGENTS[agentType];
  if (!agentInfo) {
    return Response.json({ error: `Unknown agent: ${agentType}` }, { status: 404 });
  }

  // Get the Durable Object binding directly
  const binding = env.SageAgent; // For now, only Sage
  if (!binding) {
    return Response.json({ error: `Agent binding not found` }, { status: 500 });
  }

  // Get or create the agent instance (using a singleton ID for now)
  const id = binding.idFromName("singleton");
  const stub = binding.get(id);

  // Build the request URL for the Durable Object
  const agentUrl = new URL(request.url);
  agentUrl.pathname = subPath;

  // Create request with body if provided
  const newRequest = new Request(agentUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : request.body,
  });

  return stub.fetch(newRequest);
}

/**
 * Handle chat requests - routes to the appropriate agent based on content
 */
async function handleChatRoute(request: Request, env: Env, stream: boolean): Promise<Response> {
  try {
    const body = await request.json() as { message: string; agent?: string; modelId?: string; playerId?: string };
    const { message, agent: requestedAgent, modelId, playerId } = body;

    // Determine which agent to use
    const agentType = (requestedAgent as AgentType) || routeByContent(message);
    
    // Route to the agent's chat endpoint
    const subPath = stream ? "/chat/stream" : "/chat";

    return routeToAgent(request, env, agentType, subPath, { message, modelId, playerId });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * Simple content-based routing (matches Strands agent routing)
 */
function routeByContent(query: string): AgentType {
  const queryLower = query.toLowerCase();

  // Analysis keywords -> Sage
  if (
    ["analyze", "compare", "versus", "vs", "strategy", "recommend", "should", "pros and cons", "evaluate"]
      .some(kw => queryLower.includes(kw))
  ) {
    return "sage";
  }

  // Default to sage for now (only agent implemented)
  return "sage";
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return newResponse;
}
