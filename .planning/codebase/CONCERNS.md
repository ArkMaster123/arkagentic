# Codebase Concerns

**Analysis Date:** 2026-02-05

## Security Issues

**CORS Configuration Too Permissive:**
- Issue: Wildcard `"*"` in CORS allowed origins allows any domain to make requests
- Files: `backend/server.py:257-268`
- Risk: Cross-site request forgery (CSRF), unauthorized API access from any origin
- Recommendation: Remove `"*"` from `allow_origins`. Use explicit, environment-specific origins for production

**Hardcoded Localhost Origins:**
- Issue: Development URLs hardcoded in CORS config prevent easy environment-based configuration
- Files: `backend/server.py:260-262`
- Risk: Must manually edit code to change allowed origins for different environments
- Fix approach: Move CORS allowed origins to environment variables (e.g., `ALLOWED_ORIGINS`)

**Session Token Validation Missing Expiration:**
- Issue: Session tokens never expire; they persist indefinitely once created
- Files: `backend/database.py:499-513` (validate_session), `backend/server.py:514-529` (validate_session endpoint)
- Risk: Compromised tokens remain valid forever; no automatic cleanup of stale sessions
- Fix approach: Add token expiration timestamp to `player_presence` table, validate against `created_at + TTL`, implement `cleanup_stale_sessions` as scheduled job

**String Interpolation in SQL (Potential Vulnerability):**
- Issue: `INTERVAL '%s days'` in SQL query uses string formatting instead of parameterized query
- Files: `backend/database.py:561`
- Risk: Potential SQL injection if `days` parameter isn't validated
- Fix approach: Change to `INTERVAL '%s days' % (days,)` or use PostgreSQL's native INTERVAL type with parameterized values

**API Keys Exposed in Logs:**
- Issue: Full API key could appear in error messages or tracebacks
- Files: `backend/agents.py:250, 265`, `backend/server.py:283, 374, 412`
- Risk: API keys visible in server logs if `api_key` value logged in exception messages
- Fix approach: Sanitize error messages to never log sensitive values; mask keys in logs

## Error Handling Issues

**Silent Failures in Swarm Mode:**
- Issue: Swarm initialization failures are caught but silently fall back to single-agent mode without warning user
- Files: `backend/agents.py:454-460`
- Impact: User doesn't know swarm collaboration failed; may expect full team response
- Fix approach: Return error status in response or throw exception if swarm was explicitly requested

**Missing Error Handling in Database Pool:**
- Issue: `get_pool()` can throw exception if `DATABASE_URL` not set, no try-catch at call sites
- Files: `backend/server.py:219-225`, `backend/database.py:26-35`
- Risk: Server crashes during startup if DATABASE_URL missing; unclear error message
- Fix approach: Add explicit validation in `lifespan` with clear error message; prevent server start if pool creation fails

**Orchestrator Singleton State Pollution:**
- Issue: Global `_orchestrator` instance is created once; switching `use_swarm` flag doesn't recreate it
- Files: `backend/agents.py:829-834`
- Impact: First request determines swarm mode for all subsequent requests; flag changes ignored
- Fix approach: Create new orchestrator instance per request, or pass `use_swarm` as parameter through AgentOrchestrator

**Uncaught Async Errors in Streaming:**
- Issue: Stream reader error handling incomplete; partial chunk parsing errors silently ignored
- Files: `backend/agents.py:761-799`, `src/core/services/ApiService.ts:199-220`
- Risk: Corrupted chunks or network errors silently drop data without client notification
- Fix approach: Add validation for JSON parsing; yield error events for unparseable chunks

## Performance Bottlenecks

**Large File Complexity - TownScene:**
- Problem: TownScene.ts is 2870 lines; hard to navigate and test
- Files: `src/scenes/TownScene.ts`
- Impact: Difficult to debug, high risk of unintended side effects, slow to load
- Improvement path: Split into smaller composable systems (Scene manager, agent manager, interaction handler)

**Database Connection Pool Undersized:**
- Problem: Pool min_size=2, max_size=10 may be insufficient under load
- Files: `backend/database.py:31-33`
- Impact: Connection waiting during concurrent requests; requests queue and timeout
- Fix approach: Monitor actual usage; increase max_size to 20-30 for production; add connection timeout logging

**Missing Database Query Optimization:**
- Problem: `get_user_chat_sessions` fetches all user sessions on every call without pagination
- Files: `backend/database.py:373-391`, `backend/server.py:910-930`
- Risk: Slow response as users accumulate thousands of sessions
- Fix approach: Implement cursor-based pagination; add `offset` and `limit` parameters with defaults

**Synchronous Agent Processing Blocks Event Loop:**
- Problem: `_process_with_single_agent()` is synchronous, blocks during agent calls
- Files: `backend/agents.py:563-607`
- Impact: Other requests hang while one agent processes; no concurrent handling
- Fix approach: Make agent calls async; use thread pool for blocking calls

**Swarm Streaming Through Thread Pool:**
- Problem: Swarm processing runs in thread pool, then streams in 50-char chunks with 0.01s delay
- Files: `backend/agents.py:609-693`
- Impact: Artificial slowdown; defeats purpose of streaming; wasted thread pool resources
- Fix approach: If Strands Swarm doesn't support native streaming, implement internal streaming or accept that swarm is non-streaming

## Fragile Areas

**Agent Initialization Fragility:**
- Files: `backend/agents.py:282-305, 462-469`
- Why fragile: Creating agents fails silently; missing agent types fall back to Maven without warning
- Safe modification: Test agent availability before requests; fail fast on initialization errors
- Test coverage: No tests for agent creation/routing; no validation of AGENT_CONFIGS consistency

**Multiplayer Presence Tracking Without Cleanup:**
- Files: `backend/database.py:399-432`, `backend/server.py:938-1005`
- Why fragile: Players marked offline only on explicit logout; stale entries accumulate from crashed clients
- Safe modification: Add automatic stale session cleanup job; validate presence on reconnect
- Test coverage: No tests for presence sync after network failures

**Message Parsing in Stream:**
- Files: `src/core/services/ApiService.ts:199-220`
- Why fragile: Line-based parsing assumes `data: ` prefix on every message; malformed responses cause silent failures
- Safe modification: Add validation before JSON.parse; yield error events
- Test coverage: No tests for incomplete/corrupted chunks

**Hardcoded Agent Configuration in Two Places:**
- Files: `backend/agents.py:101-240` (AGENT_CONFIGS) and `backend/database.py` (agents table)
- Why fragile: Config duplication means changes must happen in two places; easy to get out of sync
- Safe modification: Single source of truth - either code or database, not both
- Test coverage: No synchronization validation

## Scaling Limits

**Database Resource Limits:**
- Current capacity: Pool max 10 connections, 2 minimum
- Limit: Under 50 concurrent users, pool exhaustion likely
- Scaling path: Increase pool size (20-50), add connection monitoring, implement read replicas for stats queries

**Swarm Execution Timeout Hard Cap:**
- Current: 120 seconds max execution, 30 seconds per agent node
- Limit: Complex queries or slow AI provider responses will timeout and fail
- Scaling path: Make timeouts configurable per agent/request; implement exponential backoff

**Message History Growth Unbounded:**
- Current: All chat messages stored forever; no retention policy
- Limit: Database grows indefinitely; message retrieval slows as count increases
- Scaling path: Implement message archival (move old messages to separate table/storage after 90 days)

**Real-Time Presence Updates:**
- Current: Each player update hits database; broadcast to all clients
- Limit: O(n) database writes per player movement; doesn't scale beyond ~100 concurrent players
- Scaling path: In-memory presence cache with async database sync; batch presence updates

## Dependency Risks

**Strands Agents Framework Dependency:**
- Risk: Custom multi-agent framework; limited community support; tightly coupled orchestrator
- Impact: Breaking changes in Strands version difficult to migrate
- Migration plan: Build adapter layer between Strands and business logic; consider switching to LangChain/LlamaIndex if maintenance abandoned

**Colyseus Multiplayer:**
- Risk: Real-time sync library; complex state management; requires separate Node.js server
- Impact: Multiplayer features break independently of main API
- Current status: Implemented but appears unused in main game flow (TownScene doesn't integrate Colyseus)

**OpenRouter API Dependency:**
- Risk: Vendor lock-in for AI model access
- Impact: API changes or deprecation break all agent responses
- Mitigation: Fallback to direct Anthropic API (currently supported as secondary); abstract model provider

## Known Issues

**Database URL Silent Failure:**
- Symptoms: Database features silently disabled if DATABASE_URL not set
- Files: `backend/database.py:18-20`
- Trigger: Missing DATABASE_URL environment variable
- Workaround: Set DATABASE_URL explicitly; errors in logs warn about this but server continues

**Session Token Not Returned on User Creation:**
- Symptoms: User created but token not included in response
- Files: `backend/server.py:462-486` (createUser returns UserResponse without session_token)
- Trigger: Call /api/users endpoint
- Workaround: Must manually generate token on client; defeats session management purpose

**Orchestrator Swarm Flag Ignored After First Request:**
- Symptoms: use_swarm=true requests still use single-agent mode after initialization
- Files: `backend/agents.py:829-834`
- Trigger: First request with use_swarm=False, subsequent requests with use_swarm=True
- Workaround: Restart server to reinitialize orchestrator

**INTERVAL SQL String Interpolation Not Safe:**
- Symptoms: Potential SQL injection in cleanup_stale_sessions if days parameter crafted maliciously
- Files: `backend/database.py:561`
- Trigger: Direct call to cleanup_stale_sessions with untrusted input
- Workaround: Only call internally with hardcoded integer; validate days is integer on entry

## Test Coverage Gaps

**Agent Routing:**
- What's not tested: `route_to_agent()` keyword-based routing logic
- Files: `backend/agents.py:334-430`
- Risk: Incorrect routing happens silently; users get wrong agent
- Test needed: Unit tests for each keyword set; integration test for ambiguous queries

**Swarm Collaboration Results:**
- What's not tested: Swarm response extraction and formatting
- Files: `backend/agents.py:525-551`
- Risk: Agent history parsing breaks with Strands version changes
- Test needed: Mock swarm results; verify response text extraction

**Session Validation:**
- What's not tested: Full session lifecycle (create, validate, refresh, invalidate)
- Files: `backend/database.py:465-551`, `backend/server.py:514-541`
- Risk: Session vulnerabilities missed (replay attacks, token expiration)
- Test needed: Integration tests for session flow; security tests for invalid tokens

**Streaming Response Parsing:**
- What's not tested: Incomplete chunks, malformed JSON, connection interruptions
- Files: `src/core/services/ApiService.ts:176-221`
- Risk: Silent data loss or client hang on network issues
- Test needed: Test with intentionally broken SSE responses; verify error handling

**CORS and Security Headers:**
- What's not tested: CORS rejection of cross-origin requests, security header presence
- Files: `backend/server.py:257-268`
- Risk: Misconfigured CORS allows attacks
- Test needed: Integration tests with different origin headers

---

*Concerns audit: 2026-02-05*
