import { Storage } from '@google-cloud/storage';
import { readFileSync } from 'fs';

const corsConfig = JSON.parse(readFileSync('./cors.json', 'utf-8'));

const storage = new Storage();

async function listBucketsAndSetCors() {
  try {
    // First, list available buckets to find the correct name
    const [buckets] = await storage.getBuckets();
    console.log('Available buckets:');
    buckets.forEach(b => console.log(' -', b.name));
    
    if (buckets.length === 0) {
      console.log('No buckets found. Check your authentication.');
      return;
    }
    
    // Try to set CORS on the first matching bucket
    const target = buckets.find(b => b.name.includes('lost-and-found')) || buckets[0];
    console.log(`\nSetting CORS on: ${target.name}`);
    await target.setCorsConfiguration(corsConfig);
    console.log('✅ CORS successfully applied!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.code === 401 || err.message.includes('credentials')) {
      console.log('\n📌 Authentication needed. Run: gcloud auth application-default login');
      console.log('Or use: GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json node set-cors.mjs');
    }
  }
}

listBucketsAndSetCors();
