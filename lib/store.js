import { readFileSync } from "node:fs";
import { join } from "node:path";
const env = process.env;
const SHEET_URL = env.GSHEET_URL || "";
const SHEET_KEY = env.GSHEET_SECRET || "";
const pick = (suffixes) => { for (const k of Object.keys(env)) if (suffixes.some((s) => k === s || k.endsWith("_" + s))) return env[k]; return ""; };
const R_URL = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || pick(["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"]);
const R_TOKEN = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || pick(["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"]);
export const mode = () => (SHEET_URL && SHEET_KEY ? "sheets" : R_URL && R_TOKEN ? "redis" : "none");
export const hasDb = () => mode() !== "none";
const err = (msg, status = 502, code = "error") => Object.assign(new Error(msg), { status, code });
const noDb = () => { throw err("Base de datos no conectada", 503, "no_db"); };
async function sheet(method, payload) {
const url = method === "GET" ? SHEET_URL + "?" + new URLSearchParams(payload) : SHEET_URL;
const r = await fetch(url, method === "GET" ? { redirect: "follow" } : {
method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" },
body: JSON.stringify(Object.assign({ clave: SHEET_KEY }, payload)),
});
const text = await r.text();
let j; try { j = JSON.parse(text); } catch { throw err("La planilla no respondió bien. Revisá que la implementación de Apps Script tenga acceso para 'Cualquier usuario'."); }
if (j.error) throw err("Planilla: " + j.error);
return j;
}
export async function redis(...cmd) {
if (!(R_URL && R_TOKEN)) noDb();
const r = await fetch(R_URL, { method: "POST", headers: { Authorization: "Bearer " + R_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
const j = await r.json().catch(() => ({}));
if (!r.ok || j.error) throw err(j.error || "Error de base de datos");
return j.result;
}
const rjson = async (key, fallback) => { const raw = await redis("GET", key); return raw ? JSON.parse(raw) : fallback; };
let seedCache = null;
export function seed() {
if (!seedCache) seedCache = JSON.parse(readFileSync(join(process.cwd(), "public", "data", "catalog.json"), "utf8"));
return JSON.parse(JSON.stringify(seedCache));
}
function upgrade(cat) {
const base = seed(), byId = Object.fromEntries(base.products.map((p) => [p.id, p]));
cat.settings = Object.assign({}, base.settings, cat.settings || {});
if (typeof cat.settings.page === "string") { try { cat.settings.page = cat.settings.page ? JSON.parse(cat.settings.page) : undefined; } catch { cat.settings.page = undefined; } }
cat.products = (cat.products || []).map((p) => {
const s = byId[p.id];
if (!Array.isArray(p.imgs) || !p.imgs.length) {
if (s && s.imgs && (!p.img || p.img === s.img || p.img === s.imgs[0])) p.imgs = s.imgs.slice();
else p.imgs = p.img ? [p.img] : [];
}
p.img = p.imgs[0] || "";
return p;
});
return cat;
}
export async function getCatalog() {
const m = mode();
if (m === "sheets") { const c = await sheet("GET", { accion: "catalogo" }); return upgrade({ settings: c.settings, products: c.products || [] }); }
if (m === "redis") return upgrade(await rjson("rc:catalog", seed()));
return upgrade(seed());
}
export async function saveCatalog(next, { products, settings }) {
const m = mode();
if (m === "sheets") {
let c = null;
if (products) c = await sheet("POST", { accion: "guardarProductos", products: next.products });
if (settings) c = await sheet("POST", { accion: "guardarAjustes", settings: next.settings });
return c ? upgrade({ settings: c.settings, products: c.products }) : next;
}
if (m === "redis") { await redis("SET", "rc:catalog", JSON.stringify(next)); return upgrade(next); }
return noDb();
}
const PLAN_DEFAULT = { leadDays: 21, coverDays: 45 };
export async function getPrivate() {
const m = mode();
if (m === "sheets") { const j = await sheet("GET", { accion: "privado", clave: SHEET_KEY }); return { costs: j.costs || {}, interest: j.interest || {}, plan: Object.assign({}, PLAN_DEFAULT, j.plan || {}) }; }
if (m === "redis") {
const [costs, plan, interest] = await Promise.all([rjson("rc:costs", {}), rjson("rc:plan", {}), redis("HGETALL", "rc:interest")]);
const inter = {}; for (let i = 0; i < (interest || []).length; i += 2) inter[interest[i]] = Number(interest[i + 1]) || 0;
return { costs, interest: inter, plan: Object.assign({}, PLAN_DEFAULT, plan) };
}
return noDb();
}
export async function savePrivate({ costs, plan }) {
const m = mode();
if (m === "sheets") { await sheet("POST", { accion: "guardarPrivado", costs, plan }); return getPrivate(); }
if (m === "redis") {
if (costs) await redis("SET", "rc:costs", JSON.stringify(costs));
if (plan) await redis("SET", "rc:plan", JSON.stringify(plan));
return getPrivate();
}
return noDb();
}
export async function addInterest(id) {
const m = mode();
if (m === "sheets") return sheet("POST", { accion: "interes", id });
if (m === "redis") return redis("HINCRBY", "rc:interest", id, 1);
return null;
}
export async function listSales() {
const m = mode();
if (m === "sheets") return (await sheet("GET", { accion: "ventas", clave: SHEET_KEY })).sales || [];
if (m === "redis") return ((await redis("HVALS", "rc:sales")) || []).map((s) => JSON.parse(s)).sort((a, b) => (a.date < b.date ? 1 : -1));
return noDb();
}
export async function addSale(sale, discountStock) {
const m = mode();
if (m === "sheets") { const j = await sheet("POST", { accion: "venta", sale, descontar: Boolean(discountStock) }); return j.catalog ? upgrade(j.catalog) : null; }
if (m === "redis") {
await redis("HSET", "rc:sales", sale.id, JSON.stringify(sale));
if (!discountStock) return null;
const cat = await getCatalog();
sale.items.forEach((it) => { const p = cat.products.find((x) => x.id === it.id); if (p) p.stock = Math.max(0, p.stock - it.qty); });
await redis("SET", "rc:catalog", JSON.stringify(cat));
return cat;
}
return noDb();
}
export async function deleteSale(id) {
const m = mode();
if (m === "sheets") return sheet("POST", { accion: "borrarVenta", id });
if (m === "redis") return redis("HDEL", "rc:sales", id);
return noDb();
}
export async function savePhoto(id, dataUrl) {
const m = mode();
if (m === "sheets") return (await sheet("POST", { accion: "foto", id, dataUrl })).url;
if (m === "redis") {
const key = id + "-" + Date.now().toString(36);
await redis("SET", "rc:img:" + key, dataUrl);
return "/api/photo?id=" + key;
}
return noDb();
}
