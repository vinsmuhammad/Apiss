import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";
const PER_PAGE = 20;

async function fetchItemDetail(url) {
  try {
    const { data } = await axios.get(BASE_URL + url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });
    const $ = cheerio.load(data);

    // Nama
    const name = $("b.h6 a.text-primary").first().text().trim() || "-";

    // Gambar utama
    let image = $(".col-md-4 img[data-src]").attr("data-src");
    if (!image) image = "-";
    else if (!image.startsWith("http")) image = BASE_URL + image;

    // Status Monster (semua tab yg id mulai dengan status-monster)
    const stats = [];
    $(".tab-pane[id^='status-monster'] dl p").each((_, el) => {
      stats.push($(el).text().trim());
    });
    if (stats.length === 0) stats.push("-");

    // Status NPC (semua tab yg id mulai dengan status-npc)
    const npcStats = [];
    $(".tab-pane[id^='status-npc'] dl p").each((_, el) => {
      npcStats.push($(el).text().trim());
    });
    if (npcStats.length === 0) npcStats.push("-");

    // Craft: Player (semua tab yg id mulai dengan mats)
    let process = "-";
    $(".tab-pane[id^='mats']").each((_, el) => {
      const content = $(el).text().trim();
      if (content && !/Tidak ada/i.test(content)) {
        process = content;
      }
    });

    // Drop dari
    const obtainedFrom = [];
    $("details summary:contains('Bisa di peroleh')").parent().find("a").each((_, el) => {
      const txt = $(el).text().trim();
      if (txt && !txt.includes("Lihat...")) obtainedFrom.push(txt);
    });
    if (obtainedFrom.length === 0) obtainedFrom.push("-");

    return {
      name,
      image,
      stats,
      npcStats,
      process,
      obtainedFrom
    };
  } catch {
    return null;
  }
}

async function fetchPage(page = 1) {
  const url = `${BASE_URL}/items?page=${page}`;
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });
    const $ = cheerio.load(data);

    const items = [];
    $(".card .card-body b.h6 a.text-primary").each((_, el) => {
      const href = $(el).attr("href");
      if (href) items.push({ href });
    });
    return items;
  } catch {
    return [];
  }
}

export async function getItemIndoById(globalId, maxAttempts = 30) {
  if (!globalId || globalId < 1) return null;

  let probeId = Number(globalId);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const page = Math.ceil(probeId / PER_PAGE);
    const index = (probeId - 1) % PER_PAGE;

    const items = await fetchPage(page);
    if (index >= 0 && index < items.length) {
      const detail = await fetchItemDetail(items[index].href);
      if (detail) return { id: globalId, ...detail };
    }

    probeId++;
    attempts++;
  }

  return null;
}
