# Gandalfius - TikTok Transcript Knowledge Base

## Overview

This folder contains transcripts from all TikTok videos by [@thejamiebrindle](https://www.tiktok.com/@thejamiebrindle), collected for use as a knowledge base for AI agents.

## Structure

```
gandalfius/
├── GUIDE.md                    # This file - documentation
├── scrape-tiktok.ts           # Main scraping script
├── create-index.ts             # Creates INDEX.md
├── create-csv.ts               # Creates transcripts.csv
├── transcripts/               # Individual transcript files
│   ├── {video_id}_{title}.webvtt  # WEBVTT format transcript
│   └── {video_id}_{title}.txt     # Plain text version
├── videos-metadata.json        # Metadata about all videos
├── INDEX.md                    # Organized index (auto-generated)
└── transcripts.csv            # CSV export (auto-generated)
```

## How It Works

### 1. Video Discovery
The script uses the Scrape Creators API to fetch all videos from a TikTok profile:
- **Endpoint**: `GET https://api.scrapecreators.com/v1/tiktok/profile/videos`
- **Parameters**: `handle` (TikTok username without @)
- **Returns**: List of video objects with IDs, URLs, descriptions, etc.

### 2. Transcript Extraction
For each video, the script fetches the transcript:
- **Endpoint**: `GET https://api.scrapecreators.com/v1/tiktok/video/transcript`
- **Parameters**:
  - `url` (required): Full TikTok video URL
  - `language` (optional): 2-letter language code (default: 'en')
  - `use_ai_as_fallback` (optional): 'true' to use AI fallback if transcript unavailable (costs 10 credits)
- **Returns**: WEBVTT format transcript with timestamps

### 3. Storage Format

Each video gets two files:
- **`{video_id}.txt`**: Original WEBVTT format with timestamps
- **`{video_id}_plain.txt`**: Plain text version (timestamps removed)

### 4. Metadata Tracking

The `videos-metadata.json` file tracks:
- Video ID and URL
- Description and creation date
- Whether transcript was successfully saved
- File paths and scraping timestamps

## Setup

### Prerequisites
1. Node.js installed
2. API key from Scrape Creators (set in `.env.local`)

### Environment Variables

Add to `.env.local` in the project root:
```env
SCRAPE_CREATORS_API_KEY=your_api_key_here
```

### Running the Script

```bash
# Using tsx (recommended)
npx tsx gandalfius/scrape-tiktok.ts

# Or compile and run
npx tsc gandalfius/scrape-tiktok.ts --outDir dist --module esnext --target es2020
node dist/gandalfius/scrape-tiktok.js
```

## Features

### ✅ Smart Resumption
- Checks existing metadata before scraping
- Skips videos that were already successfully scraped
- Allows re-running to catch any missed videos

### ✅ Error Handling
- Graceful handling of API errors
- Continues processing even if individual videos fail
- Detailed error logging

### ✅ Rate Limiting
- 1 second delay between API calls
- Prevents overwhelming the API

### ✅ Dual Format Storage
- WEBVTT format for timestamped analysis
- Plain text for easy reading and AI processing

## API Details

### Scrape Creators API

**Base URL**: `https://api.scrapecreators.com/v1/tiktok`

**Authentication**: 
- Header: `x-api-key: {your_api_key}`

**Endpoints Used**:

1. **Get Profile Videos**
   ```
   GET /profile/videos?handle={username}
   ```

2. **Get Video Transcript**
   ```
   GET /video/transcript?url={video_url}&language={lang}&use_ai_as_fallback={true|false}
   ```

### Response Formats

**Profile Videos Response**:
```json
{
  "videos": [
    {
      "id": "7499229683859426602",
      "url": "https://www.tiktok.com/@user/video/7499229683859426602",
      "description": "Video description...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Transcript Response**:
```json
{
  "id": "7499229683859426602",
  "url": "https://www.tiktok.com/@user/video/7499229683859426602",
  "transcript": "WEBVTT\n\n00:00:00.120 --> 00:00:01.840\nTranscript text here..."
}
```

## CSV Export

The transcripts are automatically exported to `transcripts.csv` with the following columns:

- **Video ID**: Unique TikTok video identifier
- **Video URL**: Direct link to the TikTok video
- **Title**: Video title/description
- **Description**: Full video description
- **Created Date**: When the video was posted
- **Transcript (Plain Text)**: Full transcript content
- **Transcript File Path**: Path to the transcript file
- **WEBVTT File Path**: Path to the WEBVTT file
- **Scraped Date**: When the transcript was downloaded
- **Status**: Success or Failed

The CSV is sorted by **Title** (alphabetically), then by **Created Date** (newest first).

### Manual CSV Generation

If you need to regenerate the CSV:

```bash
npx tsx gandalfius/create-csv.ts
```

This is useful if you've updated transcripts or want to re-export after changes.

## Usage in AI Agents

### Loading Transcripts

```typescript
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Load all transcripts
const transcriptsDir = join(process.cwd(), 'gandalfius', 'transcripts');
const files = readdirSync(transcriptsDir)
  .filter(f => f.endsWith('_plain.txt'));

const knowledgeBase = files.map(filename => {
  const videoId = filename.replace('_plain.txt', '');
  const content = readFileSync(join(transcriptsDir, filename), 'utf-8');
  return { videoId, content };
});
```

### Using with RAG Systems

The transcripts can be:
1. **Chunked** into smaller segments for vector embeddings
2. **Indexed** in a vector database (Pinecone, Weaviate, etc.)
3. **Searched** semantically for relevant content
4. **Fed** directly to LLMs as context

### Example: Semantic Search

```typescript
// Example: Find relevant transcripts for a query
async function findRelevantTranscripts(query: string) {
  // Use embeddings to find similar content
  const queryEmbedding = await embed(query);
  
  // Search vector database
  const results = await vectorDB.similaritySearch(queryEmbedding, { topK: 5 });
  
  // Return matching transcripts
  return results.map(r => ({
    videoId: r.metadata.videoId,
    transcript: r.content,
    score: r.score
  }));
}
```

## Troubleshooting

### API Key Issues
- Ensure `SCRAPE_CREATORS_API_KEY` is set in `.env.local`
- Check that the API key is valid and has sufficient credits

### Rate Limiting
- The script includes 1-second delays between calls
- If you hit rate limits, increase the delay in the script

### Missing Transcripts
- Some videos may not have transcripts available
- The script uses `use_ai_as_fallback=true` to generate transcripts (costs credits)
- Failed videos are logged in metadata with `transcriptSaved: false`

### Network Errors
- The script includes retry logic and error handling
- Check your internet connection
- Verify the Scrape Creators API is accessible

## Maintenance

### Updating Transcripts
Simply re-run the script - it will:
- Skip already-scraped videos
- Fetch any new videos
- Retry failed videos

### Cleaning Up
To start fresh:
1. Delete `videos-metadata.json`
2. Delete contents of `transcripts/` folder
3. Re-run the script

## Credits & Costs

- **Profile Videos API**: Check Scrape Creators pricing
- **Transcript API**: 
  - Standard: Free/included in plan
  - AI Fallback: 10 credits per video (when `use_ai_as_fallback=true`)

## License & Ethics

- Ensure you have permission to scrape and store this content
- Respect TikTok's Terms of Service
- Use transcripts responsibly and ethically
- Consider privacy implications when using in AI systems

## Support

For issues with:
- **Scrape Creators API**: Contact Scrape Creators support
- **This Script**: Check the error logs and metadata file
- **TikTok Content**: Contact the content creator

---

**Last Updated**: Generated automatically by scrape-tiktok.ts
**Creator**: @thejamiebrindle
**Total Videos**: See `videos-metadata.json` for current count

