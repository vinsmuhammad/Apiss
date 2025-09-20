import { getItemByIdWithFallbackIndo } from "../scrape/item_indo.js";

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const item = await getItemByIdWithFallbackIndo(id, 30);
  if (!item) return res.status(404).json({ error: "Not found" });

  res.status(200).json(item);
}
