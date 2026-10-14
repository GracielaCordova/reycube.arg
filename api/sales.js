// Registro de ventas (solo equipo). Al guardar una venta se puede descontar el stock.
import { listSales, addSale, deleteSale, getPrivate } from "../lib/store.js";
import { requireAuth } from "../lib/auth.js";
import { body, fail } from "../lib/body.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!requireAuth(req, res)) return;
  try {
    if (req.method === "GET") return res.status(200).json({ sales: await listSales() });
    if (req.method === "POST") {
      const b = await body(req);
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 50).map((it) => ({
        id: String(it.id || ""), name: String(it.name || "").slice(0, 120),
        price: Math.max(0, Math.round(Number(it.price) || 0)), qty: Math.max(1, Math.round(Number(it.qty) || 1)),
      }));
      // Guarda el costo de cada producto al momento de la venta, para calcular la ganancia real.
      const { costs } = await getPrivate().catch(() => ({ costs: {} }));
      items.forEach((it, i) => { const c = Number((b.items[i] || {}).cost); it.cost = c > 0 ? Math.round(c) : Math.max(0, Math.round(Number(costs[it.id]) || 0)); });
      if (!String(b.customer || "").trim() || !items.length) return res.status(400).json({ error: "Faltan cliente o productos." });
      const sale = {
        id: "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date: new Date(b.date || Date.now()).toISOString(),
        customer: String(b.customer).trim().slice(0, 120), phone: String(b.phone || "").slice(0, 40),
        channel: String(b.channel || "Instagram").slice(0, 30), items,
        total: items.reduce((a, it) => a + it.qty * it.price, 0),
      };
      const catalog = await addSale(sale, b.discountStock);
      return res.status(200).json({ sale, catalog });
    }
    if (req.method === "DELETE") {
      const id = String((req.query && req.query.id) || "");
      if (!id) return res.status(400).json({ error: "Falta el id." });
      await deleteSale(id);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: "Método no permitido" });
  } catch (e) { fail(res, e); }
}
