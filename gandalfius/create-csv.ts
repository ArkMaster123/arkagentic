import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const METADATA_FILE = join(process.cwd(), 'gandalfius', 'videos-metadata.json');
const CSV_FILE = join(process.cwd(), 'gandalfius', 'transcripts.csv');

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

/**
 * Escapes CSV field values
 */
function escapeCsvField(value: string): string {
  if (!value) return '';
  
  // Replace newlines with spaces
  let escaped = value.replace(/\n/g, ' ').replace(/\r/g, '');
  
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    escaped = '"' + escaped.replace(/"/g, '""') + '"';
  }
  
  return escaped;
}

/**
 * Reads transcript content from file
 */
function readTranscript(filePath: string | undefined): string {
  if (!filePath || !existsSync(filePath)) {
    return '';
  }
  
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.warn(`⚠️  Could not read transcript from ${filePath}`);
    return '';
  }
}

/**
 * Creates a CSV file with all transcripts organized by video URL and title
 */
function createCSV() {
  if (!existsSync(METADATA_FILE)) {
    console.error('❌ Metadata file not found. Run the scraper first.');
    process.exit(1);
  }

  const metadata: VideoMetadata[] = JSON.parse(
    readFileSync(METADATA_FILE, 'utf-8')
  );

  // Sort by title (alphabetically) then by creation date (newest first)
  const sorted = [...metadata].sort((a, b) => {
    // First sort by title
    const titleCompare = a.title.localeCompare(b.title);
    if (titleCompare !== 0) return titleCompare;
    
    // If titles are equal, sort by date (newest first)
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  // CSV Headers
  const headers = [
    'Video ID',
    'Video URL',
    'Title',
    'Description',
    'Created Date',
    'Transcript (Plain Text)',
    'Transcript File Path',
    'WEBVTT File Path',
    'Scraped Date',
    'Status'
  ];

  // Build CSV rows
  const rows: string[] = [];
  
  sorted.forEach((video) => {
    const transcript = readTranscript(video.transcriptPath);
    
    const row = [
      escapeCsvField(video.id),
      escapeCsvField(video.url),
      escapeCsvField(video.title),
      escapeCsvField(video.description || ''),
      escapeCsvField(video.createdAt ? new Date(video.createdAt).toLocaleString() : ''),
      escapeCsvField(transcript),
      escapeCsvField(video.transcriptPath || ''),
      escapeCsvField(video.webvttPath || ''),
      escapeCsvField(video.scrapedAt ? new Date(video.scrapedAt).toLocaleString() : ''),
      escapeCsvField(video.transcriptSaved ? 'Success' : 'Failed')
    ];
    
    rows.push(row.join(','));
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n');

  // Write CSV file
  writeFileSync(CSV_FILE, csvContent, 'utf-8');
  
  console.log(`✅ Created CSV file: ${CSV_FILE}`);
  console.log(`   Total videos: ${sorted.length}`);
  console.log(`   Transcripts available: ${sorted.filter(v => v.transcriptSaved).length}`);
  console.log(`   Columns: ${headers.length}`);
}

createCSV();

