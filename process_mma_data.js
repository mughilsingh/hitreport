// Script to run MMA parser, then read and log the first fighter for testing
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
require('dotenv').config();

// Supabase client setup
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


// Path to the Wikipedia UFC Cheerio output JSON file
const ufcCheerioOutputPath = path.resolve(__dirname, './output_ufc_fighters_cheerio.json');

function runMmaParser() {
  // Run the Python MMA parser script
  console.log('Running MMA parser...');
  const result = spawnSync('python', [parserScriptPath], { stdio: 'inherit' });
  if (result.error) {
    console.error('Failed to run MMA parser:', result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error('MMA parser exited with code', result.status);
    process.exit(result.status);
  }
  console.log('MMA parser finished.');
}


async function uploadUfcFightersToSupabase() {
  try {
    const data = fs.readFileSync(ufcCheerioOutputPath, 'utf-8');
    const fighters = JSON.parse(data);
    if (!Array.isArray(fighters) || fighters.length === 0) {
      console.log('No fighter data found in UFC Cheerio output.');
      return;
    }
    console.log(`Upserting ${fighters.length} fighters to Supabase...`);
    // Use upsert to avoid duplicates, matching on name and division
    const { data: upserted, error } = await supabase
      .from('fighters')
      .upsert(fighters, { onConflict: ['name', 'division'] })
      .select('*');
    if (error) {
      console.error('Error upserting fighters to Supabase:', error);
    } else {
      console.log(`Successfully upserted ${upserted ? upserted.length : 0} fighters to Supabase.`);
    }
  } catch (err) {
    console.error('Error reading or uploading UFC Cheerio output:', err);
  }
}


// Uncomment if you want to run the old parser
// runMmaParser();

// Upload UFC fighters from cheerio output to Supabase
uploadUfcFightersToSupabase();
