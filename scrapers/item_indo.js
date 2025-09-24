import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";
const PER_PAGE = 20;

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
}

async function fetchObtainedFromDetail(relativeUrl) {
  try {
    const { data } = await axios.get(BASE_URL + relativeUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });
    const $ = cheerio.load(data);

    const results = [];
    $(".card:contains('Drop Dari') .card-body .mb-5").each((_, el) => {
      const monster = $(el).find("dt a.text-primary").text().trim();
      const map = $(el).find("dd b:contains('Peta:')").parent().find("a").text().trim();
      if (monster) {
        results.push(map ? `${monster} [${map}]` : monster);
      }
    });
    return results.length ? results : ["-"];
  } catch (e) {
    console.error("fetchObtainedFromDetail error:", e.message);
    return ["-"];
  }
}

async function fetchPage(page = 1) {
  const url = `${BASE_URL}/items?page=${page}`;
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });
    const $ = cheerio.load(data);

    const items = [];
    $(".card").each((_, el) => {
      // Nama
      let name = $(el).find("b.h6 a.text-primary").text().trim() || "-";

      // Cari kategori dari alt img → tempel ke name
      const alt = $(el).find("img").first().attr("alt")?.trim() || "";
      if (alt) {
        for (const [key, alias] of Object.entries(CATEGORY_MAP)) {
          if (alt.toLowerCase().includes(key.toLowerCase())) {
            name = `${name} [${alias}]`;
            break;
          }
        }
      }

      // Status Monster
      const stats = [];
      $(el)
        .find(".tab-pane[id^='status-monster'] dl p")
        .each((_, p) => {
          const txt = $(p).text().trim();
          if (txt) stats.push(txt);
        });
      if (stats.length === 0) stats.push("-");

      // Drop / diperoleh dari
      const obtainedFrom = [];
$(el)
  .find("details summary:contains('Bisa di peroleh')")
  .parent()
  .find("div.my-2 a")
  .each((_, a) => {
    const txt = $(a).text().trim();
    const href = $(a).attr("href");
    const map = $(a).parent().find("small").text().trim();

    if (txt && txt.toLowerCase().includes("lihat") && href) {
      // masih simpan sebagai type: lihat (akan diproses lanjut)
      obtainedFrom.push({ type: "lihat", href });
    } else if (txt && !txt.toLowerCase().includes("lihat")) {
      // langsung bentuk objek { monster, map }
      obtainedFrom.push({
        monster: txt,
        map: map || ""
      });
    }
  });

      items.push({
        name,
        stats,
        obtainedFrom
      });
    });

    // resolve semua "Lihat..." dan rapikan format obtainedFrom
for (const item of items) {
  const rawList = [];

  for (const entry of item.obtainedFrom) {
    if (typeof entry === "object" && entry.type === "lihat") {
      const drops = await fetchObtainedFromDetail(entry.href);
      rawList.push(...drops);
    } else if (typeof entry === "string") {
      rawList.push(entry);
    }
  }

  // konversi ke array objek { monster, map }
  const parsedList = [];
  const seen = new Set();

  for (const line of rawList) {
    if (!line || line === "-") continue;

    // Format umum: "Monster (Lv xxx) [Map]"
    const monsterMatch = line.match(/^([^\[]+?)(?=\s*\[|$)/);
    const mapMatch = line.match(/\[(.+?)\]/);

    const monster = monsterMatch ? monsterMatch[1].trim() : "";
    const map = mapMatch ? mapMatch[1].trim() : "";

    const key = `${monster.toLowerCase()}|${map.toLowerCase()}`;
    if (seen.has(key)) continue;

    parsedList.push({ monster, map });
    seen.add(key);
  }

  item.obtainedFrom = parsedList.length ? parsedList : [];
}

    return items;
  } catch (e) {
    console.error("fetchPage error:", e.message);
    return [];
  }
}

export async function getItemIndoById(requestedId, maxAttempts = 30) {
  if (!requestedId || requestedId < 1) return "not found";

  let probeId = Number(requestedId);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const page = Math.ceil(probeId / PER_PAGE);
    const index = (probeId - 1) % PER_PAGE;

    const items = await fetchPage(page);
    if (index >= 0 && index < items.length) {
      const item = items[index];

      if (item && item.name && item.name !== "-") {
        return { id: requestedId, ...item };
      }
    }

    probeId++;
    attempts++;
  }

  return "not found";
            }

