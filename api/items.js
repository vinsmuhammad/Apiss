import fs from 'fs';
import path from 'path';
import { scrapeAllItems } from '../scrapers/item.js';

let cache = null;
let lastUpdate = 0;
const INTERVAL = 2 * 60 * 60 * 1000; // 2 jam

async function updateCache() {
  try {
    await scrapeAllItems();
    const filePath = path.join("data", "toramData", "items.json");
    const raw = fs.readFileSync(filePath, 'utf-8');
    cache = JSON.parse(raw);
    lastUpdate = Date.now();
  } catch (err) {
    console.error('Gagal update cache items:', err.message);
  }
}

export default async function handler(req, res) {
  if (!cache || Date.now() - lastUpdate > INTERVAL) {
    await updateCache();
  }
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(cache || []);
}