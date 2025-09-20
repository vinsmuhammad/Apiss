import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://toram-id.com';
const OUTPUT_PATH = path.join("data", "toramData", "apps_indo.json");

const STOP_AFTER_NOT_FOUND = 200;
let scriptRunning = false;

export function isScrapingIndo() {
  return scriptRunning;
}

async function getItemById(id) {
  try {
    const { data } = await axios.get(`${BASE_URL}/item/${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
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

export async function getItemByIdWithFallbackIndo(requestedId, maxAttempts = 30, delayMs = 0) {
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

export async function scrapeAllItems2() {
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
      console.warn('⚠️ File JSON rusak, mulai dari kosong.');
    }
  }

  while (true) {
    const existingIndex = results.findIndex(it => it.id === id);
    const existing = results[existingIndex];
    const item = await getItemById(id);

    if (!item) {
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
    await new Promise(r => setTimeout(r, 800));
  }
  scriptRunning = false;
}

export { getItemById };
    
