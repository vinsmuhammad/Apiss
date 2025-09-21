import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";
const PER_PAGE = 20;

async function fetchObtainedFromDetail(relativeUrl) {
  try {
    const { data } = await axios.get(BASE_URL + relativeUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });
    const $ = cheerio.load(data);

    const results = [];
    $(".card:contains('Drop Dari') .card-body .mb-5").each((_, el) => {
      const monster = $(el).find("dt a.text-primary").text().trim();
      const map = $(el).find("dd b:contains('Peta:')").parent().find("a").text().trim();
      if (monster) {
        results.push(map ? `${monster} [${map}]` : monster);
      }
    });
    return results.length ? results : ["-"];
  } catch {
    return ["-"];
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
    $(".card").each((_, el) => {
      const anchor = $(el).find("b.h6 a.text-primary");
      const name = anchor.text().trim() || "-";
      const href = anchor.attr("href") || "";
      const realId = href ? parseInt(href.split("/").pop(), 10) : null;

      const stats = [];
      $(el)
        .find(".tab-pane[id^='status-monster'] dl p")
        .each((_, p) => {
          const txt = $(p).text().trim();
          if (txt) stats.push(txt);
        });
      if (!stats.length) stats.push("-");

      const obtainedFrom = [];
      $(el)
        .find("details summary:contains('Bisa di peroleh')")
        .parent()
        .find("div.my-2 a")
        .each((_, a) => {
          const txt = $(a).text().trim();
          const hrefA = $(a).attr("href");
          const map = $(a).parent().find("small").text().trim();

          if (txt && txt.toLowerCase().includes("lihat") && hrefA) {
            obtainedFrom.push({ type: "lihat", href: hrefA });
          } else if (txt && !txt.includes("Lihat")) {
            obtainedFrom.push(map ? `${txt} ${map}` : txt);
          }
        });

      items.push({
        id: realId,
        name,
        stats,
        obtainedFrom
      });
    });

    // Resolve "Lihat..." links
    for (const item of items) {
      const newList = [];
      for (const entry of item.obtainedFrom) {
        if (typeof entry === "object" && entry.type === "lihat") {
          const drops = await fetchObtainedFromDetail(entry.href);
          newList.push(...drops);
        } else {
          newList.push(entry);
        }
      }
      if (!newList.length) newList.push("-");
      item.obtainedFrom = newList;
    }

    return items;
  } catch {
    return [];
  }
}

// === Main Export ===
// Forward-only fallback ala Coryn.club
export async function getItemIndoById(requestedId, maxAttempts = 30) {
  if (!requestedId || requestedId < 1) return "not found";

  let probeId = Number(requestedId);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const page = Math.ceil(probeId / PER_PAGE);
    const items = await fetchPage(page);

    const found = items.find(it => it.id === probeId);
    if (found) {
      return { ...found, id: requestedId }; // id tetap requested
    }

    probeId++;
    attempts++;
  }

  return "not found";
}
