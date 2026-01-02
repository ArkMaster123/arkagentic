import { config } from 'dotenv';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getVideoTranscript, extractPlainText } from './transcript-api.js';

// Load environment variables from .env.local
config({ path: '.env.local' });

const API_KEY = process.env.SCRAPE_CREATORS_API_KEY;
const BASE_URL = 'https://api.scrapecreators.com/v1/tiktok';
const USER_HANDLE = 'thejamiebrindle';
const OUTPUT_DIR = join(process.cwd(), 'gandalfius', 'transcripts');
const METADATA_FILE = join(process.cwd(), 'gandalfius', 'videos-metadata.json');

interface Video {
  id: string;
  url: string;
  description?: string;
  createdAt?: string;
}

interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  description?: string;
  createdAt?: string;
  transcriptSaved: boolean;
  transcriptPath?: string;
  webvttPath?: string;
  scrapedAt: string;
}

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Fetches all videos from a TikTok profile
 */
async function fetchProfileVideos(handle: string): Promise<Video[]> {
  if (!API_KEY) {
    throw new Error('SCRAPE_CREATORS_API_KEY is not set in .env.local');
  }

  const url = `${BASE_URL}/profile/videos`;
  const headers = {
    'x-api-key': API_KEY,
  };
  const params = new URLSearchParams({ handle });

  console.log(`📹 Fetching videos for @${handle}...`);
  
  try {
    const response = await fetch(`${url}?${params}`, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch videos: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    
    // Handle different possible response structures
    let videos: Video[] = [];
    let videoList: any[] = [];
    
    // Check for aweme_list (TikTok API format)
    if (data.aweme_list && Array.isArray(data.aweme_list)) {
      videoList = data.aweme_list;
    } else if (Array.isArray(data)) {
      videoList = data;
    } else if (data.videos && Array.isArray(data.videos)) {
      videoList = data.videos;
    } else if (data.data && Array.isArray(data.data)) {
      videoList = data.data;
    } else if (data.items && Array.isArray(data.items)) {
      videoList = data.items;
    }
    
    // Map video list to our format
    videos = videoList.map((item: any) => ({
      id: item.aweme_id || item.id || item.video_id || String(item.aweme_id),
      url: item.share_url || item.url || `https://www.tiktok.com/@${handle}/video/${item.aweme_id || item.id}`,
      description: item.desc || item.content_desc || item.description || item.video_text?.join(' ') || '',
      createdAt: item.create_time ? new Date(item.create_time * 1000).toISOString() : undefined,
    }));
    
    // Filter out any invalid entries
    videos = videos.filter(v => v.id && v.url);
    
    if (videos.length === 0) {
      console.warn('⚠️  No videos found in response. Response structure:', Object.keys(data));
      if (data.aweme_list) {
        console.warn('   Found aweme_list but it may be empty or malformed');
      }
    }

    console.log(`✅ Found ${videos.length} videos`);
    return videos;
  } catch (error) {
    console.error('❌ Error fetching profile videos:', error);
    throw error;
  }
}

/**
 * Fetches transcript for a single TikTok video
 * Uses the transcript-api helper module
 */
async function fetchVideoTranscript(
  videoUrl: string,
  language: string = 'en',
  useAiFallback: boolean = true
) {
  if (!API_KEY) {
    throw new Error('SCRAPE_CREATORS_API_KEY is not set in .env.local');
  }

  return await getVideoTranscript(
    {
      url: videoUrl,
      language,
      useAiFallback,
    },
    API_KEY
  );
}

/**
 * Sanitizes a string for use in filenames
 */
function sanitizeFilename(str: string): string {
  return str
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 100); // Limit length
}

/**
 * Saves transcript to a file with video URL and title in the filename
 */
function saveTranscript(
  videoId: string, 
  videoUrl: string, 
  title: string, 
  transcript: string
): { webvttPath: string; plainTextPath: string } {
  // Create a safe filename from title
  const safeTitle = title ? sanitizeFilename(title) : 'untitled';
  const baseFilename = `${videoId}_${safeTitle}`;
  
  const webvttPath = join(OUTPUT_DIR, `${baseFilename}.webvtt`);
  const plainTextPath = join(OUTPUT_DIR, `${baseFilename}.txt`);
  
  // Save WEBVTT format
  writeFileSync(webvttPath, transcript, 'utf-8');
  
  // Extract and save plain text
  const plainText = extractPlainText(transcript);
  writeFileSync(plainTextPath, plainText, 'utf-8');
  
  return { webvttPath, plainTextPath };
}

// Using extractPlainText from transcript-api module

/**
 * Main function to scrape all videos and transcripts
 */
async function scrapeAllVideosAndTranscripts() {
  console.log('🚀 Starting TikTok video and transcript scraping...\n');
  
  if (!API_KEY) {
    console.error('❌ Error: SCRAPE_CREATORS_API_KEY not found in .env.local');
    process.exit(1);
  }

  try {
    // Step 1: Fetch all videos from profile
    const videos = await fetchProfileVideos(USER_HANDLE);
    
    if (videos.length === 0) {
      console.log('⚠️  No videos found for this profile');
      return;
    }

    // Load existing metadata if it exists
    let existingMetadata: VideoMetadata[] = [];
    if (existsSync(METADATA_FILE)) {
      try {
        const existingData = readFileSync(METADATA_FILE, 'utf-8');
        existingMetadata = JSON.parse(existingData);
      } catch (error) {
        console.log('⚠️  Could not load existing metadata, starting fresh');
      }
    }

    const metadata: VideoMetadata[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Step 2: Fetch transcript for each video
    // Set TEST_MODE to true to only process first video for testing
    const TEST_MODE = false;
    const videosToProcess = TEST_MODE ? videos.slice(0, 1) : videos;
    
    console.log(`\n📝 Fetching transcripts for ${videosToProcess.length} video(s)${TEST_MODE ? ' (TEST MODE - first video only)' : ''}...\n`);
    
    for (let i = 0; i < videosToProcess.length; i++) {
      const video = videosToProcess[i];
      const videoNumber = i + 1;
      
      // Check if we already have this transcript
      const existing = existingMetadata.find(m => m.id === video.id);
      if (existing && existing.transcriptSaved) {
        console.log(`⏭️  [${videoNumber}/${videos.length}] Skipping ${video.id} (already scraped)`);
        metadata.push(existing);
        continue;
      }

      console.log(`📥 [${videoNumber}/${videos.length}] Fetching transcript for video ${video.id}...`);
      
      try {
        // Add delay to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }

        const transcriptData = await fetchVideoTranscript(video.url, 'en', true);
        
        // Get title from description or use a default
        const title = video.description || 'Untitled Video';
        
        // Save transcript with URL and title in filename
        const { webvttPath, plainTextPath } = saveTranscript(
          video.id,
          video.url,
          title,
          transcriptData.transcript
        );
        
        // Create metadata entry
        const videoMetadata: VideoMetadata = {
          id: video.id,
          url: video.url,
          title: title,
          description: video.description,
          createdAt: video.createdAt,
          transcriptSaved: true,
          transcriptPath: plainTextPath,
          webvttPath: webvttPath,
          scrapedAt: new Date().toISOString(),
        };
        
        metadata.push(videoMetadata);
        successCount++;
        
        console.log(`✅ [${videoNumber}/${videos.length}] Saved transcript for ${video.id}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ [${videoNumber}/${videos.length}] Failed to get transcript for ${video.id}:`, error);
        
        // Still save metadata even if transcript failed
        metadata.push({
          id: video.id,
          url: video.url,
          title: video.description || 'Untitled Video',
          description: video.description,
          createdAt: video.createdAt,
          transcriptSaved: false,
          scrapedAt: new Date().toISOString(),
        });
      }
    }

    // Step 3: Save metadata
    writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
    
    // Step 4: Create summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Scraping Summary');
    console.log('='.repeat(50));
    console.log(`Total videos found: ${videos.length}`);
    console.log(`Videos processed: ${videosToProcess.length}`);
    console.log(`✅ Successfully scraped: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📁 Transcripts saved to: ${OUTPUT_DIR}`);
    console.log(`📄 Metadata saved to: ${METADATA_FILE}`);
    console.log('='.repeat(50));
    
    // Step 5: Create index and CSV files
    console.log('\n📑 Creating index and CSV files...');
    try {
      const { execSync } = require('child_process');
      execSync('npx tsx gandalfius/create-index.ts', { stdio: 'inherit' });
      execSync('npx tsx gandalfius/create-csv.ts', { stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️  Could not create index/CSV automatically. Run:');
      console.log('   npx tsx gandalfius/create-index.ts');
      console.log('   npx tsx gandalfius/create-csv.ts');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the scraper
scrapeAllVideosAndTranscripts().catch(console.error);

