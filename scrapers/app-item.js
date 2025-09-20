import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://coryn.club";

// daftar kategori & type (sesuai asli)
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

const PER_PAGE = 20; // Coryn default show=20 per page

async function scrapePage(type, page = 0) {
  const url = `${BASE_URL}/app_showcase.php?&show=${PER_PAGE}&type=${type}&p=${page}`;
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 8000
  });

  const $ = cheerio.load(data);
  const apps = [];

  $(".card-container.app-showcase .app").each((i, el) => {
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
}

/**
 * Ambil app global berdasarkan id
 * id = urutan global (kategori berurutan sesuai APP_TYPES)
 */
export async function getAppByGlobalId(globalId) {
  if (!globalId || globalId < 1) return null;

  let remaining = globalId;
  for (const [category, type] of Object.entries(APP_TYPES)) {
    let page = 0;

    while (true) {
      const apps = await scrapePage(type, page);
      if (apps.length === 0) break; // habis di kategori ini

      if (remaining <= apps.length) {
        // id jatuh di kategori ini
        const app = apps[remaining - 1];
        return {
          id: globalId,
          category,
          ...app
        };
      }

      remaining -= apps.length;
      page++;
    }
  }

  return null; // id terlalu besar
}
