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
      // Nama
      const name = $(el).find("b.h6 a.text-primary").text().trim() || "-";

      // Status Monster
      const stats = [];
      $(el)
        .find(".tab-pane[id^='status-monster'] dl p")
        .each((_, p) => {
          const txt = $(p).text().trim();
          if (txt) stats.push(txt);
        });
      if (stats.length === 0) stats.push("-");

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
        stats,
        obtainedFrom
      });
    });

    return items;
  } catch (e) {
    console.error("fetchPage error:", e.message);
    return [];
  }
}

export async function getItemIndoById(globalId, maxFallback = 30) {
  if (!globalId || globalId < 1) return null;

  // Urutan pencarian: 0, +1, -1, +2, -2, dst sampai maxFallback
  for (let offset = 0; offset <= maxFallback; offset++) {
    for (const sign of [1, -1]) {
      if (offset === 0 && sign === -1) continue; // skip duplikat 0
      const probeId = globalId + offset * sign;
      if (probeId < 1) continue;

      const page = Math.ceil(probeId / PER_PAGE);
      const index = (probeId - 1) % PER_PAGE;

      const items = await fetchPage(page);
      if (index >= 0 && index < items.length) {
        // id output SELALU pakai globalId, bukan probeId
        return { id: globalId, ...items[index] };
      }
    }
  }

  return null;
}
