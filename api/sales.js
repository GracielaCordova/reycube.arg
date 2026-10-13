// Registro de ventas (solo equipo). Al guardar una venta se puede descontar el stock.
import { redis, getCatalog, setCatalog } from "../lib/store.js";
import { requireAuth } from "../lib/auth.js";
import { body, fail } from "../lib/body.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!requireAuth(req, res)) return;
  try {
    if (req.method === "GET") {
      const all = (await redis("HVALS", "rc:sales")) || [];
      const sales = all.map((s) => JSON.parse(s)).sort((a, b) => (a.date < b.date ? 1 : -1));
      return res.status(200).json({ sales });
    }
    if (req.method === "POST") {
      const b = await body(req);
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 50).map((it) => ({
        id: String(it.id || ""), name: String(it.name || "").slice(0, 120),
        price: Math.max(0, Math.round(Number(it.price) || 0)), qty: Math.max(1, Math.round(Number(it.qty) || 1)),
      }));
      if (!String(b.customer || "").trim() || !items.length) return res.status(400).json({ error: "Faltan cliente o productos." });
      const sale = {
        id: "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date: new Date(b.date || Date.now()).toISOString(),
        customer: String(b.customer).trim().slice(0, 120), phone: String(b.phone || "").slice(0, 40),
        channel: String(b.channel || "Instagram").slice(0, 30), items,
        total: items.reduce((a, it) => a + it.qty * it.price, 0),
      };
      await redis("HSET", "rc:sales", sale.id, JSON.stringify(sale));
      let catalog = null;
      if (b.discountStock) {
        catalog = await getCatalog();
        items.forEach((it) => { const p = catalog.products.find((x) => x.id === it.id); if (p) p.stock = Math.max(0, p.stock - it.qty); });
        await setCatalog(catalog);
      }
      return res.status(200).json({ sale, catalog });
    }
    if (req.method === "DELETE") {
      const id = String((req.query && req.query.id) || "");
      if (!id) return res.status(400).json({ error: "Falta el id." });
      await redis("HDEL", "rc:sales", id);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: "Método no permitido" });
  } catch (e) { fail(res, e); }
}
