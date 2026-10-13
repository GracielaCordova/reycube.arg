// Almacenamiento: Upstash Redis (gratis desde el Marketplace de Vercel).
// Si todavía no está conectado, la tienda se muestra igual usando data/catalog.json
// y el panel avisa que falta conectar la base para poder guardar.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

export const hasDb = () => Boolean(URL_ && TOKEN);

export async function redis(...cmd) {
  if (!hasDb()) throw Object.assign(new Error("Base de datos no conectada"), { status: 503, code: "no_db" });
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw Object.assign(new Error(j.error || "Error de base de datos"), { status: 502 });
  return j.result;
}

let seedCache = null;
export function seed() {
  if (!seedCache) seedCache = JSON.parse(readFileSync(join(process.cwd(), "data", "catalog.json"), "utf8"));
  return JSON.parse(JSON.stringify(seedCache));
}

export async function getCatalog() {
  if (!hasDb()) return seed();
  const raw = await redis("GET", "rc:catalog");
  return raw ? JSON.parse(raw) : seed();
}

export async function setCatalog(cat) {
  await redis("SET", "rc:catalog", JSON.stringify(cat));
}
