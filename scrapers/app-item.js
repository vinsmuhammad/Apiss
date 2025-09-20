import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://coryn.club';
const OUTPUT_PATH = path.join("data", "toramData", "apps.json");

// daftar kategori & type
const APP_TYPES = {
  ARMOR: 8,
  ADD: 6,
  SHIELD: 17,
  '1H': 4,
  '2H': 5,
  BOW: 9,
  BOWGUN: 10,
  KNUCKLES: 13,
  'MAGIC DEVICE': 15,
  STAFF: 19,
  HALBERD: 26,
  KATANA: 27
};

async function fetchPage(type, category, page) {
  const url = `${BASE_URL}/app_showcase.php?&show=20&type=${type}&p=${page}`;
  try {
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    const apps = [];

    $('.card-container.app-showcase .app').each((_, el) => {
      const name = $(el).find('.accent-bold.title').text().trim();
      const rawPath = $(el).find('img').attr('src');
      if (!name || !rawPath) return;

      let fixedLink;
      if (rawPath.startsWith('app/')) {
        const filename = rawPath.slice(4);
        fixedLink = BASE_URL + '/app/' + encodeURIComponent(filename);
      } else {
        fixedLink = BASE_URL + '/' + encodeURIComponent(rawPath.replace(/^\//, ''));
      }
      apps.push({ nama: name, link: fixedLink });
    });

    return apps;
  } catch (err) {
    console.error(`Gagal ambil page ${page} untuk ${category}: ${err.message}`);
    return [];
  }
}

export async function scrapeAllApps() {
  let results = [];

  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      results = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    } catch {
      console.warn('⚠️ File JSON lama rusak, mulai dari kosong.');
    }
  }

  for (const [category, type] of Object.entries(APP_TYPES)) {
    console.log(`📥 Scraping kategori: ${category}...`);
    let emptyCount = 0;
    let page = 0;

    while (emptyCount < 10) {
      const apps = await fetchPage(type, category, page);
      if (apps.length === 0) {
        emptyCount++;
        console.log(`  Page ${page} → kosong (${emptyCount}/10)`);
      } else {
        emptyCount = 0;
        for (const app of apps) {
          const idx = results.findIndex(r => r.link === app.link);
          if (idx !== -1) {
            const old = results[idx];
            if (old.nama !== app.nama || old.link !== app.link) {
              results[idx] = app;
              console.log(`   🔄 Update: ${app.nama}`);
            }
          } else {
            results.push(app);
            console.log(`   ➕ Tambah: ${app.nama}`);
          }
        }
        console.log(`  Page ${page} → ${apps.length} item`);
      }
      page++;
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`✅ Scraping selesai. Total: ${results.length} apps.`);
}