(function () {
"use strict";
var CATEGORIES = ["2x2", "3x3", "4x4", "BigCubes", "Megaminx", "Pyraminx", "Skewb", "Square-1", "Accesorios"];
var STICKERS = ["var(--blue)", "var(--sol)", "var(--red)", "var(--green)", "var(--orange)", "#ffffff"];
var S = { email: "reycubearg@gmail.com", instagram: "reycubearg" }, PRODUCTS = [];
var ui = { filter: "Todos", q: "", cart: {}, step: "cart", ship: "andreani", name: "", phone: "", city: "", agree: false, admin: false, tab: "ventas", pq: "" };
var api = { live: false, token: "", user: "", db: false, preview: false };
var SALES = [];
var MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
try { var saved = JSON.parse(store("rc-cart") || "{}"); if (saved && typeof saved === "object") ui.cart = saved; } catch (e) {}
api.token = store("rc-token") || "";
function $(id) { return document.getElementById(id); }
function ars(n) { return "$ " + Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function byId(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; }
function visible() { return PRODUCTS.filter(function (p) { return !p.hidden; }); }
function saveCart() { store("rc-cart", JSON.stringify(ui.cart)); }
function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function dims(p) { return p.cat === "4x4" ? 4 : p.cat === "2x2" ? 2 : 3; }
function face(seed, n) { var c = ""; for (var i = 0; i < n * n; i++) c += '<i style="background:' + STICKERS[(i * 7 + seed * 5 + (i % n)) % 6] + '"></i>'; return '<div class="face" style="grid-template-columns:repeat(' + n + ',1fr)">' + c + "</div>"; }
function pics(p) { return p.imgs && p.imgs.length ? p.imgs : (p.img ? [p.img] : []); }
function imgHTML(p, i) { var im = pics(p); return im.length ? '<img src="' + esc(im[0]) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async">' : face(i + 1, dims(p)); }
function cardImg(p, i) {
var im = pics(p); if (im.length < 2) return imgHTML(p, i);
return '<img src="' + esc(im[0]) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async"><img class="alt" src="' + esc(im[1]) + '" alt="" loading="lazy" decoding="async"><span class="pcount" aria-label="' + im.length + ' fotos">' + im.map(function () { return "<i></i>"; }).join("") + "</span>";
}
function gallery(p, i) {
var im = pics(p); if (im.length < 2) return '<div class="img">' + imgHTML(p, i) + "</div>";
return '<div class="gal" data-gid="' + p.id + '"><div class="img gal-main">' + im.map(function (u, k) { return '<img src="' + esc(u) + '" alt="' + esc(p.name + " – foto " + (k + 1)) + '"' + (k ? " hidden" : "") + ">"; }).join("") +
'<button class="gal-nav prev" type="button" data-gnav="-1" aria-label="Foto anterior">‹</button><button class="gal-nav next" type="button" data-gnav="1" aria-label="Foto siguiente">›</button></div>' +
'<div class="gal-thumbs">' + im.map(function (u, k) { return '<button type="button" data-gthumb="' + k + '" aria-label="Ver foto ' + (k + 1) + '" aria-pressed="' + (k === 0) + '"><img src="' + esc(u) + '" alt=""></button>'; }).join("") + "</div></div>";
}
function galShow(root, k) {
var imgs = root.querySelectorAll(".gal-main img"), n = imgs.length; k = (k + n) % n;
imgs.forEach(function (im, j) { im.hidden = j !== k; });
root.querySelectorAll("[data-gthumb]").forEach(function (b, j) { b.setAttribute("aria-pressed", j === k); });
root.dataset.k = k;
}
function meter(v) { var h = ""; for (var i = 1; i <= 5; i++) h += '<i class="' + (i <= v ? "on" : "") + '"></i>'; return '<span class="meter" role="img" aria-label="' + v + ' de 5">' + h + "</span>"; }
function hasPrice(p) { return p.price > 0; }
function canBuy(p) { return p.stock > 0 && hasPrice(p); }
function stockHTML(p) {
if (p.stock <= 0) return '<span class="stock s-none">Sin stock por ahora</span>';
if (p.stock <= 2) return '<span class="stock s-low">' + (p.stock === 1 ? "¡Queda 1 unidad!" : "¡Quedan " + p.stock + " unidades!") + "</span>";
return '<span class="stock s-ok">' + p.stock + " en stock</span>";
}
function netHTML(price) { return S.showNet ? '<span class="net">Precio sin impuestos nacionales: ' + ars(price / 1.21) + "</span>" : ""; }
function priceHTML(p) { return hasPrice(p) ? '<span class="price">' + ars(p.price) + netHTML(p.price) + "</span>" : '<span class="price ask">Consultá el precio</span>'; }
function cartItems() { return Object.keys(ui.cart).map(function (id) { var p = byId(id); return p && canBuy(p) ? { p: p, qty: Math.min(ui.cart[id], p.stock) } : null; }).filter(Boolean); }
function totals() { var c = 0, t = 0; cartItems().forEach(function (x) { c += x.qty; t += x.qty * x.p.price; }); return { count: c, total: t }; }
function igLink() { return "https://ig.me/m/" + encodeURIComponent(S.instagram); }
function call(method, url, data) {
var h = { "Content-Type": "application/json" };
if (api.token) h.Authorization = "Bearer " + api.token;
return fetch(url, { method: method, headers: h, body: data ? JSON.stringify(data) : undefined }).then(function (r) {
return r.json().catch(function () { return {}; }).then(function (j) {
if (r.status === 401 && api.token && url !== "/api/login") { logout(true); }
if (!r.ok) throw Object.assign(new Error(j.error || "Error " + r.status), { status: r.status, code: j.code });
return j;
});
});
}
function applyCatalog(c) { if (!c) return; S = Object.assign({}, S, c.settings || {}); PRODUCTS = Array.isArray(c.products) ? c.products : PRODUCTS; }
function loadCatalog() {
return fetch("/api/products", { headers: { Accept: "application/json" } }).then(function (r) {
var ct = r.headers.get("content-type") || "";
if (!r.ok || ct.indexOf("json") < 0) throw new Error("sin api");
api.live = true; return r.json();
}).catch(function () {
api.live = false; api.preview = true;
return fetch("data/catalog.json").then(function (r) { return r.json(); });
}).then(function (c) { applyCatalog(c); });
}
function matches(p) {
var f = ui.filter;
var okF = f === "Todos" || (f === "Nuevos" ? p.badge === "nuevo" : f === "En stock" ? p.stock > 0 : p.cat === f);
if (!okF) return false;
if (!ui.q) return true;
var hay = norm(p.name + " " + p.brand + " " + p.cat + " " + (p.headline || ""));
return norm(ui.q).split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; });
}
function renderFilters() {
var list = visible(), counts = { Todos: list.length, Nuevos: 0 };
list.forEach(function (p) { counts[p.cat] = (counts[p.cat] || 0) + 1; if (p.badge === "nuevo") counts.Nuevos++; });
$("filters").innerHTML = ["Todos", "Nuevos", "En stock"].concat(CATEGORIES).map(function (c) {
var n = c === "En stock" ? list.filter(function (p) { return p.stock > 0; }).length : counts[c];
if (!n && c !== "Todos" && c !== "En stock") return "";
return '<button class="chip" type="button" data-f="' + esc(c) + '" aria-pressed="' + (ui.filter === c) + '">' + esc(c) + (n ? "<small>" + n + "</small>" : "") + "</button>";
}).join("");
}
function sortList(a, b) { return (b.stock > 0) - (a.stock > 0) || (b.badge === "nuevo") - (a.badge === "nuevo"); }
function renderGrid() {
var f = ui.filter;
var list = visible().filter(matches).sort(sortList);
$("listTitle").textContent = ui.q ? "Resultados" : f === "Todos" ? "Todo el catálogo" : f === "Nuevos" ? "Recién salidos del horno" : f;
$("listCount").textContent = list.length ? list.length + (list.length === 1 ? " producto" : " productos") : "";
if (!list.length) { $("grid").innerHTML = '<div class="empty"><b>' + (ui.q ? "No encontramos “" + esc(ui.q) + "”" : "Estamos reponiendo " + esc(f)) + "</b>Escribinos por Instagram a @" + esc(S.instagram) + " y te ayudamos a conseguirlo.</div>"; return; }
$("grid").innerHTML = list.map(function (p) {
var i = PRODUCTS.indexOf(p), inCart = !!ui.cart[p.id], btn;
if (canBuy(p)) btn = '<button class="btn' + (inCart ? " in" : "") + '" type="button" data-add="' + p.id + '">' + (inCart ? "En el carrito ✓" : "Agregar") + "</button>";
else btn = '<button class="btn sec" type="button" data-ask="' + p.id + '">' + (p.stock > 0 ? "Consultar" : "Avisame") + "</button>";
var meters = (p.speed || p.control) ? '<div class="meters">' + (p.speed ? "<span>Velocidad</span>" + meter(p.speed) : "") + (p.control ? "<span>Control</span>" + meter(p.control) : "") + "</div>" : "";
return '<article class="card"><button class="img" type="button" data-detail="' + p.id + '" aria-label="Ver detalles de ' + esc(p.name) + '">' + cardImg(p, i) + (p.badge === "nuevo" ? '<span class="badge b-nuevo">Nuevo</span>' : "") + "</button>" +
'<div class="body"><div class="cat-row"><span class="cat">' + esc(p.brand + " · " + p.cat) + "</span>" + (p.level ? '<span class="level">' + esc(p.level) + "</span>" : "") + "</div>" +
'<h3 class="name"><button type="button" data-detail="' + p.id + '">' + esc(p.name) + "</button></h3>" + meters + stockHTML(p) + "</div>" +
'<div class="foot">' + priceHTML(p) + btn + "</div></article>";
}).join("");
}
function orderNo() { if (!ui.orderNo) ui.orderNo = "RC-" + Date.now().toString(36).toUpperCase().slice(-6); return ui.orderNo; }
function orderText() {
var t = totals();
return "Pedido " + orderNo() + " · ReyCube.Arg\n" + cartItems().map(function (x) { return "• " + x.qty + " × " + x.p.name + " — " + ars(x.qty * x.p.price); }).join("\n") +
"\nTotal: " + ars(t.total) + " (envío aparte)\n\nNombre: " + (ui.name || "—") + "\nTeléfono: " + (ui.phone || "—") +
"\nEntrega: " + (ui.ship === "andreani" ? "Envío por Andreani" + (ui.city ? " a " + ui.city : "") : "Retiro en Parque Patricios");
}
function phoneOk() { return /^[+\d][\d\s()-]{7,}$/.test(ui.phone.trim()); }
function orderReady() { return ui.name.trim().length > 1 && phoneOk() && ui.agree && (ui.ship === "retiro" || ui.city.trim().length > 2); }
function mailHref() { return "mailto:" + S.email + "?subject=" + encodeURIComponent("Pedido " + orderNo() + " - ReyCube.Arg") + "&body=" + encodeURIComponent(orderText()); }
function renderCart() {
var items = cartItems(), t = totals();
$("cartCount").textContent = t.count + (t.count === 1 ? " producto" : " productos");
$("topCount").textContent = t.count;
$("fab").hidden = t.count === 0 || ui.admin;
$("fabTxt").textContent = "Ver carrito (" + t.count + ")";
$("fabTotal").textContent = ars(t.total);
document.body.classList.toggle("has-items", t.count > 0);
if (!items.length) { ui.step = "cart"; $("cartTitle").textContent = "Tu carrito"; $("cartBody").innerHTML = '<div class="cart-empty">Todavía no agregaste nada.<br>Tocá "Agregar" en un producto.</div>'; return; }
if (ui.step === "cart") {
$("cartTitle").textContent = "Tu carrito";
$("cartBody").innerHTML = '<div class="lines">' + items.map(function (x) {
return '<div class="line"><span class="line-n">' + esc(x.p.name) + '</span><span class="qty"><button type="button" data-q="' + x.p.id + '" data-d="-1" aria-label="Quitar uno">−</button><span>' + x.qty +
'</span><button type="button" data-q="' + x.p.id + '" data-d="1" aria-label="Sumar uno"' + (x.qty >= x.p.stock ? " disabled" : "") + '>+</button></span><span class="line-p">' + ars(x.qty * x.p.price) + "</span></div>";
}).join("") + '</div><div class="total"><span>Total</span><span class="price">' + ars(t.total) + netHTML(t.total) + "</span></div>" +
'<div class="note">Precio final en pesos. El envío por Andreani se cotiza aparte según destino; el retiro en Parque Patricios no tiene costo.</div>' +
'<button class="btn block" type="button" id="toOrder">Hacer pedido</button>';
} else {
var ready = orderReady();
$("cartTitle").textContent = "Tu pedido";
$("cartBody").innerHTML = '<div class="form">' +
'<label for="oName">Nombre<input id="oName" autocomplete="name" value="' + esc(ui.name) + '" placeholder="Ej.: Tomás López" required></label>' +
'<label for="oPhone">Teléfono (WhatsApp)<input id="oPhone" type="tel" autocomplete="tel" inputmode="tel" value="' + esc(ui.phone) + '" placeholder="Ej.: 11 5555-1234" pattern="[+0-9][0-9 ()-]{7,}" required><span class="hint">Te escribimos para confirmar stock, envío y pago.</span></label>' +
'<div><div class="lbl" style="margin-bottom:4px">¿Cómo lo recibís?</div><div class="seg"><button type="button" data-ship="andreani" aria-pressed="' + (ui.ship === "andreani") + '">Envío Andreani</button><button type="button" data-ship="retiro" aria-pressed="' + (ui.ship === "retiro") + '">Retiro en P. Patricios</button></div></div>' +
(ui.ship === "andreani" ? '<label for="oCity">Ciudad y provincia<input id="oCity" autocomplete="address-level2" value="' + esc(ui.city) + '" placeholder="Ej.: Rosario, Santa Fe"></label>' : "") +
'<label class="check" for="oAgree"><input type="checkbox" id="oAgree"' + (ui.agree ? " checked" : "") + '><span>Leí y acepto los <button type="button" data-open="terms">términos y condiciones</button> y la <button type="button" data-open="privacy">política de privacidad</button>.</span></label>' +
'<div class="total"><span>Total</span><span class="price">' + ars(t.total) + "</span></div>" +
'<div class="lbl">Tu pedido</div><div class="msg" id="msg">' + esc(orderText()) + "</div>" +
'<div class="err" id="oErr">' + (ready ? "" : "Completá nombre, teléfono" + (ui.ship === "andreani" ? ", ciudad" : "") + " y aceptá los términos para enviar.") + "</div>" +
'<div class="send-row"><a class="btn" id="sendMail" href="' + (ready ? esc(mailHref()) : "#") + '"' + (ready ? "" : ' aria-disabled="true" tabindex="-1"') + ">Enviar por mail</a>" +
'<button class="btn" type="button" id="sendIG"' + (ready ? "" : " disabled") + ">Enviar por Instagram</button></div>" +
'<span class="toast" id="toast" role="status"></span>' +
'<div class="note">El botón de mail abre tu correo con el pedido listo. El de Instagram copia el pedido y abre el chat con @' + esc(S.instagram) + ": solo pegalo y enviá. Mail: <span class=\"mono-sel\">" + esc(S.email) + "</span></div>" +
'<button class="btn block ghost" type="button" id="back">Volver al carrito</button></div>';
}
}
function refreshOrder() {
var ready = orderReady();
$("msg").textContent = orderText();
$("oErr").textContent = ready ? "" : "Completá nombre, teléfono" + (ui.ship === "andreani" ? ", ciudad" : "") + " y aceptá los términos para enviar.";
var m = $("sendMail"); m.href = ready ? mailHref() : "#"; if (ready) { m.removeAttribute("aria-disabled"); m.removeAttribute("tabindex"); } else { m.setAttribute("aria-disabled", "true"); m.setAttribute("tabindex", "-1"); }
$("sendIG").disabled = !ready;
}
function copyText(txt, ok, fail) { try { navigator.clipboard.writeText(txt).then(ok, fail); } catch (e) { fail(); } }
function selectMsg() { var r = document.createRange(); r.selectNodeContents($("msg")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
function openIG() { var a = document.createElement("a"); a.href = igLink(); a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); }
function askAbout(id) {
var p = byId(id); if (!p) return;
if (api.live) { try { fetch("/api/interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }), keepalive: true }); } catch (e) {} }
var txt = "Hola ReyCube! Quería consultar por el " + p.name + (p.stock > 0 ? ": ¿precio y envío?" : ": ¿cuándo vuelve a entrar?");
openDlg(p.stock > 0 ? "Consultar precio" : "Avisame cuando entre",
"<p>Te armamos el mensaje para mandar por Instagram o mail. En Instagram ya queda copiado: solo pegalo en el chat.</p>" +
'<div class="msg" id="askMsg">' + esc(txt) + '</div><div class="send-row" style="margin-top:10px"><button class="btn" type="button" id="askIG">Abrir Instagram</button>' +
'<a class="btn sec" href="mailto:' + esc(S.email) + "?subject=" + encodeURIComponent("Consulta: " + p.name) + "&body=" + encodeURIComponent(txt) + '">Mandar mail</a></div><span class="toast" id="askToast" role="status"></span>');
$("askIG").onclick = function () { copyText(txt, function () { $("askToast").textContent = "Mensaje copiado. Pegalo en el chat."; }, function () { $("askToast").textContent = "Copiá el mensaje de arriba y pegalo en el chat."; }); openIG(); };
}
function openDlg(title, html) { $("dlgTitle").textContent = title; $("dlgBody").innerHTML = html; var d = $("dlg"); if (!d.open) d.showModal(); }
function seller(v) { return v ? esc(v) : '<span class="pend">a completar</span>'; }
function productDetail(id) {
var p = byId(id), i = PRODUCTS.indexOf(p), inCart = !!ui.cart[p.id];
var btn = canBuy(p) ? '<button class="btn' + (inCart ? " in" : "") + '" type="button" data-add="' + p.id + '" data-keep="1">' + (inCart ? "En el carrito ✓" : "Agregar al carrito") + "</button>"
: '<button class="btn sec" type="button" data-ask="' + p.id + '">' + (p.stock > 0 ? "Consultar precio" : "Avisame cuando entre") + "</button>";
var meters = (p.level || p.speed || p.control) ? '<table class="spec">' + (p.level ? "<tr><th>Nivel</th><td>" + esc(p.level) + "</td></tr>" : "") + (p.speed ? "<tr><th>Velocidad</th><td>" + meter(p.speed) + "</td></tr>" : "") + (p.control ? "<tr><th>Control</th><td>" + meter(p.control) + "</td></tr>" : "") + '</table><p class="src">Velocidad y control: guía ReyCube basada en reseñas de usuarios (1 a 5).</p>' : "";
var feats = (p.features || []).length ? '<h3>Características</h3><ul class="feats">' + p.features.map(function (f) { return "<li><b>" + esc(f[0]) + ":</b> " + esc(f[1]) + "</li>"; }).join("") + "</ul>" : "";
openDlg(p.name, '<div class="pd">' + gallery(p, i) + '<div><div class="cat">' + esc(p.brand + " · " + p.cat) + "</div>" +
(p.headline ? '<p class="headline">' + esc(p.headline) + "</p>" : "") +
(p.desc ? '<p style="margin:6px 0 10px">' + esc(p.desc) + "</p>" : "") + stockHTML(p) +
'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin:12px 0;flex-wrap:wrap">' + priceHTML(p) + btn + "</div>" + meters + "</div></div>" +
feats + (p.why ? "<h3>¿Por qué elegirlo?</h3><p>" + esc(p.why) + "</p>" : ""));
}
function legal(kind) {
if (kind === "terms") openDlg("Términos y condiciones",
"<p><b>Contrato de adhesión – Ley 24.240 de Defensa del Consumidor.</b> Vigentes desde el " + esc(S.vigencia) + ".</p>" +
"<h3>1. Quién vende</h3><p>ReyCube.Arg es atendido por " + seller(S.titular) + ", CUIT " + seller(S.cuit) + ", con domicilio en " + seller(S.domicilio) + ". Contacto: " + esc(S.email) + " e Instagram @" + esc(S.instagram) + ".</p>" +
"<h3>2. Cómo se compra</h3><p>Elegís los productos, completás tus datos y nos enviás el pedido por mail o Instagram. El pedido queda confirmado cuando te respondemos con la disponibilidad, el costo de envío y el medio de pago, y realizás el pago.</p>" +
"<h3>3. Precios</h3><p>Los precios están expresados en pesos argentinos y son precios finales. El envío no está incluido y se informa antes de confirmar. Los precios y el stock pueden cambiar sin aviso, pero se respeta el precio publicado al momento de tu pedido confirmado.</p>" +
"<h3>4. Envíos</h3><p>Enviamos a todo el país por Andreani o podés retirar sin costo en Parque Patricios (CABA), coordinando día y horario.</p>" +
"<h3>5. Derecho de arrepentimiento</h3><p>Podés revocar la compra dentro de los 10 días corridos desde que recibís el producto, sin explicar el motivo y sin costo (art. 34 Ley 24.240 y art. 1110 del Código Civil y Comercial). El producto debe volver en el mismo estado en que lo recibiste. Podés pedirlo desde el Botón de arrepentimiento al pie de la página.</p>" +
"<h3>6. Garantía</h3><p>Los productos nuevos tienen la garantía legal de la Ley 24.240 por fallas de fabricación. No cubre roturas por golpes, calor o mal uso.</p>" +
'<h3>7. Reclamos</h3><p>Podés escribirnos a ' + esc(S.email) + '. También podés hacer tu reclamo ante <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" target="_blank" rel="noopener">Defensa de las y los Consumidores</a>.</p>' +
"<h3>8. Ley aplicable</h3><p>Rigen las leyes de la República Argentina.</p>");
if (kind === "privacy") openDlg("Política de privacidad",
"<p>Cumplimos con la Ley 25.326 de Protección de los Datos Personales.</p>" +
"<h3>Qué datos pedimos</h3><p>Nombre, teléfono y ciudad, solo cuando hacés un pedido o una solicitud de arrepentimiento.</p>" +
"<h3>Para qué los usamos</h3><p>Para confirmar tu pedido, coordinar el envío o retiro y responder consultas. No los vendemos ni los compartimos, salvo con el correo (Andreani) para entregarte el pedido.</p>" +
"<h3>Dónde se guardan y por cuánto tiempo</h3><p>En el registro de ventas de ReyCube.Arg, mientras sea necesario para la venta, la garantía y las obligaciones legales.</p>" +
"<h3>Tus derechos</h3><p>Podés pedir acceso, rectificación, actualización o supresión de tus datos escribiendo a " + esc(S.email) + ". Responsable: " + seller(S.titular) + ".</p>" +
"<p>El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>");
if (kind === "ship") openDlg("Envíos y cambios",
"<h3>Envíos</h3><p>A todo el país por Andreani. El costo depende del destino y te lo pasamos antes de confirmar. Despachamos dentro de las 48 h hábiles de acreditado el pago.</p>" +
"<h3>Retiro</h3><p>Sin costo en Parque Patricios (CABA), coordinando día y horario.</p>" +
"<h3>Cambios y devoluciones</h3><p>Tenés 10 días corridos desde que lo recibís para arrepentirte de la compra. Si el cubo llega con una falla de fábrica, te lo cambiamos.</p>");
if (kind === "arrep") openDlg("Botón de arrepentimiento",
"<p>Tenés 10 días corridos desde que recibiste el producto para revocar la compra, sin costo y sin explicar el motivo. Completá tus datos y te respondemos dentro de las 24 h.</p>" +
'<form class="form" id="arrForm" novalidate><label for="aName">Nombre y apellido<input id="aName" required autocomplete="name"></label>' +
'<label for="aContact">Teléfono o mail<input id="aContact" required></label>' +
'<label for="aOrder">Número de pedido o fecha de compra<input id="aOrder" required placeholder="Ej.: RC-8K2J1Q o 10/10/2026"></label>' +
'<label for="aProd">Producto<input id="aProd" required></label>' +
'<button class="btn block" type="submit">Generar solicitud</button><div class="err" id="aErr"></div><div id="aOut"></div></form>');
if (kind === "news") openDlg("Avisame por mail",
"<p>Mandanos un mail y te sumamos a la lista de novedades: ingresos, reposiciones y torneos. Podés pedir la baja cuando quieras.</p>" +
'<p><a class="btn" href="mailto:' + esc(S.email) + "?subject=" + encodeURIComponent("Quiero recibir novedades de ReyCube.Arg") + '">Escribir el mail</a></p><p>O escribinos a <span class="mono-sel">' + esc(S.email) + "</span></p>");
}
function renderFooter() {
$("footMail").textContent = S.email;
$("legalNote").textContent = (S.demo ? "Algunos precios se confirman por mensaje. " : "") + "Precios finales en pesos argentinos, IVA incluido cuando corresponda. Envío no incluido.";
}
function loginDialog() {
if (api.token) { setAdmin(true); return; }
openDlg("Acceso equipo",
'<form class="form login-box" id="loginForm" novalidate>' +
(api.preview ? '<div class="banner">Vista previa: el panel se muestra pero no guarda nada. El login real funciona cuando la página está en Vercel.</div>' : "") +
'<label for="lgUser">Usuario<input id="lgUser" autocomplete="username" autocapitalize="none" required></label>' +
'<label for="lgPass">Contraseña<input id="lgPass" type="password" autocomplete="current-password" required></label>' +
'<button class="btn block" type="submit">Entrar</button><div class="err" id="lgErr" role="alert"></div></form>');
setTimeout(function () { var u = $("lgUser"); if (u) u.focus(); }, 30);
}
function doLogin() {
var u = $("lgUser").value.trim(), p = $("lgPass").value, err = $("lgErr");
if (!u || !p) { err.textContent = "Completá usuario y contraseña."; return; }
if (api.preview) { api.token = "preview"; api.user = u; afterLogin(); return; }
err.textContent = "Entrando…"; err.style.color = "var(--muted)";
call("POST", "/api/login", { user: u, pass: p }).then(function (j) {
api.token = j.token; api.user = j.user; api.db = j.db; store("rc-token", j.token); store("rc-user", j.user); afterLogin();
}, function (e) { err.style.color = ""; err.textContent = e.message; });
}
function afterLogin() { $("dlg").close(); $("adminBtn").hidden = false; ui.tab = "ventas"; setAdmin(true); loadSales(); loadPrivate(); }
function logout(expired) {
api.token = ""; api.user = ""; store("rc-token", null); store("rc-user", null);
$("adminBtn").hidden = true; if (ui.admin) setAdmin(false);
if (expired) openDlg("Sesión vencida", "<p>Volvé a entrar desde <b>Acceso equipo</b>, al pie de la página.</p>");
}
function checkSession() {
if (!api.token || !api.live) { if (api.preview) { api.token = ""; } return; }
api.user = store("rc-user") || "";
call("GET", "/api/login").then(function (j) { api.db = j.db; $("adminBtn").hidden = false; loadSales(); loadPrivate(); }, function () {});
}
function loadSales() {
if (api.preview || !api.db) return;
call("GET", "/api/sales").then(function (j) { SALES = j.sales || []; if (ui.admin) renderAdmin(); }, function () {});
}
var DEFAULT_PAGE = {
announce: { on: false, text: "", link: "" },
hero: { title: "Cubos para ir", highlight: "más rápido.", text: "Speedcubes magnéticos, ballcore y UV de GAN, MoYu y QiYi, más lubricantes, timers y mats. Mirá el stock real y armá tu pedido en un minuto.", pills: ["Envíos a todo el país por Andreani", "Retiro en Parque Patricios", "Stock real, actualizado"] },
chooser: { show: true, title: "¿Qué cubo elijo?", lead: "Según tu tiempo promedio en el 3x3. Tocá un cubo para ver su ficha.", groups: [
{ t: "más de 1 minuto", h: "Estás empezando", d: "Buscá un cubo estable y fácil de controlar, que perdone errores.", ids: ["warrior-m-3x3", "rs3m-2020", "tornado-v5"] },
{ t: "entre 20 y 60 segundos", h: "Ya te lo sabés", d: "Un cubo más rápido y liviano te ayuda a encadenar movimientos.", ids: ["rs3m-v5-dual", "aolong-v5", "mpro-v3-pioneer"] },
{ t: "menos de 20 segundos", h: "Vas por récords", d: "Un flagship con mucho ajuste para dejarlo exactamente a tu gusto.", ids: ["gan17", "weilong-v11", "mpro-v3-flagship"] }
] },
tips: { show: true, title: "Cuidá tu cubo y te dura años", lead: "Lo básico que hacen los speedcubers para que el cubo gire igual que el primer día.", items: [
{ tag: "cada 1–2 meses", h: "Lubricá poco y bien", p: "Una o dos gotas de lubricante de silicona alcanzan. Más denso en el núcleo para controlar; más liviano en las piezas para velocidad. Girá un rato para repartirlo y limpiá el sobrante." },
{ tag: "primera semana", h: "Dale rodaje", p: "Muchos cubos se sienten duros o \"rasposos\" de fábrica. Después de unos 100 solves se asientan y quedan más suaves." },
{ tag: "con la herramienta", h: "Ajustá tensión y compresión", p: "Si salta una pieza o hay corner twist, subí un punto la tensión. Si se traba, bajala. Cambiá de a un nivel y todas las caras iguales." },
{ tag: "sin agua en los imanes", h: "Limpiá en seco", p: "Paño seco o apenas húmedo por fuera. Si lo desarmás, no mojes las piezas con imanes y secá todo antes de armarlo." },
{ tag: "siempre", h: "Lejos del sol y del calor", p: "El calor deforma el plástico y opaca el acabado UV. Guardalo en su caja o bolsita, nunca en el auto ni al sol." },
{ tag: "si pasa", h: "Pieza que saltó", p: "Girá la capa 45°, encastrá la pieza con cuidado y, si se repite, subí la tensión. No fuerces: el núcleo es lo más delicado." }
] },
wca: { show: true },
news: { show: true, title: "Enterate primero de los cubos nuevos", text: "Ingresos, reposiciones, torneos y tips. Seguinos en Instagram o pedinos que te avisemos por mail." }
};
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function PG() {
var p = S.page || {}, out = clone(DEFAULT_PAGE);
Object.keys(out).forEach(function (k) { if (p[k] && typeof p[k] === "object") out[k] = Object.assign(out[k], p[k]); });
return out;
}
function setText(id, t) { var el = $(id); if (el) el.textContent = t; }
function renderPage() {
var g = PG();
var a = $("announce");
a.hidden = !(g.announce.on && g.announce.text);
a.innerHTML = a.hidden ? "" : '<div class="wrap">' + (g.announce.link ? '<a href="' + esc(g.announce.link) + '" target="_blank" rel="noopener">' + esc(g.announce.text) + " →</a>" : esc(g.announce.text)) + "</div>";
$("heroTitle").innerHTML = esc(g.hero.title) + (g.hero.highlight ? " <em>" + esc(g.hero.highlight) + "</em>" : "");
setText("heroText", g.hero.text);
$("heroPills").innerHTML = g.hero.pills.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("");
$("heroPills").hidden = !g.hero.pills.length;
$("tips").hidden = !g.tips.show; setText("tipsTitle", g.tips.title); setText("tipsLead", g.tips.lead);
$("tipsList").innerHTML = g.tips.items.map(function (t) { return '<article class="tip">' + (t.tag ? '<span class="tag">' + esc(t.tag) + "</span>" : "") + "<h3>" + esc(t.h) + "</h3><p>" + esc(t.p) + "</p></article>"; }).join("");
$("elegir").hidden = !g.chooser.show; setText("chooserTitle", g.chooser.title); setText("chooserLead", g.chooser.lead);
$("chooser").innerHTML = g.chooser.groups.map(function (gr) {
var picks = (gr.ids || []).map(byId).filter(function (p) { return p && !p.hidden; });
return '<div class="choose">' + (gr.t ? '<div class="t">Promedio ' + esc(gr.t) + "</div>" : "") + "<h3>" + esc(gr.h) + "</h3><p>" + esc(gr.d) + '</p><div class="picks">' + picks.map(function (p) { return '<button type="button" data-detail="' + p.id + '">' + esc(p.name) + "</button>"; }).join("") + "</div></div>";
}).join("");
$("campeonatos").hidden = !g.wca.show;
$("novedades").hidden = !g.news.show; setText("newsTitle", g.news.title); setText("newsText", g.news.text);
document.querySelectorAll('nav.links a').forEach(function (l) { var t = document.querySelector(l.getAttribute("href")); l.hidden = !!(t && t.hidden); });
}
function draft() { if (!ui.pageDraft) ui.pageDraft = PG(); return ui.pageDraft; }
function inp(id, val, ph, max) { return '<input id="' + id + '" data-pg="' + id + '" value="' + esc(val) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : "") + (max ? ' maxlength="' + max + '"' : "") + ">"; }
function area(id, val, max) { return '<textarea id="' + id + '" data-pg="' + id + '" rows="2"' + (max ? ' maxlength="' + max + '"' : "") + ">" + esc(val) + "</textarea>"; }
function showToggle(id, on, label) { return '<label class="check sw" for="' + id + '"><input type="checkbox" id="' + id + '" data-pg="' + id + '"' + (on ? " checked" : "") + "><span>" + label + "</span></label>"; }
function adminPage() {
var d = draft();
var opts = PRODUCTS.slice().sort(function (a, b) { return a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name); });
var h = '<p class="hint" style="font-size:14px;margin:0 0 14px">Cambiá lo que quieras y tocá <b>Guardar y publicar</b>. Los cambios se ven en la tienda enseguida. Si algo no te gusta, <button class="lnk-inline" type="button" id="pgReset">volvé a los textos originales</button>.</p>';
h += '<div class="panel"><div class="pg-h"><h2>Aviso arriba de todo</h2>' + showToggle("pgAnnOn", d.announce.on, "Mostrar") + '</div><p class="hint" style="margin-top:0">Una franja de color sobre el encabezado. Sirve para promos, feriados o "llegó stock nuevo".</p>' +
'<div class="form"><label for="pgAnnText">Texto' + inp("pgAnnText", d.announce.text, "Ej.: ¡Llegaron los GAN 17! Envíos gratis en CABA este fin de semana", 200) + '</label><label for="pgAnnLink">Link (opcional)' + inp("pgAnnLink", d.announce.link, "Ej.: https://www.instagram.com/reycubearg/", 300) + "</label></div></div>";
h += '<div class="panel"><h2>Portada</h2><div class="form"><div class="two"><label for="pgHeroTitle">Título' + inp("pgHeroTitle", d.hero.title, "", 80) + '</label><label for="pgHeroHi">Parte en azul' + inp("pgHeroHi", d.hero.highlight, "", 60) + "</label></div>" +
'<label for="pgHeroText">Texto' + area("pgHeroText", d.hero.text, 400) + '</label><label for="pgHeroPills">Etiquetas (una por línea)<textarea id="pgHeroPills" data-pg="pgHeroPills" rows="3">' + esc(d.hero.pills.join("\n")) + "</textarea></label></div></div>";
h += '<div class="panel"><div class="pg-h"><h2>¿Qué cubo elijo?</h2>' + showToggle("pgChShow", d.chooser.show, "Mostrar") + '</div><div class="form"><div class="two"><label for="pgChTitle">Título' + inp("pgChTitle", d.chooser.title, "", 80) + '</label><label for="pgChLead">Bajada' + inp("pgChLead", d.chooser.lead, "", 300) + "</label></div></div>" +
'<div class="groups">' + d.chooser.groups.map(function (g, i) {
var chosen = (g.ids || []).map(byId).filter(Boolean);
return '<div class="grp"><div class="grp-h"><b>Nivel ' + (i + 1) + "</b>" + (d.chooser.groups.length > 1 ? '<button class="btn ghost mini" type="button" data-grdel="' + i + '">Quitar nivel</button>' : "") + "</div>" +
'<label for="pgG' + i + 'h">Nombre del nivel' + inp("pgG" + i + "h", g.h, "Ej.: Estás empezando", 60) + "</label>" +
'<label for="pgG' + i + 't">Promedio en el 3x3' + inp("pgG" + i + "t", g.t, "Ej.: más de 1 minuto", 60) + "</label>" +
'<label for="pgG' + i + 'd">Descripción' + area("pgG" + i + "d", g.d, 240) + "</label>" +
'<div class="lbl">Cubos recomendados <span class="hint">(hasta 6, en este orden)</span></div><div class="picked">' +
(chosen.length ? chosen.map(function (p, j) { return '<span class="pick">' + (j > 0 ? '<button type="button" data-grup="' + i + '" data-j="' + j + '" aria-label="Subir">‹</button>' : "") + esc(p.name) + '<button type="button" data-grrm="' + i + '" data-j="' + j + '" aria-label="Quitar ' + esc(p.name) + '">×</button></span>'; }).join("") : '<span class="hint">Todavía no elegiste cubos para este nivel.</span>') + "</div>" +
(chosen.length < 6 ? '<select data-gradd="' + i + '" aria-label="Agregar un cubo al nivel ' + (i + 1) + '"><option value="">+ Agregar un cubo…</option>' + opts.filter(function (p) { return (g.ids || []).indexOf(p.id) < 0; }).map(function (p) { return '<option value="' + p.id + '">' + esc(p.cat + " · " + p.name) + (p.stock > 0 ? "" : " (sin stock)") + "</option>"; }).join("") + "</select>" : "") + "</div>";
}).join("") + "</div>" + (d.chooser.groups.length < 6 ? '<button class="btn sec mini" type="button" id="grAdd" style="margin-top:10px">+ Agregar nivel</button>' : "") + "</div>";
h += '<div class="panel"><div class="pg-h"><h2>Tips</h2>' + showToggle("pgTipsShow", d.tips.show, "Mostrar") + '</div><div class="form"><div class="two"><label for="pgTipsTitle">Título' + inp("pgTipsTitle", d.tips.title, "", 80) + '</label><label for="pgTipsLead">Bajada' + inp("pgTipsLead", d.tips.lead, "", 300) + "</label></div></div>" +
'<div class="groups">' + d.tips.items.map(function (t, i) {
return '<div class="grp"><div class="grp-h"><b>Tip ' + (i + 1) + '</b><button class="btn ghost mini" type="button" data-tipdel="' + i + '">Quitar</button></div>' +
'<label for="pgT' + i + 'h">Título' + inp("pgT" + i + "h", t.h, "", 80) + '</label><label for="pgT' + i + 'tag">Etiqueta' + inp("pgT" + i + "tag", t.tag, "Ej.: cada 1–2 meses", 40) + '</label><label for="pgT' + i + 'p">Texto' + area("pgT" + i + "p", t.p, 400) + "</label></div>";
}).join("") + "</div>" + (d.tips.items.length < 12 ? '<button class="btn sec mini" type="button" id="tipAdd" style="margin-top:10px">+ Agregar tip</button>' : "") + "</div>";
h += '<div class="panel"><div class="pg-h"><h2>Novedades</h2>' + showToggle("pgNewsShow", d.news.show, "Mostrar") + '</div><div class="form"><label for="pgNewsTitle">Título' + inp("pgNewsTitle", d.news.title, "", 80) + '</label><label for="pgNewsText">Texto' + area("pgNewsText", d.news.text, 300) + "</label></div></div>";
h += '<div class="panel"><div class="pg-h"><h2>Campeonatos WCA</h2>' + showToggle("pgWcaShow", d.wca.show, "Mostrar") + '</div><p class="hint" style="margin:0">La sección que explica cómo anotarse en torneos oficiales.</p></div>';
h += '<div class="savebar"><button class="btn" type="button" id="savePage">Guardar y publicar</button><button class="btn sec" type="button" id="viewPage">Ver cómo queda</button><span class="status" id="pageStatus" role="status"></span></div>';
return h;
}
function readPageForm() {
var d = draft(), v = function (id) { var el = $(id); return el ? (el.type === "checkbox" ? el.checked : el.value) : undefined; };
if (!$("pgHeroTitle")) return d;
d.announce = { on: v("pgAnnOn"), text: v("pgAnnText").trim(), link: v("pgAnnLink").trim() };
d.hero = { title: v("pgHeroTitle"), highlight: v("pgHeroHi"), text: v("pgHeroText"), pills: v("pgHeroPills").split("\n").map(function (x) { return x.trim(); }).filter(Boolean) };
d.chooser.show = v("pgChShow"); d.chooser.title = v("pgChTitle"); d.chooser.lead = v("pgChLead");
d.chooser.groups.forEach(function (g, i) { g.h = v("pgG" + i + "h"); g.t = v("pgG" + i + "t"); g.d = v("pgG" + i + "d"); });
d.tips.show = v("pgTipsShow"); d.tips.title = v("pgTipsTitle"); d.tips.lead = v("pgTipsLead");
d.tips.items.forEach(function (t, i) { t.h = v("pgT" + i + "h"); t.tag = v("pgT" + i + "tag"); t.p = v("pgT" + i + "p"); });
d.news = { show: v("pgNewsShow"), title: v("pgNewsTitle"), text: v("pgNewsText") };
d.wca = { show: v("pgWcaShow") };
return d;
}
function savePage() {
var d = readPageForm();
if (api.preview || !api.db) { S.page = clone(d); renderPage(); guard("pageStatus"); return; }
status("pageStatus", "Publicando…");
call("PUT", "/api/products", { settings: Object.assign({}, S, { page: d }) }).then(function (c) { applyCatalog(c); ui.pageDraft = null; renderPage(); renderAdmin(); status("pageStatus", "Listo, la página ya está actualizada.", "ok"); },
function (e) { status("pageStatus", "No se pudo guardar: " + e.message, "bad"); });
}
function pageAction(fn) { readPageForm(); fn(draft()); renderAdmin(); status("pageStatus", "Cambios sin guardar. Tocá Guardar y publicar."); }
var PRIV = { costs: {}, interest: {}, plan: { leadDays: 21, coverDays: 45 }, loaded: false };
var DAY = 864e5;
function monthKey(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2); }
function costOf(id) { var c = PRIV.costs[id]; return c > 0 ? c : 0; }
function pct(n) { return (Math.round(n * 10) / 10).toString().replace(".", ",") + "%"; }
function loadPrivate() {
if (api.preview || !api.db) return Promise.resolve();
return call("GET", "/api/private").then(function (j) { PRIV = Object.assign(PRIV, j, { loaded: true }); if (ui.admin) renderAdmin(); }, function () {});
}
function renderAdmin() {
var v = $("adminView");
var tabs = [["ventas", "Ventas e ingresos"], ["ganancias", "Ganancias"], ["compras", "Qué comprar"], ["nueva", "Registrar venta"], ["productos", "Productos y stock"], ["pagina", "Editar página"], ["legal", "Datos legales"]];
var html = '<div class="admin-top"><div><h1>Panel de ReyCube.Arg</h1><p class="lead" style="margin:0">Hola' + (api.user ? " " + esc(api.user) : "") + '. Lo que ves acá es confidencial: costos, ganancias y ventas nunca se muestran en la tienda.</p></div>' +
'<button class="btn sec" type="button" id="logoutBtn">Cerrar sesión</button></div>' +
(api.preview ? '<div class="banner">Vista previa: podés recorrer el panel, pero no se guarda nada.</div>' : !api.db ? '<div class="banner">Falta conectar dónde se guardan los datos (Upstash o Google Sheets). Mirá el README.</div>' : "") +
'<div class="tabs">' + tabs.map(function (t) { return '<button class="chip" type="button" data-tab="' + t[0] + '" aria-pressed="' + (ui.tab === t[0]) + '">' + t[1] + "</button>"; }).join("") + "</div>";
if (ui.tab === "ventas") html += adminSales();
if (ui.tab === "ganancias") html += adminProfit();
if (ui.tab === "compras") html += adminBuy();
if (ui.tab === "nueva") html += adminNewSale();
if (ui.tab === "productos") html += adminProducts();
if (ui.tab === "pagina") html += adminPage();
if (ui.tab === "legal") html += adminLegal();
v.innerHTML = html;
}
function barsChart(rows, series, fmt) {
var W = 900, H = 240, padL = 88, padB = 28, padT = 12, n = rows.length, k = series.length;
var max = 1; rows.forEach(function (r) { r.values.forEach(function (x) { if (x > max) max = x; }); });
var ex = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / ex * 2) / 2 * ex;
var cw = (W - padL - 8) / n, bw = Math.min(30, (cw - 14) / k), y = function (x) { return padT + (H - padT - padB) * (1 - x / top); };
var g = "";
for (var t = 0; t <= 4; t++) { var val = top * t / 4, yy = y(val); g += '<line x1="' + padL + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" class="gl"/><text x="' + (padL - 8) + '" y="' + (yy + 4) + '" class="ax" text-anchor="end">' + esc(fmt(val)) + "</text>"; }
rows.forEach(function (r, i) {
var x0 = padL + cw * i + (cw - bw * k - 4 * (k - 1)) / 2;
r.values.forEach(function (x, j) { var h = Math.max(0, y(0) - y(Math.max(0, x))); g += '<rect x="' + (x0 + j * (bw + 4)) + '" y="' + (y(0) - h) + '" width="' + bw + '" height="' + h + '" rx="3" fill="' + series[j].color + '"><title>' + esc(series[j].name + ": " + fmt(x)) + "</title></rect>"; });
g += '<text x="' + (padL + cw * i + cw / 2) + '" y="' + (H - 8) + '" class="ax" text-anchor="middle">' + esc(r.label) + "</text>";
});
var legend = '<div class="legend">' + series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + "</span>"; }).join("") + "</div>";
return legend + '<div class="chart-wrap"><svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" preserveAspectRatio="xMidYMid meet">' + g + "</svg></div>";
}
function hbars(items, fmt, color) {
var max = Math.max.apply(null, items.map(function (x) { return x[1]; }).concat([1]));
return '<div class="bars">' + items.map(function (x) { return '<div class="r" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) auto"><span>' + esc(x[0]) + '</span><span class="t"><i style="width:' + Math.max(2, x[1] / max * 100) + "%;background:" + (color || "var(--blue)") + '"></i></span><span class="n">' + esc(fmt(x[1])) + "</span></div>"; }).join("") + "</div>";
}
function saleStats() {
var now = Date.now(), byMonth = {}, prod = {};
SALES.forEach(function (s) {
var d = new Date(s.date), mk = monthKey(d), age = (now - d.getTime()) / DAY;
var m = byMonth[mk] = byMonth[mk] || { rev: 0, cost: 0, n: 0, units: 0, missing: 0 };
m.n++;
(s.items || []).forEach(function (it) {
var c = it.cost > 0 ? it.cost : costOf(it.id), rev = it.qty * it.price;
m.rev += rev; m.units += it.qty; if (c > 0) m.cost += it.qty * c; else m.missing += rev;
var p = prod[it.id] = prod[it.id] || { name: it.name, units: 0, rev: 0, profit: 0, u30: 0, u60: 0, u90: 0, first: d.getTime() };
p.units += it.qty; p.rev += rev; if (c > 0) p.profit += rev - it.qty * c;
if (age <= 30) p.u30 += it.qty; if (age <= 60) p.u60 += it.qty; if (age <= 90) p.u90 += it.qty;
if (d.getTime() < p.first) p.first = d.getTime();
});
});
var first = SALES.reduce(function (a, s) { return Math.min(a, new Date(s.date).getTime()); }, now);
return { byMonth: byMonth, prod: prod, historyDays: Math.max(1, (now - first) / DAY) };
}
function adminSales() {
var now = new Date(), mk = monthKey(now), today = now.toDateString();
var st = saleStats(), m = st.byMonth[mk] || { rev: 0, n: 0, units: 0 };
var dTot = 0, all = 0;
SALES.forEach(function (s) { all += s.total; if (new Date(s.date).toDateString() === today) dTot += s.total; });
var stockVal = 0, low = [];
PRODUCTS.forEach(function (p) { stockVal += p.stock * p.price; if (p.stock > 0 && p.stock <= 2) low.push(p); });
var months = []; for (var i = 5; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push([MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2), (st.byMonth[monthKey(d)] || {}).rev || 0]); }
var top = Object.keys(st.prod).map(function (k) { return [st.prod[k].name, st.prod[k].rev]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
var noPrice = PRODUCTS.filter(function (p) { return p.stock > 0 && !p.price; }).length;
var h = '<div class="kpis"><div class="kpi"><div class="l">Ingresos este mes</div><div class="v">' + ars(m.rev) + '</div><div class="s">' + m.n + (m.n === 1 ? " venta" : " ventas") + "</div></div>" +
'<div class="kpi"><div class="l">Hoy</div><div class="v">' + ars(dTot) + "</div></div>" +
'<div class="kpi"><div class="l">Unidades vendidas este mes</div><div class="v">' + m.units + "</div></div>" +
'<div class="kpi"><div class="l">Total histórico</div><div class="v">' + ars(all) + '</div><div class="s">' + SALES.length + " ventas</div></div>" +
'<div class="kpi"><div class="l">Stock valorizado</div><div class="v">' + ars(stockVal) + '</div><div class="s">' + (noPrice ? noPrice + " con stock sin precio" : "a precio de venta") + "</div></div></div>";
h += '<div class="two"><div class="panel"><h2>Ingresos por mes</h2>' + hbars(months, ars) + "</div>" +
'<div class="panel"><h2>Lo más vendido</h2>' + (top.length ? hbars(top, ars) : '<p class="hint">Todavía no hay ventas registradas.</p>') +
(low.length ? '<h2 style="margin-top:18px">Quedan pocas unidades</h2><p class="hint" style="font-size:14px">' + low.map(function (p) { return esc(p.name) + " (" + p.stock + ")"; }).join(" · ") + "</p>" : "") + "</div></div>";
h += '<div class="panel"><h2>Ventas registradas</h2>' + (SALES.length ? '<div class="tbl-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Cliente</th><th>Teléfono</th><th>Productos</th><th>Canal</th><th style="text-align:right">Total</th><th style="text-align:right">Ganancia</th><th></th></tr></thead><tbody>' +
SALES.map(function (s) {
var d = new Date(s.date), cost = 0, ok = true;
(s.items || []).forEach(function (it) { var c = it.cost > 0 ? it.cost : costOf(it.id); if (c > 0) cost += c * it.qty; else ok = false; });
return "<tr><td>" + d.toLocaleDateString("es-AR") + "</td><td>" + esc(s.customer) + "</td><td>" + esc(s.phone) + "</td><td>" + esc((s.items || []).map(function (it) { return it.qty + "× " + it.name; }).join(", ")) + "</td><td>" + esc(s.channel) + '</td><td class="num">' + ars(s.total) + '</td><td class="num">' + (ok ? ars(s.total - cost) : '<span class="hint">falta costo</span>') + '</td><td><button class="btn ghost mini" type="button" data-delsale="' + esc(s.id) + '">Borrar</button></td></tr>';
}).join("") + "</tbody></table></div>" : '<p class="hint" style="font-size:14px">Cuando confirmes un pedido, cargalo en "Registrar venta": se suma a tus ingresos y se descuenta del stock.</p>') + "</div>";
return h;
}
function adminProfit() {
var now = new Date(), st = saleStats(), mk = monthKey(now), m = st.byMonth[mk] || { rev: 0, cost: 0, missing: 0 };
var profit = m.rev - m.missing - m.cost, base = m.rev - m.missing;
var withCost = PRODUCTS.filter(function (p) { return costOf(p.id) > 0 && p.price > 0; });
var avgMargin = withCost.length ? withCost.reduce(function (a, p) { return a + (p.price - costOf(p.id)) / p.price; }, 0) / withCost.length * 100 : 0;
var invested = PRODUCTS.reduce(function (a, p) { return a + p.stock * costOf(p.id); }, 0);
var potential = PRODUCTS.reduce(function (a, p) { return a + (costOf(p.id) > 0 && p.price > 0 ? p.stock * (p.price - costOf(p.id)) : 0); }, 0);
var missingCost = PRODUCTS.filter(function (p) { return !costOf(p.id) && (p.stock > 0 || p.price > 0); }).length;
var h = (missingCost ? '<div class="banner">Faltan cargar ' + missingCost + " costos. Cargalos en <b>Productos y stock</b> (columna Costo) para que los números sean completos.</div>" : "") +
'<div class="kpis"><div class="kpi"><div class="l">Ganancia este mes</div><div class="v">' + ars(profit) + '</div><div class="s">' + (base > 0 ? "margen " + pct(profit / base * 100) : "sin ventas con costo") + "</div></div>" +
'<div class="kpi"><div class="l">Costo de lo vendido (mes)</div><div class="v">' + ars(m.cost) + "</div>" + (m.missing ? '<div class="s">' + ars(m.missing) + " vendidos sin costo cargado</div>" : "") + "</div>" +
'<div class="kpi"><div class="l">Margen promedio del catálogo</div><div class="v">' + (withCost.length ? pct(avgMargin) : "—") + '</div><div class="s">' + withCost.length + " productos con costo y precio</div></div>" +
'<div class="kpi"><div class="l">Plata invertida en stock</div><div class="v">' + ars(invested) + '</div><div class="s">a precio de costo</div></div>' +
'<div class="kpi"><div class="l">Ganancia si vendés todo el stock</div><div class="v">' + ars(potential) + "</div></div></div>";
var months = []; for (var i = 5; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1), x = st.byMonth[monthKey(d)] || { rev: 0, cost: 0, missing: 0 }; months.push({ label: MONTHS[d.getMonth()], values: [x.rev, Math.max(0, x.rev - x.missing - x.cost)] }); }
h += '<div class="panel"><h2>Ingresos y ganancia por mes</h2>' + (SALES.length ? barsChart(months, [{ name: "Ingresos", color: "var(--blue)" }, { name: "Ganancia", color: "var(--green)" }], function (v) { return v >= 1e6 ? "$ " + (Math.round(v / 1e5) / 10).toString().replace(".", ",") + " M" : v >= 1000 ? "$ " + Math.round(v / 1000) + " mil" : ars(v); }) : '<p class="hint" style="font-size:14px">Aparece cuando registres ventas.</p>') + "</div>";
var marg = withCost.map(function (p) { return [p.name, (p.price - costOf(p.id)) / p.price * 100, p]; }).sort(function (a, b) { return b[1] - a[1]; });
var prof = Object.keys(st.prod).map(function (k) { return [st.prod[k].name, st.prod[k].profit]; }).filter(function (x) { return x[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
h += '<div class="two"><div class="panel"><h2>Margen por producto</h2>' + (marg.length ? hbars(marg.slice(0, 10).map(function (x) { return [x[0], x[1]]; }), pct, "var(--green)") + (marg.length > 10 ? '<p class="hint">Los 10 con más margen. La tabla de abajo tiene todos.</p>' : "") : '<p class="hint" style="font-size:14px">Cargá costo y precio para ver el margen.</p>') + "</div>" +
'<div class="panel"><h2>Lo que más ganancia dejó</h2>' + (prof.length ? hbars(prof, ars, "var(--green)") : '<p class="hint" style="font-size:14px">Aparece cuando registres ventas de productos con costo.</p>') + "</div></div>";
h += '<div class="panel"><h2>Precio, costo y margen</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>Producto</th><th style="text-align:right">Costo</th><th style="text-align:right">Precio</th><th style="text-align:right">Ganás por unidad</th><th style="text-align:right">Margen</th><th style="text-align:right">Vendidos</th><th style="text-align:right">Ganancia total</th></tr></thead><tbody>' +
PRODUCTS.slice().sort(function (a, b) { return (st.prod[b.id] ? st.prod[b.id].profit : 0) - (st.prod[a.id] ? st.prod[a.id].profit : 0) || a.name.localeCompare(b.name); }).map(function (p) {
var c = costOf(p.id), sp = st.prod[p.id], u = p.price && c ? p.price - c : null;
return '<tr><td class="nm">' + esc(p.name) + "<small>" + esc(p.cat) + '</small></td><td class="num">' + (c ? ars(c) : '<span class="hint">—</span>') + '</td><td class="num">' + (p.price ? ars(p.price) : '<span class="hint">—</span>') + '</td><td class="num">' + (u === null ? "—" : '<span class="' + (u < 0 ? "neg" : "") + '">' + ars(u) + "</span>") + '</td><td class="num">' + (u === null ? "—" : pct(u / p.price * 100)) + '</td><td class="num">' + (sp ? sp.units : 0) + '</td><td class="num">' + (sp && sp.profit ? ars(sp.profit) : "—") + "</td></tr>";
}).join("") + "</tbody></table></div></div>";
return h;
}
function buyPlan() {
var st = saleStats(), lead = PRIV.plan.leadDays || 21, cover = PRIV.plan.coverDays || 45, win = Math.max(30, Math.min(60, st.historyDays));
return PRODUCTS.filter(function (p) { return !p.hidden; }).map(function (p) {
var sp = st.prod[p.id] || { u30: 0, u60: 0, u90: 0, units: 0 }, ask = PRIV.interest[p.id] || 0;
var rate = sp.u60 / win, need = Math.ceil(rate * (lead + cover)), buy = 0, why = "", prio = 0;
var days = rate > 0 ? Math.floor(p.stock / rate) : Infinity;
if (rate > 0) {
buy = Math.max(0, need - p.stock);
why = "Vende ~" + (Math.round(rate * 7 * 10) / 10).toString().replace(".", ",") + " por semana. " + (p.stock ? "El stock alcanza para ~" + days + " días." : "Está sin stock.");
prio = days <= lead ? 3 : days <= lead + cover ? 2 : 1;
} else if (ask > 0) {
buy = Math.max(0, Math.min(3, Math.ceil(ask / 3)) - p.stock);
why = "Lo consultaron " + ask + (ask === 1 ? " vez" : " veces") + " y todavía no hay ventas registradas." + (buy ? " Probá con pocas unidades." : "");
prio = buy ? (p.stock ? 1 : 2) : 0;
} else { why = "Sin ventas ni consultas todavía."; }
if (ask > 0 && rate > 0) why += " Además lo consultaron " + ask + (ask === 1 ? " vez." : " veces.");
return { p: p, sp: sp, ask: ask, rate: rate, buy: buy, why: why, prio: prio, days: days, cost: costOf(p.id) };
}).sort(function (a, b) { return b.prio - a.prio || b.buy - a.buy || b.ask - a.ask || a.p.name.localeCompare(b.p.name); });
}
function adminBuy() {
var plan = buyPlan(), toBuy = plan.filter(function (x) { return x.buy > 0; });
var invest = toBuy.reduce(function (a, x) { return a + x.buy * x.cost; }, 0), noCost = toBuy.filter(function (x) { return !x.cost; }).length;
var asks = Object.keys(PRIV.interest).map(function (k) { var p = byId(k); return p ? [p.name, PRIV.interest[k]] : null; }).filter(Boolean).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
var lbl = ["", "Puede esperar", "Pedir pronto", "Urgente"], cls = ["", "s-ok", "s-low", "s-out"];
var h = '<div class="panel"><h2>Cómo calcula</h2><p class="hint" style="font-size:14px;margin-top:0">Mira cuánto se vendió de cada producto en los últimos 60 días y calcula cuántas unidades necesitás para cubrir el tiempo que tarda en llegar el pedido más los días de stock que querés tener. A eso le resta lo que ya tenés. Las consultas de "Consultar" y "Avisame" en la tienda también suman. Con pocas ventas registradas, tomalo como una guía.</p>' +
'<form class="form" id="planForm" novalidate><div class="two"><label for="plLead">¿Cuántos días tarda en llegarte un pedido?<input id="plLead" type="number" min="1" max="365" value="' + (PRIV.plan.leadDays || 21) + '"></label><label for="plCover">¿Para cuántos días querés tener stock?<input id="plCover" type="number" min="7" max="365" value="' + (PRIV.plan.coverDays || 45) + '"></label></div><button class="btn sec" type="submit" style="align-self:flex-start">Recalcular y guardar</button><span class="status" id="planStatus" role="status"></span></form></div>';
h += '<div class="kpis"><div class="kpi"><div class="l">Productos para reponer</div><div class="v">' + toBuy.length + "</div></div>" +
'<div class="kpi"><div class="l">Unidades sugeridas</div><div class="v">' + toBuy.reduce(function (a, x) { return a + x.buy; }, 0) + "</div></div>" +
'<div class="kpi"><div class="l">Inversión estimada</div><div class="v">' + ars(invest) + '</div><div class="s">' + (noCost ? noCost + " sin costo cargado" : "a precio de costo") + "</div></div>" +
'<div class="kpi"><div class="l">Consultas de clientes</div><div class="v">' + Object.keys(PRIV.interest).reduce(function (a, k) { return a + PRIV.interest[k]; }, 0) + '</div><div class="s">clics en Consultar / Avisame</div></div></div>';
h += '<div class="panel"><h2>Qué comprar y cuánto</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>Producto</th><th></th><th style="text-align:right">Stock</th><th style="text-align:right">Vendidos 30 / 90 días</th><th style="text-align:right">Consultas</th><th style="text-align:right">Comprar</th><th style="text-align:right">Inversión</th><th>Por qué</th></tr></thead><tbody>' +
plan.map(function (x) {
return '<tr><td class="nm">' + esc(x.p.name) + "<small>" + esc(x.p.cat) + "</small></td><td>" + (x.prio ? '<span class="stock ' + cls[x.prio] + '" style="white-space:nowrap">' + lbl[x.prio] + "</span>" : "") + '</td><td class="num">' + x.p.stock + '</td><td class="num">' + x.sp.u30 + " / " + x.sp.u90 + '</td><td class="num">' + (x.ask || "—") + '</td><td class="num"><b>' + (x.buy || "—") + '</b></td><td class="num">' + (x.buy && x.cost ? ars(x.buy * x.cost) : "—") + '</td><td style="min-width:220px;font-size:13px;color:var(--muted)">' + esc(x.why) + "</td></tr>";
}).join("") + "</tbody></table></div></div>";
h += '<div class="panel"><h2>Lo más consultado</h2>' + (asks.length ? hbars(asks, function (v) { return v + (v === 1 ? " consulta" : " consultas"); }, "var(--sol)") : '<p class="hint" style="font-size:14px">Cuando la gente toque "Consultar" o "Avisame" en un producto, aparece acá.</p>') + "</div>";
return h;
}
function adminNewSale() {
var opts = PRODUCTS.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + " · " + (p.price ? ars(p.price) : "sin precio") + " · stock " + p.stock + "</option>"; }).join("");
var t = new Date(), iso = t.getFullYear() + "-" + ("0" + (t.getMonth() + 1)).slice(-2) + "-" + ("0" + t.getDate()).slice(-2);
return '<div class="panel"><h2>Registrar una venta confirmada</h2><form class="form" id="saleForm" novalidate>' +
'<div class="two"><label for="sCust">Cliente<input id="sCust" required></label><label for="sPhone">Teléfono<input id="sPhone" type="tel"></label></div>' +
'<div class="two"><label for="sChan">Canal<select id="sChan"><option>Instagram</option><option>Mail</option><option>WhatsApp</option><option>En persona</option></select></label><label for="sDate">Fecha<input id="sDate" type="date" value="' + iso + '"></label></div>' +
'<div class="lbl">Productos <span class="hint">(si cobraste otro precio, ponelo; si no, se usa el de la tienda)</span></div><div class="sale-lines" id="saleLines">' + saleLine(opts, false) + "</div>" +
'<button class="btn sec mini" type="button" id="addLine" style="align-self:flex-start">+ Otro producto</button>' +
'<label class="check" for="sStock"><input type="checkbox" id="sStock" checked><span>Descontar del stock y actualizar la tienda</span></label>' +
'<button class="btn block" type="submit">Guardar venta</button><span class="status" id="saleStatus" role="status"></span></form></div>';
}
function saleLine(opts, removable) {
return '<div class="sale-line" style="grid-template-columns:minmax(0,1fr) 70px 110px auto"><select class="sp" aria-label="Producto">' + opts + '</select><input class="sq" type="number" min="1" value="1" aria-label="Cantidad"><input class="spr" type="number" min="0" step="500" placeholder="Precio" aria-label="Precio unitario"><span>' +
(removable ? '<button class="btn ghost mini" type="button" data-rmline="1">Quitar</button>' : "") + "</span></div>";
}
function photosCell(p) {
var imgs = p.imgs && p.imgs.length ? p.imgs : (p.img ? [p.img] : []);
return '<div class="ph-row">' + imgs.map(function (u, i) {
return '<span class="ph' + (i === 0 ? " main" : "") + '"><img src="' + esc(u) + '" alt="">' +
'<span class="ph-act">' + (i > 0 ? '<button type="button" data-phmain="' + p.id + '" data-i="' + i + '" title="Usar como principal" aria-label="Usar como foto principal">★</button>' : "") + '<button type="button" data-phdel="' + p.id + '" data-i="' + i + '" title="Quitar foto" aria-label="Quitar foto">×</button></span></span>';
}).join("") + (imgs.length < 8 ? '<label class="ph add" title="Agregar foto">+<input type="file" accept="image/*" multiple data-photo="' + p.id + '" hidden></label>' : "") + "</div>";
}
function adminProducts() {
var q = norm(ui.pq);
var list = PRODUCTS.filter(function (p) { return !q || norm(p.name + " " + p.cat + " " + p.brand).indexOf(q) > -1; });
return '<div class="panel"><h2>Productos y stock</h2><p class="hint" style="font-size:14px;margin-top:0">Precio en 0 = la tienda muestra "Consultá el precio". Stock en 0 = "Sin stock por ahora" con botón Avisame. El <b>costo</b> es privado: solo se ve en este panel. Fotos: hasta 8 por producto, la de la ★ es la principal.</p>' +
'<div class="prod-filter"><input id="pq" type="search" placeholder="Filtrar productos…" value="' + esc(ui.pq) + '"></div>' +
'<div class="tbl-wrap"><table class="t"><thead><tr><th>Fotos</th><th>Producto</th><th>Costo</th><th>Precio</th><th>Margen</th><th>Stock</th><th>Nivel</th><th title="1 = más lento · 5 = más rápido">Velocidad</th><th title="1 = menos estable · 5 = más estable">Control</th><th>Nuevo</th><th>Oculto</th></tr></thead><tbody>' +
list.map(function (p) {
var c = costOf(p.id);
return "<tr><td>" + photosCell(p) + "</td>" +
'<td class="nm">' + esc(p.name) + "<small>" + esc(p.brand + " · " + p.cat) + "</small></td>" +
'<td><input type="number" min="0" step="500" value="' + (c || "") + '" placeholder="—" data-cost="' + p.id + '" style="width:110px" aria-label="Costo de ' + esc(p.name) + '"></td>' +
'<td><input type="number" min="0" step="500" value="' + p.price + '" data-price="' + p.id + '" style="width:110px" aria-label="Precio de ' + esc(p.name) + '"></td>' +
'<td class="num" data-margin="' + p.id + '">' + marginTxt(p.price, c) + "</td>" +
'<td><input type="number" min="0" value="' + p.stock + '" data-stock="' + p.id + '" style="width:72px" aria-label="Stock de ' + esc(p.name) + '"></td>' +
'<td>' + levelSel('data-level="' + p.id + '"', p.level, p.name) + "</td>" +
'<td>' + rateSel('data-speed="' + p.id + '"', p.speed, "Velocidad de " + p.name) + "</td>" +
'<td>' + rateSel('data-control="' + p.id + '"', p.control, "Control de " + p.name) + "</td>" +
'<td><input type="checkbox" data-new="' + p.id + '"' + (p.badge === "nuevo" ? " checked" : "") + ' aria-label="Marcar como nuevo"></td>' +
'<td><input type="checkbox" data-hide="' + p.id + '"' + (p.hidden ? " checked" : "") + ' aria-label="Ocultar de la tienda"></td></tr>';
}).join("") + '</tbody></table></div><div style="display:flex;gap:12px;align-items:center;margin-top:14px;flex-wrap:wrap"><button class="btn" type="button" id="saveProducts">Guardar y publicar</button><span class="status" id="prodStatus" role="status"></span></div></div>' +
'<div class="panel"><h2>Agregar producto</h2><form class="form" id="newProdForm" novalidate><div class="two"><label for="npName">Nombre<input id="npName" required placeholder="Ej.: Tengyun V4 Pro"></label><label for="npBrand">Marca<input id="npBrand" placeholder="GAN, MoYu, QiYi…"></label></div>' +
'<div class="two"><label for="npCat">Categoría<select id="npCat">' + CATEGORIES.map(function (c) { return "<option>" + c + "</option>"; }).join("") + '</select></label><label for="npStock">Stock<input id="npStock" type="number" min="0" value="1"></label></div>' +
'<div class="two"><label for="npCost">Costo (privado)<input id="npCost" type="number" min="0" step="500" placeholder="—"></label><label for="npPrice">Precio de venta<input id="npPrice" type="number" min="0" step="500" value="0"></label></div>' +
'<div class="two three"><label for="npLevel">Nivel' + levelSel('id="npLevel"', "", "nuevo producto") + '</label><label for="npSpeed">Velocidad (1 a 5)' + rateSel('id="npSpeed"', 0, "Velocidad") + '</label><label for="npControl">Control (1 a 5)' + rateSel('id="npControl"', 0, "Control") + "</label></div>" +
'<label for="npDesc">Descripción corta<input id="npDesc"></label>' +
'<button class="btn sec" type="submit" style="align-self:flex-start">Agregar a la lista</button><span class="status" id="npStatus" role="status"></span></form></div>';
}
function marginTxt(price, cost) {
if (!price || !cost) return '<span class="hint">—</span>';
var u = price - cost; return '<span class="' + (u < 0 ? "neg" : "") + '">' + ars(u) + "</span><small>" + pct(u / price * 100) + "</small>";
}
function adminLegal() {
return '<div class="panel"><h2>Datos legales del vendedor</h2><p class="hint" style="font-size:14px;margin-top:0">No se muestran en el pie de página: se usan dentro de los Términos y la Política de privacidad.</p><form class="form" id="legalForm">' +
'<label for="lTit">Nombre y apellido o razón social<input id="lTit" value="' + esc(S.titular) + '"></label>' +
'<div class="two"><label for="lCuit">CUIT / CUIL<input id="lCuit" value="' + esc(S.cuit) + '" placeholder="20-12345678-9"></label><label for="lMail">Mail de contacto<input id="lMail" type="email" value="' + esc(S.email) + '"></label></div>' +
'<label for="lDom">Domicilio<input id="lDom" value="' + esc(S.domicilio) + '" placeholder="Calle, número, localidad"></label>' +
'<label class="check" for="lNet"><input type="checkbox" id="lNet"' + (S.showNet ? " checked" : "") + '><span>Mostrar "precio sin impuestos nacionales" (Régimen de Transparencia Fiscal al Consumidor). Consultá con tu contador si te corresponde.</span></label>' +
'<label class="check" for="lDemo"><input type="checkbox" id="lDemo"' + (S.demo ? " checked" : "") + '><span>Mostrar el aviso "Algunos precios se confirman por mensaje" al pie</span></label>' +
'<button class="btn" type="submit" style="align-self:flex-start">Guardar y publicar</button><span class="status" id="legalStatus" role="status"></span></form></div>';
}
function resizeImage(file, size) {
return new Promise(function (res, rej) {
var r = new FileReader(); r.onerror = rej;
r.onload = function () { var im = new Image(); im.onerror = rej; im.onload = function () {
var sc = Math.min(1, size / Math.max(im.width, im.height)), w = Math.round(im.width * sc), h = Math.round(im.height * sc), side = Math.max(w, h);
var c = document.createElement("canvas"); c.width = c.height = side; var g = c.getContext("2d");
g.fillStyle = "#fff"; g.fillRect(0, 0, side, side); g.drawImage(im, (side - w) / 2, (side - h) / 2, w, h);
res(c.toDataURL("image/jpeg", 0.85)); }; im.src = r.result; };
r.readAsDataURL(file);
});
}
function status(id, txt, cls) { var el = $(id); if (el) { el.textContent = txt; el.className = "status" + (cls ? " " + cls : ""); } }
function guard(id) {
if (api.preview) { status(id, "Vista previa: en Vercel esto se guarda.", "bad"); return false; }
if (!api.db) { status(id, "Falta conectar dónde se guardan los datos (README).", "bad"); return false; }
return true;
}
var LEVELS = ["Principiante", "Todos los niveles", "Intermedio", "Avanzado"];
function levelSel(attr, val, name) {
var o = ['<option value="">—</option>'].concat(LEVELS.concat(val && LEVELS.indexOf(val) < 0 ? [val] : []).map(function (l) { return '<option' + (l === val ? " selected" : "") + ">" + esc(l) + "</option>"; }));
return "<select " + attr + ' class="mini-sel" aria-label="Nivel de ' + esc(name) + '">' + o.join("") + "</select>";
}
function rateSel(attr, val, label) {
var o = ['<option value="0">—</option>']; for (var i = 1; i <= 5; i++) o.push('<option value="' + i + '"' + (Number(val) === i ? " selected" : "") + ">" + i + "</option>");
return "<select " + attr + ' class="mini-sel" aria-label="' + esc(label) + '">' + o.join("") + "</select>";
}
function collectProducts() {
document.querySelectorAll("[data-price]").forEach(function (i) { byId(i.dataset.price).price = Math.max(0, Number(i.value) || 0); });
document.querySelectorAll("[data-stock]").forEach(function (i) { byId(i.dataset.stock).stock = Math.max(0, parseInt(i.value, 10) || 0); });
document.querySelectorAll("[data-new]").forEach(function (i) { byId(i.dataset.new).badge = i.checked ? "nuevo" : ""; });
document.querySelectorAll("[data-hide]").forEach(function (i) { byId(i.dataset.hide).hidden = i.checked; });
document.querySelectorAll("[data-level]").forEach(function (i) { byId(i.dataset.level).level = i.value; });
document.querySelectorAll("[data-speed]").forEach(function (i) { byId(i.dataset.speed).speed = Number(i.value) || 0; });
document.querySelectorAll("[data-control]").forEach(function (i) { byId(i.dataset.control).control = Number(i.value) || 0; });
document.querySelectorAll("[data-cost]").forEach(function (i) { var v = Math.max(0, Number(i.value) || 0); if (v) PRIV.costs[i.dataset.cost] = v; else delete PRIV.costs[i.dataset.cost]; });
}
function saveProducts() {
collectProducts();
if (api.preview || !api.db) { render(); guard("prodStatus"); return; }
status("prodStatus", "Publicando…");
Promise.all([call("PUT", "/api/products", { products: PRODUCTS }), call("PUT", "/api/private", { costs: PRIV.costs })])
.then(function (r) { applyCatalog(r[0]); PRIV = Object.assign(PRIV, r[1]); render(); status("prodStatus", "Listo, la tienda ya está actualizada. Los costos quedaron guardados en privado.", "ok"); },
function (e) { status("prodStatus", "No se pudo guardar: " + e.message, "bad"); });
}
function savePlan() {
var lead = Math.max(1, parseInt($("plLead").value, 10) || 21), cover = Math.max(7, parseInt($("plCover").value, 10) || 45);
PRIV.plan = { leadDays: lead, coverDays: cover }; renderAdmin();
if (api.preview || !api.db) { guard("planStatus"); return; }
status("planStatus", "Guardando…");
call("PUT", "/api/private", { plan: PRIV.plan }).then(function (j) { PRIV = Object.assign(PRIV, j); status("planStatus", "Guardado.", "ok"); }, function (e) { status("planStatus", "No se pudo guardar: " + e.message, "bad"); });
}
function saveSale() {
var cust = $("sCust").value.trim(); if (!cust) { status("saleStatus", "Poné el nombre del cliente.", "bad"); return; }
var items = [].map.call(document.querySelectorAll("#saleLines .sale-line"), function (l) {
var p = byId(l.querySelector(".sp").value), pr = Number(l.querySelector(".spr").value);
return { id: p.id, name: p.name, price: pr > 0 ? pr : p.price, qty: Math.max(1, parseInt(l.querySelector(".sq").value, 10) || 1), cost: costOf(p.id) };
});
if (items.some(function (it) { return !it.price; })) { status("saleStatus", "Poné el precio cobrado en los productos que no tienen precio.", "bad"); return; }
if (!guard("saleStatus")) return;
var dv = $("sDate").value;
status("saleStatus", "Guardando…");
call("POST", "/api/sales", { date: dv ? new Date(dv + "T12:00:00").toISOString() : new Date().toISOString(), customer: cust, phone: $("sPhone").value.trim(), channel: $("sChan").value, items: items, discountStock: $("sStock").checked })
.then(function (j) { SALES.unshift(j.sale); if (j.catalog) applyCatalog(j.catalog); render(); status("saleStatus", "Venta guardada: " + ars(j.sale.total) + ".", "ok"); setTimeout(function () { ui.tab = "ventas"; renderAdmin(); }, 900); },
function (e) { status("saleStatus", "No se pudo guardar: " + e.message, "bad"); });
}
function deleteSale(id, el) {
if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.textContent = "¿Seguro?"; setTimeout(function () { if (el.isConnected) { el.dataset.confirm = ""; el.textContent = "Borrar"; } }, 4000); return; }
if (api.preview) return;
call("DELETE", "/api/sales?id=" + encodeURIComponent(id)).then(function () { SALES = SALES.filter(function (s) { return s.id !== id; }); renderAdmin(); }, function () { el.textContent = "Error"; });
}
function saveLegal() {
var next = Object.assign({}, S, { titular: $("lTit").value.trim(), cuit: $("lCuit").value.trim(), email: $("lMail").value.trim() || S.email, domicilio: $("lDom").value.trim(), showNet: $("lNet").checked, demo: $("lDemo").checked });
if (!guard("legalStatus")) return;
status("legalStatus", "Publicando…");
call("PUT", "/api/products", { settings: next }).then(function (c) { applyCatalog(c); render(); status("legalStatus", "Guardado.", "ok"); }, function (e) { status("legalStatus", "No se pudo guardar: " + e.message, "bad"); });
}
function addProduct() {
var name = $("npName").value.trim(); if (!name) { status("npStatus", "Poné un nombre.", "bad"); return; }
collectProducts();
var id = norm(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "producto";
while (byId(id)) id += "-2";
PRODUCTS.push({ id: id, cat: $("npCat").value, name: name, brand: $("npBrand").value.trim(), price: Math.max(0, Number($("npPrice").value) || 0), stock: Math.max(0, parseInt($("npStock").value, 10) || 0), badge: "nuevo", img: "", imgs: [], level: $("npLevel").value, speed: Number($("npSpeed").value) || 0, control: Number($("npControl").value) || 0, headline: "", desc: $("npDesc").value.trim(), features: [], why: "" });
var c = Math.max(0, Number($("npCost").value) || 0); if (c) PRIV.costs[id] = c;
renderAdmin(); status("prodStatus", "Producto agregado. Subile fotos y tocá Guardar y publicar.");
}
function setImgs(p, imgs) { p.imgs = imgs; p.img = imgs[0] || ""; }
function uploadPhotos(p, files) {
if (!guard("prodStatus")) return;
var list = [].slice.call(files, 0, 8 - (p.imgs || []).length), done = 0;
status("prodStatus", "Subiendo " + list.length + (list.length === 1 ? " foto…" : " fotos…"));
list.reduce(function (chain, f) {
return chain.then(function () { return resizeImage(f, 900); }).then(function (url) { return call("POST", "/api/photo", { id: p.id, dataUrl: url }); })
.then(function (j) { collectProducts(); setImgs(p, (p.imgs || []).concat([j.url])); done++; });
}, Promise.resolve()).then(function () { renderAdmin(); status("prodStatus", (done === 1 ? "Foto lista." : done + " fotos listas.") + " Tocá Guardar y publicar."); },
function (err) { renderAdmin(); status("prodStatus", "No se pudo subir la foto: " + (err && err.message || "probá con un JPG o PNG"), "bad"); });
}
function render() { renderFilters(); renderGrid(); renderCart(); renderPage(); renderFooter(); if (ui.admin) renderAdmin(); }
function openCart(v) { $("cart").classList.toggle("open", v); $("scrim").classList.toggle("open", v); }
function setAdmin(on) {
if (on && $("pvNote") && !$("pvNote").hidden) { S.page = ui.pagePreview; renderPage(); $("pvNote").hidden = true; }
ui.admin = on; $("adminBtn").setAttribute("aria-pressed", on); $("adminBtn").textContent = on ? "Ver tienda" : "Panel";
$("shopView").hidden = on; $("adminView").hidden = !on; renderCart(); if (on) renderAdmin(); window.scrollTo(0, 0);
}
document.addEventListener("click", function (e) {
var el = e.target.closest("button, a"); if (!el) return;
var d = el.dataset;
if (d.f) { ui.filter = d.f; renderFilters(); renderGrid(); return; }
if (d.detail) { productDetail(d.detail); return; }
if (d.ask) { askAbout(d.ask); return; }
if (d.add) { var id = d.add; if (ui.cart[id]) delete ui.cart[id]; else ui.cart[id] = 1; saveCart(); renderGrid(); renderCart(); if (d.keep) productDetail(id); return; }
if (d.q) { var p = byId(d.q), n = (ui.cart[d.q] || 0) + Number(d.d); if (n <= 0) delete ui.cart[d.q]; else ui.cart[d.q] = Math.min(n, p.stock); saveCart(); renderGrid(); renderCart(); return; }
if (d.ship) { ui.ship = d.ship; renderCart(); return; }
if (d.open) { legal(d.open); return; }
if (d.tab) { if (ui.tab === "productos") collectProducts(); if (ui.tab === "pagina") readPageForm(); ui.tab = d.tab; renderAdmin(); return; }
if (d.delsale) { deleteSale(d.delsale, el); return; }
if (d.rmline) { el.closest(".sale-line").remove(); return; }
if (d.grdel) { pageAction(function (x) { x.chooser.groups.splice(Number(d.grdel), 1); }); return; }
if (d.grrm) { pageAction(function (x) { x.chooser.groups[Number(d.grrm)].ids.splice(Number(d.j), 1); }); return; }
if (d.grup) { pageAction(function (x) { var a = x.chooser.groups[Number(d.grup)].ids, j = Number(d.j); a.splice(j - 1, 0, a.splice(j, 1)[0]); }); return; }
if (d.tipdel) { pageAction(function (x) { x.tips.items.splice(Number(d.tipdel), 1); }); return; }
if (d.gnav || d.gthumb) { var g = el.closest(".gal"); galShow(g, d.gthumb ? Number(d.gthumb) : Number(g.dataset.k || 0) + Number(d.gnav)); return; }
if (d.phdel || d.phmain) {
collectProducts(); var pp = byId(d.phdel || d.phmain), im = pics(pp).slice(), k = Number(d.i);
if (d.phdel) im.splice(k, 1); else im.unshift(im.splice(k, 1)[0]);
setImgs(pp, im); renderAdmin(); status("prodStatus", "Tocá Guardar y publicar para que se vea en la tienda."); return;
}
switch (el.id) {
case "toOrder": ui.step = "order"; renderCart(); return;
case "back": ui.step = "cart"; renderCart(); return;
case "sendMail": if (!orderReady()) { e.preventDefault(); return; } $("toast").textContent = "Se abrió tu correo con el pedido. Si no se abrió, copialo y mandalo a " + S.email + "."; return;
case "sendIG":
var go = function (ok) { $("toast").textContent = ok ? "Pedido copiado. Pegalo en el chat de Instagram y enviá." : "Copiá el pedido (ya está seleccionado) y pegalo en el chat."; if (!ok) selectMsg(); };
copyText(orderText(), function () { go(true); }, function () { go(false); }); openIG(); return;
case "topCart": case "fab": if (ui.admin) setAdmin(false); if (matchMedia("(max-width: 880px)").matches) openCart(true); else $("cart").scrollIntoView({ behavior: "smooth", block: "start" }); return;
case "closeCart": openCart(false); return;
case "dlgX": $("dlg").close(); return;
case "newsBtn": legal("news"); return;
case "teamBtn": loginDialog(); return;
case "logoutBtn": logout(false); return;
case "adminBtn": setAdmin(!ui.admin); return;
case "addLine": var opts = $("saleLines").querySelector(".sp").innerHTML; $("saleLines").insertAdjacentHTML("beforeend", saleLine(opts, true)); return;
case "saveProducts": saveProducts(); return;
case "savePage": savePage(); return;
case "grAdd": pageAction(function (x) { x.chooser.groups.push({ t: "", h: "Nuevo nivel", d: "", ids: [] }); }); return;
case "tipAdd": pageAction(function (x) { x.tips.items.push({ tag: "", h: "Nuevo tip", p: "" }); }); return;
case "pgReset": ui.pageDraft = clone(DEFAULT_PAGE); renderAdmin(); status("pageStatus", "Volviste a los textos originales. Tocá Guardar y publicar para aplicarlos."); return;
case "viewPage": ui.pagePreview = S.page; S.page = clone(readPageForm()); renderPage(); setAdmin(false); $("pvNote").hidden = false; return;
case "pvBack": S.page = ui.pagePreview; renderPage(); $("pvNote").hidden = true; setAdmin(true); return;
}
});
var qTimer;
document.addEventListener("input", function (e) {
var t = e.target;
if (t.id === "q") { clearTimeout(qTimer); qTimer = setTimeout(function () { ui.q = t.value.trim(); renderGrid(); }, 120); }
if (t.id === "pq") { collectProducts(); ui.pq = t.value; clearTimeout(qTimer); qTimer = setTimeout(function () { renderAdmin(); var x = $("pq"); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }, 200); }
if (t.dataset && (t.dataset.cost || t.dataset.price)) { var id = t.dataset.cost || t.dataset.price, cell = document.querySelector('[data-margin="' + id + '"]'); if (cell) { var pc = document.querySelector('[data-price="' + id + '"]'), cc = document.querySelector('[data-cost="' + id + '"]'); cell.innerHTML = marginTxt(Number(pc.value) || 0, Number(cc.value) || 0); } }
if (t.id === "oName") { ui.name = t.value; refreshOrder(); }
if (t.id === "oPhone") { ui.phone = t.value; refreshOrder(); }
if (t.id === "oCity") { ui.city = t.value; refreshOrder(); }
});
document.addEventListener("change", function (e) {
var t = e.target;
if (t.id === "oAgree") { ui.agree = t.checked; refreshOrder(); }
if (t.dataset && t.dataset.gradd && t.value) { var gi = Number(t.dataset.gradd), pid = t.value; pageAction(function (x) { x.chooser.groups[gi].ids.push(pid); }); return; }
if (t.dataset && t.dataset.photo && t.files.length) uploadPhotos(byId(t.dataset.photo), t.files);
});
$("dlg").addEventListener("click", function (e) { if (e.target === $("dlg")) $("dlg").close(); });
$("dlg").addEventListener("keydown", function (e) { var g = $("dlg").querySelector(".gal"); if (!g || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return; galShow(g, Number(g.dataset.k || 0) + (e.key === "ArrowRight" ? 1 : -1)); });
var tx = null;
$("dlg").addEventListener("touchstart", function (e) { if (e.target.closest(".gal-main")) tx = e.touches[0].clientX; }, { passive: true });
$("dlg").addEventListener("touchend", function (e) { if (tx === null) return; var dx = e.changedTouches[0].clientX - tx, g = $("dlg").querySelector(".gal"); tx = null; if (g && Math.abs(dx) > 40) galShow(g, Number(g.dataset.k || 0) + (dx < 0 ? 1 : -1)); });
$("scrim").addEventListener("click", function () { openCart(false); });
document.addEventListener("submit", function (e) {
e.preventDefault();
var id = e.target.id;
if (id === "loginForm") doLogin();
if (id === "saleForm") saveSale();
if (id === "legalForm") saveLegal();
if (id === "newProdForm") addProduct();
if (id === "planForm") savePlan();
if (id === "arrForm") {
var f = ["aName", "aContact", "aOrder", "aProd"].map(function (k) { return $(k).value.trim(); });
if (f.some(function (v) { return !v; })) { $("aErr").textContent = "Completá todos los campos."; return; }
$("aErr").textContent = "";
var code = "ARR-" + Date.now().toString(36).toUpperCase().slice(-6);
var txt = "Solicitud de arrepentimiento " + code + "\nNombre: " + f[0] + "\nContacto: " + f[1] + "\nPedido/fecha: " + f[2] + "\nProducto: " + f[3];
$("aOut").innerHTML = '<div class="note" style="margin-top:8px">Tu código de solicitud es <b class="mono-sel">' + code + '</b>. Envianos la solicitud para iniciar la devolución:</div><div class="msg" style="margin-top:8px">' + esc(txt) + '</div><div class="send-row" style="margin-top:8px"><a class="btn" href="mailto:' + esc(S.email) + "?subject=" + encodeURIComponent("Arrepentimiento " + code) + "&body=" + encodeURIComponent(txt) + '">Enviar por mail</a><a class="btn sec" href="' + igLink() + '" target="_blank" rel="noopener">Abrir Instagram</a></div>';
}
});
renderCart();
loadCatalog().then(function () { render(); checkSession(); }, function () { $("grid").innerHTML = '<div class="empty"><b>No pudimos cargar el catálogo</b>Probá recargar la página o escribinos por Instagram a @reycubearg.</div>'; });
})();
