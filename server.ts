import http from 'http';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const PORT = 3001;

// Agent personalities for responses
const AGENT_PERSONALITIES: Record<string, { name: string; emoji: string; style: string }> = {
  scout: {
    name: 'Scout',
    emoji: '🔍',
    style: 'You are Scout, a research specialist. You help find information about companies, people, and topics. Be thorough but concise.',
  },
  sage: {
    name: 'Sage',
    emoji: '🧙',
    style: 'You are Sage, a strategic analyst. You compare options, analyze situations, and provide recommendations. Be wise and thoughtful.',
  },
  chronicle: {
    name: 'Chronicle',
    emoji: '✍️',
    style: 'You are Chronicle, a newsroom editor. You help write articles and summarize news. Be clear and journalistic.',
  },
  trends: {
    name: 'Trends',
    emoji: '📈',
    style: 'You are Trends, an intelligence analyst. You track trending topics and breaking news. Be current and insightful.',
  },
  maven: {
    name: 'Maven',
    emoji: '👋',
    style: 'You are Maven, a friendly general assistant. You help with general questions and greet users warmly. Be helpful and approachable.',
  },
};

// Simple in-memory rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

async function callAI(message: string, agent: string, history: any[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return `[${AGENT_PERSONALITIES[agent]?.name || agent}] I'd love to help, but no API key is configured. Please set OPENROUTER_API_KEY or ANTHROPIC_API_KEY in your .env file.`;
  }

  const personality = AGENT_PERSONALITIES[agent] || AGENT_PERSONALITIES.maven;
  
  const systemPrompt = `${personality.style}

You are part of a team of AI agents in a visual game world. Keep responses concise (2-3 sentences max) and helpful. 
Your emoji is ${personality.emoji} and your name is ${personality.name}.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-5).map((h: any) => ({
      role: h.role,
      content: h.content,
    })),
    { role: 'user', content: message },
  ];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'AgentVerse Visual',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages,
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', error);
      return `[${personality.name}] Sorry, I encountered an error connecting to my brain. Please try again.`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || `[${personality.name}] I'm not sure how to respond to that.`;
  } catch (error) {
    console.error('Fetch error:', error);
    return `[${personality.name}] Sorry, I couldn't connect to the AI service. Please check your internet connection.`;
  }
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Main API endpoint
  if (req.url === '/api/aisdk' && req.method === 'POST') {
    const clientIP = req.socket.remoteAddress || 'unknown';
    
    if (!checkRateLimit(clientIP)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { message, agent, history = [] } = JSON.parse(body);
        
        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Message is required' }));
          return;
        }

        console.log(`[${agent}] Processing: "${message.substring(0, 50)}..."`);
        
        const response = await callAI(message, agent || 'maven', history);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response, agent }));
      } catch (error) {
        console.error('Request error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`
🎮 AgentVerse Backend Server
============================
Server running at: http://localhost:${PORT}
Health check: http://localhost:${PORT}/health
API endpoint: http://localhost:${PORT}/api/aisdk

Environment:
- API Key: ${process.env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Missing OPENROUTER_API_KEY'}

Press Ctrl+C to stop
`);
});
