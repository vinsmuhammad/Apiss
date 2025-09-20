import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://coryn.club";

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
  KATANA: 27,
};

async function fetchPage(type, category, page) {
  const url = `${BASE_URL}/app_showcase.php?&show=20&type=${type}&p=${page}`;
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000,
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
        fixedLink =
          BASE_URL + "/" + encodeURIComponent(rawPath.replace(/^\//, ""));
      }

      apps.push({ nama: name, link: fixedLink, kategori: category });
    });

    return apps;
  } catch {
    return [];
  }
}

export async function scrapeAllApps() {
  let results = [];

  for (const [category, type] of Object.entries(APP_TYPES)) {
    let emptyCount = 0;
    let page = 0;

    while (emptyCount < 10) {
      const apps = await fetchPage(type, category, page);
      if (apps.length === 0) {
        emptyCount++;
      } else {
        emptyCount = 0;
        results = results.concat(apps);
      }
      page++;
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  return results.map((item, idx) => ({ id: idx + 1, ...item }));
}
