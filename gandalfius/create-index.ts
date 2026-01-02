import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const METADATA_FILE = join(process.cwd(), 'gandalfius', 'videos-metadata.json');
const INDEX_FILE = join(process.cwd(), 'gandalfius', 'INDEX.md');

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
 * Creates an index file organizing transcripts by video URL and title
 */
function createIndex() {
  if (!existsSync(METADATA_FILE)) {
    console.error('❌ Metadata file not found. Run the scraper first.');
    process.exit(1);
  }

  const metadata: VideoMetadata[] = JSON.parse(
    readFileSync(METADATA_FILE, 'utf-8')
  );

  // Sort by creation date (newest first) or by title
  const sorted = [...metadata].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.title.localeCompare(b.title);
  });

  let indexContent = `# TikTok Transcripts Index - @thejamiebrindle\n\n`;
  indexContent += `**Total Videos:** ${metadata.length}\n`;
  indexContent += `**Transcripts Available:** ${metadata.filter(m => m.transcriptSaved).length}\n\n`;
  indexContent += `---\n\n`;

  sorted.forEach((video, index) => {
    const num = index + 1;
    indexContent += `## ${num}. ${video.title}\n\n`;
    indexContent += `**Video URL:** [${video.url}](${video.url})\n\n`;
    
    if (video.description) {
      indexContent += `**Description:** ${video.description}\n\n`;
    }
    
    if (video.createdAt) {
      const date = new Date(video.createdAt).toLocaleDateString();
      indexContent += `**Created:** ${date}\n\n`;
    }
    
    if (video.transcriptSaved && video.transcriptPath) {
      const filename = video.transcriptPath.split('/').pop();
      indexContent += `**Transcript:** [${filename}](./transcripts/${filename})\n\n`;
      
      if (video.webvttPath) {
        const webvttFilename = video.webvttPath.split('/').pop();
        indexContent += `**WEBVTT:** [${webvttFilename}](./transcripts/${webvttFilename})\n\n`;
      }
    } else {
      indexContent += `**Status:** ❌ Transcript not available\n\n`;
    }
    
    indexContent += `---\n\n`;
  });

  // Add a summary table at the top
  let tableContent = `\n## Quick Reference Table\n\n`;
  tableContent += `| # | Title | URL | Transcript |\n`;
  tableContent += `|---|-------|-----|------------|\n`;
  
  sorted.forEach((video, index) => {
    const num = index + 1;
    const transcriptStatus = video.transcriptSaved ? '✅' : '❌';
    const title = video.title.length > 50 ? video.title.substring(0, 47) + '...' : video.title;
    tableContent += `| ${num} | ${title} | [View](${video.url}) | ${transcriptStatus} |\n`;
  });

  // Insert table after the summary
  const insertPos = indexContent.indexOf('---\n\n');
  indexContent = indexContent.slice(0, insertPos) + tableContent + indexContent.slice(insertPos);

  writeFileSync(INDEX_FILE, indexContent, 'utf-8');
  console.log(`✅ Created index file: ${INDEX_FILE}`);
  console.log(`   Organized ${sorted.length} videos by title and URL`);
}

createIndex();

