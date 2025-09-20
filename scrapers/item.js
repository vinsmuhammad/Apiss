import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://coryn.club';
const OUTPUT_PATH = path.join("data", "toramData", "items.json");

const STOP_AFTER_NOT_FOUND = 250;
const SKIP_BEFORE_ID = 8000;

let scriptRunning = false;
export function isScraping() {
  return scriptRunning;
}

async function getItemById(id) {
  try {
    const { data } = await axios.get(`${BASE_URL}/item.php?id=${id}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(data);

    if ($('body').text().includes('No Result Found')) return null;

    const itemName = $('.card-title').first().text().trim();
    if (!itemName) return null;

    const sell = $('.item-prop .accent-bold:contains("Sell")').parent().find('p').eq(1).text().trim();
    const process = $('.item-prop .accent-bold:contains("Process")').parent().find('p').eq(1).text().trim();

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

export async function getItemByIdWithFallback(requestedId, maxAttempts = 30, delayMs = 0) {
  let attempts = 0;
  let probeId = Number(requestedId);
  if (isNaN(probeId) || probeId < 1) throw new Error('requestedId harus angka > 0');

  while (attempts < maxAttempts) {
    const item = await getItemById(probeId);
    if (item) {
      return { ...item, id: Number(requestedId) };
    }
    probeId++;
    attempts++;
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));
  }
  return null;
}

export async function scrapeAllItems() {
  if (scriptRunning) return;
  scriptRunning = true;
  let id = 1;
  let results = [];
  let notFoundCount = 0;

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      results = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    } catch {
      console.warn('File JSON rusak. Memulai dari kosong.');
    }
  }

  while (true) {
    const existingIndex = results.findIndex(it => it.id === id);
    const existing = results[existingIndex];
    const item = await getItemById(id);

    if (!item) {
      if (id < SKIP_BEFORE_ID) { id++; continue; }
      notFoundCount++;
      if (notFoundCount >= STOP_AFTER_NOT_FOUND) break;
      id++;
      continue;
    }

    notFoundCount = 0;
    if (existing) {
      const oldData = { ...existing };
      const newData = { ...item };
      delete oldData.id; delete newData.id;
      if (JSON.stringify(oldData) !== JSON.stringify(newData)) results[existingIndex] = item;
    } else {
      results.push(item);
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    id++;
  }
  scriptRunning = false;
}

export { getItemById };
