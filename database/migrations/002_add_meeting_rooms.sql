-- Migration: Add Meeting Rooms
-- Run this after 001_add_gandalfius.sql

-- =============================================================================
-- ADD MEETING ROOMS
-- =============================================================================

-- Add the meeting room as a room
INSERT INTO rooms (slug, name, tilemap_key, width_tiles, height_tiles, tile_size, default_spawn_x, default_spawn_y, is_main) VALUES
('room-meeting', 'Meeting Rooms', 'room-meeting', 40, 30, 16, 320, 400, false);

-- =============================================================================
-- ADD MEETING ZONES AS BUILDINGS
-- =============================================================================

-- Meeting Room Alpha
INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, jitsi_room, trigger_message)
SELECT 
    r.id,
    'Meeting Room Alpha',
    'meeting',
    64, 64, 96, 96,
    112, 160, 32, 16,
    'alpha',
    'Press SPACE to join Meeting Room Alpha'
FROM rooms r WHERE r.slug = 'room-meeting';

-- Meeting Room Beta
INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, jitsi_room, trigger_message)
SELECT 
    r.id,
    'Meeting Room Beta',
    'meeting',
    224, 64, 96, 96,
    272, 160, 32, 16,
    'beta',
    'Press SPACE to join Meeting Room Beta'
FROM rooms r WHERE r.slug = 'room-meeting';

-- Main Conference Room
INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, jitsi_room, trigger_message)
SELECT 
    r.id,
    'Main Conference',
    'meeting',
    384, 64, 128, 128,
    448, 192, 32, 16,
    'main-conference',
    'Press SPACE to join Main Conference'
FROM rooms r WHERE r.slug = 'room-meeting';

-- =============================================================================
-- ADD MEETING ROOM ENTRANCE IN TOWN
-- =============================================================================

-- Portal from town to meeting rooms (right side of town map)
INSERT INTO buildings (room_id, name, type, x, y, width, height, door_x, door_y, door_width, door_height, target_room_id, trigger_message)
SELECT 
    town.id,
    'Meeting Rooms Entrance',
    'portal',
    720, 200, 48, 48,
    720, 248, 48, 32,
    meeting.id,
    'Press SPACE to enter Meeting Rooms'
FROM rooms town, rooms meeting 
WHERE town.slug = 'town' AND meeting.slug = 'room-meeting';

-- =============================================================================
-- ADD SPAWN POINTS FOR MEETING ROOMS
-- =============================================================================

-- Player spawn when entering meeting rooms from town
INSERT INTO spawn_points (room_id, x, y, type, direction, priority)
SELECT id, 320, 400, 'player', 'up', 0 FROM rooms WHERE slug = 'room-meeting';

-- =============================================================================
-- DONE
-- =============================================================================
