import { checkLogin, configured, makeToken, verify } from "../lib/auth.js";
import { hasDb } from "../lib/store.js";
import { body } from "../lib/body.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") {
    const who = verify(req);
    return res.status(who ? 200 : 401).json({ ok: Boolean(who), user: who && who.u, db: hasDb() });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!configured()) return res.status(503).json({ error: "Falta configurar ADMIN_USER y ADMIN_PASS en Vercel." });
  const { user, pass } = await body(req);
  // Pequeña pausa para frenar intentos repetidos.
  await new Promise((r) => setTimeout(r, 400));
  if (!checkLogin(user, pass)) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  const name = String(user).trim();
  res.status(200).json({ token: makeToken(name), user: name, db: hasDb() });
}
