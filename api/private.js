import { getPrivate, savePrivate } from "../lib/store.js";
import { requireAuth } from "../lib/auth.js";
import { body, fail } from "../lib/body.js";
export default async function handler(req, res) {
res.setHeader("Cache-Control", "no-store");
if (!requireAuth(req, res)) return;
try {
if (req.method === "GET") return res.status(200).json(await getPrivate());
if (req.method === "PUT") {
const b = await body(req);
const costs = b.costs && typeof b.costs === "object" ? Object.fromEntries(Object.entries(b.costs).slice(0, 500)
.map(([k, v]) => [String(k).replace(/[^a-z0-9-]/gi, "").slice(0, 60), Math.max(0, Math.round(Number(v) || 0))]).filter(([k]) => k)) : undefined;
const plan = b.plan && typeof b.plan === "object" ? {
leadDays: Math.min(365, Math.max(1, Math.round(Number(b.plan.leadDays) || 21))),
coverDays: Math.min(365, Math.max(7, Math.round(Number(b.plan.coverDays) || 45))),
} : undefined;
return res.status(200).json(await savePrivate({ costs, plan }));
}
res.status(405).json({ error: "Método no permitido" });
} catch (e) { fail(res, e); }
}
