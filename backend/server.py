"""
FastAPI Server for AgentVerse

Exposes the Strands Agents multi-agent system via REST API.
Includes database integration for multiplayer persistence.
"""

import os
import logging
from typing import Optional, List
from contextlib import asynccontextmanager
from datetime import datetime
import uuid

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv(dotenv_path="../.env.local")
load_dotenv()

from agents import (
    get_orchestrator,
    route_to_agent,
    AGENT_CONFIGS,
    AI_MODELS,
    DEFAULT_MODEL,
    get_available_models,
)
import database as db

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
    model_id: Optional[str] = None  # Optional: user's preferred AI model


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


# =============================================================================
# USER MODELS
# =============================================================================


class CreateUserRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=50)
    avatar_sprite: str = "brendan"
    session_token: Optional[str] = None  # Client-generated session token


class UpdateUserRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=50)
    avatar_sprite: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    display_name: str
    avatar_sprite: str
    is_anonymous: bool
    created_at: datetime
    session_token: Optional[str] = None  # Returned on creation only


# =============================================================================
# ROOM MODELS
# =============================================================================


class BuildingResponse(BaseModel):
    id: str
    name: str
    type: str
    x: int
    y: int
    width: int
    height: int
    door_x: Optional[int] = None
    door_y: Optional[int] = None
    door_width: Optional[int] = None
    door_height: Optional[int] = None
    trigger_message: Optional[str] = None
    agent_slug: Optional[str] = None
    target_room_slug: Optional[str] = None
    jitsi_room: Optional[str] = None


class SpawnPointResponse(BaseModel):
    id: str
    x: int
    y: int
    type: str
    direction: str
    priority: int
    agent_slug: Optional[str] = None


class RoomResponse(BaseModel):
    id: str
    slug: str
    name: str
    tilemap_key: str
    width_tiles: int
    height_tiles: int
    tile_size: int
    default_spawn_x: int
    default_spawn_y: int
    is_main: bool
    buildings: Optional[List[BuildingResponse]] = None
    spawn_points: Optional[List[SpawnPointResponse]] = None


class RoomListResponse(BaseModel):
    id: str
    slug: str
    name: str
    tilemap_key: str
    is_main: bool


# =============================================================================
# AGENT MODELS (from database)
# =============================================================================


class AgentDBResponse(BaseModel):
    id: str
    slug: str
    name: str
    role: str
    emoji: str
    sprite_key: str
    greeting: Optional[str] = None
    routing_keywords: Optional[List[str]] = None
    system_prompt: Optional[str] = None


# =============================================================================
# CHAT MODELS
# =============================================================================


class ChatSessionRequest(BaseModel):
    session_type: str = "agent"  # agent, private, room
    agent_slug: Optional[str] = None
    other_user_id: Optional[str] = None


class ChatMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    sender_name: Optional[str] = None


# Client-side debug logging (for mobile debugging)
class ClientLogRequest(BaseModel):
    level: str = "info"
    message: str
    data: Optional[dict] = None
    user_agent: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: str
    sender_type: str
    sender_id: str
    sender_name: str
    content: str
    created_at: datetime


class ChatSessionResponse(BaseModel):
    id: str
    type: str
    created_at: datetime
    messages: Optional[List[ChatMessageResponse]] = None


# Lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup."""
    logger.info("Starting AgentVerse API server...")

    # Initialize database connection pool
    try:
        await db.get_pool()
        logger.info("Database connection pool initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database pool: {e}")
        import traceback

        traceback.print_exc()

    # Pre-initialize the orchestrator
    logger.info("Initializing Strands Agents orchestrator...")
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

    # Cleanup
    logger.info("Shutting down AgentVerse API server...")
    await db.close_pool()
    logger.info("Database pool closed")


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
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "agentverse-api"}


@app.post("/api/client-log")
async def client_log(request: ClientLogRequest):
    """Receive logs from client for debugging mobile issues."""
    log_msg = f"[CLIENT] [{request.level.upper()}] {request.message}"
    if request.data:
        log_msg += f" | Data: {json.dumps(request.data)}"
    if request.user_agent:
        log_msg += f" | UA: {request.user_agent[:100]}"

    # Print directly to stdout to ensure it shows in journalctl
    print(log_msg, flush=True)

    return {"status": "logged"}


@app.get("/models")
@app.get("/api/models")
async def list_models():
    """List available AI models with pricing info."""
    return {
        "models": get_available_models(),
        "default": DEFAULT_MODEL,
    }


@app.get("/agents", response_model=List[AgentInfo])
@app.get("/api/agents", response_model=List[AgentInfo])
async def list_agents():
    """List all available agents."""
    orchestrator = get_orchestrator()
    return orchestrator.get_all_agents()


@app.get("/agents/{agent_id}", response_model=AgentInfo)
@app.get("/api/agents/{agent_id}", response_model=AgentInfo)
async def get_agent(agent_id: str):
    """Get info about a specific agent."""
    orchestrator = get_orchestrator()
    agent_info = orchestrator.get_agent_info(agent_id)
    if not agent_info:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return {"id": agent_id, **agent_info}


@app.post("/route", response_model=RouteResponse)
@app.post("/api/route", response_model=RouteResponse)
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
@app.post("/api/chat", response_model=ChatResponse)
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


# Streaming chat endpoint for real-time responses
@app.post("/chat/stream")
@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Stream a message response from the agent system.

    Returns Server-Sent Events (SSE) with the following event types:
    - start: {"type": "start", "agent": "agent_type", "model": "model_id"}
    - chunk: {"type": "chunk", "data": "text chunk"}
    - done: {"type": "done", "agent": "agent_type", "response": "full response"}
    - error: {"type": "error", "message": "error message"}
    """
    model_display = request.model_id or DEFAULT_MODEL
    logger.info(
        f"Streaming chat request (model: {model_display}, swarm: {request.use_swarm}): '{request.message[:50]}...'"
    )

    async def generate():
        try:
            orchestrator = get_orchestrator(use_swarm=request.use_swarm)

            async for event in orchestrator.stream_query(
                query=request.message,
                preferred_agent=request.agent,
                model_id=request.model_id,
            ):
                # Format as SSE
                yield f"data: {json.dumps(event)}\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            import traceback

            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


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


# =============================================================================
# USER API ENDPOINTS
# =============================================================================


@app.post("/api/users", response_model=UserResponse)
async def create_user(request: CreateUserRequest):
    """Create a new anonymous user with session token."""
    import secrets

    try:
        # Generate session token if not provided
        session_token = request.session_token or secrets.token_hex(32)

        user = await db.create_user_with_session(
            display_name=request.display_name,
            avatar_sprite=request.avatar_sprite,
            session_token=session_token,
        )
        return UserResponse(
            id=str(user["id"]),
            display_name=user["display_name"],
            avatar_sprite=user["avatar_sprite"],
            is_anonymous=user["is_anonymous"],
            created_at=user["created_at"],
            session_token=session_token,  # Return token to client
        )
    except Exception as e:
        logger.error(f"Failed to create user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")


@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get a user by ID."""
    try:
        user = await db.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Update last seen
        await db.update_user_last_seen(user_id)

        return UserResponse(
            id=str(user["id"]),
            display_name=user["display_name"],
            avatar_sprite=user["avatar_sprite"],
            is_anonymous=user["is_anonymous"],
            created_at=user["created_at"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user")


@app.post("/api/auth/validate")
async def validate_session(
    user_id: str = Query(...),
    session_token: str = Query(...),
):
    """Validate a session token."""
    try:
        is_valid = await db.validate_session(user_id, session_token)
        if is_valid:
            await db.refresh_session(user_id, session_token)
            return {"valid": True, "user_id": user_id}
        else:
            return {"valid": False, "user_id": user_id}
    except Exception as e:
        logger.error(f"Failed to validate session: {e}")
        return {"valid": False, "error": str(e)}


@app.post("/api/auth/logout")
async def logout(user_id: str = Query(...)):
    """Invalidate user session (logout)."""
    try:
        await db.invalidate_session(user_id)
        return {"status": "logged_out", "user_id": user_id}
    except Exception as e:
        logger.error(f"Failed to logout: {e}")
        raise HTTPException(status_code=500, detail="Failed to logout")


@app.patch("/api/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, request: UpdateUserRequest):
    """Update a user's profile."""
    try:
        user = await db.update_user(
            user_id=user_id,
            display_name=request.display_name,
            avatar_sprite=request.avatar_sprite,
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse(
            id=str(user["id"]),
            display_name=user["display_name"],
            avatar_sprite=user["avatar_sprite"],
            is_anonymous=user["is_anonymous"],
            created_at=datetime.now(),  # Not returned by update, use placeholder
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")


# =============================================================================
# USER SETTINGS API ENDPOINTS
# =============================================================================


class UserSettingsRequest(BaseModel):
    audio_enabled: Optional[bool] = None
    video_enabled: Optional[bool] = None
    volume: Optional[int] = None
    theme: Optional[str] = None
    show_player_names: Optional[bool] = None
    preferred_ai_model: Optional[str] = None
    model_temperature: Optional[float] = None


class UserSettingsResponse(BaseModel):
    user_id: str
    audio_enabled: bool
    video_enabled: bool
    volume: int
    theme: str
    show_player_names: bool
    preferred_ai_model: str
    model_temperature: float


@app.get("/api/users/{user_id}/settings", response_model=UserSettingsResponse)
async def get_user_settings(user_id: str):
    """Get user settings including AI model preference."""
    try:
        settings = await db.get_user_settings(user_id)
        if not settings:
            # Create default settings if not exists
            settings = await db.update_user_settings(user_id)
        return UserSettingsResponse(
            user_id=str(settings["user_id"]),
            audio_enabled=settings["audio_enabled"],
            video_enabled=settings["video_enabled"],
            volume=settings["volume"],
            theme=settings["theme"],
            show_player_names=settings["show_player_names"],
            preferred_ai_model=settings["preferred_ai_model"],
            model_temperature=float(settings["model_temperature"]),
        )
    except Exception as e:
        logger.error(f"Failed to get user settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user settings")


@app.patch("/api/users/{user_id}/settings", response_model=UserSettingsResponse)
async def update_user_settings(user_id: str, request: UserSettingsRequest):
    """Update user settings including AI model preference."""
    try:
        # Validate model_id if provided
        if request.preferred_ai_model and request.preferred_ai_model not in AI_MODELS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model. Available models: {list(AI_MODELS.keys())}",
            )

        settings = await db.update_user_settings(
            user_id=user_id,
            audio_enabled=request.audio_enabled,
            video_enabled=request.video_enabled,
            volume=request.volume,
            theme=request.theme,
            show_player_names=request.show_player_names,
            preferred_ai_model=request.preferred_ai_model,
            model_temperature=request.model_temperature,
        )
        return UserSettingsResponse(
            user_id=str(settings["user_id"]),
            audio_enabled=settings["audio_enabled"],
            video_enabled=settings["video_enabled"],
            volume=settings["volume"],
            theme=settings["theme"],
            show_player_names=settings["show_player_names"],
            preferred_ai_model=settings["preferred_ai_model"],
            model_temperature=float(settings["model_temperature"]),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user settings")


# =============================================================================
# ROOM API ENDPOINTS
# =============================================================================


@app.get("/api/rooms", response_model=List[RoomListResponse])
async def list_rooms():
    """List all available rooms."""
    try:
        rooms = await db.get_all_rooms()
        return [
            RoomListResponse(
                id=str(r["id"]),
                slug=r["slug"],
                name=r["name"],
                tilemap_key=r["tilemap_key"],
                is_main=r["is_main"],
            )
            for r in rooms
        ]
    except Exception as e:
        logger.error(f"Failed to list rooms: {e}")
        raise HTTPException(status_code=500, detail="Failed to list rooms")


@app.get("/api/rooms/{slug}", response_model=RoomResponse)
async def get_room(slug: str):
    """Get a room by slug with buildings and spawn points."""
    try:
        room = await db.get_room(slug)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        buildings = [
            BuildingResponse(
                id=str(b["id"]),
                name=b["name"],
                type=b["type"],
                x=b["x"],
                y=b["y"],
                width=b["width"],
                height=b["height"],
                door_x=b["door_x"],
                door_y=b["door_y"],
                door_width=b["door_width"],
                door_height=b["door_height"],
                trigger_message=b["trigger_message"],
                agent_slug=b["agent_slug"],
                target_room_slug=b["target_room_slug"],
                jitsi_room=b["jitsi_room"],
            )
            for b in room.get("buildings", [])
        ]

        spawn_points = [
            SpawnPointResponse(
                id=str(sp["id"]),
                x=sp["x"],
                y=sp["y"],
                type=sp["type"],
                direction=sp["direction"],
                priority=sp["priority"],
                agent_slug=sp["agent_slug"],
            )
            for sp in room.get("spawn_points", [])
        ]

        return RoomResponse(
            id=str(room["id"]),
            slug=room["slug"],
            name=room["name"],
            tilemap_key=room["tilemap_key"],
            width_tiles=room["width_tiles"],
            height_tiles=room["height_tiles"],
            tile_size=room["tile_size"],
            default_spawn_x=room["default_spawn_x"],
            default_spawn_y=room["default_spawn_y"],
            is_main=room["is_main"],
            buildings=buildings,
            spawn_points=spawn_points,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get room: {e}")
        raise HTTPException(status_code=500, detail="Failed to get room")


@app.get("/api/rooms/main/info", response_model=RoomResponse)
async def get_main_room():
    """Get the main/starting room."""
    try:
        room = await db.get_main_room()
        if not room:
            raise HTTPException(status_code=404, detail="No main room configured")
        # Reuse get_room logic
        return await get_room(room["slug"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get main room: {e}")
        raise HTTPException(status_code=500, detail="Failed to get main room")


# =============================================================================
# AGENT API ENDPOINTS (from database)
# =============================================================================


@app.get("/api/agents/db", response_model=List[AgentDBResponse])
async def list_agents_from_db():
    """List all agents from database (with full details including prompts)."""
    try:
        agents = await db.get_all_agents()
        return [
            AgentDBResponse(
                id=str(a["id"]),
                slug=a["slug"],
                name=a["name"],
                role=a["role"],
                emoji=a["emoji"],
                sprite_key=a["sprite_key"],
                greeting=a["greeting"],
                routing_keywords=a["routing_keywords"],
                system_prompt=a["system_prompt"],
            )
            for a in agents
        ]
    except Exception as e:
        logger.error(f"Failed to list agents from DB: {e}")
        raise HTTPException(status_code=500, detail="Failed to list agents")


@app.get("/api/agents/db/{slug}", response_model=AgentDBResponse)
async def get_agent_from_db(slug: str):
    """Get an agent by slug from database."""
    try:
        agent = await db.get_agent(slug)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        return AgentDBResponse(
            id=str(agent["id"]),
            slug=agent["slug"],
            name=agent["name"],
            role=agent["role"],
            emoji=agent["emoji"],
            sprite_key=agent["sprite_key"],
            greeting=agent["greeting"],
            routing_keywords=agent["routing_keywords"],
            system_prompt=agent["system_prompt"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get agent from DB: {e}")
        raise HTTPException(status_code=500, detail="Failed to get agent")


# =============================================================================
# CHAT API ENDPOINTS
# =============================================================================


@app.post("/api/chat/sessions")
async def create_chat_session(user_id: str, request: ChatSessionRequest):
    """Create or get a chat session."""
    try:
        # Resolve agent_slug to agent_id if provided
        agent_id = None
        if request.agent_slug:
            agent = await db.get_agent(request.agent_slug)
            if agent:
                agent_id = str(agent["id"])

        session = await db.get_or_create_chat_session(
            user_id=user_id,
            session_type=request.session_type,
            agent_id=agent_id,
            other_user_id=request.other_user_id,
        )
        return {
            "id": str(session["id"]),
            "type": session["type"],
            "created_at": session["created_at"],
        }
    except Exception as e:
        logger.error(f"Failed to create chat session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create chat session")


@app.get(
    "/api/chat/sessions/{session_id}/messages", response_model=List[ChatMessageResponse]
)
async def get_chat_messages(
    session_id: str,
    limit: int = Query(default=50, le=100),
    before_id: Optional[str] = None,
):
    """Get messages from a chat session."""
    try:
        messages = await db.get_chat_messages(
            session_id=session_id, limit=limit, before_id=before_id
        )
        return [
            ChatMessageResponse(
                id=str(m["id"]),
                sender_type=m["sender_type"],
                sender_id=str(m["sender_id"]),
                sender_name=m["sender_name"],
                content=m["content"],
                created_at=m["created_at"],
            )
            for m in messages
        ]
    except Exception as e:
        logger.error(f"Failed to get chat messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to get messages")


@app.post(
    "/api/chat/sessions/{session_id}/messages", response_model=ChatMessageResponse
)
async def add_chat_message(
    session_id: str,
    user_id: str,
    request: ChatMessageRequest,
):
    """Add a message to a chat session."""
    try:
        # Get user info for sender_name if not provided
        sender_name = request.sender_name
        if not sender_name:
            user = await db.get_user(user_id)
            sender_name = user["display_name"] if user else "Anonymous"

        message = await db.add_chat_message(
            session_id=session_id,
            sender_type="user",
            sender_id=user_id,
            sender_name=sender_name,
            content=request.content,
        )
        return ChatMessageResponse(
            id=str(message["id"]),
            sender_type=message["sender_type"],
            sender_id=str(message["sender_id"]),
            sender_name=message["sender_name"],
            content=message["content"],
            created_at=message["created_at"],
        )
    except Exception as e:
        logger.error(f"Failed to add chat message: {e}")
        raise HTTPException(status_code=500, detail="Failed to add message")


@app.get("/api/chat/users/{user_id}/sessions")
async def get_user_sessions(user_id: str, limit: int = Query(default=20, le=50)):
    """Get a user's recent chat sessions."""
    try:
        sessions = await db.get_user_chat_sessions(user_id=user_id, limit=limit)
        return [
            {
                "id": str(s["id"]),
                "type": s["type"],
                "created_at": s["created_at"],
                "last_message_at": s["last_message_at"],
                "agent_slug": s.get("agent_slug"),
                "agent_name": s.get("agent_name"),
                "agent_emoji": s.get("agent_emoji"),
                "other_user_name": s.get("other_user_name"),
            }
            for s in sessions
        ]
    except Exception as e:
        logger.error(f"Failed to get user sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get sessions")


# =============================================================================
# PLAYER PRESENCE ENDPOINTS (for multiplayer)
# =============================================================================


@app.post("/api/presence/{user_id}")
async def update_presence(
    user_id: str,
    room_slug: Optional[str] = None,
    x: Optional[int] = None,
    y: Optional[int] = None,
    direction: Optional[str] = None,
    status: str = "online",
):
    """Update player presence/position."""
    try:
        # Resolve room_slug to room_id
        room_id = None
        if room_slug:
            room = await db.get_room(room_slug)
            if room:
                room_id = str(room["id"])

        presence = await db.update_player_presence(
            user_id=user_id,
            room_id=room_id,
            x=x,
            y=y,
            direction=direction,
            status=status,
        )
        return {
            "user_id": str(presence["user_id"]),
            "room_id": str(presence["room_id"]) if presence["room_id"] else None,
            "x": presence["x"],
            "y": presence["y"],
            "direction": presence["direction"],
            "status": presence["status"],
            "last_update": presence["last_update"],
        }
    except Exception as e:
        logger.error(f"Failed to update presence: {e}")
        raise HTTPException(status_code=500, detail="Failed to update presence")


@app.get("/api/presence/room/{room_slug}")
async def get_room_players(room_slug: str):
    """Get all online players in a room."""
    try:
        room = await db.get_room(room_slug)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        players = await db.get_players_in_room(str(room["id"]))
        return [
            {
                "user_id": str(p["user_id"]),
                "display_name": p["display_name"],
                "avatar_sprite": p["avatar_sprite"],
                "x": p["x"],
                "y": p["y"],
                "direction": p["direction"],
                "status": p["status"],
                "last_update": p["last_update"],
            }
            for p in players
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get room players: {e}")
        raise HTTPException(status_code=500, detail="Failed to get players")


@app.delete("/api/presence/{user_id}")
async def set_offline(user_id: str):
    """Set a player as offline."""
    try:
        await db.set_player_offline(user_id)
        return {"status": "offline", "user_id": user_id}
    except Exception as e:
        logger.error(f"Failed to set offline: {e}")
        raise HTTPException(status_code=500, detail="Failed to set offline")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "3001"))
    logger.info(f"Starting server on port {port}...")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True, log_level="info")
