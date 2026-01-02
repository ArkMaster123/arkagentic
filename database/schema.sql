-- ArkAgentic Database Schema
-- PostgreSQL 16
-- Created: January 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS & AUTH
-- =============================================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name    VARCHAR(50) NOT NULL,
    avatar_sprite   VARCHAR(50) DEFAULT 'brendan',
    email           VARCHAR(255) UNIQUE,
    password_hash   VARCHAR(255),
    is_anonymous    BOOLEAN DEFAULT true,
    is_admin        BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_last_seen ON users(last_seen_at);

CREATE TABLE user_settings (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    audio_enabled       BOOLEAN DEFAULT true,
    video_enabled       BOOLEAN DEFAULT true,
    volume              INTEGER DEFAULT 100 CHECK (volume BETWEEN 0 AND 100),
    theme               VARCHAR(20) DEFAULT 'dark',
    show_player_names   BOOLEAN DEFAULT true,
    preferred_ai_model  VARCHAR(100) DEFAULT 'anthropic/claude-3.5-haiku',
    model_temperature   DECIMAL(2,1) DEFAULT 0.7 CHECK (model_temperature BETWEEN 0.0 AND 2.0),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AGENTS (AI Characters)
-- =============================================================================

CREATE TABLE agents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug                VARCHAR(50) UNIQUE NOT NULL,
    name                VARCHAR(100) NOT NULL,
    role                VARCHAR(200),
    emoji               VARCHAR(10),
    sprite_key          VARCHAR(50) NOT NULL,
    greeting            TEXT,
    routing_keywords    TEXT[],
    model               VARCHAR(100) DEFAULT 'anthropic/claude-3-haiku',
    temperature         DECIMAL(2,1) DEFAULT 0.7,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_agents_active ON agents(is_active) WHERE is_active = true;

CREATE TABLE agent_prompts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL DEFAULT 1,
    system_prompt   TEXT NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, version)
);

CREATE INDEX idx_agent_prompts_active ON agent_prompts(agent_id) WHERE is_active = true;

-- =============================================================================
-- ROOMS & WORLD
-- =============================================================================

CREATE TABLE rooms (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug                VARCHAR(50) UNIQUE NOT NULL,
    name                VARCHAR(100) NOT NULL,
    tilemap_key         VARCHAR(100) NOT NULL,
    width_tiles         INTEGER NOT NULL,
    height_tiles        INTEGER NOT NULL,
    tile_size           INTEGER DEFAULT 16,
    default_spawn_x     INTEGER NOT NULL,
    default_spawn_y     INTEGER NOT NULL,
    is_main             BOOLEAN DEFAULT false,
    background_music    VARCHAR(500),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rooms_slug ON rooms(slug);
CREATE INDEX idx_rooms_main ON rooms(is_main) WHERE is_main = true;

CREATE TABLE buildings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(50) NOT NULL,  -- 'agent_room', 'meeting', 'portal'
    x               INTEGER NOT NULL,
    y               INTEGER NOT NULL,
    width           INTEGER DEFAULT 32,
    height          INTEGER DEFAULT 32,
    door_x          INTEGER NOT NULL,
    door_y          INTEGER NOT NULL,
    door_width      INTEGER DEFAULT 32,
    door_height     INTEGER DEFAULT 16,
    agent_id        UUID REFERENCES agents(id) ON DELETE SET NULL,
    target_room_id  UUID REFERENCES rooms(id) ON DELETE SET NULL,
    jitsi_room      VARCHAR(100),
    trigger_message VARCHAR(200),
    is_active       BOOLEAN DEFAULT true
);

CREATE INDEX idx_buildings_room ON buildings(room_id);
CREATE INDEX idx_buildings_agent ON buildings(agent_id) WHERE agent_id IS NOT NULL;

CREATE TABLE spawn_points (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    x               INTEGER NOT NULL,
    y               INTEGER NOT NULL,
    type            VARCHAR(20) DEFAULT 'player',  -- 'player' or 'agent'
    agent_id        UUID REFERENCES agents(id) ON DELETE CASCADE,
    direction       VARCHAR(10) DEFAULT 'down',
    priority        INTEGER DEFAULT 0
);

CREATE INDEX idx_spawn_points_room ON spawn_points(room_id);
CREATE INDEX idx_spawn_points_agent ON spawn_points(agent_id) WHERE agent_id IS NOT NULL;

-- =============================================================================
-- CHAT & MESSAGES
-- =============================================================================

CREATE TABLE chat_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            VARCHAR(20) NOT NULL,  -- 'agent', 'proximity', 'private'
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id        UUID REFERENCES agents(id) ON DELETE SET NULL,
    other_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    room_id         UUID REFERENCES rooms(id) ON DELETE SET NULL,
    title           VARCHAR(200),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_agent ON chat_sessions(user_id, agent_id) WHERE type = 'agent';
CREATE INDEX idx_chat_sessions_recent ON chat_sessions(user_id, last_message_at DESC);

CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_type     VARCHAR(20) NOT NULL,  -- 'user', 'agent', 'system'
    sender_id       UUID,
    sender_name     VARCHAR(100) NOT NULL,
    content         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);

-- =============================================================================
-- PLAYER PRESENCE (for multiplayer)
-- =============================================================================

CREATE TABLE player_presence (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    room_id             UUID REFERENCES rooms(id) ON DELETE SET NULL,
    x                   INTEGER,
    y                   INTEGER,
    direction           VARCHAR(10) DEFAULT 'down',
    status              VARCHAR(20) DEFAULT 'online',
    session_token       VARCHAR(255),
    connected_at        TIMESTAMPTZ,
    last_update         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_presence_room ON player_presence(room_id) WHERE status = 'online';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_agents_timestamp BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_chat_sessions_timestamp BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update last_message_at on new message
CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_sessions SET last_message_at = NEW.created_at WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_on_message AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_session_last_message();
