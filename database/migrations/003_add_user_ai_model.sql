-- Migration: Add AI model preference to user_settings
-- Date: January 2026

-- Add preferred_ai_model column to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS preferred_ai_model VARCHAR(100) DEFAULT 'anthropic/claude-3.5-haiku';

-- Add model_temperature preference
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS model_temperature DECIMAL(2,1) DEFAULT 0.7 
CHECK (model_temperature BETWEEN 0.0 AND 2.0);

-- Comment for documentation
COMMENT ON COLUMN user_settings.preferred_ai_model IS 'User preferred AI model (e.g., anthropic/claude-3.5-haiku, openai/gpt-4o-mini)';
COMMENT ON COLUMN user_settings.model_temperature IS 'User preferred temperature setting for AI responses (0.0-2.0)';
