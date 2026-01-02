# Gandalfius - TikTok Knowledge Base

This folder contains transcripts from TikTok videos by [@thejamiebrindle](https://www.tiktok.com/@thejamiebrindle), collected for use as a knowledge base for AI agents.

## Quick Start

1. **Set up API key** in `.env.local`:
   ```env
   SCRAPE_CREATORS_API_KEY=your_key_here
   ```

2. **Run the scraper**:
   ```bash
   npx tsx gandalfius/scrape-tiktok.ts
   ```

3. **Find transcripts** in `gandalfius/transcripts/`

## Files

- `scrape-tiktok.ts` - Main scraping script
- `create-csv.ts` - Generates CSV export
- `create-index.ts` - Generates INDEX.md
- `GUIDE.md` - Detailed documentation
- `transcripts/` - All video transcripts (WEBVTT and plain text)
- `transcripts.csv` - **CSV export with all transcripts** (sorted by title & URL)
- `videos-metadata.json` - Metadata about all scraped videos
- `INDEX.md` - Organized index of all videos

## Documentation

See [GUIDE.md](./GUIDE.md) for complete documentation including:
- API details
- Usage examples
- Troubleshooting
- Integration with AI agents

