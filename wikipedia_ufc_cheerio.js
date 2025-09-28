const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cheerio = require('cheerio');
const fs = require('fs');

// Wikipedia URL for current UFC fighters
const UFC_URL = 'https://en.wikipedia.org/wiki/List_of_current_UFC_fighters';

// List of allowed headings (weight classes)
const allowedHeadings = [
  'Debuted fighters',
  'Heavyweights (265lb, 120 kg)',
  'Light heavyweights (205 lb, 93 kg)',
  'Middleweights (185 lb, 84 kg)',
  'Welterweights (170 lb, 77 kg)',
  'Lightweights (155 lb, 70 kg)',
  'Featherweights (145 lb, 65 kg)',
  'Bantamweights (135 lb, 61 kg)',
  'Flyweights (125 lb, 56 kg)',
  "Women's bantamweights (135 lb, 61 kg)",
  "Women's flyweights (125 lb, 56 kg)",
  "Women's strawweights (115 lb, 52 kg)"
];

async function fetchUfcFighters() {
  const res = await fetch(UFC_URL);
  const html = await res.text();
  const $ = cheerio.load(html);
  const divisions = [];

  // No debug output for headings

  // For each allowed heading, find the h3 with that text, then from its parent, scan all following elements for the first table.wikitable
  allowedHeadings.forEach(heading => {
    const h3 = $('h3').filter((i, el) => $(el).text().replace(/\[edit\]/, '').trim() === heading).first();
    if (!h3.length) return;
    let foundTable = false;
    let next = h3.parent().next();
    while (next.length && !foundTable) {
      if (next.is('table.wikitable')) {
        foundTable = true;
        // Print division name
        const table = next;
        const headers = [];
        table.find('tr').first().find('th').each((i, th) => {
          headers.push($(th).text().trim());
        });
        const keepCols = headers.map((h, idx) =>
          ['Name', 'Ht.', 'Nickname', 'Result / next fight / status', 'Endeavor record', 'MMA record'].includes(h) ? idx : -1
        ).filter(idx => idx !== -1);
        const fighters = [];
        let printed = 0;
        let fighterObjs = [];
        table.find('tr').slice(1).each((i, tr) => {
          if (printed >= 3) return false; // Only process 3 fighters per division for debugging
          const row = {};
          $(tr).find('td').each((j, td) => {
            if (!keepCols.includes(j)) return;
            let value = $(td).text().trim();
            if (headers[j] && headers[j].toLowerCase() === 'name') {
              const a = $(td).find('a').first();
              if (a.length) value = a.text().trim();
            }
            row[headers[j]] = value;
          });
          if (row['Name']) {
            const a = $(tr).find('td').eq(headers.findIndex(h => h.toLowerCase() === 'name')).find('a').first();
            if (a.length) {
              const wikiUrl = a.attr('href').startsWith('http') ? a.attr('href') : `https://en.wikipedia.org${a.attr('href')}`;
              fighterObjs.push({
                name: row['Name'],
                nickname: row['Nickname'] || '',
                division: heading,
                wikipedia_url: wikiUrl
              });
              printed++;
            }
          }
        });
        if (fighterObjs.length > 0) {
          fighterObjs.forEach(f => {
            console.log(JSON.stringify(f));
            divisions.push(f);
          });
        }
      }
      next = next.next();
    }
  });

  fs.writeFileSync('output_ufc_fighters_cheerio.json', JSON.stringify(divisions, null, 2));
}

fetchUfcFighters();
