import { getItemById, scrapeAllItems } from "../scrapers/item.js";

export default async function handler(req, res) {
  try {
    const { id, force } = req.query;

    if (id) {
      const item = await getItemById(Number(id));
      if (!item) return res.status(404).json({ error: 'Item tidak ditemukan' });
      return res.status(200).json(item);
    }

    if (force === '1') {
      // Note: on Vercel this will likely be rejected by scraper (disabled).
      const data = await scrapeAllItems(true);
      return res.status(200).json(data);
    }

    return res.status(400).json({
      error: 'Gunakan ?id=123 untuk mengambil 1 item. Full scrape tidak disarankan di serverless.'
    });
  } catch (err) {
    console.error('Gagal scrape items:', err.message);
    res.status(500).json({ error: err.message || 'Gagal mengambil data items' });
  }
}
