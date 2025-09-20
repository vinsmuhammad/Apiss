import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";
const PER_PAGE = 20;

async function fetchDetailImage(itemUrl) {
  try {
    const { data } = await axios.get(BASE_URL + itemUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });
    const $ = cheerio.load(data);

    // Cari gambar utama di halaman detail
    const img = $(".row img[data-src]").attr("data-src");
    if (img && img.includes("/imgs/mobs/")) {
      return img.startsWith("http") ? img : BASE_URL + img;
    }
    return "-";
  } catch {
    return "-";
  }
}

async function fetchPage(page = 1) {
  const url = `${BASE_URL}/items?page=${page}`;
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 15000
  });

  const $ = cheerio.load(data);
  const items = [];

  $(".card .card-body").each((_, el) => {
    const name = $(el).find("a.text-primary").text().trim();
    const href = $(el).find("a.text-primary").attr("href");
    if (!name || !href) return;

    items.push({ nama: name, href });
  });

  // Ambil gambar detail secara paralel
  const results = await Promise.all(
    items.map(async (it) => {
      const img = await fetchDetailImage(it.href);
      return { nama: it.nama, link: img };
    })
  );

  return results;
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
