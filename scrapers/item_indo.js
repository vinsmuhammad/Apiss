import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";
const STOP_AFTER_NOT_FOUND = 200;

export async function scrapeAllItemsIndo() {
  let results = [];
  let id = 1;
  let notFoundCount = 0;

  while (true) {
    try {
      const { data } = await axios.get(`${BASE_URL}/item/${id}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 15000,
      });

      const $ = cheerio.load(data);
      const name = $(".card-title").first().text().trim();
      if (!name) {
        notFoundCount++;
        if (notFoundCount >= STOP_AFTER_NOT_FOUND) break;
        id++;
        continue;
      }

      results.push({ nama: name });
    } catch {
      notFoundCount++;
      if (notFoundCount >= STOP_AFTER_NOT_FOUND) break;
    }

    id++;
    await new Promise((r) => setTimeout(r, 400));
  }

  return results.map((item, idx) => ({ id: idx + 1, ...item }));
}
