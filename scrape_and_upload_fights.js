// scrape_and_upload_fights.js
// 1. Connects to Supabase
// 2. Fetches all fighters with Wikipedia URLs
// 3. (Next steps: scrape and upload fights)

require('dotenv').config();
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment!');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const cheerio = require('cheerio');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function getFightersWithWikipediaUrls() {
  const { data, error } = await supabase
    .from('fighters')
    .select('id, name, wikipedia_url')
    .not('wikipedia_url', 'is', null);

  if (error) {
    console.error('Error fetching fighters:', error);
    return [];
  }
  return data;
}

// Scrape fight history from a fighter's Wikipedia page
async function scrapeFightHistory(wikipediaUrl, fighterName) {
  try {
    const res = await fetch(wikipediaUrl);
    const html = await res.text();
    console.log(`Scraping fight history for ${fighterName} from ${wikipediaUrl}`);
    const $ = cheerio.load(html);
    // Find the fight record table (usually class 'wikitable')
    const tables = $('table.wikitable');
    console.log(`Found ${tables.length} wikitables on page`);
    let fightTable = null;
    tables.each((i, el) => {
      const caption = $(el).find('caption').text().toLowerCase();
      console.log(`Table ${i} caption: "${caption}"`);
      if (caption.includes('mixed martial arts record') || caption.includes('professional record')) {
        fightTable = $(el);
        console.log('Found fight table with matching caption');
        return false;
      }
    });
    if (!fightTable) return [];
    // Get headers - Wikipedia tables can have different structures
    const headers = [];
    
    // Try to find headers in thead first (sometimes used in Wikipedia)
    let headerRow = fightTable.find('thead tr').first();
    
    // If no thead, use the first row of the table
    if (!headerRow.length) {
      headerRow = fightTable.find('tr').first();
    }
    
    // Log the header row HTML for debugging
    console.log('Header row HTML:', headerRow.html());
    
    // Try to get th elements
    headerRow.find('th').each((i, th) => {
      headers.push($(th).text().trim().toLowerCase());
    });
    
    // If no th elements, try td elements (sometimes headers are in td)
    if (headers.length === 0) {
      headerRow.find('td').each((i, td) => {
        headers.push($(td).text().trim().toLowerCase());
      });
    }
    // Find relevant columns - use flexible matching for different header formats
    const colMap = {
      date: headers.findIndex(h => h.includes('date') || h.includes('when')),
      opponent: headers.findIndex(h => h.includes('opponent') || h.includes('res') || h.includes('fighter')),
      event: headers.findIndex(h => h.includes('event') || h.includes('promotion')),
      result: headers.findIndex(h => h.includes('result') || h.includes('outcome')),
      method: headers.findIndex(h => h.includes('method') || h.includes('type') || h.includes('won by')),
      round: headers.findIndex(h => h.includes('round')),
      time: headers.findIndex(h => h.includes('time')),
    };
    console.log('Headers:', headers);
    console.log('Column mapping:', colMap);
    
    // If we don't have enough column mappings, try a generic approach
    if (Object.values(colMap).filter(val => val !== -1).length < 3) {
      console.log('Not enough columns mapped, trying generic approach');
      // Examine the first data row to determine structure
      const firstDataRow = fightTable.find('tr').eq(1);
      const cellCount = firstDataRow.find('td').length;
      console.log(`First data row has ${cellCount} cells`);
      
      // If we have enough cells, make an educated guess based on common Wikipedia table layouts
      if (cellCount >= 3) {
        colMap.result = 0;  // First column often has result
        colMap.opponent = 1; // Second column often has opponent
        colMap.date = cellCount >= 4 ? 2 : -1; // Third column might have date
        colMap.event = cellCount >= 5 ? 3 : -1; // Fourth column might have event
        colMap.method = cellCount >= 6 ? 4 : -1; // Fifth column might have method
        console.log('Using generic column mapping:', colMap);
      }
    }
    const fights = [];
    fightTable.find('tr').slice(1).each((i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 2) return; // Need at least opponent and result
      
      // Safe text extraction function that checks if column exists
      const getCellText = (colIndex) => {
        if (colIndex === -1 || colIndex >= tds.length) return '';
        // Extract text and clean it (Wikipedia cells often have extra markup)
        return $(tds.eq(colIndex)).text().trim().replace(/\[\d+\]/g, '');
      };
      
      // Try to extract event info, looking for UFC mention
      let event = colMap.event !== -1 ? getCellText(colMap.event) : '';
      let opponent = colMap.opponent !== -1 ? getCellText(colMap.opponent) : '';
      let result = colMap.result !== -1 ? getCellText(colMap.result) : '';
      
      // Check if any cell contains UFC text - Wikipedia tables sometimes have inconsistent formats
      let hasUfcMention = false;
      tds.each((i, cell) => {
        const cellText = $(cell).text().toLowerCase();
        if (cellText.includes('ufc')) {
          hasUfcMention = true;
          if (event === '') event = cellText;
        }
      });
      
      // Skip if we can't identify this as a UFC fight
      if (!hasUfcMention && !event.toLowerCase().includes('ufc')) {
        return;
      }
      
      // Extract name from opponent cell, which may contain hyperlinks
      if (opponent === '' && colMap.opponent !== -1) {
        const opponentLink = tds.eq(colMap.opponent).find('a').first();
        if (opponentLink.length) {
          opponent = opponentLink.text().trim();
        }
      }
      
      fights.push({
        fighter1_name: fighterName,
        date: getCellText(colMap.date),
        opponent: opponent,
        event: event,
        result: result,
        method: getCellText(colMap.method),
        round: getCellText(colMap.round),
        time: getCellText(colMap.time),
      });
    });
    
    console.log(`Extracted ${fights.length} fights with UFC mention for ${fighterName}`);
    return fights;
  } catch (err) {
    console.error('Error scraping', wikipediaUrl, err);
    return [];
  }
}

(async () => {
  const fighters = await getFightersWithWikipediaUrls();
  console.log(`Fetched ${fighters.length} fighters with Wikipedia URLs`);
  if (fighters.length === 0) {
    console.error('No fighters found with Wikipedia URLs. Check your database.');
    process.exit(1);
  }
  
  // Log the first few fighters for debugging
  console.log('Sample fighters:', fighters.slice(0, 3));
  
  let allFights = [];
  for (const fighter of fighters) {
    if (!fighter.wikipedia_url) continue;
    const fights = await scrapeFightHistory(fighter.wikipedia_url, fighter.name);
    console.log(`Found ${fights.length} UFC fights for ${fighter.name}`);
    if (fights.length > 0) {
      // Log the first fight for debugging
      console.log('Sample fight data:', fights[0]);
      allFights = allFights.concat(fights);
    }
  }
  
  console.log(`Total fights found: ${allFights.length}`);
  if (allFights.length === 0) {
    console.error('No UFC fights were found. Check the scraping logic.');
    process.exit(1);
  }
  // Upsert allFights to Supabase
  for (const fight of allFights) {
    // Find fighter1 and fighter2 IDs from fighters array
    const fighter1 = fighters.find(f => f.name === fight.fighter1_name);
    const fighter2 = fighters.find(f => f.name === fight.opponent);
    const fightRow = {
      date: fight.date,
      fighter1_id: fighter1 ? fighter1.id : null,
      fighter2_id: fighter2 ? fighter2.id : null,
      fighter1_name: fight.fighter1_name,
      fighter2_name: fight.opponent,
      event: fight.event,
      result: fight.result,
      method: fight.method,
      round: fight.round,
      time: fight.time,
      // elo fields can be added later
    };
    const { error } = await supabase
      .from('fights')
      .upsert([fightRow], { onConflict: ['date', 'fighter1_id', 'fighter2_id', 'event'] });
    if (error) {
      console.error('Error upserting fight:', fightRow, error);
    } else {
      console.log(`Successfully upserted fight: ${fightRow.fighter1_name} vs ${fightRow.fighter2_name} on ${fightRow.date}`);
    }
  }
  console.log('All fights uploaded to Supabase.');
})();
