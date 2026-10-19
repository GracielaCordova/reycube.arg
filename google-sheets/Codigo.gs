const CLAVE = "Um02EkbUkVNY7XVYdFoaICBF";
const SITIO = "https://reycubearg.vercel.app";
const CARPETA_FOTOS = "ReyCube.Arg - Fotos";
const COLS = ["id", "nombre", "categoria", "marca", "precio", "stock", "nuevo", "oculto", "foto",
"nivel", "velocidad", "control", "titulo", "descripcion", "caracteristicas", "por_que"];
const COLS_VENTAS = ["id", "fecha", "cliente", "telefono", "canal", "productos", "total", "detalle_json"];
const AJUSTES = ["titular", "cuit", "domicilio", "email", "instagram", "showNet", "demo", "vigencia", "page"];
function instalar() {
const ss = SpreadsheetApp.getActive();
const r = UrlFetchApp.fetch(SITIO + "/data/catalog.json", { muteHttpExceptions: true });
const seed = r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : { settings: {}, products: [] };
const p = hoja_(ss, "Productos", COLS);
if (p.getLastRow() < 2 && seed.products.length) {
p.getRange(2, 1, seed.products.length, COLS.length).setValues(seed.products.map(aFila_));
}
p.setFrozenRows(1); p.getRange("A:A").setFontColor("#888");
p.getRange("E:F").setNumberFormat("0");
p.getRange("G:H").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["SI", "NO"], true).build());
p.setColumnWidth(2, 260); p.setColumnWidths(13, 4, 280);
p.getRange("M:P").setWrap(false);
const v = hoja_(ss, "Ventas", COLS_VENTAS);
v.setFrozenRows(1); v.getRange("G:G").setNumberFormat("$ #,##0");
v.hideColumns(8);
const a = hoja_(ss, "Ajustes", ["clave", "valor"]);
if (a.getLastRow() < 2) {
const s = seed.settings || {};
a.getRange(2, 1, AJUSTES.length, 2).setValues(AJUSTES.map(k => [k, s[k] === undefined || s[k] === null ? "" : typeof s[k] === "object" ? JSON.stringify(s[k]) : String(s[k])]));
}
a.setFrozenRows(1);
const c = hoja_(ss, "Costos", ["id", "nombre", "costo"]);
if (c.getLastRow() < 2 && p.getLastRow() > 1) {
const ids = p.getRange(2, 1, p.getLastRow() - 1, 2).getValues();
c.getRange(2, 1, ids.length, 3).setValues(ids.map(r => [r[0], r[1], ""]));
}
c.setFrozenRows(1); c.getRange("C:C").setNumberFormat("$ #,##0"); c.setColumnWidth(2, 260);
const it = hoja_(ss, "Interes", ["id", "consultas"]); it.setFrozenRows(1);
const pr = hoja_(ss, "Privado", ["clave", "valor"]);
if (pr.getLastRow() < 2) pr.getRange(2, 1, 2, 2).setValues([["leadDays", 21], ["coverDays", 45]]);
pr.setFrozenRows(1);
const sobra = ss.getSheetByName("Hoja 1") || ss.getSheetByName("Sheet1");
if (sobra && ss.getSheets().length > 3) ss.deleteSheet(sobra);
SpreadsheetApp.getUi && SpreadsheetApp.getActive().toast("Listo: " + (p.getLastRow() - 1) + " productos cargados.", "ReyCube.Arg", 8);
}
function hoja_(ss, nombre, cols) {
const h = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
h.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold").setBackground("#1f5bd6").setFontColor("#ffffff");
return h;
}
const siNo_ = v => String(v).trim().toUpperCase() === "SI" || v === true;
function aFila_(p) {
return [p.id, p.name, p.cat, p.brand, Number(p.price) || 0, Number(p.stock) || 0,
p.badge === "nuevo" ? "SI" : "NO", p.hidden ? "SI" : "NO", (p.imgs && p.imgs.length ? p.imgs : [p.img || ""]).filter(Boolean).join("\n"),
p.level || "", Number(p.speed) || "", Number(p.control) || "", p.headline || "", p.desc || "",
(p.features || []).map(f => f[0] + ": " + f[1]).join("\n"), p.why || ""];
}
function deFila_(r) {
const o = {}; COLS.forEach((c, i) => o[c] = r[i]);
if (!String(o.id).trim() && !String(o.nombre).trim()) return null;
const id = String(o.id || o.nombre).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
return {
id: id, name: String(o.nombre).trim(), cat: String(o.categoria).trim(), brand: String(o.marca).trim(),
price: Math.max(0, Math.round(Number(o.precio) || 0)), stock: Math.max(0, Math.round(Number(o.stock) || 0)),
badge: siNo_(o.nuevo) ? "nuevo" : "", hidden: siNo_(o.oculto),
imgs: String(o.foto).split(/\n|\s*\|\s*/).map(x => x.trim()).filter(Boolean),
level: String(o.nivel).trim(), speed: Number(o.velocidad) || 0, control: Number(o.control) || 0,
headline: String(o.titulo), desc: String(o.descripcion), why: String(o.por_que),
features: String(o.caracteristicas).split("\n").map(l => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; }).filter(Boolean),
};
}
function catalogo_() {
const ss = SpreadsheetApp.getActive();
const p = ss.getSheetByName("Productos");
const filas = p.getLastRow() > 1 ? p.getRange(2, 1, p.getLastRow() - 1, COLS.length).getValues() : [];
const settings = {};
const a = ss.getSheetByName("Ajustes");
if (a && a.getLastRow() > 1) a.getRange(2, 1, a.getLastRow() - 1, 2).getValues().forEach(r => {
const k = String(r[0]).trim(); if (!k) return;
settings[k] = (k === "showNet" || k === "demo") ? (r[1] === true || String(r[1]).toLowerCase() === "true" || siNo_(r[1])) : String(r[1]);
});
return { settings: settings, products: filas.map(deFila_).filter(Boolean) };
}
function tabla_(nombre) {
const h = SpreadsheetApp.getActive().getSheetByName(nombre);
return h && h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, h.getLastColumn()).getValues() : [];
}
function privado_() {
const costs = {}, interest = {}, plan = {};
tabla_("Costos").forEach(r => { const id = String(r[0]).trim(); if (id && r[2] !== "") costs[id] = Number(r[2]) || 0; });
tabla_("Interes").forEach(r => { const id = String(r[0]).trim(); if (id) interest[id] = Number(r[1]) || 0; });
tabla_("Privado").forEach(r => { const k = String(r[0]).trim(); if (k) plan[k] = Number(r[1]) || 0; });
return { costs: costs, interest: interest, plan: plan };
}
function guardarPrivado_(costs, plan) {
const ss = SpreadsheetApp.getActive();
if (costs) {
const h = ss.getSheetByName("Costos") || hoja_(ss, "Costos", ["id", "nombre", "costo"]);
const prods = tabla_("Productos").filter(r => String(r[0]).trim());
const rows = prods.map(r => { const id = String(r[0]).trim(); return [id, r[1], costs[id] === undefined || costs[id] === null || costs[id] === "" ? "" : Number(costs[id])]; });
if (h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, 3).clearContent();
if (rows.length) h.getRange(2, 1, rows.length, 3).setValues(rows);
}
if (plan) {
const h = ss.getSheetByName("Privado") || hoja_(ss, "Privado", ["clave", "valor"]);
const keys = Object.keys(plan);
if (h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, 2).clearContent();
if (keys.length) h.getRange(2, 1, keys.length, 2).setValues(keys.map(k => [k, Number(plan[k]) || 0]));
}
}
function sumarInteres_(id) {
const ss = SpreadsheetApp.getActive();
const h = ss.getSheetByName("Interes") || hoja_(ss, "Interes", ["id", "consultas"]);
const clean = String(id || "").replace(/[^a-z0-9-]/gi, "").slice(0, 60); if (!clean) return;
const n = h.getLastRow() - 1;
const ids = n > 0 ? h.getRange(2, 1, n, 1).getValues().map(r => String(r[0])) : [];
const i = ids.indexOf(clean);
if (i < 0) h.appendRow([clean, 1]); else { const c = h.getRange(i + 2, 2); c.setValue((Number(c.getValue()) || 0) + 1); }
}
function ventas_() {
const v = SpreadsheetApp.getActive().getSheetByName("Ventas");
if (!v || v.getLastRow() < 2) return [];
return v.getRange(2, 1, v.getLastRow() - 1, COLS_VENTAS.length).getValues().map(r => {
let items = []; try { items = JSON.parse(r[7] || "[]"); } catch (e) {}
return { id: String(r[0]), date: new Date(r[1]).toISOString(), customer: String(r[2]), phone: String(r[3]), channel: String(r[4]), total: Number(r[6]) || 0, items: items };
}).filter(s => s.id).sort((a, b) => a.date < b.date ? 1 : -1);
}
function guardarProductos_(products) {
const p = SpreadsheetApp.getActive().getSheetByName("Productos");
if (p.getLastRow() > 1) p.getRange(2, 1, p.getLastRow() - 1, COLS.length).clearContent();
if (products.length) p.getRange(2, 1, products.length, COLS.length).setValues(products.map(aFila_));
}
function guardarAjustes_(s) {
const a = SpreadsheetApp.getActive().getSheetByName("Ajustes");
a.getRange(2, 1, AJUSTES.length, 2).setValues(AJUSTES.map(k => [k, s[k] === undefined || s[k] === null ? "" : typeof s[k] === "object" ? JSON.stringify(s[k]) : String(s[k])]));
}
function registrarVenta_(sale, descontar) {
const ss = SpreadsheetApp.getActive();
ss.getSheetByName("Ventas").appendRow([sale.id, new Date(sale.date), sale.customer, sale.phone, sale.channel,
sale.items.map(it => it.qty + "× " + it.name).join(", "), sale.total, JSON.stringify(sale.items)]);
if (!descontar) return null;
const p = ss.getSheetByName("Productos");
const n = p.getLastRow() - 1; if (n < 1) return null;
const ids = p.getRange(2, 1, n, 1).getValues().map(r => String(r[0]).trim());
sale.items.forEach(it => {
const i = ids.indexOf(it.id); if (i < 0) return;
const c = p.getRange(i + 2, 6); c.setValue(Math.max(0, (Number(c.getValue()) || 0) - it.qty));
});
return catalogo_();
}
function borrarVenta_(id) {
const v = SpreadsheetApp.getActive().getSheetByName("Ventas");
const n = v.getLastRow() - 1; if (n < 1) return;
const ids = v.getRange(2, 1, n, 1).getValues().map(r => String(r[0]));
const i = ids.indexOf(String(id)); if (i >= 0) v.deleteRow(i + 2);
}
function subirFoto_(id, dataUrl) {
const m = /^data:(image\/(?:jpeg|webp|png));base64,(.+)$/.exec(dataUrl || "");
if (!m) throw new Error("Foto inválida.");
const it = DriveApp.getFoldersByName(CARPETA_FOTOS);
const carpeta = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_FOTOS);
const ext = m[1].split("/")[1].replace("jpeg", "jpg");
const f = carpeta.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], id + "-" + Date.now() + "." + ext));
f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
return "https://lh3.googleusercontent.com/d/" + f.getId() + "=w900";
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
const accion = (e && e.parameter && e.parameter.accion) || "catalogo";
if (accion === "catalogo") return json_(catalogo_());
if (accion === "privado") {
if (e.parameter.clave !== CLAVE) return json_({ error: "Clave incorrecta" });
return json_(privado_());
}
if (accion === "ventas") {
if (e.parameter.clave !== CLAVE) return json_({ error: "Clave incorrecta" });
return json_({ sales: ventas_() });
}
return json_({ error: "Acción desconocida" });
}
function doPost(e) {
let b = {};
try { b = JSON.parse(e.postData.contents); } catch (err) { return json_({ error: "Pedido inválido" }); }
if (b.clave !== CLAVE) return json_({ error: "Clave incorrecta" });
const lock = LockService.getScriptLock(); lock.waitLock(20000);
try {
if (b.accion === "guardarProductos") { guardarProductos_(b.products || []); return json_(catalogo_()); }
if (b.accion === "guardarAjustes") { guardarAjustes_(b.settings || {}); return json_(catalogo_()); }
if (b.accion === "venta") { return json_({ catalog: registrarVenta_(b.sale, b.descontar) }); }
if (b.accion === "guardarPrivado") { guardarPrivado_(b.costs, b.plan); return json_({ ok: true }); }
if (b.accion === "interes") { sumarInteres_(b.id); return json_({ ok: true }); }
if (b.accion === "borrarVenta") { borrarVenta_(b.id); return json_({ ok: true }); }
if (b.accion === "foto") { return json_({ url: subirFoto_(b.id, b.dataUrl) }); }
return json_({ error: "Acción desconocida" });
} catch (err) {
return json_({ error: String(err && err.message || err) });
} finally { lock.releaseLock(); }
}
