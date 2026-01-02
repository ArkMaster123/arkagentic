# ArkAgentic Deployment Guide

## What's Implemented vs. What's on Server

This guide details the differences between the local codebase and what's currently deployed on the VPS (46.62.192.79), and how to deploy the new features.

---

## Summary: New Features to Deploy

### 1. Session Security System
**Status: IMPLEMENTED LOCALLY - NOT ON SERVER**

Previously user data was stored entirely in localStorage (insecure). Now:
- localStorage only stores credentials: `arkagentic_user_id` + `arkagentic_session_token`
- All user data fetched from PostgreSQL database via API
- Session validation on every page load

**Files Changed:**
| File | Changes |
|------|---------|
| `backend/server.py` | Added `/api/auth/validate` and `/api/auth/logout` endpoints |
| `backend/database.py` | Added `create_user_with_session()`, `validate_session()`, `refresh_session()`, `invalidate_session()` |
| `src/scenes/LoadingScene.ts` | Now validates session with backend before loading |
| `src/scenes/CharacterSelectScene.ts` | Generates secure session token on user creation |
| `index.html` | Settings modal fetches user data from API |

### 2. Proximity Voice/Video Chat (Jitsi)
**Status: IMPLEMENTED LOCALLY - NOT ON SERVER**

Zone-based voice chat using Jitsi Meet:
- Walk into designated zones to join voice chat
- Uses public `meet.jit.si` (no server setup needed)
- Proximity-based volume (closer players = louder)

**Files Created:**
| File | Purpose |
|------|---------|
| `src/classes/JitsiManager.ts` | Jitsi Meet integration class |
| `src/utils/sounds.ts` | Web Audio sound effects |

**Files Changed:**
| File | Changes |
|------|---------|
| `src/constants.ts` | Added `JITSI_CONFIG` and `JITSI_ZONES` |
| `src/scenes/TownScene.ts` | Added Jitsi initialization and proximity checks |
| `index.html` | Added Jitsi UI container and CSS |

### 3. User Settings Modal
**Status: IMPLEMENTED LOCALLY - NOT ON SERVER**

- Gear icon next to zoom controls
- Profile name editing
- Avatar picker (7 characters)
- Account info display
- "Reset Character" button to logout

**Files Changed:**
| File | Changes |
|------|---------|
| `index.html` | Settings modal HTML + CSS + JS |

---

## Server Environment Variables

The server needs these environment variables in `.env` or `.env.local`:

### Required (Already Should Exist)
```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://arkagentic:your-password@127.0.0.1:5432/arkagentic

# OpenRouter for AI agents (REQUIRED for agent chat)
ANTHROPIC_BASE_URL=https://openrouter.ai/api
ANTHROPIC_API_KEY=sk-or-v1-xxxxx
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# MCP API Keys (REQUIRED for agent tools)
EXA_API_KEY=your-exa-api-key
FIRECRAWL_API_KEY=fc-your-firecrawl-api-key
```

### New Variables for Jitsi (Optional)
```bash
# Jitsi Video Chat Configuration
# Default: meet.jit.si (free public server, no setup required)
VITE_JITSI_DOMAIN=meet.jit.si

# Session expiry in days (default: 30)
SESSION_EXPIRY_DAYS=30
```

**Note:** The public `meet.jit.si` server works out of the box with no configuration. Only set `VITE_JITSI_DOMAIN` if you want to use a self-hosted Jitsi server.

---

## Deployment Steps

### Step 1: Connect to Server
```bash
ssh root@46.62.192.79
# Password: Carescope26isawesome
```

### Step 2: Navigate to Project
```bash
cd /var/www/arkagentic
# or wherever the project is deployed
```

### Step 3: Pull Latest Code
```bash
git pull origin main
```

### Step 4: Update Backend Dependencies
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Step 5: Verify Database Schema
The session system uses the existing `player_presence` table with `session_token` column. Check if it exists:

```bash
sudo -u postgres psql arkagentic
```

```sql
-- Check if session_token column exists
\d player_presence

-- If session_token column is missing, add it:
ALTER TABLE player_presence ADD COLUMN IF NOT EXISTS session_token VARCHAR(255);
```

### Step 6: Build Frontend
```bash
cd /var/www/arkagentic
npm install
npm run build
```

### Step 7: Restart Services
```bash
# Restart Python backend
sudo systemctl restart arkagentic-backend
# OR if using PM2:
pm2 restart arkagentic-backend

# If using nginx, it should already serve the new dist/ files
sudo systemctl reload nginx
```

### Step 8: Verify Deployment
1. Open https://agentic.th3ark.com
2. Check browser console for errors
3. Test new user flow: should go to character select → create user → save to DB
4. Test existing user: should validate session on load
5. Test settings modal: click gear icon, should show user data from DB

---

## Database Schema Additions

### player_presence table (verify columns exist)
```sql
CREATE TABLE IF NOT EXISTS player_presence (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  room_id UUID REFERENCES rooms(id),
  x INTEGER,
  y INTEGER,
  direction VARCHAR(10) DEFAULT 'down',
  status VARCHAR(20) DEFAULT 'offline',
  session_token VARCHAR(255),  -- NEW: For session validation
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_update TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints Added

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/validate?user_id=X&session_token=Y` | Validate session token |
| POST | `/api/auth/logout?user_id=X` | Invalidate session (logout) |

### Users (Updated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users` | Create user WITH session token |
| GET | `/api/users/{user_id}` | Get user data (from DB, not localStorage) |
| PATCH | `/api/users/{user_id}` | Update user profile |

---

## Testing Checklist

### Session Security
- [ ] New user: Creates account → stored in DB with session token
- [ ] Reload page: Session validated with backend before loading
- [ ] Invalid session: Redirects to character select
- [ ] Settings modal: Shows data fetched from API, not localStorage
- [ ] Logout (Reset Character): Invalidates session on server

### Jitsi Proximity Chat
- [ ] Walk into "Town Square" zone → Jitsi call auto-joins
- [ ] Walk out of zone → Leaves call
- [ ] Press J in "Meeting Hall" zone → Shows join prompt
- [ ] Multiple players in zone → Proximity volume works
- [ ] Sound effects play on join/leave

### User Settings
- [ ] Gear icon visible next to zoom controls
- [ ] Modal opens with current user data
- [ ] Can change name → saves to DB
- [ ] Can change avatar → updates in-game immediately
- [ ] Reset Character → logs out and clears credentials

---

## Rollback Plan

If deployment fails:

1. **Revert code:**
   ```bash
   cd /var/www/arkagentic
   git checkout HEAD~1
   npm run build
   sudo systemctl restart arkagentic-backend
   ```

2. **Database is backward compatible** - the session_token column is optional and won't break existing code

---

## Troubleshooting

### "Session invalid" on every load
- Check if `player_presence` table has `session_token` column
- Check if backend can connect to database

### Jitsi not loading
- Check browser console for errors
- Verify `meet.jit.si` is not blocked by network
- Try different browser (some block third-party iframes)

### Settings not saving
- Check browser network tab for API errors
- Verify backend is running and accessible

---

## Files Reference

### Backend Changes
```
backend/
├── server.py          # +30 lines (auth endpoints)
├── database.py        # +70 lines (session functions)
└── requirements.txt   # (unchanged)
```

### Frontend Changes
```
src/
├── classes/
│   ├── JitsiManager.ts      # NEW (531 lines)
│   └── MultiplayerManager.ts # +15 lines (getRemotePlayers)
├── scenes/
│   ├── LoadingScene.ts       # +80 lines (session validation)
│   ├── CharacterSelectScene.ts # +20 lines (session token)
│   └── TownScene.ts          # +120 lines (Jitsi integration)
├── utils/
│   └── sounds.ts             # NEW (179 lines)
└── constants.ts              # +50 lines (Jitsi config)

index.html                    # +500 lines (settings modal, Jitsi UI)
```

### Documentation
```
docs/
├── SESSION_SECURITY.md           # NEW
├── JITSI_MEET_INTEGRATION_RESEARCH.md # (already existed)
└── DEPLOYMENT_GUIDE.md           # NEW (this file)
```
