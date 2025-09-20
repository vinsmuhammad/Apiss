import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";

export async function getItemByIdIndo(id) {
  try {
    const { data } = await axios.get(`${BASE_URL}/item/${id}`, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": BASE_URL },
      timeout: 15000
    });

    const $ = cheerio.load(data);
    const itemName = $(".card-title").first().text().trim();
    if (!itemName) return null;

    let sell = null, process = null;
    const stats = [];
    $(".card-body .row").each((_, el) => {
      const key = $(el).find(".col-4").text().trim();
      const val = $(el).find(".col-8").text().trim();
      if (!key || !val) return;
      if (/harga jual/i.test(key)) sell = val;
      else if (/proses/i.test(key)) process = val;
      else stats.push(`${key}: ${val}`);
    });

    const obtainedFrom = [];
    $("#drop-list .row").each((_, el) => {
      const monster = $(el).find('a[href*="/monster/"]').text().trim();
      const map = $(el).find('a[href*="/map/"]').text().trim();
      if (monster || map) obtainedFrom.push({ monster, map });
    });

    return { id, name: itemName, sell, process, stats, obtainedFrom };
  } catch {
    return null;
  }
}

export async function getItemByIdWithFallbackIndo(requestedId, maxAttempts = 30) {
  let probeId = Number(requestedId);
  let attempts = 0;
  while (attempts < maxAttempts) {
    const item = await getItemByIdIndo(probeId);
    if (item) return { ...item, id: Number(requestedId) };
    probeId++;
    attempts++;
  }
  return null;
}
