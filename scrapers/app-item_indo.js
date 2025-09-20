import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";

async function fetchPage(page) {
  const url = `${BASE_URL}/items?page=${page}`;
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000,
    });

    const $ = cheerio.load(data);
    const items = [];

    $(".card .card-body").each((_, el) => {
      const name = $(el).find("a.text-primary").text().trim();
      const img = $(el).find("img").attr("src");
      if (!name) return;

      items.push({
        nama: name,
        link: img ? (img.startsWith("http") ? img : BASE_URL + img) : null,
      });
    });

    return items;
  } catch {
    return [];
  }
}

export async function scrapeAllAppsIndo() {
  let results = [];
  let page = 1;
  let emptyCount = 0;

  while (emptyCount < 5) {
    const items = await fetchPage(page);
    if (items.length === 0) {
      emptyCount++;
    } else {
      emptyCount = 0;
      results = results.concat(items);
    }
    page++;
    await new Promise((r) => setTimeout(r, 400));
  }

  return results.map((item, idx) => ({ id: idx + 1, ...item }));
}
