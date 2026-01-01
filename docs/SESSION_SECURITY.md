# Session Security in ArkAgentic

## Overview

ArkAgentic uses a **lightweight session system** designed for ease of open-source deployment while maintaining reasonable security for a casual multiplayer game.

## Current Implementation

### User Identification
- **User ID**: UUID v4 stored in `localStorage` as `arkagentic_user_id`
- **Session Token**: Random 64-character hex string generated on first connection
- **Stored in**: `localStorage` as `arkagentic_session_token`

### Security Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐    │
│  │    user_id      │   │  session_token  │   │   user_data     │    │
│  │    (UUID)       │   │  (64 hex chars) │   │   (cached)      │    │
│  └────────┬────────┘   └────────┬────────┘   └─────────────────┘    │
│           │                     │                                     │
└───────────┼─────────────────────┼─────────────────────────────────────┘
            │                     │
            │  Authorization: Bearer <session_token>
            │  X-User-ID: <user_id>
            ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Backend API                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  1. Validate session_token exists in player_presence        │    │
│  │  2. Verify session_token matches user_id                    │    │
│  │  3. Allow request or return 401                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│           │                                                          │
└───────────┼──────────────────────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                             │
│  player_presence:                                                    │
│    user_id (FK) | session_token | room_id | x | y | status          │
└─────────────────────────────────────────────────────────────────────┘
```

### How It Works

1. **First Visit (New User)**:
   - Frontend generates a random session token
   - Calls `POST /api/users` with display_name, avatar, session_token
   - Backend creates user, stores session_token in player_presence
   - Frontend stores user_id and session_token in localStorage

2. **Return Visit**:
   - Frontend reads user_id and session_token from localStorage
   - Sends session_token in `Authorization: Bearer` header
   - Backend validates token matches user_id
   - If valid, user continues; if not, redirected to character select

3. **Session Expiry**:
   - Sessions expire after 30 days of inactivity
   - Cleanup job removes stale sessions

### API Authentication

```http
# All authenticated requests include:
Authorization: Bearer <session_token>
X-User-ID: <user_id>

# Example
POST /api/users/update
Authorization: Bearer a1b2c3d4e5f6...
X-User-ID: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{"display_name": "NewName"}
```

### Security Considerations

**What we protect against:**
- Random UUID guessing (tokens add second factor)
- Session hijacking (tokens are unique per device)
- CSRF (CORS configured for specific origins)

**What we don't protect against (by design):**
- Users sharing their localStorage (they control their device)
- Determined attackers with access to user's browser
- Man-in-the-middle (HTTPS required in production)

**This is appropriate because:**
- This is a casual game, not a banking app
- No real money or sensitive data involved
- Anonymous accounts can be recreated easily
- Priority is low-friction user experience

### For Production Deployment

If you need stronger security:

1. **Add HTTPS** (required for WebRTC anyway)
2. **Use HTTP-only cookies** instead of localStorage
3. **Add rate limiting** via nginx or middleware
4. **Implement JWT** with short expiry + refresh tokens
5. **Add email verification** for non-anonymous accounts

### Environment Variables

```bash
# Session configuration
SESSION_SECRET=your-random-secret-key-here
SESSION_EXPIRY_DAYS=30

# For JWT (optional, stricter security)
JWT_SECRET=your-jwt-secret
JWT_EXPIRY=24h
```

## Jitsi Room Security

Jitsi rooms are protected by:
1. **Room name prefix**: `arkagentic-{room}` to avoid collisions
2. **Random room suffix**: For private conversations (optional)
3. **JWT tokens**: For self-hosted Jitsi with authentication

See `/docs/JITSI_MEET_INTEGRATION_RESEARCH.md` for Jitsi JWT setup.
