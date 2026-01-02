import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { extractPlainText } from './transcript-api.js';

const TRANSCRIPTS_DIR = join(process.cwd(), 'gandalfius', 'transcripts');

/**
 * Regenerates all plain text transcripts with improved formatting
 */
function fixAllTranscripts() {
  if (!existsSync(TRANSCRIPTS_DIR)) {
    console.error('❌ Transcripts directory not found');
    process.exit(1);
  }

  const files = readdirSync(TRANSCRIPTS_DIR);
  const webvttFiles = files.filter(f => f.endsWith('.webvtt'));
  
  console.log(`📝 Found ${webvttFiles.length} WEBVTT files to process...\n`);

  let fixed = 0;
  let errors = 0;

  for (const webvttFile of webvttFiles) {
    try {
      const webvttPath = join(TRANSCRIPTS_DIR, webvttFile);
      const txtFile = webvttFile.replace('.webvtt', '.txt');
      const txtPath = join(TRANSCRIPTS_DIR, txtFile);

      // Read WEBVTT
      const webvtt = readFileSync(webvttPath, 'utf-8');
      
      // Extract improved plain text
      const plainText = extractPlainText(webvtt);
      
      // Write improved plain text
      writeFileSync(txtPath, plainText, 'utf-8');
      
      fixed++;
      console.log(`✅ Fixed: ${txtFile}`);
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${webvttFile}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📁 Total: ${webvttFiles.length}`);
}

fixAllTranscripts();

