// Lee el cuerpo JSON de la petición (Vercel ya lo parsea, pero por las dudas).
export async function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { return {}; }
}

export function fail(res, e) {
  res.status(e.status || 500).json({ error: e.message || "Error", code: e.code || "error" });
}
