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
};

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
            obtainedFrom.push({ type: "lihat", href });
          } else if (txt && !txt.includes("Lihat")) {
            obtainedFrom.push(map ? `${txt} [${map}]` : txt);
          }
        });

      items.push({
        name,
        stats,
        obtainedFrom
      });
    });

    // resolve semua "Lihat..." dan format monster/map
    for (const item of items) {
      const obtainedList = [];

      for (const entry of item.obtainedFrom) {
        let dropEntries = [];

        if (typeof entry === "object" && entry.type === "lihat") {
          dropEntries = await fetchObtainedFromDetail(entry.href);
        } else if (typeof entry === "string") {
          dropEntries = [entry];
        }

        for (const drop of dropEntries) {
          // pisahkan monster dan map, buang (Lv xxx) dari monster
          const matches = drop.match(/^(.+?)\s*\[(.+?)\]$/);
          if (matches) {
            let monsterName = matches[1].trim();
            let mapName = matches[2].trim();

            // hapus (Lv xxx) jika ada
            monsterName = monsterName.replace(/\s*\(Lv\s*\d+\)/i, "").trim();

            // skip kalau monsterName kosong atau map mengandung event
            if (monsterName && !mapName.toLowerCase().includes("event")) {
              obtainedList.push({ 
                monster: monsterName, 
                map: mapName // sudah tanpa [ ]
              });
            }
          }
        }
      }

      item.obtainedFrom = obtainedList;
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
  
