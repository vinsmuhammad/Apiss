import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://toram-id.com';
const STOP_AFTER_NOT_FOUND = 200;

let scriptRunning = false;
let cache = null;
let lastUpdate = 0;
const INTERVAL = 2 * 60 * 60 * 1000; // 2 jam

export function isScrapingIndo() {
  return scriptRunning;
}

export async function getItemByIdIndo(id) {
  try {
    const { data } = await axios.get(`${BASE_URL}/item/${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': BASE_URL,
        'Connection': 'keep-alive'
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);
    const itemName = $('.card-title').first().text().trim();
    if (!itemName) return null;

    let sell = null, process = null;
    const stats = [];

    $('.card-body .row').each((_, el) => {
      const key = $(el).find('.col-4').text().trim();
      const val = $(el).find('.col-8').text().trim();
      if (!key || !val) return;
      if (/harga jual/i.test(key)) sell = val;
      else if (/proses/i.test(key)) process = val;
      else stats.push(`${key}: ${val}`);
    });

    const obtainedFrom = [];
    $('#drop-list .row').each((_, el) => {
      const monster = $(el).find('a[href*="/monster/"]').text().trim();
      const map = $(el).find('a[href*="/map/"]').text().trim();
      if (monster || map) obtainedFrom.push({ monster, map });
    });

    return { id, name: itemName, sell, process, stats, obtainedFrom };
  } catch {
    return null;
  }
}

export async function scrapeAllItemsIndo(force = false) {
  const IS_SERVERLESS = !!process.env.VERCEL;
  if (IS_SERVERLESS && !force) {
    throw new Error('Full scraping (semua item) dilarang di environment serverless. Gunakan getItemByIdIndo(id) atau jalankan di mesin lokal.');
  }

  if (!force && cache && Date.now() - lastUpdate < INTERVAL) {
    return cache;
  }

  if (scriptRunning) return [];
  scriptRunning = true;

  let id = 1;
  let results = [];
  let notFoundCount = 0;

  while (true) {
    const item = await getItemByIdIndo(id);

    if (!item) {
      notFoundCount++;
      if (notFoundCount >= STOP_AFTER_NOT_FOUND) break;
      id++;
      continue;
    }

    notFoundCount = 0;
    results.push(item);
    id++;
    await new Promise(r => setTimeout(r, 400));
  }

  scriptRunning = false;
  cache = results;
  lastUpdate = Date.now();
  return results;
}
