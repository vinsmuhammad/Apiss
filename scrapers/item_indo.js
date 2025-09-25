import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";

// Mapping kategori
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

// Ambil stats item
function parseStats($) {
  const stats = [];
  $(".card-body .row").each((_, el) => {
    const key = $(el).find(".col-4").text().trim();
    const val = $(el).find(".col-8").text().trim();
    if (key && val) {
      stats.push(`${key}: ${val}`);
    }
  });
  return stats.length > 0 ? stats : ["-"];
}

// Ambil obtainedFrom
function parseObtainedFrom($) {
  const obtainedFrom = [];
  $("#drop-list .row").each((_, el) => {
    const monster = $(el).find('a[href*="/monster/"]').text().trim();
    const map = $(el).find('a[href*="/map/"]').text().trim();

    if (monster || map) {
      let cleanMonster = monster.replace(/\(Lv\s*\d+\)/i, "").trim();
      cleanMonster = cleanMonster.replace(/[\[\]]/g, "").trim();
      const cleanMap = map.replace(/[\[\]]/g, "").trim();

      if (cleanMonster && !cleanMap.toLowerCase().includes("event")) {
        obtainedFrom.push({ monster: cleanMonster, map: cleanMap });
      }
    }
  });
  return obtainedFrom;
}

// Fungsi utama
export async function getItemIndoById(id) {
  if (!id || id < 1) return "not found";

  try {
    const { data } = await axios.get(`${BASE_URL}/item/${id}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });

    const $ = cheerio.load(data);

    let itemName = $(".card-title").first().text().trim();
    if (!itemName) return "not found";

    // Ambil kategori dari <img alt="">
    const alt = $(".card img").first().attr("alt")?.trim() || "";
    if (alt) {
      for (const [key, alias] of Object.entries(CATEGORY_MAP)) {
        if (alt.toLowerCase().includes(key.toLowerCase())) {
          itemName = `${itemName} [${alias}]`;
          break;
        }
      }
    }

    const stats = parseStats($);
    const obtainedFrom = parseObtainedFrom($);

    return {
      id,
      name: itemName,
      stats,
      obtainedFrom
    };
  } catch (e) {
    console.error(`getItemIndoById error (id=${id}):`, e.message);
    return "not found";
  }
      }
