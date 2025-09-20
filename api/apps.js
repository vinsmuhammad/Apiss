import { getAppById } from "../scrapers/app-item.js";

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Gunakan ?id=123 untuk ambil 1 app" });
    }

    const app = await getAppById(Number(id));
    if (!app) {
      return res.status(404).json({ error: "App tidak ditemukan" });
    }

    res.setHeader("Content-Type", "application/json");
    res.status(200).json(app);
  } catch (err) {
    console.error("Gagal scrape app:", err.message);
    res.status(500).json({ error: "Gagal mengambil data app" });
  }
}
