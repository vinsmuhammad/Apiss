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

async function fetchPage(type, page) {
  const url = `${BASE_URL}/app_showcase.php?&show=${PER_PAGE}&type=${type}&p=${page}`;
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
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

      apps.push({
        nama: name,
        link: fixedLink
      });
    });

    return apps;
  } catch {
    return [];
  }
}

/**
 * Cari app berdasarkan ID global dengan fallback.
 */
export async function getAppByGlobalId(requestedId, maxAttempts = 30) {
  if (!requestedId || requestedId < 1) return "not found";

  const categories = Object.entries(APP_TYPES);
  let globalCounter = 1;

  // loop kategori
  for (const [category, type] of categories) {
    let localId = 1;
    let emptyCount = 0;

    while (emptyCount < maxAttempts) {
      const page = Math.ceil(localId / PER_PAGE);
      const index = (localId - 1) % PER_PAGE;

      const apps = await fetchPage(type, page);

      if (index < apps.length) {
        if (globalCounter === requestedId) {
          return { id: requestedId, category, ...apps[index] };
        }
        globalCounter++;
        localId++;
        emptyCount = 0;
      } else {
        // halaman kosong
        emptyCount++;
        localId++;
      }
    }
    // pindah kategori setelah maxAttempts kosong
  }

  return "not found";
}
