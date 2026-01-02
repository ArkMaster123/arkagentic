/**
 * TikTok Video Transcript API Helper
 * 
 * This module provides a clean interface for fetching transcripts
 * from TikTok videos using the Scrape Creators API.
 */

interface TranscriptOptions {
  /** TikTok video URL (required) */
  url: string;
  /** Language code (2 letters, e.g., 'en', 'es', 'fr') - defaults to 'en' */
  language?: string;
  /** Use AI fallback if transcript not found (costs 10 credits) - defaults to false */
  useAiFallback?: boolean;
}

interface TranscriptResponse {
  id: string;
  url: string;
  transcript: string;
}

interface ApiError {
  message: string;
  status: number;
  statusText: string;
  body?: string;
}

/**
 * Fetches transcript from a TikTok video
 * 
 * @param options - Configuration options for transcript fetching
 * @param apiKey - Your Scrape Creators API key
 * @returns Promise resolving to transcript data
 * @throws Error if API call fails or transcript is unavailable
 * 
 * @example
 * ```typescript
 * const transcript = await getVideoTranscript({
 *   url: 'https://www.tiktok.com/@user/video/1234567890',
 *   language: 'en',
 *   useAiFallback: true
 * }, process.env.SCRAPE_CREATORS_API_KEY);
 * ```
 */
export async function getVideoTranscript(
  options: TranscriptOptions,
  apiKey: string
): Promise<TranscriptResponse> {
  // Validate inputs
  if (!apiKey) {
    throw new Error('API key is required');
  }

  if (!options.url) {
    throw new Error('Video URL is required');
  }

  // Validate URL format
  try {
    new URL(options.url);
  } catch {
    throw new Error('Invalid video URL format');
  }

  // Build request
  const baseUrl = 'https://api.scrapecreators.com/v1/tiktok/video/transcript';
  const headers = {
    'x-api-key': apiKey,
  };

  const params = new URLSearchParams({
    url: options.url,
    language: options.language || 'en',
    use_ai_as_fallback: options.useAiFallback ? 'true' : 'false',
  });

  const url = `${baseUrl}?${params}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.message || errorJson.error || errorBody;
      } catch {
        errorMessage = errorBody || 'Unknown error';
      }

      const error: ApiError = {
        message: errorMessage,
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      };

      throw error;
    }

    // Parse successful response
    const data = await response.json();

    // Validate response structure
    if (!data.id || !data.url || !data.transcript) {
      throw new Error(
        `Invalid response format: missing required fields. Got: ${JSON.stringify(Object.keys(data))}`
      );
    }

    return data as TranscriptResponse;
  } catch (error) {
    // Re-throw API errors as-is
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    // Wrap other errors (network, parsing, etc.)
    if (error instanceof Error) {
      throw new Error(`Failed to fetch transcript: ${error.message}`);
    }

    throw new Error('Failed to fetch transcript: Unknown error');
  }
}

/**
 * Extracts plain text from WEBVTT format transcript
 * 
 * @param webvtt - WEBVTT formatted transcript string
 * @returns Plain text with timestamps removed
 * 
 * @example
 * ```typescript
 * const plainText = extractPlainText(webvttTranscript);
 * ```
 */
export function extractPlainText(webvtt: string): string {
  // Remove WEBVTT header
  let text = webvtt.replace(/^WEBVTT\s*\n\n?/i, '');

  // Parse WEBVTT format: timestamp line followed by text lines
  // Pattern: timestamp --> timestamp\n text lines (until next timestamp or empty line)
  const segments: string[] = [];
  const lines = text.split('\n');
  
  let currentText: string[] = [];
  let inTimestamp = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      if (currentText.length > 0) {
        segments.push(currentText.join(' '));
        currentText = [];
      }
      continue;
    }
    
    // Check if this is a timestamp line
    if (/^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/.test(line)) {
      // Save previous segment if exists
      if (currentText.length > 0) {
        segments.push(currentText.join(' '));
        currentText = [];
      }
      inTimestamp = true;
      continue;
    }
    
    // Check if this is a cue identifier (just a number)
    if (/^\d+$/.test(line)) {
      continue;
    }
    
    // Check if this is a NOTE
    if (line.startsWith('NOTE:')) {
      continue;
    }
    
    // This is text content
    if (inTimestamp || currentText.length > 0) {
      currentText.push(line);
      inTimestamp = false;
    }
  }
  
  // Add final segment
  if (currentText.length > 0) {
    segments.push(currentText.join(' '));
  }
  
  // Join segments with smart line breaks for readability
  let result = '';
  let lineLength = 0;
  const maxLineLength = 80; // Characters per line for readability
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i].trim();
    if (!segment) continue;
    
    const prevSegment = i > 0 ? segments[i - 1].trim() : '';
    
    // If segment ends with punctuation, add it and break line
    if (/[.!?]$/.test(segment)) {
      if (result && !result.endsWith('\n')) {
        result += ' ' + segment + '\n';
      } else {
        result += segment + '\n';
      }
      lineLength = 0;
    }
    // If segment starts with capital and we have content, might be new sentence
    else if (/^[A-Z]/.test(segment) && result && lineLength > 40 && !result.endsWith('\n')) {
      result += '\n' + segment;
      lineLength = segment.length;
    }
    // If line is getting long, add break
    else if (lineLength + segment.length > maxLineLength && result && !result.endsWith('\n')) {
      result += '\n' + segment;
      lineLength = segment.length;
    }
    // Otherwise, add space and continue line
    else {
      if (result && !result.endsWith('\n') && !result.endsWith(' ')) {
        result += ' ' + segment;
      } else {
        result += segment;
      }
      lineLength += segment.length + (result.endsWith(' ') ? 0 : 1);
    }
  }
  
  // Final cleanup: normalize whitespace but preserve paragraph breaks
  result = result
    .replace(/[ \t]+/g, ' ')  // Multiple spaces to single space
    .replace(/\n{3,}/g, '\n\n')  // Multiple newlines to double newline
    .replace(/\n /g, '\n')  // Remove space after newline
    .replace(/ \n/g, '\n')  // Remove space before newline
    .trim();
  
  return result;
}

/**
 * Parses WEBVTT transcript into structured format with timestamps
 * 
 * @param webvtt - WEBVTT formatted transcript string
 * @returns Array of transcript segments with timestamps
 * 
 * @example
 * ```typescript
 * const segments = parseWebVTT(webvttTranscript);
 * // [{ start: 0.12, end: 1.84, text: "Alright, pizza review time." }, ...]
 * ```
 */
export interface TranscriptSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export function parseWebVTT(webvtt: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  
  // Remove WEBVTT header
  let text = webvtt.replace(/^WEBVTT\s*\n\n?/i, '');
  
  // Match timestamp lines followed by text
  const regex = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})\n([^\n]+(?:\n(?!\d{2}:\d{2}:\d{2})[^\n]+)*)/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const [, h1, m1, s1, ms1, h2, m2, s2, ms2, transcriptText] = match;
    
    const start = 
      parseInt(h1) * 3600 + 
      parseInt(m1) * 60 + 
      parseInt(s1) + 
      parseInt(ms1) / 1000;
    
    const end = 
      parseInt(h2) * 3600 + 
      parseInt(m2) * 60 + 
      parseInt(s2) + 
      parseInt(ms2) / 1000;
    
    segments.push({
      start,
      end,
      text: transcriptText.trim(),
    });
  }
  
  return segments;
}

/**
 * Example usage function
 */
export async function exampleUsage() {
  const apiKey = process.env.SCRAPE_CREATORS_API_KEY;
  
  if (!apiKey) {
    console.error('Please set SCRAPE_CREATORS_API_KEY in your environment');
    return;
  }

  try {
    // Fetch transcript
    const result = await getVideoTranscript(
      {
        url: 'https://www.tiktok.com/@stoolpresidente/video/7499229683859426602',
        language: 'en',
        useAiFallback: true,
      },
      apiKey
    );

    console.log('Video ID:', result.id);
    console.log('Video URL:', result.url);
    console.log('\n--- WEBVTT Transcript ---');
    console.log(result.transcript);
    
    // Extract plain text
    const plainText = extractPlainText(result.transcript);
    console.log('\n--- Plain Text ---');
    console.log(plainText);
    
    // Parse into segments
    const segments = parseWebVTT(result.transcript);
    console.log('\n--- Segments ---');
    segments.forEach(seg => {
      console.log(`[${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s] ${seg.text}`);
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as ApiError;
      console.error(`API Error (${apiError.status}): ${apiError.message}`);
    } else {
      console.error('Error:', error);
    }
  }
}

// Export error type for use in catch blocks
export type { ApiError, TranscriptResponse, TranscriptSegment };

