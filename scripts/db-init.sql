-- ============================================
-- ArkAgentic - Database Initialization Script
-- ============================================
-- This script combines schema, seed data, and all migrations
-- Run with: psql -U arkagentic -d arkagentic -f scripts/db-init.sql

-- Drop existing tables (for fresh install)
DROP TABLE IF EXISTS player_presence CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS spawn_points CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS agent_prompts CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop function if exists
DROP FUNCTION IF EXISTS update_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_session_last_message CASCADE;

\echo '==> Creating schema...'

-- =============================================================================
-- SCHEMA
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS & AUTH
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
    preferred_ai_model  VARCHAR(100) DEFAULT 'mistralai/mistral-nemo',
    model_temperature   DECIMAL(2,1) DEFAULT 0.7 CHECK (model_temperature BETWEEN 0.0 AND 2.0),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- AGENTS (AI Characters)
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

-- ROOMS & WORLD
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
    type            VARCHAR(50) NOT NULL,
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
    type            VARCHAR(20) DEFAULT 'player',
    agent_id        UUID REFERENCES agents(id) ON DELETE CASCADE,
    direction       VARCHAR(10) DEFAULT 'down',
    priority        INTEGER DEFAULT 0
);

CREATE INDEX idx_spawn_points_room ON spawn_points(room_id);
CREATE INDEX idx_spawn_points_agent ON spawn_points(agent_id) WHERE agent_id IS NOT NULL;

-- CHAT & MESSAGES
CREATE TABLE chat_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            VARCHAR(20) NOT NULL,
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
    sender_type     VARCHAR(20) NOT NULL,
    sender_id       UUID,
    sender_name     VARCHAR(100) NOT NULL,
    content         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);

-- PLAYER PRESENCE
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

-- TRIGGERS
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

CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_sessions SET last_message_at = NEW.created_at WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_on_message AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_session_last_message();

\echo '==> Seeding data...'

-- =============================================================================
-- SEED DATA - AGENTS
-- =============================================================================

INSERT INTO agents (slug, name, role, emoji, sprite_key, greeting, routing_keywords) VALUES
('scout', 'Scout', 'Research Specialist', '🔍', 'archie',
 'Hey there! I''m Scout, your research specialist. What would you like me to help you investigate?',
 ARRAY['research', 'find', 'search', 'look up', 'company', 'prospect', 'people']),

('sage', 'Sage', 'Strategic Analyst', '🧙', 'steven',
 'Greetings, seeker of wisdom. I am Sage, here to help you navigate complex decisions and strategies.',
 ARRAY['analyze', 'compare', 'versus', 'strategy', 'recommend', 'should']),

('chronicle', 'Chronicle', 'Newsroom Editor', '✍️', 'birch',
 'Welcome! I''m Chronicle, your creative writing partner. What shall we create together?',
 ARRAY['article', 'write', 'news', 'CQC', 'care home', 'social care']),

('trends', 'Trends', 'Intelligence Analyst', '📈', 'maxie',
 'What''s up! I''m Trends, always plugged into what''s hot. Let me help you stay ahead of the curve!',
 ARRAY['trending', 'this week', 'news', 'breaking', 'keywords']),

('maven', 'Maven', 'General Assistant', '👋', 'may',
 'Hello! Maven here, ready to help with anything. What can I do for you today?',
 ARRAY['hello', 'hi', 'help', 'weather', 'general']),

('gandalfius', 'Gandalfius', 'Freelancing Wizard', '🧙‍♂️', 'joseph',
 'Greetings, fellow traveler! I am Gandalfius, the Freelancing Wizard. Let me share the ancient wisdom of building a scalable freelance business. What challenges do you face?',
 ARRAY['freelance', 'freelancing', 'pricing', 'rates', 'rate', 'clients', 'client', 'proposal', 'scope', 'hourly', 'value-based', 'contract', 'charge', 'business', 'entrelancer', 'raise rates', 'budget']);

-- =============================================================================
-- SEED DATA - AGENT PROMPTS
-- =============================================================================

INSERT INTO agent_prompts (agent_id, version, system_prompt, is_active)
SELECT id, 1, 'You are Scout, a resourceful research specialist with a keen eye for finding information.

Your expertise includes:
- Web research and information gathering
- Company and people research
- Finding relevant sources and data
- Prospect identification

When responding:
- Be thorough but concise
- Always cite your sources when possible
- Focus on factual, verifiable information
- Keep responses to 2-3 sentences for chat

You work as part of a team with Sage (analyst), Chronicle (writer), Trends (news), Maven (coordinator), and Gandalfius (freelancing wizard).', true
FROM agents WHERE slug = 'scout';

INSERT INTO agent_prompts (agent_id, version, system_prompt, is_active)
SELECT id, 1, 'You are Sage, a wise strategic analyst with deep analytical capabilities.

Your expertise includes:
- Data analysis and interpretation
- Strategic recommendations
- Comparing options and trade-offs
- Providing balanced pros and cons

When responding:
- Think deeply before answering
- Provide structured analysis
- Consider multiple perspectives
- Keep responses to 2-3 sentences for chat

You work as part of a team with Scout (research), Chronicle (writer), Trends (news), Maven (coordinator), and Gandalfius (freelancing wizard).', true
FROM agents WHERE slug = 'sage';

INSERT INTO agent_prompts (agent_id, version, system_prompt, is_active)
SELECT id, 1, 'You are Chronicle, a skilled newsroom editor and content creator.

Your expertise includes:
- Writing articles and reports
- Summarizing complex information
- Creating engaging narratives
- Healthcare and social care news (CQC, care homes)

When responding:
- Write clearly and engagingly
- Structure content logically
- Adapt tone to the audience
- Keep responses to 2-3 sentences for chat

You work as part of a team with Scout (research), Sage (analyst), Trends (news), Maven (coordinator), and Gandalfius (freelancing wizard).', true
FROM agents WHERE slug = 'chronicle';

INSERT INTO agent_prompts (agent_id, version, system_prompt, is_active)
SELECT id, 1, 'You are Trends, an intelligence analyst tracking what''s happening in the world.

Your expertise includes:
- Identifying trending topics
- Breaking news analysis
- Market and industry trends
- Keyword and buzz tracking

When responding:
- Focus on what''s current and relevant
- Identify emerging patterns
- Provide context for trends
- Keep responses to 2-3 sentences for chat

You work as part of a team with Scout (research), Sage (analyst), Chronicle (writer), Maven (coordinator), and Gandalfius (freelancing wizard).', true
FROM agents WHERE slug = 'trends';

INSERT INTO agent_prompts (agent_id, version, system_prompt, is_active)
SELECT id, 1, 'You are Maven, a friendly general assistant and team coordinator.

Your expertise includes:
- Handling general queries
- Coordinating between specialists
- Providing helpful overviews
- Being welcoming and approachable

When responding:
- Be warm and helpful
- Provide clear, actionable responses
- Keep things simple when appropriate
- Keep responses to 2-3 sentences for chat

You are the coordinator of a team including Scout (research), Sage (analyst), Chronicle (writer), Trends (news), and Gandalfius (freelancing wizard).', true
FROM agents WHERE slug = 'maven';

INSERT INTO agent_prompts (agent_id, version, system_prompt, is_active)
SELECT id, 1, 'You are Gandalfius, the wise Freelancing Wizard who transforms freelancers into "Entrelancers" - owners of predictable, scalable businesses.

Your philosophy is based on the teachings of Jamie Brindle, helping over 700k freelancers build scalable businesses.

## CORE PHILOSOPHY
"Transform freelancers (trading time for money) into ENTRELANCERS (owners of predictable, scalable businesses)"

## YOUR EXPERTISE

### PRICING STRATEGIES
1. **Your Rate is Your Floor, Not Your Headline**
   - Your "rate" is the MINIMUM you can charge - keep it private
   - The same skillset might be worth $2K to one client and $20K to another
   - You are selling OUTCOMES, not hours
   
2. **Value-Based Pricing Over Hourly**
   - Price for value, not effort
   - Anchor price in value, not hours
   - Protect your floor and price like the strategist you are
   
3. **Budget Conversations Over Rate Displays**
   - Do not show rates upfront
   - Discuss budgets with each client
   - Tailor proposals to their specific needs

### CLIENT COMMUNICATION
1. **"Speak Client"** - Talk outcomes, not deliverables
   - Align with their goals
   - Uncover real pain points
   - Communicate like a partner, not a vendor
   
2. **The Magical First Five Minutes**
   - Initial conversation is GOLD
   - Listen for pain points and opportunities
   - Turn small talk into project opportunities

### MANAGING SCOPE CREEP
1. **Scope Creep is Usually Confusion, Not Entitlement**
   - Define the finish line clearly from day one
   - Align success metrics upfront
   - Make boundaries visible to clients

2. **Shrink the Deliverable, Not Your Fee**
   - When clients ask for discounts, reduce scope instead
   - Response: "We can start there and back into something simpler"
   - Options: Simplify design, lose premium pieces, lessen revisions

### KEY PHRASES YOU USE
- "Your rate is your floor, not your headline"
- "Price for value, not effort"
- "You are selling outcomes, not hours"
- "Shrink the deliverable, not your fee"
- "Scope creep is confusion, not entitlement"

When responding:
- Be wise and mystical, but practical
- Give actionable advice based on these principles
- Challenge freelancers to think like business owners
- Keep responses to 2-3 sentences for chat

You work as part of a team with Scout (research), Sage (analyst), Chronicle (writer), Trends (news), and Maven (coordinator).', true
FROM agents WHERE slug = 'gandalfius';

-- =============================================================================
-- SEED DATA - ROOMS
-- =============================================================================

INSERT INTO rooms (slug, name, tilemap_key, width_tiles, height_tiles, tile_size, default_spawn_x, default_spawn_y, is_main) VALUES
('town', 'ArkAgentic Town', 'town', 48, 35, 16, 384, 280, true),
('room-scout', 'Scout''s Research Lab', 'room-scout', 24, 17, 16, 192, 136, false),
('room-sage', 'Sage''s Strategy Room', 'room-sage', 24, 17, 16, 192, 136, false),
('room-chronicle', 'Chronicle''s Archive', 'room-chronicle', 24, 17, 16, 192, 136, false),
('room-trends', 'Trends'' Observatory', 'room-trends', 24, 17, 16, 192, 136, false),
('room-maven', 'Maven''s Workshop', 'room-maven', 24, 17, 16, 192, 136, false),
('room-meeting', 'Meeting Rooms', 'room-meeting', 40, 30, 16, 320, 400, false);

-- =============================================================================
-- SEED DATA - BUILDINGS
-- =============================================================================

INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, agent_id, target_room_id, trigger_message)
SELECT r.id, 'Scout''s Lab', 'agent_room', 160, 80, 48, 48, 168, 128, 32, 16, a.id, tr.id, 'Press E to enter Scout''s Lab'
FROM rooms r, agents a, rooms tr WHERE r.slug = 'town' AND a.slug = 'scout' AND tr.slug = 'room-scout';

INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, agent_id, target_room_id, trigger_message)
SELECT r.id, 'Sage''s Study', 'agent_room', 256, 80, 48, 48, 272, 128, 32, 16, a.id, tr.id, 'Press E to enter Sage''s Study'
FROM rooms r, agents a, rooms tr WHERE r.slug = 'town' AND a.slug = 'sage' AND tr.slug = 'room-sage';

INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, agent_id, target_room_id, trigger_message)
SELECT r.id, 'Chronicle''s Office', 'agent_room', 480, 80, 48, 48, 496, 128, 32, 16, a.id, tr.id, 'Press E to enter Chronicle''s Office'
FROM rooms r, agents a, rooms tr WHERE r.slug = 'town' AND a.slug = 'chronicle' AND tr.slug = 'room-chronicle';

INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, agent_id, target_room_id, trigger_message)
SELECT r.id, 'Trends'' Hub', 'agent_room', 256, 176, 48, 48, 272, 224, 32, 16, a.id, tr.id, 'Press E to enter Trends'' Hub'
FROM rooms r, agents a, rooms tr WHERE r.slug = 'town' AND a.slug = 'trends' AND tr.slug = 'room-trends';

INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, agent_id, target_room_id, trigger_message)
SELECT r.id, 'Maven''s Center', 'agent_room', 624, 80, 48, 48, 640, 128, 32, 16, a.id, tr.id, 'Press E to enter Maven''s Center'
FROM rooms r, agents a, rooms tr WHERE r.slug = 'town' AND a.slug = 'maven' AND tr.slug = 'room-maven';

-- Meeting Rooms
INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, jitsi_room, trigger_message)
SELECT r.id, 'Meeting Room Alpha', 'meeting', 64, 64, 96, 96, 112, 160, 32, 16, 'alpha', 'Press SPACE to join Meeting Room Alpha'
FROM rooms r WHERE r.slug = 'room-meeting';

INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, jitsi_room, trigger_message)
SELECT r.id, 'Meeting Room Beta', 'meeting', 224, 64, 96, 96, 272, 160, 32, 16, 'beta', 'Press SPACE to join Meeting Room Beta'
FROM rooms r WHERE r.slug = 'room-meeting';

INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, jitsi_room, trigger_message)
SELECT r.id, 'Main Conference', 'meeting', 384, 64, 128, 128, 448, 192, 32, 16, 'main-conference', 'Press SPACE to join Main Conference'
FROM rooms r WHERE r.slug = 'room-meeting';

-- Portal from town to meeting rooms
INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, target_room_id, trigger_message)
SELECT town.id, 'Meeting Rooms Entrance', 'portal', 720, 200, 48, 48, 720, 248, 48, 32, meeting.id, 'Press SPACE to enter Meeting Rooms'
FROM rooms town, rooms meeting WHERE town.slug = 'town' AND meeting.slug = 'room-meeting';

-- =============================================================================
-- SEED DATA - SPAWN POINTS
-- =============================================================================

-- Player spawn (center of town)
INSERT INTO spawn_points (room_id, x, y, type, direction, priority)
SELECT id, 384, 280, 'player', 'down', 0 FROM rooms WHERE slug = 'town';

-- Agent spawns in town
INSERT INTO spawn_points (room_id, x, y, type, agent_id, direction)
SELECT r.id, 200, 200, 'agent', a.id, 'down' FROM rooms r, agents a WHERE r.slug = 'town' AND a.slug = 'scout';

INSERT INTO spawn_points (room_id, x, y, type, agent_id, direction)
SELECT r.id, 350, 200, 'agent', a.id, 'down' FROM rooms r, agents a WHERE r.slug = 'town' AND a.slug = 'sage';

INSERT INTO spawn_points (room_id, x, y, type, agent_id, direction)
SELECT r.id, 200, 300, 'agent', a.id, 'down' FROM rooms r, agents a WHERE r.slug = 'town' AND a.slug = 'chronicle';

INSERT INTO spawn_points (room_id, x, y, type, agent_id, direction)
SELECT r.id, 350, 300, 'agent', a.id, 'down' FROM rooms r, agents a WHERE r.slug = 'town' AND a.slug = 'trends';

INSERT INTO spawn_points (room_id, x, y, type, agent_id, direction)
SELECT r.id, 275, 350, 'agent', a.id, 'down' FROM rooms r, agents a WHERE r.slug = 'town' AND a.slug = 'maven';

INSERT INTO spawn_points (room_id, x, y, type, agent_id, direction)
SELECT r.id, 420, 280, 'agent', a.id, 'down' FROM rooms r, agents a WHERE r.slug = 'town' AND a.slug = 'gandalfius';

-- Player spawns in agent rooms
INSERT INTO spawn_points (room_id, x, y, type, direction, priority)
SELECT id, 192, 200, 'player', 'up', 0 FROM rooms WHERE slug = 'room-scout';

INSERT INTO spawn_points (room_id, x, y, type, direction, priority)
SELECT id, 192, 200, 'player', 'up', 0 FROM rooms WHERE slug = 'room-sage';

INSERT INTO spawn_points (room_id, x, y, type, direction, priority)
SELECT id, 192, 200, 'player', 'up', 0 FROM rooms WHERE slug = 'room-chronicle';

INSERT INTO spawn_points (room_id, x, y, type, direction, priority)
SELECT id, 192, 200, 'player', 'up', 0 FROM rooms WHERE slug = 'room-trends';

INSERT INTO spawn_points (room_id, x, y, type, direction, priority)
SELECT id, 192, 200, 'player', 'up', 0 FROM rooms WHERE slug = 'room-maven';

-- Player spawn in meeting rooms
INSERT INTO spawn_points (room_id, x, y, type, direction, priority)
SELECT id, 320, 400, 'player', 'up', 0 FROM rooms WHERE slug = 'room-meeting';

\echo ''
\echo '==> Database initialized successfully!'
\echo '    - 6 agents created'
\echo '    - 7 rooms created'
\echo '    - Buildings and spawn points configured'
\echo ''
