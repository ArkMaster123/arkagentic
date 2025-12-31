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
};

// Meeting point in the town (center area)
export const MEETING_POINT = {
  x: 288,
  y: 240,
};

// API endpoint - use relative path in production, localhost in development
export const API_BASE_URL = (import.meta as any).env?.DEV ? 'http://localhost:3001' : '/api';
