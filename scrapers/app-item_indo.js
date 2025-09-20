import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://toram-id.com';
let cache = null;
let lastUpdate = 0;
const INTERVAL = 2 * 60 * 60 * 1000; // 2 jam

async function fetchPage(page) {
  const url = `${BASE_URL}/items?page=${page}`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': BASE_URL,
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);
    const items = [];

    $('.card .card-body').each((_, el) => {
      const name = $(el).find('a.text-primary').text().trim();
      const href = $(el).find('a.text-primary').attr('href');
      const img = $(el).find('img').attr('src');
      if (!name || !href) return;

      items.push({
        nama: name,
        link: img ? (img.startsWith('http') ? img : BASE_URL + img.replace(/^\//, '')) : null
      });
    });

    return items;
  } catch (err) {
    console.error(`❌ Toram Id Gagal ambil page ${page}: ${err.message}`);
    return [];
  }
}

export async function scrapeAllAppsIndo(force = false) {
  if (!force && cache && Date.now() - lastUpdate < INTERVAL) {
    return cache;
  }

  let results = [];
  let page = 1;
  let emptyCount = 0;

  while (emptyCount < 20) {
    console.log(`📥 Scraping page ${page}...`);
    const items = await fetchPage(page);

    if (items.length === 0) {
      emptyCount++;
      console.log(`  Page ${page} → kosong (${emptyCount}/20)`);
    } else {
      emptyCount = 0;
      for (const item of items) {
        const idx = results.findIndex(r => r.link === item.link);
        if (idx !== -1) {
          const old = results[idx];
          if (old.nama !== item.nama) {
            results[idx] = item;
            console.log(`   🔄 Update: ${item.nama}`);
          }
        } else {
          results.push(item);
          console.log(`   ➕ Tambah: ${item.nama}`);
        }
      }
      console.log(`  Page ${page} → ${items.length} item`);
    }

    page++;
    await new Promise(r => setTimeout(r, 600));
  }

  cache = results;
  lastUpdate = Date.now();
  console.log(`✅ Scraping selesai. Total: ${results.length} items.`);
  return results;
}
