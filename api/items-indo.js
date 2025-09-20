import { scrapeAllItemsIndo } from '../scrapers/item_indo.js';

export default async function handler(req, res) {
  try {
    const data = await scrapeAllItemsIndo(); // langsung scrape tiap request
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
  } catch (err) {
    console.error('Gagal scrape items-indo:', err.message);
    res.status(500).json({ error: 'Gagal mengambil data items-indo' });
  }
}
