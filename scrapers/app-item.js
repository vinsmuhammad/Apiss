import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://coryn.club";

export async function getAppById(id) {
  try {
    const { data } = await axios.get(`${BASE_URL}/app_showcase.php?id=${id}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 8000
    });

    const $ = cheerio.load(data);
    const name = $(".accent-bold.title").first().text().trim();
    const img = $(".app img").attr("src");

    if (!name || !img) return null;

    let fixedLink;
    if (img.startsWith("app/")) {
      fixedLink = BASE_URL + "/" + img;
    } else {
      fixedLink = BASE_URL + "/" + img.replace(/^\//, "");
    }

    return { id, nama: name, link: fixedLink };
  } catch {
    return null;
  }
}

export async function getAppByIdWithFallback(requestedId, maxAttempts = 30) {
  let probeId = Number(requestedId);
  let attempts = 0;
  while (attempts < maxAttempts) {
    const app = await getAppById(probeId);
    if (app) return { ...app, id: Number(requestedId) };
    probeId++; attempts++;
  }
  return null;
}
