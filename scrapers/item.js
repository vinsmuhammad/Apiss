import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://coryn.club';
const STOP_AFTER_NOT_FOUND = 250;
const SKIP_BEFORE_ID = 8000;

let scriptRunning = false;

export function isScraping() {
  return scriptRunning;
}

export async function getItemById(id) {
  try {
    const { data } = await axios.get(`${BASE_URL}/item.php?id=${id}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
    const $ = cheerio.load(data);

    if ($('body').text().includes('No Result Found')) return null;

    const itemName = $('.card-title').first().text().trim();
    if (!itemName) return null;

    const sell = $('.item-prop .accent-bold:contains("Sell")').parent().find('p').eq(1).text().trim() || null;
    const process = $('.item-prop .accent-bold:contains("Process")').parent().find('p').eq(1).text().trim() || null;

    const stats = [];
    $('.item-basestat > div:not(:first-child)').each((_, el) => {
      const key = $(el).find('div').eq(0).text().trim();
      const val = $(el).find('div').eq(1).text().trim();
      if (key && val) stats.push(`${key}: ${val}`);
    });

    const obtainedFrom = [];
    $('.js-pagination').each((_, container) => {
      const $container = $(container);
      if ($container.find('.pagination-js-item a[href*="monster.php"]').length > 0) {
        $container.find('.pagination-js-item').each((_, el) => {
          const monsterRaw = $(el).find('a[href*="monster.php"]').first().text().trim();
          const monster = monsterRaw.replace(/\(Lv\s*\d+\)/i, '').trim();
          const map = $(el).find('a[href*="map.php"]').first().text().trim();
          if (monster || map) obtainedFrom.push({ monster, map });
        });
      }
    });

    return { id, name: itemName, sell, process, stats, obtainedFrom };
  } catch {
    return null;
  }
}

/**
 * Full scraping (sequential many IDs) is **disabled on serverless** by default because:
 * - It can run very long and hit timeouts.
 * - If you really need it, run locally or on a VM and store results externally (S3/DB).
 */
export async function scrapeAllItems(force = false) {
  const IS_SERVERLESS = !!process.env.VERCEL;
  if (IS_SERVERLESS && !force) {
    throw new Error('Full scraping is disabled on serverless environments. Use getItemById(id) or run this script locally with force=true.');
  }

  if (scriptRunning) return [];
  scriptRunning = true;

  let id = 1;
  let results = [];
  let notFoundCount = 0;

  while (true) {
    const item = await getItemById(id);

    if (!item) {
      if (id < SKIP_BEFORE_ID) { id++; continue; }
      notFoundCount++;
      if (notFoundCount >= STOP_AFTER_NOT_FOUND) break;
      id++;
      continue;
    }

    notFoundCount = 0;
    results.push(item);
    id++;
    // be polite
    await new Promise(r => setTimeout(r, 300));
  }

  scriptRunning = false;
  return results;
}
