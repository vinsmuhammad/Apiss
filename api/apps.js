import { scrapeAllApps } from "../scrapers/app-item.js";

export default async function handler(req, res) {
  try {
    const force = req.query?.force === '1';
    const data = await scrapeAllApps(force);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
  } catch (err) {
    console.error('Gagal scrape apps:', err.message);
    res.status(500).json({ error: err.message || 'Gagal mengambil data apps' });
  }
}
