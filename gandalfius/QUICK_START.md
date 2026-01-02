# Quick Start Guide

## Run the Scraper

```bash
# From project root
npx tsx gandalfius/scrape-tiktok.ts
```

## What It Does

1. ✅ Fetches all videos from @thejamiebrindle's TikTok profile
2. ✅ Downloads transcript for each video
3. ✅ Saves transcripts in two formats:
   - `{video_id}.txt` - Original WEBVTT with timestamps
   - `{video_id}_plain.txt` - Plain text for easy reading
4. ✅ Tracks metadata in `videos-metadata.json`
5. ✅ Skips already-scraped videos on re-runs

## Output Location

All files are saved in: `gandalfius/transcripts/`

## Using the Transcript API Helper

```typescript
import { getVideoTranscript, extractPlainText } from './gandalfius/transcript-api.js';

const result = await getVideoTranscript(
  {
    url: 'https://www.tiktok.com/@user/video/123',
    language: 'en',
    useAiFallback: true,
  },
  process.env.SCRAPE_CREATORS_API_KEY!
);

console.log(result.transcript); // WEBVTT format
console.log(extractPlainText(result.transcript)); // Plain text
```

## Troubleshooting

**API Key Error?**
- Check `.env.local` has `SCRAPE_CREATORS_API_KEY=your_key`

**No videos found?**
- Check the handle is correct: `thejamiebrindle`
- Verify API key has access to profile scraping

**Rate limiting?**
- Script includes 1-second delays between calls
- If issues persist, increase delay in script

See [GUIDE.md](./GUIDE.md) for full documentation.

