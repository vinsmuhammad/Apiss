import { scrapeAllItemsIndo } from "../scrapers/item_indo.js";

let cache = null;
let lastUpdate = 0;
const INTERVAL = 2 * 60 * 60 * 1000;

async function getData(force = false) {
  if (!force && cache && Date.now() - lastUpdate < INTERVAL) {
    return cache;
  }
  const data = await scrapeAllItemsIndo();
  cache = data;
  lastUpdate = Date.now();
  return data;
}

export default async function handler(req, res) {
  try {
    const { id, force } = req.query;
    const data = await getData(force === "1");

    if (id) {
      const found = data.find((item) => item.id === Number(id));
      if (!found) return res.status(404).json({ error: "Tidak ditemukan" });
      return res.status(200).json(found);
    }

    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: "Gagal ambil data items indo" });
  }
}
