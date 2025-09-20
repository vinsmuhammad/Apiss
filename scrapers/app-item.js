import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://coryn.club";

export async function getAppById(id) {
  try {
    const { data } = await axios.get(`${BASE_URL}/app_showcase.php?id=${id}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000,
    });

    const $ = cheerio.load(data);

    // ambil nama app
    const name = $(".card-title").first().text().trim();
    if (!name) return null;

    // ambil gambar
    const image = $(".card-img-top").attr("src");
    const fixedImage = image
      ? image.startsWith("http")
        ? image
        : BASE_URL + "/" + image.replace(/^\//, "")
      : null;

    // ambil deskripsi singkat
    const desc = $(".card-body").text().trim();

    return {
      id,
      name,
      image: fixedImage
    };
  } catch (err) {
    console.error(`❌ Gagal ambil app ${id}: ${err.message}`);
    return null;
  }
}
