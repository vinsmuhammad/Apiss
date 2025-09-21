import { getMonsterByIdWithFallback } from "../scrapers/monster.js";

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const app = await getMonsterByIdWithFallback(Number(id));
  if (!app) return res.status(404).json({ error: "Not found" });

  res.status(200).json(app);
}
