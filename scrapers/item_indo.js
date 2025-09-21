import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";

/**
 * Ambil data item berdasarkan ID
 */
export async function getItemIndoByIdRaw(id) {
  try {
    const page = Math.ceil(id / 20);
    const index = (id - 1) % 20;

    const { data } = await axios.get(`${BASE_URL}/items?page=${page}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000,
    });

    const $ = cheerio.load(data);
    const cards = $(".card");

    if (index >= cards.length) return null;

    const el = cards.eq(index);

    // Nama
    const name = el.find("b.h6 a.text-primary").text().trim() || "-";

    // Status
    const stats = [];
    el.find(".tab-pane[id^='status-monster'] dl p").each((_, p) => {
      const txt = $(p).text().trim();
      if (txt) stats.push(txt);
    });
    if (stats.length === 0) stats.push("-");

    // Drop / diperoleh dari
    const obtainedFrom = [];
    el.find("details summary:contains('Bisa di peroleh')")
      .parent()
      .find("div.my-2 a")
      .each((_, a) => {
        const txt = $(a).text().trim();
        const map = $(a).parent().find("small").text().trim();
        if (txt) obtainedFrom.push(map ? `${txt} ${map}` : txt);
      });
    if (obtainedFrom.length === 0) obtainedFrom.push("-");

    return { id, name, stats, obtainedFrom };
  } catch {
    return null;
  }
}

/**
 * Ambil data item dengan fallback increment (cek ID berikutnya jika tidak ada)
 */
export async function getItemIndoById(requestedId, maxAttempts = 30) {
  let probeId = Number(requestedId);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const item = await getItemIndoByIdRaw(probeId);
    if (item) {
      return { ...item, id: Number(requestedId) };
    }
    probeId++;
    attempts++;
  }

  return "not found";
}
