import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://coryn.club";
const PER_PAGE = 20; // jumlah item per halaman

async function scrapePage(page = 1) {
  const { data } = await axios.get(`${BASE_URL}/app_showcase.php?page=${page}`, {
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
      fixedLink = BASE_URL + "/" + rawPath;
    } else {
      fixedLink = BASE_URL + "/" + rawPath.replace(/^\//, "");
    }

    apps.push({ nama: name, link: fixedLink });
  });

  return apps;
}

export async function getAppByGlobalId(requestedId, maxAttempts = 30) {
  if (!requestedId || requestedId < 1) return "not found";

  let probeId = Number(requestedId);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const page = Math.ceil(probeId / PER_PAGE);
    const index = (probeId - 1) % PER_PAGE;

    const apps = await scrapePage(page);
    if (index >= 0 && index < apps.length) {
      const app = apps[index];

      if (app && app.nama && app.nama !== "-") {
        return { id: requestedId, ...app };
      }
    }

    probeId++;
    attempts++;
  }

  return "not found";
        }
