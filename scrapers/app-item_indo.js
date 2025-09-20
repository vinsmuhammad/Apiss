import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";
const PER_PAGE = 20; // Toram-ID biasanya menampilkan 20 item per halaman

async function fetchPage(page = 1) {
  const url = `${BASE_URL}/items?page=${page}`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Referer": BASE_URL
      },
      timeout: 15000
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
        link: img ? (img.startsWith("http") ? img : BASE_URL + img.replace(/^\//, "")) : null
      });
    });

    return items;
  } catch {
    return [];
  }
}

export async function getAppByGlobalIdIndo(globalId) {
  if (!globalId || globalId < 1) return null;

  const page = Math.ceil(globalId / PER_PAGE);
  const index = (globalId - 1) % PER_PAGE;

  const items = await fetchPage(page);
  if (index < 0 || index >= items.length) return null;

  return { id: globalId, ...items[index] };
}
