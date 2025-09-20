import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";
const PER_PAGE = 20; // jumlah item per halaman

async function fetchPage(page = 1) {
  const { data } = await axios.get(`${BASE_URL}/items?page=${page}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 15000
  });

  const $ = cheerio.load(data);
  const items = [];

  $(".card .card-body").each((_, el) => {
    const name = $(el).find("a.text-primary").text().trim();
    const img = $(el).find("img").attr("src");
    if (!name) return;

    items.push({
      nama: name,
      link: img ? (img.startsWith("http") ? img : BASE_URL + img.replace(/^\//, "")) : null
    });
  });

  return items;
}

export async function getAppByGlobalIdIndo(globalId, maxAttempts = 30) {
  if (!globalId || globalId < 1) return null;

  let probeId = Number(globalId);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const page = Math.ceil(probeId / PER_PAGE);
    const index = (probeId - 1) % PER_PAGE;

    const items = await fetchPage(page);
    if (index >= 0 && index < items.length) {
      return { id: globalId, ...items[index] };
    }

    probeId++;
    attempts++;
  }

  return null;
}
