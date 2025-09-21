import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://coryn.club";

export async function getMonsterById(id) {
  try {
    const { data } = await axios.get(`${BASE_URL}/monster.php?id=${id}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);

    if ($("body").text().includes("No Result Found")) return null;

    const monsterName = $(".card-title-inverse").first().text().trim();
    if (!monsterName) return null;

    const getInfo = (label) =>
      $(`.item-prop .accent-bold:contains("${label}")`)
        .parent()
        .find("p")
        .eq(1)
        .text()
        .trim();

    const level = getInfo("Lv");
    const element = getInfo("Element");
    const type = getInfo("Type");
    const hp = getInfo("HP");
    const exp = getInfo("Exp");
    const tamable = getInfo("Tamable");
    const map = $(".item-prop a").first().text().trim();

    const drops = [];
    $(".monster-drop-list .monster-drop").each((_, el) => {
      drops.push($(el).text().trim());
    });

    return {
      id,
      name: monsterName,
      level,
      element,
      type,
      hp,
      exp,
      tamable,
      map,
      drops
    };
  } catch {
    return null;
  }
}

export async function getMonsterByIdWithFallback(requestedId, maxAttempts = 30) {
  let probeId = Number(requestedId);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const monster = await getMonsterById(probeId);
    if (monster) return { ...monster, id: Number(requestedId) };
    probeId++;
    attempts++;
  }

  return null;
}
