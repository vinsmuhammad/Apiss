import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://coryn.club";

export async function scrapeApps() {
  try {
    const { data } = await axios.get(`${BASE_URL}/app_showcase.php`, {
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
      apps.push({ nama: name, link: fixedLink });
    });

    return apps;
  } catch {
    return [];
  }
}
