import { scrapeAllItems } from '../scrapers/item.js';

export default async function handler(req, res) {
  try {
    const data = await scrapeAllItems(); // langsung scrape tiap request
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
  } catch (err) {
    console.error('Gagal scrape items:', err.message);
    res.status(500).json({ error: 'Gagal mengambil data items' });
  }
}
