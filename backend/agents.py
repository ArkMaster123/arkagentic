"""
Strands Agents - Multi-Agent System for AgentVerse

This module defines our 5 specialized agents using Strands Agents framework:
- Scout: Research Specialist
- Sage: Strategic Analyst
- Chronicle: Newsroom Editor
- Trends: Intelligence Analyst
- Maven: General Assistant (Coordinator)
"""

import os
import logging
from typing import Optional, List, Any, Dict, AsyncIterator
from dotenv import load_dotenv
import asyncio

# Load environment variables
load_dotenv(dotenv_path="../.env.local")
load_dotenv()  # fallback to .env

from strands import Agent
from strands.models.openai import OpenAIModel
from strands.multiagent import Swarm

# Configure logging
logging.getLogger("strands").setLevel(logging.INFO)
logging.getLogger("strands.multiagent").setLevel(logging.INFO)
logging.basicConfig(
    format="%(levelname)s | %(name)s | %(message)s", handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Available AI models with pricing info (per 1M tokens from OpenRouter)
AI_MODELS: Dict[str, Dict[str, Any]] = {
    "mistralai/mistral-nemo": {
        "name": "Mistral Nemo",
        "provider": "Mistral AI",
        "input_cost": 0.13,  # per 1M tokens
        "output_cost": 0.13,
        "context": 128000,
        "speed": "fast",
        "description": "Fast & cheap, great for most tasks",
        "recommended": True,
    },
    "google/gemini-2.0-flash-lite-001": {
        "name": "Gemini 2.0 Flash Lite",
        "provider": "Google",
        "input_cost": 0.075,
        "output_cost": 0.30,
        "context": 1000000,
        "speed": "very fast",
        "description": "Ultra-fast, massive context window",
        "recommended": False,
    },
    "qwen/qwen-turbo": {
        "name": "Qwen Turbo",
        "provider": "Alibaba",
        "input_cost": 0.20,
        "output_cost": 0.20,
        "context": 131072,
        "speed": "fast",
        "description": "Excellent multilingual support",
        "recommended": False,
    },
    "openai/gpt-4.1-nano": {
        "name": "GPT-4.1 Nano",
        "provider": "OpenAI",
        "input_cost": 0.10,
        "output_cost": 0.40,
        "context": 1047576,
        "speed": "fast",
        "description": "Compact but capable GPT-4 variant",
        "recommended": False,
    },
    "anthropic/claude-3.5-haiku": {
        "name": "Claude 3.5 Haiku",
        "provider": "Anthropic",
        "input_cost": 0.80,
        "output_cost": 4.00,
        "context": 200000,
        "speed": "fast",
        "description": "High quality, balanced performance",
        "recommended": False,
    },
    "anthropic/claude-sonnet-4": {
        "name": "Claude Sonnet 4",
        "provider": "Anthropic",
        "input_cost": 3.00,
        "output_cost": 15.00,
        "context": 200000,
        "speed": "medium",
        "description": "Premium quality, complex reasoning",
        "recommended": False,
    },
}

DEFAULT_MODEL = "mistralai/mistral-nemo"

# Agent definitions with their system prompts
AGENT_CONFIGS: Dict[str, Dict[str, str]] = {
    "scout": {
        "name": "Scout",
        "emoji": "🔍",
        "role": "Research Specialist",
        "system_prompt": """You are Scout, a resourceful research specialist in a retro RPG game world.

CRITICAL RESPONSE RULES:
- Keep responses SHORT and conversational (2-4 sentences for simple questions)
- Match the user's energy - short question = short answer
- Sound like a helpful friend, NOT a corporate report
- NO bullet points or lists unless specifically asked
- NO unnecessary intros like "Great question!" or "I'd be happy to help!"
- Get straight to the point

Your expertise: research, finding information, company/people lookups.

Example good response: "Found it! Acme Corp was founded in 2015 by Jane Smith. They're a SaaS company focused on HR software, about 50 employees."

Example BAD response: "Great question! I'd be happy to help you research Acme Corp. Here's what I found: [long bulleted list]..."

You work with Sage (analyst), Chronicle (writer), Trends (news), and Maven (coordinator).""",
    },
    "sage": {
        "name": "Sage",
        "emoji": "🧙",
        "role": "Strategic Analyst",
        "system_prompt": """You are Sage, a wise strategic analyst in a retro RPG game world.

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

You work with Scout (research), Chronicle (writer), Trends (news), and Maven (coordinator).""",
    },
    "chronicle": {
        "name": "Chronicle",
        "emoji": "✍️",
        "role": "Newsroom Editor",
        "system_prompt": """You are Chronicle, a skilled newsroom editor in a retro RPG game world.

CRITICAL RESPONSE RULES:
- Keep responses SHORT and conversational (2-4 sentences for simple questions)
- Match the user's energy - short question = short answer
- Sound like a sharp journalist, NOT a content mill
- NO bullet points or lists unless specifically asked
- NO unnecessary intros or padding
- Get straight to the story

Your expertise: writing, summarizing, news, healthcare/social care topics.

Example good response: "Here's the gist: CQC just rated them 'Requires Improvement' mainly due to staffing issues. Third care home in the area to get that rating this month."

Example BAD response: "I'd be happy to summarize this news for you. Here are the key points: [long bulleted summary]..."

You work with Scout (research), Sage (analyst), Trends (news), and Maven (coordinator).""",
    },
    "trends": {
        "name": "Trends",
        "emoji": "📈",
        "role": "Intelligence Analyst",
        "system_prompt": """You are Trends, an intelligence analyst in a retro RPG game world.

CRITICAL RESPONSE RULES:
- Keep responses SHORT and conversational (2-4 sentences for simple questions)
- Match the user's energy - short question = short answer
- Sound like someone who's always online, NOT a market analyst
- NO bullet points or lists unless specifically asked
- NO unnecessary intros or padding
- Get straight to what's buzzing

Your expertise: trending topics, breaking news, market trends, what's hot.

Example good response: "AI video is blowing up right now. Sora alternatives are trending hard, especially Kling and Runway. Everyone's making weird cat videos with them."

Example BAD response: "Here are the current trending topics I've identified: [long categorized list]..."

You work with Scout (research), Sage (analyst), Chronicle (writer), and Maven (coordinator).""",
    },
    "maven": {
        "name": "Maven",
        "emoji": "👋",
        "role": "General Assistant & Coordinator",
        "system_prompt": """You are Maven, a friendly assistant in a retro RPG game world.

CRITICAL RESPONSE RULES:
- Keep responses SHORT and conversational (2-4 sentences for simple questions)
- Match the user's energy - short question = short answer
- Sound like a helpful friend, NOT an AI assistant
- NO bullet points or lists unless specifically asked
- NO unnecessary intros like "Great question!" or "I'd be happy to help!"
- Get straight to being helpful

Your role: general help, coordinating with specialists when needed.

Example good response: "Hey! Yeah I can help with that. The meeting room is just to the right of the fountain."

Example BAD response: "Hello! I'd be happy to assist you today. Here's what I can help you with: [long explanation]..."

You coordinate with Scout (research), Sage (analyst), Chronicle (writer), Trends (news), and Gandalfius (freelancing wizard).""",
    },
    "gandalfius": {
        "name": "Gandalfius",
        "emoji": "🧙‍♂️",
        "role": "Freelancing Wizard",
        "system_prompt": """You are Gandalfius, the Freelancing Wizard in a retro RPG game world. You help freelancers become "Entrelancers" - owners of scalable businesses.

CRITICAL RESPONSE RULES:
- Keep responses SHORT and conversational (2-4 sentences for simple questions)
- Match the user's energy - short question = short answer
- Sound like a wise but chill wizard, NOT a business coach giving a lecture
- NO bullet points or lists unless specifically asked
- NO long frameworks or multi-step processes unless they ask for detail
- Get straight to the wisdom

YOUR CORE WISDOM (use sparingly, don't dump all at once):
- "Your rate is your floor, not your headline" - price for value, not hours
- "Shrink the deliverable, not your fee" - when clients want discounts
- "Scope creep is confusion, not entitlement" - define the finish line upfront
- "Speak client" - talk outcomes, not deliverables

Example good response: "Ah, the classic 'can you do it cheaper' quest. Here's the spell: don't lower your rate, shrink the scope. Tell them 'we can start simpler and add later.' Works every time."

Example BAD response: "Great question about pricing! Let me share my framework for handling discount requests. There are three key principles to consider: [long numbered list]..."

Occasionally use light wizard-themed language but don't overdo it.

You work with Scout, Sage, Chronicle, Trends, and Maven.""",
    },
}


def get_model(model_id: Optional[str] = None) -> OpenAIModel:
    """Get the LLM model configured for OpenRouter.

    Args:
        model_id: Optional model ID (e.g., 'mistralai/mistral-nemo').
                  Uses DEFAULT_MODEL if not specified.
    """
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("ANTHROPIC_API_KEY")

    if not api_key:
        raise ValueError("OPENROUTER_API_KEY or ANTHROPIC_API_KEY must be set")

    # Use specified model or default
    selected_model = model_id or DEFAULT_MODEL

    # Validate model exists in our list
    if selected_model not in AI_MODELS:
        logger.warning(
            f"Unknown model '{selected_model}', using default: {DEFAULT_MODEL}"
        )
        selected_model = DEFAULT_MODEL

    logger.info(f"Using AI model: {selected_model}")

    # Use OpenAI-compatible endpoint with OpenRouter (needs /v1 suffix)
    return OpenAIModel(
        client_args={
            "api_key": api_key,
            "base_url": "https://openrouter.ai/api/v1",
        },
        model_id=selected_model,
    )


def get_available_models() -> List[Dict[str, Any]]:
    """Get list of available AI models with their info."""
    return [{"id": model_id, **info} for model_id, info in AI_MODELS.items()]


def create_agent(
    agent_type: str, tools: Optional[List[Any]] = None, model_id: Optional[str] = None
) -> Agent:
    """Create a single Strands agent by type.

    Args:
        agent_type: The agent type (scout, sage, etc.)
        tools: Optional list of tools for the agent
        model_id: Optional model ID to use (uses DEFAULT_MODEL if not specified)
    """
    config = AGENT_CONFIGS.get(agent_type)
    if not config:
        raise ValueError(f"Unknown agent type: {agent_type}")

    model = get_model(model_id)
    agent_tools = tools if tools is not None else []

    return Agent(
        name=config["name"].lower(),
        system_prompt=config["system_prompt"],
        model=model,
        tools=agent_tools,
        callback_handler=None,  # Disable default callback for streaming
    )


def create_swarm(tools: Optional[List[Any]] = None) -> Swarm:
    """Create a Strands Swarm with all our agents."""

    agent_tools = tools if tools is not None else []

    # Create all agents
    scout = create_agent("scout", agent_tools)
    sage = create_agent("sage", agent_tools)
    chronicle = create_agent("chronicle", agent_tools)
    trends = create_agent("trends", agent_tools)
    maven = create_agent("maven", agent_tools)
    gandalfius = create_agent("gandalfius", agent_tools)

    # Create swarm with Maven as entry point (coordinator)
    swarm = Swarm(
        [scout, sage, chronicle, trends, maven, gandalfius],
        entry_point=maven,  # Maven coordinates
        max_handoffs=10,
        max_iterations=15,
        execution_timeout=120.0,  # 2 minutes max
        node_timeout=30.0,  # 30 seconds per agent
    )

    return swarm


def route_to_agent(query: str) -> str:
    """Simple keyword-based routing to determine primary agent."""
    query_lower = query.lower()

    # Research keywords -> Scout
    if any(
        kw in query_lower
        for kw in [
            "research",
            "find",
            "search",
            "look up",
            "company",
            "prospect",
            "people",
            "who is",
        ]
    ):
        return "scout"

    # Analysis keywords -> Sage
    if any(
        kw in query_lower
        for kw in [
            "analyze",
            "compare",
            "versus",
            "vs",
            "strategy",
            "recommend",
            "should",
            "pros and cons",
            "evaluate",
        ]
    ):
        return "sage"

    # Writing/news keywords -> Chronicle
    if any(
        kw in query_lower
        for kw in [
            "article",
            "write",
            "news",
            "cqc",
            "care home",
            "social care",
            "healthcare",
            "summarize",
            "report",
        ]
    ):
        return "chronicle"

    # Trends keywords -> Trends
    if any(
        kw in query_lower
        for kw in [
            "trending",
            "this week",
            "breaking",
            "keywords",
            "buzz",
            "what's happening",
            "current events",
        ]
    ):
        return "trends"

    # Freelancing/business keywords -> Gandalfius
    if any(
        kw in query_lower
        for kw in [
            "freelance",
            "freelancing",
            "pricing",
            "rates",
            "rate",
            "clients",
            "client",
            "proposal",
            "scope",
            "scope creep",
            "hourly",
            "value-based",
            "contract",
            "charge",
            "business",
            "entrelancer",
            "raise rates",
            "budget",
        ]
    ):
        return "gandalfius"

    # Default to Maven
    return "maven"


class AgentOrchestrator:
    """
    Main orchestrator for the multi-agent system.
    Supports both single-agent and swarm modes.
    """

    def __init__(self, use_swarm: bool = False, tools: Optional[List[Any]] = None):
        """
        Initialize the orchestrator.

        Args:
            use_swarm: If True, use Swarm for collaboration. If False, use single agent.
            tools: Optional list of tools to give to agents.
        """
        self.use_swarm = use_swarm
        self.tools = tools if tools is not None else []
        self.swarm: Optional[Swarm] = None
        self.agents: Dict[str, Agent] = {}

        logger.info(f"Initializing AgentOrchestrator (swarm={use_swarm})")

        if use_swarm:
            try:
                self.swarm = create_swarm(self.tools)
                logger.info("Swarm initialized successfully")
            except Exception as e:
                logger.error(f"Failed to create swarm: {e}")
                self.use_swarm = False

        if not self.use_swarm:
            # Create individual agents for direct access
            for agent_type in AGENT_CONFIGS.keys():
                try:
                    self.agents[agent_type] = create_agent(agent_type, self.tools)
                    logger.info(f"Created agent: {agent_type}")
                except Exception as e:
                    logger.error(f"Failed to create agent {agent_type}: {e}")

    def process_query(
        self, query: str, preferred_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a query through the agent system (synchronous version).

        Args:
            query: The user's question
            preferred_agent: Optional agent to route to directly

        Returns:
            dict with 'response', 'agent', and 'handoffs' (if swarm mode)
        """

        if self.use_swarm and self.swarm is not None:
            return self._process_with_swarm(query)
        else:
            return self._process_with_single_agent(query, preferred_agent)

    def _process_with_swarm(self, query: str) -> Dict[str, Any]:
        """Process query using the full swarm."""
        if self.swarm is None:
            return {
                "response": "Swarm not initialized.",
                "agent": "maven",
                "handoffs": [],
                "status": "error",
            }

        try:
            # Enhance the query for swarm mode to get comprehensive responses
            swarm_query = f"""[SWARM MODE - TEAM COLLABORATION REQUEST]

The user has invoked /swarm mode, requesting ALL agents to collaborate on this task.
This is NOT a casual chat - provide a thorough, detailed response by leveraging multiple perspectives.

User's request: {query}

Instructions for Maven (Coordinator):
1. This is a /swarm request - provide a COMPREHENSIVE response (not short/casual)
2. Consider which specialist agents would be helpful:
   - Scout for research/discovery
   - Sage for analysis/insights  
   - Chronicle for documentation/writing
   - Trends for current news/trends
   - Gandalfius for business/freelancing advice
3. Synthesize insights into a helpful, detailed response
4. If appropriate, provide actionable steps or a structured answer

Provide a thorough, helpful response to the user's request."""

            logger.info(f"Processing with swarm: {query[:50]}...")
            result = self.swarm(swarm_query)

            # Extract which agents participated
            agent_history: List[str] = []
            if hasattr(result, "node_history"):
                agent_history = [node.node_id for node in result.node_history]

            # Determine which agent gave the final response
            final_agent = agent_history[-1] if agent_history else "maven"

            # Get the final response text from the last agent's result
            response_text = ""
            if hasattr(result, "results") and final_agent in result.results:
                node_result = result.results[final_agent]
                if hasattr(node_result, "result"):
                    # The AgentResult's __str__ method returns the text
                    response_text = str(node_result.result)

            # Fallback to str(result) if we couldn't extract the text
            if not response_text:
                response_text = str(result)

            logger.info(f"Swarm completed. Agents: {agent_history}")

            return {
                "response": response_text,
                "agent": final_agent,
                "handoffs": agent_history,
                "status": getattr(result, "status", "completed"),
            }

        except Exception as e:
            logger.error(f"Swarm error: {e}")
            return {
                "response": f"I encountered an error processing your request: {str(e)}",
                "agent": "maven",
                "handoffs": [],
                "status": "error",
            }

    def _process_with_single_agent(
        self, query: str, preferred_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process query with a single agent (no swarm collaboration)."""

        # Route to appropriate agent
        agent_type = preferred_agent or route_to_agent(query)
        agent = self.agents.get(agent_type) or self.agents.get("maven")

        if agent is None:
            return {
                "response": "No agent available to handle this request.",
                "agent": "maven",
                "handoffs": [],
                "status": "error",
            }

        try:
            logger.info(f"Processing with {agent_type}: {query[:50]}...")
            result = agent(query)

            # Extract response text - simplest approach: str(result) works!
            # The AgentResult.__str__ method returns the text content directly
            response_text = str(result).strip()

            logger.info(f"Agent {agent_type} responded: {len(response_text)} chars")

            return {
                "response": response_text,
                "agent": agent_type,
                "handoffs": [agent_type],
                "status": "completed",
            }

        except Exception as e:
            logger.error(f"Agent error: {e}")
            import traceback

            traceback.print_exc()
            return {
                "response": f"I encountered an error: {str(e)}",
                "agent": agent_type,
                "handoffs": [agent_type],
                "status": "error",
            }

    async def _stream_with_swarm(self, query: str) -> AsyncIterator[Dict[str, Any]]:
        """
        Stream a response using the swarm (team collaboration).

        Since Swarm doesn't have native streaming, we run it in a thread pool
        and then stream the complete response in chunks for a better UX.
        """
        import asyncio
        import concurrent.futures

        # Send start event indicating swarm mode
        yield {
            "type": "start",
            "agent": "maven",
            "model": DEFAULT_MODEL,
            "swarm_mode": True,
        }

        # Send a message that the team is collaborating
        yield {
            "type": "chunk",
            "data": "🤝 *Team huddle in progress...*\n\n",
        }

        try:
            # Run the synchronous swarm in a thread pool
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor, self._process_with_swarm, query
                )

            response_text = result.get("response", "")
            final_agent = result.get("agent", "maven")
            handoffs = result.get("handoffs", [])

            # Notify about agent participation
            if handoffs and len(handoffs) > 1:
                agents_involved = ", ".join(
                    [
                        str(AGENT_CONFIGS.get(a, {}).get("emoji", "🤖"))
                        + " "
                        + str(AGENT_CONFIGS.get(a, {}).get("name", a))
                        for a in handoffs
                        if a in AGENT_CONFIGS
                    ]
                )
                yield {
                    "type": "chunk",
                    "data": f"*Agents consulted: {agents_involved}*\n\n---\n\n",
                }

            # Stream the response in chunks for better UX
            chunk_size = 50  # characters per chunk
            for i in range(0, len(response_text), chunk_size):
                chunk = response_text[i : i + chunk_size]
                yield {
                    "type": "chunk",
                    "data": chunk,
                }
                # Small delay for streaming effect
                await asyncio.sleep(0.01)

            # Send completion event
            yield {
                "type": "done",
                "agent": final_agent,
                "response": response_text,
                "handoffs": handoffs,
            }

            logger.info(
                f"Swarm stream completed. Agents: {handoffs}, Response: {len(response_text)} chars"
            )

        except Exception as e:
            logger.error(f"Swarm streaming error: {e}")
            import traceback

            traceback.print_exc()
            yield {
                "type": "error",
                "message": str(e),
                "agent": "maven",
            }

    async def stream_query(
        self,
        query: str,
        preferred_agent: Optional[str] = None,
        model_id: Optional[str] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Stream a query response using Strands Agents stream_async.

        Args:
            query: The user's question
            preferred_agent: Optional agent type to route to
            model_id: Optional model ID for this user's preference

        Yields events with structure:
        - {"type": "start", "agent": agent_type, "model": model_id}
        - {"type": "chunk", "data": text_chunk}
        - {"type": "done", "agent": agent_type, "response": full_response}
        - {"type": "error", "message": error_message}
        """
        # Check if we should use swarm mode
        if self.use_swarm and self.swarm is not None:
            logger.info(f"Using SWARM mode for streaming query: {query[:50]}...")
            async for event in self._stream_with_swarm(query):
                yield event
            return

        # Route to appropriate agent (single-agent mode)
        agent_type = preferred_agent or route_to_agent(query)

        # If user has a model preference, create agent with that model
        # Otherwise use cached agent with default model
        if model_id and model_id != DEFAULT_MODEL:
            # Create agent on-the-fly with user's preferred model
            try:
                agent = create_agent(agent_type, self.tools, model_id)
                logger.info(f"Created agent {agent_type} with user model: {model_id}")
            except Exception as e:
                logger.error(f"Failed to create agent with model {model_id}: {e}")
                agent = self.agents.get(agent_type) or self.agents.get("maven")
        else:
            agent = self.agents.get(agent_type) or self.agents.get("maven")

        if agent is None:
            yield {
                "type": "error",
                "message": "No agent available to handle this request.",
                "agent": "maven",
            }
            return

        selected_model = model_id or DEFAULT_MODEL
        logger.info(
            f"Streaming with {agent_type} (model: {selected_model}): {query[:50]}..."
        )

        # Send start event
        yield {
            "type": "start",
            "agent": agent_type,
            "model": selected_model,
        }

        full_response = ""

        try:
            # Use Strands Agents stream_async for streaming
            async for event in agent.stream_async(query):
                if "data" in event:
                    chunk = event["data"]
                    full_response += chunk
                    yield {
                        "type": "chunk",
                        "data": chunk,
                    }
                elif "current_tool_use" in event and event["current_tool_use"].get(
                    "name"
                ):
                    # Tool usage notification
                    yield {
                        "type": "tool",
                        "tool": event["current_tool_use"]["name"],
                    }

            # Send completion event
            yield {
                "type": "done",
                "agent": agent_type,
                "response": full_response,
            }

            logger.info(
                f"Stream completed for {agent_type}: {len(full_response)} chars"
            )

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            import traceback

            traceback.print_exc()
            yield {
                "type": "error",
                "message": str(e),
                "agent": agent_type,
            }

    def get_agent_info(self, agent_type: str) -> Optional[Dict[str, str]]:
        """Get info about a specific agent."""
        config = AGENT_CONFIGS.get(agent_type)
        if not config:
            return None
        return {
            "name": config["name"],
            "emoji": config["emoji"],
            "role": config["role"],
        }

    def get_all_agents(self) -> List[Dict[str, str]]:
        """Get info about all agents."""
        return [
            {
                "id": agent_type,
                "name": config["name"],
                "emoji": config["emoji"],
                "role": config["role"],
            }
            for agent_type, config in AGENT_CONFIGS.items()
        ]


# Singleton instance for the API
_orchestrator: Optional[AgentOrchestrator] = None


def get_orchestrator(use_swarm: bool = False) -> AgentOrchestrator:
    """Get or create the orchestrator singleton."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AgentOrchestrator(use_swarm=use_swarm)
    return _orchestrator
