import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";

export async function scrapeAppsIndo(page = 1) {
  try {
    const { data } = await axios.get(`${BASE_URL}/items?page=${page}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);
    const items = [];

    $(".card .card-body").each((_, el) => {
      const name = $(el).find("a.text-primary").text().trim();
      const href = $(el).find("a.text-primary").attr("href");
      const img = $(el).find("img").attr("src");
      if (!name || !href) return;

      items.push({
        nama: name,
        link: img ? (img.startsWith("http") ? img : BASE_URL + img.replace(/^\//, "")) : null,
      });
    });

    return items;
  } catch {
    return [];
  }
}
