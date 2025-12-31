"""
FastAPI Server for AgentVerse

Exposes the Strands Agents multi-agent system via REST API.
"""

import os
import logging
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env.local")
load_dotenv()

from agents import get_orchestrator, route_to_agent, AGENT_CONFIGS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Request/Response models
class ChatRequest(BaseModel):
    message: str
    agent: Optional[str] = None  # Optional: force a specific agent
    use_swarm: bool = (
        False  # Whether to use swarm collaboration (disabled by default for speed)
    )


class ChatResponse(BaseModel):
    response: str
    agent: str
    agent_name: str
    agent_emoji: str
    handoffs: List[str]
    status: str


class AgentInfo(BaseModel):
    id: str
    name: str
    emoji: str
    role: str


class RouteResponse(BaseModel):
    agent: str
    agent_name: str
    agent_emoji: str


# Lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup."""
    logger.info("Starting AgentVerse API server...")
    logger.info("Initializing Strands Agents orchestrator...")

    # Pre-initialize the orchestrator
    try:
        orchestrator = get_orchestrator(use_swarm=False)
        logger.info(
            f"Orchestrator initialized with {len(orchestrator.get_all_agents())} agents"
        )
    except Exception as e:
        logger.error(f"Failed to initialize orchestrator: {e}")
        import traceback

        traceback.print_exc()

    yield

    logger.info("Shutting down AgentVerse API server...")


# Create FastAPI app
app = FastAPI(
    title="AgentVerse API",
    description="Multi-agent system powered by Strands Agents",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "agentverse-api"}


@app.get("/agents", response_model=List[AgentInfo])
async def list_agents():
    """List all available agents."""
    orchestrator = get_orchestrator()
    return orchestrator.get_all_agents()


@app.get("/agents/{agent_id}", response_model=AgentInfo)
async def get_agent(agent_id: str):
    """Get info about a specific agent."""
    orchestrator = get_orchestrator()
    agent_info = orchestrator.get_agent_info(agent_id)
    if not agent_info:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return {"id": agent_id, **agent_info}


@app.post("/route", response_model=RouteResponse)
async def route_query(request: ChatRequest):
    """Route a query to determine which agent would handle it."""
    agent_type = route_to_agent(request.message)
    config = AGENT_CONFIGS.get(agent_type, AGENT_CONFIGS["maven"])

    return {
        "agent": agent_type,
        "agent_name": config["name"],
        "agent_emoji": config["emoji"],
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to the agent system.

    If use_swarm=True, agents will collaborate via Strands Swarm.
    If use_swarm=False (default), a single agent handles the request.
    """
    logger.info(
        f"Chat request: '{request.message[:50]}...' (swarm={request.use_swarm})"
    )

    try:
        orchestrator = get_orchestrator(use_swarm=request.use_swarm)
        result = orchestrator.process_query(
            query=request.message, preferred_agent=request.agent
        )

        # Get agent info for response
        agent_type = result.get("agent", "maven")
        config = AGENT_CONFIGS.get(agent_type, AGENT_CONFIGS["maven"])

        response = ChatResponse(
            response=result["response"],
            agent=agent_type,
            agent_name=config["name"],
            agent_emoji=config["emoji"],
            handoffs=result.get("handoffs", []),
            status=result.get("status", "completed"),
        )

        logger.info(
            f"Response from {agent_type}: {len(result['response'])} chars, handoffs: {result.get('handoffs', [])}"
        )
        return response

    except Exception as e:
        logger.error(f"Chat error: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# Legacy endpoint for compatibility with existing frontend
@app.post("/api/aisdk")
async def legacy_chat(request: dict):
    """Legacy endpoint for backwards compatibility."""
    message = request.get("message", "")
    agent = request.get("agent")

    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    try:
        orchestrator = get_orchestrator(use_swarm=False)
        result = orchestrator.process_query(query=message, preferred_agent=agent)

        return {
            "response": result["response"],
            "agent": result.get("agent", "maven"),
            "handoffs": result.get("handoffs", []),
        }

    except Exception as e:
        logger.error(f"Legacy chat error: {e}")
        import traceback

        traceback.print_exc()
        return {"response": f"Error: {str(e)}", "agent": "maven", "handoffs": []}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "3001"))
    logger.info(f"Starting server on port {port}...")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True, log_level="info")
