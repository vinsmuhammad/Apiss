import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";
const PER_PAGE = 20;

/**
 * Ambil 1 halaman daftar monster
 */
export async function fetchMonstersPage(page = 1) {
  const url = `${BASE_URL}/monsters?page=${page}`;
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });
    const $ = cheerio.load(data);

    const monsters = [];
    $(".card").each((_, el) => {
      const anchor = $(el).find("b.h6 a.text-primary");
      const nameLevel = anchor.text().trim();
      const link = anchor.attr("href");
      const idMatch = link ? link.match(/\/monster\/(\d+)/) : null;
      const id = idMatch ? parseInt(idMatch[1]) : null;

      // Tipe monster (Boss, Mini Boss, Normal)
      const typeImg = $(el).find("b.h6 img").attr("src") || "";
      let type = "Normal";
      if (typeImg.includes("boss.png")) type = "Boss";
      else if (typeImg.includes("f_boss.png")) type = "Mini Boss";

      // Info lainnya
      const element = $(el).find("b:contains('Unsur:')").next("span").text().trim() || "-";
      const hp = $(el).find("b:contains('HP:')").next("span").text().trim() || "-";
      const xp = $(el).find("b:contains('XP:')").next("span").text().trim() || "-";
      const leveling = $(el)
        .find("b:contains('Leveling:')")
        .parent()
        .text()
        .replace("Leveling:", "")
        .trim() || "-";
      const map = $(el).find("b:contains('Peta:')").parent().find("a").text().trim() || "-";

      // Drop item
      const drops = [];
      $(el).find("b:contains('Drop:')").parent().find("a").each((_, a) => {
        const itemName = $(a).text().trim();
        if (itemName) drops.push(itemName);
      });
      if (!drops.length) drops.push("-");

      monsters.push({
        id,
        nameLevel,
        type,
        element,
        hp,
        xp,
        leveling,
        map,
        drops
      });
    });

    return monsters;
  } catch (e) {
    console.error("fetchMonstersPage error:", e.message);
    return [];
  }
}

/**
 * Ambil monster berdasarkan ID dengan fallback
 */
export async function getMonsterIndoById(requestedId, maxAttempts = 30) {
  if (!requestedId || requestedId < 1) return "not found";

  let probeId = Number(requestedId);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const page = Math.ceil(probeId / PER_PAGE);
    const index = (probeId - 1) % PER_PAGE;

    const monsters = await fetchMonstersPage(page);
    if (index >= 0 && index < monsters.length) {
      const monster = monsters[index];

      if (monster && monster.nameLevel && monster.nameLevel !== "-") {
        return { id: requestedId, ...monster };
      }
    }

    probeId++;
    attempts++;
  }

  return "not found";
        }
