import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";

const CATEGORY_MAP = {
  "tongkat": "Staff",
  "kayu": "Material",
  "Crysta Penguat": "Enhancer Crysta",
  "Crysta Perkakas Tambahan": "Additional Crysta",
  "Pedang 2 Tangan": "2 Handed Sword",
  "tameng": "Shield",
  "kain": "Material",
  "mana": "Mana",
  "katana": "Katana",
  "Crysta Perkakas Spesial": "Special Crysta",
  "Perkakas Special": "Special",
  "obat": "Material",
  "panah": "Arrow",
  "Pedang 1 Tangan": "1 Handed Sword",
  "tinju": "Knuckles",
  "tombak": "Halberd",
  "Pesawat Sihir": "Magic Device",
  "busur": "Bow",
  "bowgun": "Bowgun",
  "Perkakas Tambahan": "Additional",
  "Belati": "Dagger",
  "Crysta Normal": "Normal Crysta",
  "Crysta Senjata": "Weapon Crysta",
  "Crysta Zirah": "Armor Crysta",
  "fauna": "Material",
  "logam": "Material",
  "permata": "Gem"
};

function mapCategoryFromImg($, el) {
  const img = $(el).find("img").first();
  const alt = img.attr("alt")?.trim() || "";
  const src = img.attr("src")?.toLowerCase() || "";

  const target = alt || src; // pakai alt, kalau kosong fallback ke src

  if (target) {
    for (const [key, alias] of Object.entries(CATEGORY_MAP)) {
      if (target.toLowerCase().includes(key.toLowerCase())) {
        return alias;
      }
    }
  }
  return null;
}

function parseStats($) {
  const stats = [];
  $("#status-monster p").each((_, p) => {
    const txt = $(p).text().trim();
    if (txt) stats.push(txt);
  });
  return stats.length > 0 ? stats : ["-"];
}

function parseObtainedFrom($) {
  const obtainedFrom = [];
  const dropCard = $('.card:has(h2.card-title:contains("Drop Dari"))');

  if (dropCard.length) {
    // format baru (dl + div.mb-5)
    dropCard.find("dl > div.mb-5").each((_, div) => {
      const monster = $(div).find("dt a.text-primary").text().trim();
      const map = $(div).find("dd b:contains('Peta:')").next("a").text().trim();

      if (monster) {
        let cleanMonster = monster.replace(/\(Lv\s*\d+\)/i, "").trim();
        cleanMonster = cleanMonster.replace(/[\[\]]/g, "").trim();

        obtainedFrom.push({
          monster: cleanMonster,
          map: map || "-"
        });
      }
    });

    // fallback ke format lama (ul.list-group)
    if (obtainedFrom.length === 0) {
      dropCard.find("ul.list-group li").each((_, li) => {
        const monster = $(li).find("a.text-primary").text().trim();
        if (monster) {
          let cleanMonster = monster.replace(/\(Lv\s*\d+\)/i, "").trim();
          cleanMonster = cleanMonster.replace(/[\[\]]/g, "").trim();

          obtainedFrom.push({ monster: cleanMonster, map: "-" });
        }
      });
    }
  }

  return obtainedFrom;
}

export async function getItemIndoById(id) {
  if (!id || id < 1) return "not found";

  try {
    const { data } = await axios.get(`${BASE_URL}/item/${id}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000,
    });

    const $ = cheerio.load(data);

    const rawName = $(".page-title").first().text().trim();
    if (!rawName) return "not found";

    let name = rawName;
    const cat = mapCategoryFromImg($, $(".card-body dl dt"));
    if (cat) name = `${name} [${cat}]`;

    const stats = parseStats($);
    const obtainedFrom = parseObtainedFrom($);

    return {
      id,
      name,
      stats,
      obtainedFrom,
    };
  } catch (e) {
    console.error(`getItemIndoById error (id=${id}):`, e.message);
    return "not found";
  }
}
