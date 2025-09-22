import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://coryn.club";
const PER_PAGE = 20; // jumlah item per halaman

// daftar kategori & type (sama persis seperti yang kamu kasih)
const APP_TYPES = {
  ARMOR: 8,
  ADD: 6,
  SHIELD: 17,
  '1H': 4,
  '2H': 5,
  BOW: 9,
  BOWGUN: 10,
  KNUCKLES: 13,
  'MAGIC DEVICE': 15,
  STAFF: 19,
  HALBERD: 26,
  KATANA: 27
};

/**
 * fetchPage(type?, category?, page)
 * - kalau `type` diberikan -> panggil dengan ?type=...
 * - kalau tidak -> panggil tanpa type (global listing)
 * Mengembalikan array apps: { nama, link, category?, type? }
 */
async function fetchPage(type = undefined, category = undefined, page = 1) {
  const q = type ? `?&show=20&type=${type}&p=${page}` : `?&show=20&p=${page}`;
  const url = `${BASE_URL}/app_showcase.php${q}`;

  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 8000
    });
    const $ = cheerio.load(data);
    const apps = [];

    $(".card-container.app-showcase .app").each((_, el) => {
      const name = $(el).find(".accent-bold.title").text().trim();
      const rawPath = $(el).find("img").attr("src");
      if (!name || !rawPath) return;

      // encode supaya URL valid (sama seperti skripmu)
      let fixedLink;
      if (rawPath.startsWith("app/")) {
        const filename = rawPath.slice(4); // hapus 'app/'
        fixedLink = BASE_URL + "/app/" + encodeURIComponent(filename);
      } else {
        fixedLink = BASE_URL + "/" + encodeURIComponent(rawPath.replace(/^\//, ""));
      }

      apps.push({
        nama: name,
        link: fixedLink,
        category: category || null,
        type: type || null
      });
    });

    return apps;
  } catch (err) {
    // jangan throw — return array kosong supaya fallback bisa lanjut
    // (tetap log supaya gampang debug)
    console.error(`fetchPage error (${type || "all"} page ${page}): ${err.message}`);
    return [];
  }
}

/**
 * scrapePage(page)
 * - wrapper yang memanggil fetchPage tanpa type (global listing),
 *   sehingga kompatibel dengan fallback globalId yang berbasis page/index.
 */
async function scrapePage(page = 1) {
  return await fetchPage(undefined, undefined, page);
}

/**
 * getAppByGlobalId(requestedId, maxAttempts = 30)
 * - fallback forward-only (probe++) sesuai permintaanmu (Coryn style)
 * - mengembalikan { id: requestedId, nama, link, ... } atau "not found"
 * - menjaga agar tidak langsung mengembalikan hasil kosong/invalid
 */
export async function getAppByGlobalId(requestedId, maxAttempts = 30) {
  if (!requestedId || requestedId < 1) return "not found";

  let probeId = Number(requestedId);
  let attempts = 0;
  let lastLink = null; // opsional: mencegah duplikat hasil beruntun

  while (attempts < maxAttempts) {
    const page = Math.ceil(probeId / PER_PAGE);
    const index = (probeId - 1) % PER_PAGE;

    const apps = await scrapePage(page);

    if (index >= 0 && index < apps.length) {
      const app = apps[index];

      // validasi sederhana sebelum return
      if (app && app.nama && app.link) {
        // kalau ingin mencegah hasil duplikat beruntun (opsional),
        // uncomment blok ini; saat ini aku aktifkan supaya tidak berulang:
        if (lastLink && app.link === lastLink) {
          // skip duplikat dan lanjut
          probeId++;
          attempts++;
          continue;
        }
        lastLink = app.link;

        // kembalikan dengan id tetap requestedId
        return { id: requestedId, ...app };
      }
    }

    probeId++;
    attempts++;
  }

  return "not found";
      }
