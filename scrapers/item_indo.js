import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";
const PER_PAGE = 20;

async function fetchPage(page = 1) {
  const url = `${BASE_URL}/items?page=${page}`;
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });
    const $ = cheerio.load(data);

    const items = [];
    $(".card").each((_, el) => {
      // Nama & href
      const anchor = $(el).find("b.h6 a.text-primary");
      const name = anchor.text().trim() || "-";
      const href = anchor.attr("href") || "-";

      // Icon / gambar kecil
      let icon = $(el).find("img.avatar").attr("src") || "-";
      if (icon !== "-" && !icon.startsWith("http")) {
        icon = BASE_URL + icon;
      }

      // Gambar utama (lazyload pakai data-src)
      let image =
        $(el).find("img[data-src]").attr("data-src") ||
        $(el).find("img.rounded").attr("src") ||
        "-";
      if (image !== "-" && !image.startsWith("http")) {
        image = BASE_URL + image;
      }

      // Status Monster
      const stats = [];
      $(el)
        .find(".tab-pane[id^='status-monster'] dl p")
        .each((_, p) => {
          const txt = $(p).text().trim();
          if (txt) stats.push(txt);
        });
      if (stats.length === 0) stats.push("-");

      // Status NPC
      const npcStats = [];
      $(el)
        .find(".tab-pane[id^='status-npc'] dl p")
        .each((_, p) => {
          const txt = $(p).text().trim();
          if (txt) npcStats.push(txt);
        });
      if (npcStats.length === 0) {
        if ($(el).find(".tab-pane[id^='status-npc']").text().match(/tidak ada/i)) {
          npcStats.push("-");
        }
      }

      // Craft Player
      let process = "-";
      const mats = $(el).find(".tab-pane[id^='mats']").text().trim();
      if (mats && !/Tidak ada/i.test(mats)) {
        process = mats.replace(/\s+/g, " ").trim();
      }

      // Drop / diperoleh dari
      const obtainedFrom = [];
      $(el)
        .find("details summary:contains('Bisa di peroleh')")
        .parent()
        .find("div.my-2")
        .each((_, div) => {
          const monster = $(div).find("a").first().text().trim();
          const map = $(div).find("small").text().trim();
          if (monster) {
            obtainedFrom.push(map ? `${monster} ${map}` : monster);
          }
        });
      if (obtainedFrom.length === 0) obtainedFrom.push("-");

      items.push({
        name,
        href,
        icon,
        image,
        stats,
        npcStats,
        process,
        obtainedFrom
      });
    });

    return items;
  } catch (e) {
    console.error("fetchPage error:", e.message);
    return [];
  }
}

export async function getItemIndoById(globalId) {
  if (!globalId || globalId < 1) return null;

  const page = Math.ceil(globalId / PER_PAGE);
  const index = (globalId - 1) % PER_PAGE;

  const items = await fetchPage(page);
  if (index >= 0 && index < items.length) {
    return { id: globalId, ...items[index] };
  }

  return null;
}
