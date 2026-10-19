import { createHmac, timingSafeEqual } from "node:crypto";
const DAY = 24 * 60 * 60 * 1000;
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASS || "";
function sign(payload) {
return createHmac("sha256", secret()).update(payload).digest("base64url");
}
function same(a, b) {
const x = Buffer.from(String(a)), y = Buffer.from(String(b));
return x.length === y.length && timingSafeEqual(x, y);
}
export function configured() {
return Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASS);
}
export function checkLogin(user, pass) {
if (!configured()) return false;
const okUser = same(String(user || "").trim().toLowerCase(), process.env.ADMIN_USER.trim().toLowerCase());
const okPass = same(String(pass || ""), process.env.ADMIN_PASS);
return okUser && okPass;
}
export function makeToken(user) {
const payload = Buffer.from(JSON.stringify({ u: user, exp: Date.now() + 7 * DAY })).toString("base64url");
return payload + "." + sign(payload);
}
export function verify(req) {
const h = req.headers.authorization || "";
const t = h.startsWith("Bearer ") ? h.slice(7) : "";
const [payload, sig] = t.split(".");
if (!payload || !sig || !secret() || !same(sig, sign(payload))) return null;
try {
const data = JSON.parse(Buffer.from(payload, "base64url").toString());
return data.exp > Date.now() ? data : null;
} catch {
return null;
}
}
export function requireAuth(req, res) {
const who = verify(req);
if (!who) { res.status(401).json({ error: "Tenés que iniciar sesión." }); return null; }
return who;
}
