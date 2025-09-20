import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://coryn.club";

export async function getItemById(id) {
  try {
    const { data } = await axios.get(`${BASE_URL}/item.php?id=${id}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);
    if ($("body").text().includes("No Result Found")) return null;

    const itemName = $(".card-title").first().text().trim();
    if (!itemName) return null;

    const sell = $('.item-prop .accent-bold:contains("Sell")')
      .parent()
      .find("p")
      .eq(1)
      .text()
      .trim();
    const process = $('.item-prop .accent-bold:contains("Process")')
      .parent()
      .find("p")
      .eq(1)
      .text()
      .trim();

    const stats = [];
    $(".item-basestat > div:not(:first-child)").each((_, el) => {
      const key = $(el).find("div").eq(0).text().trim();
      const val = $(el).find("div").eq(1).text().trim();
      if (key && val) stats.push(`${key}: ${val}`);
    });

    const obtainedFrom = [];
    $(".js-pagination").each((_, container) => {
      const $container = $(container);
      if ($container.find('.pagination-js-item a[href*="monster.php"]').length > 0) {
        $container.find(".pagination-js-item").each((_, el) => {
          const monsterRaw = $(el).find('a[href*="monster.php"]').first().text().trim();
          const monster = monsterRaw.replace(/\(Lv\s*\d+\)/i, "").trim();
          const map = $(el).find('a[href*="map.php"]').first().text().trim();
          if (monster || map) obtainedFrom.push({ monster, map });
        });
      }
    });

    return { id, name: itemName, sell, process, stats, obtainedFrom };
  } catch {
    return null;
  }
}

export async function getItemByIdWithFallback(requestedId, maxAttempts = 30) {
  let probeId = Number(requestedId);
  let attempts = 0;
  while (attempts < maxAttempts) {
    const item = await getItemById(probeId);
    if (item) return { ...item, id: Number(requestedId) };
    probeId++;
    attempts++;
  }
  return null;
}
