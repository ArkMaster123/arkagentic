/**
 * Environment bindings for AgentVerse Cloudflare Workers
 */
export interface Env {
  // Durable Object bindings
  SageAgent: DurableObjectNamespace;
  
  // Environment variables
  OPENROUTER_API_KEY: string;
  DEFAULT_MODEL: string;
}

// Re-export for module augmentation
declare global {
  interface CloudflareEnv extends Env {}
}
