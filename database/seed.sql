-- ArkAgentic Seed Data
-- Migrates all hardcoded data from constants.ts, TownScene.ts, agents.py
-- Run this AFTER schema.sql

-- =============================================================================
-- AGENTS (from constants.ts + agents.py)
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
 ARRAY['hello', 'hi', 'help', 'weather', 'general']);

-- =============================================================================
-- AGENT PROMPTS (from agents.py)
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

You work as part of a team with Sage (analyst), Chronicle (writer), Trends (news), and Maven (coordinator).', true
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

You work as part of a team with Scout (research), Chronicle (writer), Trends (news), and Maven (coordinator).', true
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

You work as part of a team with Scout (research), Sage (analyst), Trends (news), and Maven (coordinator).', true
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

You work as part of a team with Scout (research), Sage (analyst), Chronicle (writer), and Maven (coordinator).', true
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

You are the coordinator of a team including Scout (research), Sage (analyst), Chronicle (writer), and Trends (news).', true
FROM agents WHERE slug = 'maven';

-- =============================================================================
-- ROOMS (from LoadingScene.ts)
-- =============================================================================

INSERT INTO rooms (slug, name, tilemap_key, width_tiles, height_tiles, tile_size, default_spawn_x, default_spawn_y, is_main) VALUES
('town', 'ArkAgentic Town', 'town', 48, 35, 16, 384, 280, true),
('room-scout', 'Scout''s Research Lab', 'room-scout', 24, 17, 16, 192, 136, false),
('room-sage', 'Sage''s Strategy Room', 'room-sage', 24, 17, 16, 192, 136, false),
('room-chronicle', 'Chronicle''s Archive', 'room-chronicle', 24, 17, 16, 192, 136, false),
('room-trends', 'Trends'' Observatory', 'room-trends', 24, 17, 16, 192, 136, false),
('room-maven', 'Maven''s Workshop', 'room-maven', 24, 17, 16, 192, 136, false);

-- =============================================================================
-- BUILDINGS (from TownScene.ts buildingZones)
-- =============================================================================

INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, agent_id, target_room_id, trigger_message)
SELECT 
    r.id,
    'Scout''s Lab',
    'agent_room',
    160, 80, 48, 48,
    168, 128, 32, 16,
    a.id,
    tr.id,
    'Press E to enter Scout''s Lab'
FROM rooms r, agents a, rooms tr
WHERE r.slug = 'town' AND a.slug = 'scout' AND tr.slug = 'room-scout';

INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, agent_id, target_room_id, trigger_message)
SELECT 
    r.id,
    'Sage''s Study',
    'agent_room',
    256, 80, 48, 48,
    272, 128, 32, 16,
    a.id,
    tr.id,
    'Press E to enter Sage''s Study'
FROM rooms r, agents a, rooms tr
WHERE r.slug = 'town' AND a.slug = 'sage' AND tr.slug = 'room-sage';

INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, agent_id, target_room_id, trigger_message)
SELECT 
    r.id,
    'Chronicle''s Office',
    'agent_room',
    480, 80, 48, 48,
    496, 128, 32, 16,
    a.id,
    tr.id,
    'Press E to enter Chronicle''s Office'
FROM rooms r, agents a, rooms tr
WHERE r.slug = 'town' AND a.slug = 'chronicle' AND tr.slug = 'room-chronicle';

INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, agent_id, target_room_id, trigger_message)
SELECT 
    r.id,
    'Trends'' Hub',
    'agent_room',
    256, 176, 48, 48,
    272, 224, 32, 16,
    a.id,
    tr.id,
    'Press E to enter Trends'' Hub'
FROM rooms r, agents a, rooms tr
WHERE r.slug = 'town' AND a.slug = 'trends' AND tr.slug = 'room-trends';

INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, agent_id, target_room_id, trigger_message)
SELECT 
    r.id,
    'Maven''s Center',
    'agent_room',
    624, 80, 48, 48,
    640, 128, 32, 16,
    a.id,
    tr.id,
    'Press E to enter Maven''s Center'
FROM rooms r, agents a, rooms tr
WHERE r.slug = 'town' AND a.slug = 'maven' AND tr.slug = 'room-maven';

-- =============================================================================
-- SPAWN POINTS (from TownScene.ts spawnPositions)
-- =============================================================================

-- Player spawn (center of town)
INSERT INTO spawn_points (room_id, x, y, type, direction, priority)
SELECT id, 384, 280, 'player', 'down', 0 FROM rooms WHERE slug = 'town';

-- Agent spawns in town
INSERT INTO spawn_points (room_id, x, y, type, agent_id, direction)
SELECT r.id, 200, 200, 'agent', a.id, 'down'
FROM rooms r, agents a WHERE r.slug = 'town' AND a.slug = 'scout';

INSERT INTO spawn_points (room_id, x, y, type, agent_id, direction)
SELECT r.id, 350, 200, 'agent', a.id, 'down'
FROM rooms r, agents a WHERE r.slug = 'town' AND a.slug = 'sage';

INSERT INTO spawn_points (room_id, x, y, type, agent_id, direction)
SELECT r.id, 200, 300, 'agent', a.id, 'down'
FROM rooms r, agents a WHERE r.slug = 'town' AND a.slug = 'chronicle';

INSERT INTO spawn_points (room_id, x, y, type, agent_id, direction)
SELECT r.id, 350, 300, 'agent', a.id, 'down'
FROM rooms r, agents a WHERE r.slug = 'town' AND a.slug = 'trends';

INSERT INTO spawn_points (room_id, x, y, type, agent_id, direction)
SELECT r.id, 275, 350, 'agent', a.id, 'down'
FROM rooms r, agents a WHERE r.slug = 'town' AND a.slug = 'maven';

-- Player spawns in agent rooms (when entering from town)
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

-- =============================================================================
-- DONE
-- =============================================================================
