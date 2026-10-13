// GET: catálogo público (productos + datos de contacto).
// PUT: el equipo guarda precios, stock, fotos y datos legales.
import { getCatalog, saveCatalog } from "../lib/store.js";
import { requireAuth } from "../lib/auth.js";
import { body, fail } from "../lib/body.js";

const num = (v, min = 0) => Math.max(min, Math.round(Number(v) || 0));
const str = (v, max = 4000) => String(v == null ? "" : v).slice(0, max);

function cleanProduct(p) {
  const out = {
    id: str(p.id, 60).replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
    cat: str(p.cat, 40), name: str(p.name, 120), brand: str(p.brand, 40),
    price: num(p.price), stock: num(p.stock), badge: p.badge === "nuevo" ? "nuevo" : "",
    imgs: (Array.isArray(p.imgs) ? p.imgs : [p.img]).map((u) => str(u, 300)).filter(Boolean).slice(0, 8),
    level: str(p.level, 40), speed: Math.min(5, num(p.speed)), control: Math.min(5, num(p.control)),
    headline: str(p.headline, 200), desc: str(p.desc), why: str(p.why, 2000), hidden: Boolean(p.hidden),
    features: Array.isArray(p.features) ? p.features.slice(0, 20).map((f) => [str(f[0], 80), str(f[1], 400)]) : [],
  };
  out.img = out.imgs[0] || "";
  return out;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=120");
      return res.status(200).json(await getCatalog());
    }
    if (req.method === "PUT") {
      if (!requireAuth(req, res)) return;
      const b = await body(req);
      const current = await getCatalog();
      const next = {
        settings: Object.assign({}, current.settings, b.settings ? {
          titular: str(b.settings.titular, 120), cuit: str(b.settings.cuit, 20), domicilio: str(b.settings.domicilio, 200),
          email: str(b.settings.email, 120) || current.settings.email, instagram: str(b.settings.instagram, 60) || current.settings.instagram,
          showNet: Boolean(b.settings.showNet), demo: Boolean(b.settings.demo), vigencia: str(b.settings.vigencia, 20) || current.settings.vigencia,
        } : {}),
        products: Array.isArray(b.products) ? b.products.slice(0, 500).map(cleanProduct) : current.products,
      };
      const saved = await saveCatalog(next, { products: Array.isArray(b.products), settings: Boolean(b.settings) });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(saved);
    }
    res.status(405).json({ error: "Método no permitido" });
  } catch (e) { fail(res, e); }
}
