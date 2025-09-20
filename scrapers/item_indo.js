import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://toram-id.com";
const PER_PAGE = 20; // biasanya 20 item per halaman

async function fetchItemDetail(url) {
  try {
    const { data } = await axios.get(BASE_URL + url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });

    const $ = cheerio.load(data);

    // nama item
    const name = $("h1.text-primary").first().text().trim();

    // harga jual & proses material
    let sell = null;
    let process = null;
    $("table.table tr").each((_, tr) => {
      const label = $(tr).find("td:first-child").text().trim();
      const value = $(tr).find("td:last-child").text().trim();
      if (/Sell/i.test(label)) sell = value || null;
      if (/Proses|Process/i.test(label)) process = value || null;
    });

    // stats
    const stats = [];
    $(".card:contains('Stat') li").each((_, li) => {
      stats.push($(li).text().trim());
    });

    // drop dari
    const obtainedFrom = [];
    $(".card:contains('Drop dari') table tr").each((i, tr) => {
      if (i === 0) return; // skip header
      const tds = $(tr).find("td");
      if (tds.length) {
        const mob = $(tds[0]).text().trim();
        const map = $(tds[1]).text().trim();
        obtainedFrom.push({ mob, map });
      }
    });

    return {
      name,
      sell,
      process,
      stats,
      obtainedFrom
    };
  } catch {
    return null;
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

    $(".card .card-body").each((_, el) => {
      const name = $(el).find("a.text-primary").text().trim();
      const href = $(el).find("a.text-primary").attr("href");
      if (!name || !href) return;

      items.push({ name, href });
    });

    return items;
  } catch {
    return [];
  }
}

export async function getItemIndoById(globalId, maxAttempts = 30) {
  if (!globalId || globalId < 1) return null;

  let probeId = Number(globalId);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const page = Math.ceil(probeId / PER_PAGE);
    const index = (probeId - 1) % PER_PAGE;

    const items = await fetchPage(page);
    if (index >= 0 && index < items.length) {
      const detail = await fetchItemDetail(items[index].href);
      if (detail) {
        return { id: globalId, ...detail };
      }
    }

    probeId++;
    attempts++;
  }

  return null;
}
