import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://coryn.club";
const STOP_AFTER_NOT_FOUND = 250;
const SKIP_BEFORE_ID = 8000;

export async function scrapeAllItems() {
  let results = [];
  let id = 1;
  let notFoundCount = 0;

  while (true) {
    try {
      const { data } = await axios.get(`${BASE_URL}/item.php?id=${id}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 15000,
      });

      const $ = cheerio.load(data);
      if ($("body").text().includes("No Result Found")) {
        if (id < SKIP_BEFORE_ID) {
          id++;
          continue;
        }
        notFoundCount++;
        if (notFoundCount >= STOP_AFTER_NOT_FOUND) break;
        id++;
        continue;
      }

      const name = $(".card-title").first().text().trim();
      if (!name) {
        id++;
        continue;
      }

      results.push({ nama: name });
    } catch {
      id++;
      continue;
    }

    id++;
    await new Promise((r) => setTimeout(r, 300));
  }

  return results.map((item, idx) => ({ id: idx + 1, ...item }));
}
