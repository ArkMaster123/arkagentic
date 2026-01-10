// UI Colors (from AgentVerse)
export const COLOR_PRIMARY = 0x4e342e;
export const COLOR_LIGHT = 0x7b5e57;
export const COLOR_DARK = 0x260e04;

// Agent colors for identification
export const AGENT_COLORS = {
  scout: 0x3498db,    // Blue
  sage: 0x9b59b6,     // Purple
  chronicle: 0x27ae60, // Green
  trends: 0xe74c3c,   // Red
  maven: 0xf39c12,    // Orange
  gandalfius: 0x8e44ad, // Deep Purple (wizard vibes)
};

// Agent definitions - mapping our 5 agents to Pokemon sprites
export const AGENTS = {
  scout: {
    name: 'Scout',
    sprite: 'archie',    // Blue character
    icon: 'search',      // Lucide Search icon
    emoji: '🔍',         // Keep for backward compatibility during transition
    role: 'Research Specialist',
    keywords: ['research', 'find', 'search', 'look up', 'company', 'prospect', 'people'],
  },
  sage: {
    name: 'Sage',
    sprite: 'steven',    // Serious looking character
    icon: 'brain',       // Lucide Brain icon
    emoji: '🧙',         // Keep for backward compatibility during transition
    role: 'Strategic Analyst',
    keywords: ['analyze', 'compare', 'versus', 'strategy', 'recommend', 'should'],
  },
  chronicle: {
    name: 'Chronicle',
    sprite: 'birch',     // Professional character
    icon: 'pen-tool',    // Lucide PenTool icon
    emoji: '✍️',         // Keep for backward compatibility during transition
    role: 'Newsroom Editor',
    keywords: ['article', 'write', 'news', 'CQC', 'care home', 'social care'],
  },
  trends: {
    name: 'Trends',
    sprite: 'maxie',     // Red character
    icon: 'trending-up', // Lucide TrendingUp icon
    emoji: '📈',         // Keep for backward compatibility during transition
    role: 'Intelligence Analyst',
    keywords: ['trending', 'this week', 'news', 'breaking', 'keywords'],
  },
  maven: {
    name: 'Maven',
    sprite: 'may',       // Friendly character
    icon: 'user',        // Lucide User icon
    emoji: '👋',         // Keep for backward compatibility during transition
    role: 'General Assistant',
    keywords: ['hello', 'hi', 'help', 'weather', 'general'],
  },
  gandalfius: {
    name: 'Gandalfius',
    sprite: 'joseph',    // Wise wizard character
    icon: 'wand-2',      // Lucide Wand icon
    emoji: '🧙‍♂️',         // Wizard emoji
    role: 'Freelancing Wizard',
    keywords: ['freelance', 'pricing', 'rates', 'clients', 'proposal', 'scope', 'business', 'value', 'charge', 'hourly', 'contract'],
  },
};

// Meeting point in the town (center area)
export const MEETING_POINT = {
  x: 288,
  y: 240,
};

// API endpoint - use relative path in production, localhost in development
export const API_BASE_URL = (import.meta as any).env?.DEV ? 'http://localhost:3001' : '/api';

// Jitsi configuration
// 
// DEFAULT: Uses public Jitsi servers (free, no setup required, NO AUTHENTICATION REQUIRED)
// 
// List of free public Jitsi servers that allow anonymous meetings without authentication.
// The system will try servers in order until one works.
// 
// FOR SELF-HOSTING: Set VITE_JITSI_DOMAIN in your .env file
// Example: VITE_JITSI_DOMAIN=meet.yourdomain.com
// 
// See /docs/JITSI_MEET_INTEGRATION_RESEARCH.md for self-hosting setup
// Minimum requirements: 4 CPU cores, 8GB RAM, valid SSL certificate
//
export const JITSI_CONFIG = {
  // Self-hosted Jitsi server only - no fallbacks
  freeServers: [],
  
  // Jitsi server from env var (VITE_JITSI_DOMAIN in .env.local)
  // Falls back to self-hosted server if not set
  domain: (import.meta as any).env?.VITE_JITSI_DOMAIN || 'jitsi.coolify.th3ark.com',
  
  // No fallback - only use the configured server
  fallbackDomain: null,
  
  // Container element ID for the iframe
  containerId: 'jitsi-frame',
  
  // Default audio/video settings
  startWithAudio: false,  // Mic muted by default (user can enable manually)
  startWithVideo: false,
  
  // Room name prefix to avoid conflicts with other public Jitsi users
  // This creates unique rooms like: arkagentic-town-square-abc123
  roomPrefix: 'arkagentic-',
  
  // Add random suffix to room names for privacy (recommended for public servers)
  useRandomRoomSuffix: true,
  
  // Enable proximity-based voice chat
  proximityEnabled: true,
};

// Proximity chat zones in the town
// These define areas where players can join voice/video chat
export const JITSI_ZONES = [
  {
    id: 'town-square',
    roomName: 'town-square',
    displayName: 'Town Square',
    trigger: 'onenter' as const,
    x: 240,  // Center of town
    y: 200,
    width: 96,
    height: 96,
  },
  {
    id: 'meeting-hall',
    roomName: 'meeting-hall',
    displayName: 'Meeting Hall',
    trigger: 'onaction' as const,  // Requires pressing a key to join
    x: 256,
    y: 208,
    width: 64,
    height: 64,
  },
];
