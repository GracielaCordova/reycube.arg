// Cuenta cuándo alguien toca "Consultar" o "Avisame" en un producto (sin datos personales).
// Sirve para ver qué piden los clientes aunque no haya stock.
import { addInterest, hasDb } from "../lib/store.js";
import { body } from "../lib/body.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const { id } = await body(req);
  const clean = String(id || "").replace(/[^a-z0-9-]/gi, "").toLowerCase().slice(0, 60);
  if (clean && hasDb()) { try { await addInterest(clean); } catch (e) { /* no frena al cliente */ } }
  res.status(204).end();
}
