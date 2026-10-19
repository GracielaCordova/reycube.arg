import { redis, savePhoto } from "../lib/store.js";
import { requireAuth } from "../lib/auth.js";
import { body, fail } from "../lib/body.js";
export default async function handler(req, res) {
try {
if (req.method === "GET") {
const id = String((req.query && req.query.id) || "").replace(/[^a-z0-9-]/gi, "");
const raw = id && (await redis("GET", "rc:img:" + id));
if (!raw) return res.status(404).end();
const m = /^data:(image\/(?:jpeg|webp|png));base64,(.+)$/.exec(raw);
if (!m) return res.status(404).end();
res.setHeader("Content-Type", m[1]);
res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
return res.status(200).send(Buffer.from(m[2], "base64"));
}
if (req.method === "POST") {
if (!requireAuth(req, res)) return;
const { id, dataUrl } = await body(req);
const clean = String(id || "").replace(/[^a-z0-9-]/gi, "").toLowerCase();
if (!clean || !/^data:image\/(jpeg|webp|png);base64,/.test(String(dataUrl)) || String(dataUrl).length > 1_500_000)
return res.status(400).json({ error: "Foto inválida o muy pesada." });
return res.status(200).json({ url: await savePhoto(clean, dataUrl) });
}
res.status(405).json({ error: "Método no permitido" });
} catch (e) { fail(res, e); }
}
