"""
Database connection and queries for ArkAgentic.
Uses asyncpg for async PostgreSQL access.
"""

import os
import logging
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
import asyncpg
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Database configuration - requires DATABASE_URL env var in production
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.warning("DATABASE_URL not set - database features will not work")

# Connection pool
_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    """Get or create the connection pool."""
    global _pool
    if _pool is None:
        logger.info(f"Creating database connection pool...")
        _pool = await asyncpg.create_pool(
            DATABASE_URL, min_size=2, max_size=10, command_timeout=60
        )
        logger.info("Database pool created successfully")
    return _pool


async def close_pool():
    """Close the connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database pool closed")


@asynccontextmanager
async def get_connection():
    """Get a connection from the pool."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn


# =============================================================================
# USER QUERIES
# =============================================================================


async def create_anonymous_user(
    display_name: str, avatar_sprite: str = "brendan"
) -> Dict[str, Any]:
    """Create a new anonymous user."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO users (display_name, avatar_sprite, is_anonymous)
            VALUES ($1, $2, true)
            RETURNING id, display_name, avatar_sprite, is_anonymous, created_at
            """,
            display_name,
            avatar_sprite,
        )
        return dict(row)


async def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    """Get a user by ID."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, display_name, avatar_sprite, email, is_anonymous, is_admin, created_at, last_seen_at
            FROM users WHERE id = $1
            """,
            user_id,
        )
        return dict(row) if row else None


async def update_user_last_seen(user_id: str):
    """Update user's last seen timestamp."""
    async with get_connection() as conn:
        await conn.execute(
            "UPDATE users SET last_seen_at = NOW() WHERE id = $1", user_id
        )


async def update_user(
    user_id: str,
    display_name: Optional[str] = None,
    avatar_sprite: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Update user profile."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            UPDATE users 
            SET display_name = COALESCE($2, display_name),
                avatar_sprite = COALESCE($3, avatar_sprite),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, display_name, avatar_sprite, is_anonymous
            """,
            user_id,
            display_name,
            avatar_sprite,
        )
        return dict(row) if row else None


# =============================================================================
# AGENT QUERIES
# =============================================================================


async def get_all_agents() -> List[Dict[str, Any]]:
    """Get all active agents."""
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT a.id, a.slug, a.name, a.role, a.emoji, a.sprite_key, a.greeting, a.routing_keywords,
                   ap.system_prompt
            FROM agents a
            LEFT JOIN agent_prompts ap ON a.id = ap.agent_id AND ap.is_active = true
            WHERE a.is_active = true
            ORDER BY a.name
            """
        )
        return [dict(row) for row in rows]


async def get_agent(slug: str) -> Optional[Dict[str, Any]]:
    """Get an agent by slug."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT a.id, a.slug, a.name, a.role, a.emoji, a.sprite_key, a.greeting, a.routing_keywords,
                   ap.system_prompt
            FROM agents a
            LEFT JOIN agent_prompts ap ON a.id = ap.agent_id AND ap.is_active = true
            WHERE a.slug = $1 AND a.is_active = true
            """,
            slug,
        )
        return dict(row) if row else None


async def get_agent_by_id(agent_id: str) -> Optional[Dict[str, Any]]:
    """Get an agent by ID."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT a.id, a.slug, a.name, a.role, a.emoji, a.sprite_key, a.greeting, a.routing_keywords,
                   ap.system_prompt
            FROM agents a
            LEFT JOIN agent_prompts ap ON a.id = ap.agent_id AND ap.is_active = true
            WHERE a.id = $1 AND a.is_active = true
            """,
            agent_id,
        )
        return dict(row) if row else None


# =============================================================================
# ROOM QUERIES
# =============================================================================


async def get_all_rooms() -> List[Dict[str, Any]]:
    """Get all rooms."""
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT id, slug, name, tilemap_key, width_tiles, height_tiles, tile_size,
                   default_spawn_x, default_spawn_y, is_main
            FROM rooms
            ORDER BY is_main DESC, name
            """
        )
        return [dict(row) for row in rows]


async def get_room(slug: str) -> Optional[Dict[str, Any]]:
    """Get a room by slug with buildings and spawn points."""
    async with get_connection() as conn:
        room = await conn.fetchrow(
            """
            SELECT id, slug, name, tilemap_key, width_tiles, height_tiles, tile_size,
                   default_spawn_x, default_spawn_y, is_main
            FROM rooms WHERE slug = $1
            """,
            slug,
        )
        if not room:
            return None

        room_dict = dict(room)

        # Get buildings for this room
        buildings = await conn.fetch(
            """
            SELECT b.id, b.name, b.type, b.x, b.y, b.width, b.height,
                   b.door_x, b.door_y, b.door_width, b.door_height,
                   b.trigger_message, b.jitsi_room,
                   a.slug as agent_slug, tr.slug as target_room_slug
            FROM buildings b
            LEFT JOIN agents a ON b.agent_id = a.id
            LEFT JOIN rooms tr ON b.target_room_id = tr.id
            WHERE b.room_id = $1 AND b.is_active = true
            """,
            room["id"],
        )
        room_dict["buildings"] = [dict(b) for b in buildings]

        # Get spawn points for this room
        spawn_points = await conn.fetch(
            """
            SELECT sp.id, sp.x, sp.y, sp.type, sp.direction, sp.priority,
                   a.slug as agent_slug
            FROM spawn_points sp
            LEFT JOIN agents a ON sp.agent_id = a.id
            WHERE sp.room_id = $1
            ORDER BY sp.priority, sp.type
            """,
            room["id"],
        )
        room_dict["spawn_points"] = [dict(sp) for sp in spawn_points]

        return room_dict


async def get_main_room() -> Optional[Dict[str, Any]]:
    """Get the main room (starting room)."""
    async with get_connection() as conn:
        row = await conn.fetchrow("SELECT slug FROM rooms WHERE is_main = true LIMIT 1")
        if row:
            return await get_room(row["slug"])
        return None


# =============================================================================
# CHAT QUERIES
# =============================================================================


async def get_or_create_chat_session(
    user_id: str,
    session_type: str,
    agent_id: Optional[str] = None,
    other_user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Get or create a chat session."""
    async with get_connection() as conn:
        # Try to find existing session
        if session_type == "agent" and agent_id:
            row = await conn.fetchrow(
                """
                SELECT id, type, user_id, agent_id, created_at, last_message_at
                FROM chat_sessions
                WHERE user_id = $1 AND agent_id = $2 AND type = 'agent' AND is_active = true
                ORDER BY last_message_at DESC NULLS LAST
                LIMIT 1
                """,
                user_id,
                agent_id,
            )
        elif session_type == "private" and other_user_id:
            row = await conn.fetchrow(
                """
                SELECT id, type, user_id, other_user_id, created_at, last_message_at
                FROM chat_sessions
                WHERE ((user_id = $1 AND other_user_id = $2) OR (user_id = $2 AND other_user_id = $1))
                  AND type = 'private' AND is_active = true
                ORDER BY last_message_at DESC NULLS LAST
                LIMIT 1
                """,
                user_id,
                other_user_id,
            )
        else:
            row = None

        if row:
            return dict(row)

        # Create new session
        row = await conn.fetchrow(
            """
            INSERT INTO chat_sessions (type, user_id, agent_id, other_user_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, type, user_id, agent_id, other_user_id, created_at
            """,
            session_type,
            user_id,
            agent_id,
            other_user_id,
        )
        return dict(row)


async def add_chat_message(
    session_id: str,
    sender_type: str,
    sender_id: str,
    sender_name: str,
    content: str,
    metadata: Optional[dict] = None,
) -> Dict[str, Any]:
    """Add a message to a chat session."""
    import json

    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO chat_messages (session_id, sender_type, sender_id, sender_name, content, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, session_id, sender_type, sender_id, sender_name, content, created_at
            """,
            session_id,
            sender_type,
            sender_id,
            sender_name,
            content,
            json.dumps(metadata) if metadata else "{}",
        )
        return dict(row)


async def get_chat_messages(
    session_id: str, limit: int = 50, before_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get messages from a chat session."""
    async with get_connection() as conn:
        if before_id:
            rows = await conn.fetch(
                """
                SELECT id, sender_type, sender_id, sender_name, content, created_at
                FROM chat_messages
                WHERE session_id = $1 AND id < $2
                ORDER BY created_at DESC
                LIMIT $3
                """,
                session_id,
                before_id,
                limit,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT id, sender_type, sender_id, sender_name, content, created_at
                FROM chat_messages
                WHERE session_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                """,
                session_id,
                limit,
            )
        # Return in chronological order
        return [dict(row) for row in reversed(rows)]


async def get_user_chat_sessions(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Get recent chat sessions for a user."""
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT cs.id, cs.type, cs.created_at, cs.last_message_at,
                   a.slug as agent_slug, a.name as agent_name, a.emoji as agent_emoji,
                   u.display_name as other_user_name
            FROM chat_sessions cs
            LEFT JOIN agents a ON cs.agent_id = a.id
            LEFT JOIN users u ON cs.other_user_id = u.id
            WHERE cs.user_id = $1 AND cs.is_active = true
            ORDER BY cs.last_message_at DESC NULLS LAST
            LIMIT $2
            """,
            user_id,
            limit,
        )
        return [dict(row) for row in rows]


# =============================================================================
# PLAYER PRESENCE QUERIES
# =============================================================================


async def update_player_presence(
    user_id: str,
    room_id: Optional[str] = None,
    x: Optional[int] = None,
    y: Optional[int] = None,
    direction: Optional[str] = None,
    status: str = "online",
    session_token: Optional[str] = None,
) -> Dict[str, Any]:
    """Update or insert player presence."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO player_presence (user_id, room_id, x, y, direction, status, session_token, connected_at, last_update)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                room_id = COALESCE($2, player_presence.room_id),
                x = COALESCE($3, player_presence.x),
                y = COALESCE($4, player_presence.y),
                direction = COALESCE($5, player_presence.direction),
                status = $6,
                session_token = COALESCE($7, player_presence.session_token),
                last_update = NOW()
            RETURNING user_id, room_id, x, y, direction, status, last_update
            """,
            user_id,
            room_id,
            x,
            y,
            direction,
            status,
            session_token,
        )
        return dict(row)


async def get_players_in_room(room_id: str) -> List[Dict[str, Any]]:
    """Get all online players in a room."""
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT pp.user_id, pp.x, pp.y, pp.direction, pp.status, pp.last_update,
                   u.display_name, u.avatar_sprite
            FROM player_presence pp
            JOIN users u ON pp.user_id = u.id
            WHERE pp.room_id = $1 AND pp.status = 'online'
            ORDER BY pp.connected_at
            """,
            room_id,
        )
        return [dict(row) for row in rows]


async def set_player_offline(user_id: str):
    """Set a player as offline."""
    async with get_connection() as conn:
        await conn.execute(
            "UPDATE player_presence SET status = 'offline' WHERE user_id = $1", user_id
        )


# =============================================================================
# SESSION/TOKEN QUERIES
# =============================================================================


async def create_user_with_session(
    display_name: str, avatar_sprite: str, session_token: str
) -> Dict[str, Any]:
    """Create a new anonymous user with a session token."""
    async with get_connection() as conn:
        # Create user
        user = await conn.fetchrow(
            """
            INSERT INTO users (display_name, avatar_sprite, is_anonymous)
            VALUES ($1, $2, true)
            RETURNING id, display_name, avatar_sprite, is_anonymous, created_at
            """,
            display_name,
            avatar_sprite,
        )

        # Create presence record with session token
        await conn.execute(
            """
            INSERT INTO player_presence (user_id, session_token, status, connected_at, last_update)
            VALUES ($1, $2, 'online', NOW(), NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                session_token = $2,
                status = 'online',
                connected_at = NOW(),
                last_update = NOW()
            """,
            user["id"],
            session_token,
        )

        return dict(user)


async def validate_session(user_id: str, session_token: str) -> bool:
    """Validate a session token for a user."""
    if not user_id or not session_token:
        return False

    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT 1 FROM player_presence 
            WHERE user_id = $1 AND session_token = $2
            """,
            user_id,
            session_token,
        )
        return row is not None


async def refresh_session(user_id: str, session_token: str) -> bool:
    """Refresh a session token's last activity time."""
    async with get_connection() as conn:
        result = await conn.execute(
            """
            UPDATE player_presence 
            SET last_update = NOW(), status = 'online'
            WHERE user_id = $1 AND session_token = $2
            """,
            user_id,
            session_token,
        )
        return result != "UPDATE 0"


async def get_session_token(user_id: str) -> Optional[str]:
    """Get the current session token for a user (for reconnection)."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            "SELECT session_token FROM player_presence WHERE user_id = $1",
            user_id,
        )
        return row["session_token"] if row else None


async def invalidate_session(user_id: str):
    """Invalidate all sessions for a user (logout)."""
    async with get_connection() as conn:
        await conn.execute(
            """
            UPDATE player_presence 
            SET session_token = NULL, status = 'offline'
            WHERE user_id = $1
            """,
            user_id,
        )


async def cleanup_stale_sessions(days: int = 30):
    """Remove sessions that haven't been active for X days."""
    async with get_connection() as conn:
        result = await conn.execute(
            """
            UPDATE player_presence 
            SET session_token = NULL, status = 'offline'
            WHERE last_update < NOW() - INTERVAL '%s days'
              AND status = 'online'
            """,
            days,
        )
        return result


# =============================================================================
# USER SETTINGS QUERIES
# =============================================================================


async def get_user_settings(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user settings."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT user_id, audio_enabled, video_enabled, volume, theme, 
                   show_player_names, preferred_ai_model, model_temperature, updated_at
            FROM user_settings WHERE user_id = $1
            """,
            user_id,
        )
        return dict(row) if row else None


async def update_user_settings(
    user_id: str,
    audio_enabled: Optional[bool] = None,
    video_enabled: Optional[bool] = None,
    volume: Optional[int] = None,
    theme: Optional[str] = None,
    show_player_names: Optional[bool] = None,
    preferred_ai_model: Optional[str] = None,
    model_temperature: Optional[float] = None,
) -> Dict[str, Any]:
    """Update or create user settings."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO user_settings (
                user_id, audio_enabled, video_enabled, volume, theme,
                show_player_names, preferred_ai_model, model_temperature
            )
            VALUES ($1, 
                    COALESCE($2, true), 
                    COALESCE($3, true), 
                    COALESCE($4, 100), 
                    COALESCE($5, 'dark'),
                    COALESCE($6, true),
                    COALESCE($7, 'anthropic/claude-3.5-haiku'),
                    COALESCE($8, 0.7)
            )
            ON CONFLICT (user_id) DO UPDATE SET
                audio_enabled = COALESCE($2, user_settings.audio_enabled),
                video_enabled = COALESCE($3, user_settings.video_enabled),
                volume = COALESCE($4, user_settings.volume),
                theme = COALESCE($5, user_settings.theme),
                show_player_names = COALESCE($6, user_settings.show_player_names),
                preferred_ai_model = COALESCE($7, user_settings.preferred_ai_model),
                model_temperature = COALESCE($8, user_settings.model_temperature),
                updated_at = NOW()
            RETURNING user_id, audio_enabled, video_enabled, volume, theme, 
                      show_player_names, preferred_ai_model, model_temperature, updated_at
            """,
            user_id,
            audio_enabled,
            video_enabled,
            volume,
            theme,
            show_player_names,
            preferred_ai_model,
            model_temperature,
        )
        return dict(row)
