import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://coryn.club";

// daftar kategori & type
const APP_TYPES = {
  ARMOR: 8,
  ADD: 6,
  SHIELD: 17,
  "1H": 4,
  "2H": 5,
  BOW: 9,
  BOWGUN: 10,
  KNUCKLES: 13,
  "MAGIC DEVICE": 15,
  STAFF: 19,
  HALBERD: 26,
  KATANA: 27
};

const PER_PAGE = 20;

/** Ambil satu halaman */
async function fetchPage(type, page) {
  const url = `${BASE_URL}/app_showcase.php?&show=${PER_PAGE}&type=${type}&p=${page}`;
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 8000
    });
    const $ = cheerio.load(data);

    const apps = [];
    $(".card-container.app-showcase .app").each((_, el) => {
      const name = $(el).find(".accent-bold.title").text().trim();
      const rawPath = $(el).find("img").attr("src");
      if (!name || !rawPath) return;

      let fixedLink;
      if (rawPath.startsWith("app/")) {
        const filename = rawPath.slice(4);
        fixedLink = BASE_URL + "/app/" + encodeURIComponent(filename);
      } else {
        fixedLink = BASE_URL + "/" + encodeURIComponent(rawPath.replace(/^\//, ""));
      }

      apps.push({ nama: name, link: fixedLink });
    });

    return apps;
  } catch {
    return [];
  }
}

/**
 * Cari app berdasarkan ID global (hybrid batch).
 */
export async function getAppByGlobalId(requestedId, maxPagesPerCategory = 200, batchSize = 20) {
  if (!requestedId || requestedId < 1) return "not found";

  const categories = Object.entries(APP_TYPES);
  let globalCounter = 1;

  for (const [category, type] of categories) {
    let page = 0;
    let emptyCount = 0;

    while (page < maxPagesPerCategory && emptyCount < 5) {
      // ambil batch paralel (misalnya 5 halaman sekaligus)
      const batch = Array.from({ length: batchSize }, (_, i) => page + i);
      const batchResults = await Promise.all(batch.map(p => fetchPage(type, p)));

      let batchHasData = false;
      for (let b = 0; b < batchResults.length; b++) {
        const apps = batchResults[b];
        if (apps.length > 0) {
          batchHasData = true;
          for (let index = 0; index < apps.length; index++) {
            if (globalCounter === requestedId) {
              return { id: requestedId, ...apps[index] };
            }
            globalCounter++;
          }
        }
      }

      if (!batchHasData) {
        emptyCount++;
      } else {
        emptyCount = 0; // reset kalau ada data
      }

      page += batchSize; // lanjut ke batch berikutnya
    }
  }

  return "not found";
}



