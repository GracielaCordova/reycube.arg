/* ReyCube.Arg — tienda + panel del equipo.
   La tienda lee el catálogo de /api/products. El panel (Acceso equipo) usa /api/login,
   /api/products (PUT), /api/sales y /api/photo. Si la página se abre sin servidor
   (vista previa estática), usa data/catalog.json y el panel funciona en "modo vista previa"
   sin guardar nada. */
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
function imgHTML(p, i) { return p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async">' : face(i + 1, dims(p)); }
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

/* ---------- API ---------- */
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

/* ---------- Tienda ---------- */
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
    var meters = p.speed ? '<div class="meters"><span>Velocidad</span>' + meter(p.speed) + "<span>Control</span>" + meter(p.control) + "</div>" : "";
    return '<article class="card"><button class="img" type="button" data-detail="' + p.id + '" aria-label="Ver detalles de ' + esc(p.name) + '">' + imgHTML(p, i) + (p.badge === "nuevo" ? '<span class="badge b-nuevo">Nuevo</span>' : "") + "</button>" +
      '<div class="body"><div class="cat-row"><span class="cat">' + esc(p.brand + " · " + p.cat) + "</span>" + (p.level ? '<span class="level">' + esc(p.level) + "</span>" : "") + "</div>" +
      '<h3 class="name"><button type="button" data-detail="' + p.id + '">' + esc(p.name) + "</button></h3>" + meters + stockHTML(p) + "</div>" +
      '<div class="foot">' + priceHTML(p) + btn + "</div></article>";
  }).join("");
}
function renderChooser() {
  var groups = [
    { t: "más de 1 minuto", h: "Estás empezando", d: "Buscá un cubo estable y fácil de controlar, que perdone errores.", ids: ["warrior-m-3x3", "rs3m-2020", "tornado-v5"] },
    { t: "entre 20 y 60 segundos", h: "Ya te lo sabés", d: "Un cubo más rápido y liviano te ayuda a encadenar movimientos.", ids: ["rs3m-v5-dual", "aolong-v5", "weilong-v11", "mpro-v3-pioneer"] },
    { t: "menos de 20 segundos", h: "Vas por récords", d: "Un flagship con mucho ajuste para dejarlo exactamente a tu gusto.", ids: ["gan17", "weilong-v11", "mpro-v3-flagship", "rs3m-v5-picube"] }
  ];
  $("chooser").innerHTML = groups.map(function (g) {
    var picks = g.ids.map(byId).filter(function (p) { return p && !p.hidden; }).slice(0, 3);
    return '<div class="choose"><div class="t">Promedio ' + g.t + "</div><h3>" + g.h + "</h3><p>" + g.d + '</p><div class="picks">' + picks.map(function (p) { return '<button type="button" data-detail="' + p.id + '">' + esc(p.name) + "</button>"; }).join("") + "</div></div>";
  }).join("");
}

/* ---------- Carrito y pedido ---------- */
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
  var txt = "Hola ReyCube! Quería consultar por el " + p.name + (p.stock > 0 ? ": ¿precio y envío?" : ": ¿cuándo vuelve a entrar?");
  openDlg(p.stock > 0 ? "Consultar precio" : "Avisame cuando entre",
    "<p>Te armamos el mensaje para mandar por Instagram o mail. En Instagram ya queda copiado: solo pegalo en el chat.</p>" +
    '<div class="msg" id="askMsg">' + esc(txt) + '</div><div class="send-row" style="margin-top:10px"><button class="btn" type="button" id="askIG">Abrir Instagram</button>' +
    '<a class="btn sec" href="mailto:' + esc(S.email) + "?subject=" + encodeURIComponent("Consulta: " + p.name) + "&body=" + encodeURIComponent(txt) + '">Mandar mail</a></div><span class="toast" id="askToast" role="status"></span>');
  $("askIG").onclick = function () { copyText(txt, function () { $("askToast").textContent = "Mensaje copiado. Pegalo en el chat."; }, function () { $("askToast").textContent = "Copiá el mensaje de arriba y pegalo en el chat."; }); openIG(); };
}

/* ---------- Ventanas ---------- */
function openDlg(title, html) { $("dlgTitle").textContent = title; $("dlgBody").innerHTML = html; var d = $("dlg"); if (!d.open) d.showModal(); }
function seller(v) { return v ? esc(v) : '<span class="pend">a completar</span>'; }
function productDetail(id) {
  var p = byId(id), i = PRODUCTS.indexOf(p), inCart = !!ui.cart[p.id];
  var btn = canBuy(p) ? '<button class="btn' + (inCart ? " in" : "") + '" type="button" data-add="' + p.id + '" data-keep="1">' + (inCart ? "En el carrito ✓" : "Agregar al carrito") + "</button>"
    : '<button class="btn sec" type="button" data-ask="' + p.id + '">' + (p.stock > 0 ? "Consultar precio" : "Avisame cuando entre") + "</button>";
  var meters = p.speed ? '<table class="spec"><tr><th>Nivel</th><td>' + esc(p.level) + "</td></tr><tr><th>Velocidad</th><td>" + meter(p.speed) + "</td></tr><tr><th>Control</th><td>" + meter(p.control) + '</td></tr></table><p class="src">Velocidad y control: guía ReyCube basada en reseñas de usuarios (1 a 5).</p>' : "";
  var feats = (p.features || []).length ? '<h3>Características</h3><ul class="feats">' + p.features.map(function (f) { return "<li><b>" + esc(f[0]) + ":</b> " + esc(f[1]) + "</li>"; }).join("") + "</ul>" : "";
  openDlg(p.name, '<div class="pd"><div class="img">' + imgHTML(p, i) + '</div><div><div class="cat">' + esc(p.brand + " · " + p.cat) + "</div>" +
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

/* ---------- Acceso equipo ---------- */
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
function afterLogin() { $("dlg").close(); $("adminBtn").hidden = false; ui.tab = "ventas"; setAdmin(true); loadSales(); }
function logout(expired) {
  api.token = ""; api.user = ""; store("rc-token", null); store("rc-user", null);
  $("adminBtn").hidden = true; if (ui.admin) setAdmin(false);
  if (expired) openDlg("Sesión vencida", "<p>Volvé a entrar desde <b>Acceso equipo</b>, al pie de la página.</p>");
}
function checkSession() {
  if (!api.token || !api.live) { if (api.preview) { api.token = ""; } return; }
  api.user = store("rc-user") || "";
  call("GET", "/api/login").then(function (j) { api.db = j.db; $("adminBtn").hidden = false; loadSales(); }, function () {});
}
function loadSales() {
  if (api.preview || !api.db) return;
  call("GET", "/api/sales").then(function (j) { SALES = j.sales || []; if (ui.admin) renderAdmin(); }, function () {});
}

/* ---------- Panel ---------- */
function monthKey(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2); }
function renderAdmin() {
  var v = $("adminView");
  var tabs = [["ventas", "Ventas e ingresos"], ["nueva", "Registrar venta"], ["productos", "Productos y stock"], ["legal", "Datos legales"]];
  var html = '<div class="admin-top"><div><h1>Panel de ReyCube.Arg</h1><p class="lead" style="margin:0">Hola' + (api.user ? " " + esc(api.user) : "") + ". Los cambios de productos y stock se ven en la tienda al guardar.</p></div>" +
    '<button class="btn sec" type="button" id="logoutBtn">Cerrar sesión</button></div>' +
    (api.preview ? '<div class="banner">Vista previa: podés recorrer el panel, pero no se guarda nada.</div>' : !api.db ? '<div class="banner">Falta conectar la base de datos (Upstash Redis) en Vercel para guardar cambios y ventas. Mirá el paso 4 del README.</div>' : "") +
    '<div class="tabs">' + tabs.map(function (t) { return '<button class="chip" type="button" data-tab="' + t[0] + '" aria-pressed="' + (ui.tab === t[0]) + '">' + t[1] + "</button>"; }).join("") + "</div>";
  if (ui.tab === "ventas") html += adminSales();
  if (ui.tab === "nueva") html += adminNewSale();
  if (ui.tab === "productos") html += adminProducts();
  if (ui.tab === "legal") html += adminLegal();
  v.innerHTML = html;
}
function adminSales() {
  var now = new Date(), mk = monthKey(now), today = now.toDateString();
  var mTot = 0, mN = 0, dTot = 0, units = 0, all = 0, byMonth = {}, byProd = {};
  SALES.forEach(function (s) {
    var d = new Date(s.date); all += s.total;
    byMonth[monthKey(d)] = (byMonth[monthKey(d)] || 0) + s.total;
    if (monthKey(d) === mk) { mTot += s.total; mN++; (s.items || []).forEach(function (it) { units += it.qty; }); }
    if (d.toDateString() === today) dTot += s.total;
    (s.items || []).forEach(function (it) { byProd[it.name] = (byProd[it.name] || 0) + it.qty * it.price; });
  });
  var stockVal = 0, low = [];
  PRODUCTS.forEach(function (p) { stockVal += p.stock * p.price; if (p.stock > 0 && p.stock <= 2) low.push(p); });
  var months = []; for (var i = 5; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push([MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2), byMonth[monthKey(d)] || 0]); }
  var maxM = Math.max.apply(null, months.map(function (m) { return m[1]; }).concat([1]));
  var prods = Object.keys(byProd).map(function (k) { return [k, byProd[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
  var maxP = prods.length ? prods[0][1] : 1;
  var noPrice = PRODUCTS.filter(function (p) { return p.stock > 0 && !p.price; }).length;
  var h = '<div class="kpis"><div class="kpi"><div class="l">Ingresos este mes</div><div class="v">' + ars(mTot) + '</div><div class="s">' + mN + (mN === 1 ? " venta" : " ventas") + "</div></div>" +
    '<div class="kpi"><div class="l">Hoy</div><div class="v">' + ars(dTot) + "</div></div>" +
    '<div class="kpi"><div class="l">Unidades vendidas este mes</div><div class="v">' + units + "</div></div>" +
    '<div class="kpi"><div class="l">Total histórico</div><div class="v">' + ars(all) + '</div><div class="s">' + SALES.length + " ventas</div></div>" +
    '<div class="kpi"><div class="l">Stock valorizado</div><div class="v">' + ars(stockVal) + '</div><div class="s">' + (noPrice ? noPrice + " con stock sin precio" : "a precio de venta") + "</div></div></div>";
  h += '<div class="two"><div class="panel"><h2>Ingresos por mes</h2><div class="bars">' + months.map(function (m) { return '<div class="r"><span>' + m[0] + '</span><span class="t"><i style="width:' + (m[1] / maxM * 100) + '%"></i></span><span class="n">' + ars(m[1]) + "</span></div>"; }).join("") + "</div></div>" +
    '<div class="panel"><h2>Lo más vendido</h2>' + (prods.length ? '<div class="bars">' + prods.map(function (p) { return '<div class="r" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) auto"><span>' + esc(p[0]) + '</span><span class="t"><i style="width:' + (p[1] / maxP * 100) + '%"></i></span><span class="n">' + ars(p[1]) + "</span></div>"; }).join("") + "</div>" : '<p class="hint">Todavía no hay ventas registradas.</p>') +
    (low.length ? '<h2 style="margin-top:18px">Reponer pronto</h2><p class="hint" style="font-size:14px">' + low.map(function (p) { return esc(p.name) + " (" + p.stock + ")"; }).join(" · ") + "</p>" : "") + "</div></div>";
  h += '<div class="panel"><h2>Ventas registradas</h2>' + (SALES.length ? '<div class="tbl-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Cliente</th><th>Teléfono</th><th>Productos</th><th>Canal</th><th style="text-align:right">Total</th><th></th></tr></thead><tbody>' +
    SALES.map(function (s) { var d = new Date(s.date); return "<tr><td>" + d.toLocaleDateString("es-AR") + "</td><td>" + esc(s.customer) + "</td><td>" + esc(s.phone) + "</td><td>" + esc((s.items || []).map(function (it) { return it.qty + "× " + it.name; }).join(", ")) + "</td><td>" + esc(s.channel) + '</td><td class="num">' + ars(s.total) + '</td><td><button class="btn ghost mini" type="button" data-delsale="' + esc(s.id) + '">Borrar</button></td></tr>'; }).join("") +
    "</tbody></table></div>" : '<p class="hint" style="font-size:14px">Cuando confirmes un pedido, cargalo en "Registrar venta": se suma a tus ingresos y se descuenta del stock.</p>') + "</div>";
  return h;
}
function adminNewSale() {
  var opts = PRODUCTS.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + " · " + (p.price ? ars(p.price) : "sin precio") + " · stock " + p.stock + "</option>"; }).join("");
  var t = new Date(), iso = t.getFullYear() + "-" + ("0" + (t.getMonth() + 1)).slice(-2) + "-" + ("0" + t.getDate()).slice(-2);
  return '<div class="panel"><h2>Registrar una venta confirmada</h2><form class="form" id="saleForm" novalidate>' +
    '<div class="two"><label for="sCust">Cliente<input id="sCust" required></label><label for="sPhone">Teléfono<input id="sPhone" type="tel"></label></div>' +
    '<div class="two"><label for="sChan">Canal<select id="sChan"><option>Instagram</option><option>Mail</option><option>WhatsApp</option><option>En persona</option></select></label><label for="sDate">Fecha<input id="sDate" type="date" value="' + iso + '"></label></div>' +
    '<div class="lbl">Productos (precio unitario cobrado)</div><div class="sale-lines" id="saleLines">' + saleLine(opts, false) + "</div>" +
    '<button class="btn sec mini" type="button" id="addLine" style="align-self:flex-start">+ Otro producto</button>' +
    '<label class="check" for="sStock"><input type="checkbox" id="sStock" checked><span>Descontar del stock y actualizar la tienda</span></label>' +
    '<button class="btn block" type="submit">Guardar venta</button><span class="status" id="saleStatus" role="status"></span></form></div>';
}
function saleLine(opts, removable) {
  return '<div class="sale-line" style="grid-template-columns:minmax(0,1fr) 70px 110px auto"><select class="sp" aria-label="Producto">' + opts + '</select><input class="sq" type="number" min="1" value="1" aria-label="Cantidad"><input class="spr" type="number" min="0" step="500" placeholder="Precio" aria-label="Precio unitario"><span>' +
    (removable ? '<button class="btn ghost mini" type="button" data-rmline="1">Quitar</button>' : "") + "</span></div>";
}
function adminProducts() {
  var q = norm(ui.pq);
  var list = PRODUCTS.filter(function (p) { return !q || norm(p.name + " " + p.cat + " " + p.brand).indexOf(q) > -1; });
  return '<div class="panel"><h2>Productos y stock</h2><p class="hint" style="font-size:14px;margin-top:0">Precio en 0 = la tienda muestra "Consultá el precio". Stock en 0 = "Sin stock por ahora" con botón Avisame. Para fotos nuevas usá imágenes cuadradas con fondo blanco: se achican solas.</p>' +
    '<div class="prod-filter"><input id="pq" type="search" placeholder="Filtrar productos…" value="' + esc(ui.pq) + '"></div>' +
    '<div class="tbl-wrap"><table class="t"><thead><tr><th>Foto</th><th>Producto</th><th>Precio</th><th>Stock</th><th>Nuevo</th><th>Oculto</th></tr></thead><tbody>' +
    list.map(function (p) {
      return '<tr><td><label style="cursor:pointer" title="Cambiar foto">' + (p.img ? '<img class="thumb" src="' + esc(p.img) + '" alt="" style="object-fit:contain;background:#fff">' : '<span class="thumb" style="display:grid;place-items:center;font-size:11px;color:var(--muted)">+ foto</span>') + '<input type="file" accept="image/*" data-photo="' + p.id + '" hidden></label></td>' +
        '<td class="nm">' + esc(p.name) + "<small>" + esc(p.brand + " · " + p.cat) + "</small></td>" +
        '<td><input type="number" min="0" step="500" value="' + p.price + '" data-price="' + p.id + '" style="width:120px" aria-label="Precio de ' + esc(p.name) + '"></td>' +
        '<td><input type="number" min="0" value="' + p.stock + '" data-stock="' + p.id + '" style="width:80px" aria-label="Stock de ' + esc(p.name) + '"></td>' +
        '<td><input type="checkbox" data-new="' + p.id + '"' + (p.badge === "nuevo" ? " checked" : "") + ' aria-label="Marcar como nuevo"></td>' +
        '<td><input type="checkbox" data-hide="' + p.id + '"' + (p.hidden ? " checked" : "") + ' aria-label="Ocultar de la tienda"></td></tr>';
    }).join("") + '</tbody></table></div><div style="display:flex;gap:12px;align-items:center;margin-top:14px;flex-wrap:wrap"><button class="btn" type="button" id="saveProducts">Guardar y publicar</button><span class="status" id="prodStatus" role="status"></span></div></div>' +
    '<div class="panel"><h2>Agregar producto</h2><form class="form" id="newProdForm" novalidate><div class="two"><label for="npName">Nombre<input id="npName" required placeholder="Ej.: Tengyun V4 Pro"></label><label for="npBrand">Marca<input id="npBrand" placeholder="GAN, MoYu, QiYi…"></label></div>' +
    '<div class="two"><label for="npCat">Categoría<select id="npCat">' + CATEGORIES.map(function (c) { return "<option>" + c + "</option>"; }).join("") + '</select></label><label for="npPrice">Precio<input id="npPrice" type="number" min="0" step="500" value="0"></label></div>' +
    '<div class="two"><label for="npStock">Stock<input id="npStock" type="number" min="0" value="1"></label><label for="npDesc">Descripción corta<input id="npDesc"></label></div>' +
    '<button class="btn sec" type="submit" style="align-self:flex-start">Agregar a la lista</button><span class="status" id="npStatus" role="status"></span></form></div>';
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
  if (!api.db) { status(id, "Falta conectar la base de datos en Vercel (README, paso 4).", "bad"); return false; }
  return true;
}
function collectProducts() {
  document.querySelectorAll("[data-price]").forEach(function (i) { byId(i.dataset.price).price = Math.max(0, Number(i.value) || 0); });
  document.querySelectorAll("[data-stock]").forEach(function (i) { byId(i.dataset.stock).stock = Math.max(0, parseInt(i.value, 10) || 0); });
  document.querySelectorAll("[data-new]").forEach(function (i) { byId(i.dataset.new).badge = i.checked ? "nuevo" : ""; });
  document.querySelectorAll("[data-hide]").forEach(function (i) { byId(i.dataset.hide).hidden = i.checked; });
}
function saveProducts() {
  collectProducts();
  if (api.preview || !api.db) { render(); guard("prodStatus"); return; }
  status("prodStatus", "Publicando…");
  call("PUT", "/api/products", { products: PRODUCTS }).then(function (c) { applyCatalog(c); render(); status("prodStatus", "Listo, la tienda ya está actualizada.", "ok"); },
    function (e) { status("prodStatus", "No se pudo guardar: " + e.message, "bad"); });
}
function saveSale() {
  var cust = $("sCust").value.trim(); if (!cust) { status("saleStatus", "Poné el nombre del cliente.", "bad"); return; }
  var items = [].map.call(document.querySelectorAll("#saleLines .sale-line"), function (l) {
    var p = byId(l.querySelector(".sp").value), pr = Number(l.querySelector(".spr").value);
    return { id: p.id, name: p.name, price: pr > 0 ? pr : p.price, qty: Math.max(1, parseInt(l.querySelector(".sq").value, 10) || 1) };
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
  PRODUCTS.push({ id: id, cat: $("npCat").value, name: name, brand: $("npBrand").value.trim(), price: Math.max(0, Number($("npPrice").value) || 0), stock: Math.max(0, parseInt($("npStock").value, 10) || 0), badge: "nuevo", img: "", level: "", speed: 0, control: 0, headline: "", desc: $("npDesc").value.trim(), features: [], why: "" });
  renderAdmin(); status("prodStatus", "Producto agregado. Subile una foto y tocá Guardar y publicar.");
}

/* ---------- Eventos ---------- */
function render() { renderFilters(); renderGrid(); renderCart(); renderChooser(); renderFooter(); if (ui.admin) renderAdmin(); }
function openCart(v) { $("cart").classList.toggle("open", v); $("scrim").classList.toggle("open", v); }
function setAdmin(on) {
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
  if (d.tab) { if (ui.tab === "productos") collectProducts(); ui.tab = d.tab; renderAdmin(); return; }
  if (d.delsale) { deleteSale(d.delsale, el); return; }
  if (d.rmline) { el.closest(".sale-line").remove(); return; }
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
  }
});
var qTimer;
document.addEventListener("input", function (e) {
  var t = e.target;
  if (t.id === "q") { clearTimeout(qTimer); qTimer = setTimeout(function () { ui.q = t.value.trim(); renderGrid(); }, 120); }
  if (t.id === "pq") { collectProducts(); ui.pq = t.value; clearTimeout(qTimer); qTimer = setTimeout(function () { renderAdmin(); var x = $("pq"); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }, 200); }
  if (t.id === "oName") { ui.name = t.value; refreshOrder(); }
  if (t.id === "oPhone") { ui.phone = t.value; refreshOrder(); }
  if (t.id === "oCity") { ui.city = t.value; refreshOrder(); }
});
document.addEventListener("change", function (e) {
  var t = e.target;
  if (t.id === "oAgree") { ui.agree = t.checked; refreshOrder(); }
  if (t.dataset && t.dataset.photo && t.files[0]) {
    var p = byId(t.dataset.photo);
    if (!guard("prodStatus")) return;
    status("prodStatus", "Subiendo foto…");
    resizeImage(t.files[0], 800).then(function (url) { return call("POST", "/api/photo", { id: p.id, dataUrl: url }); })
      .then(function (j) { collectProducts(); p.img = j.url; renderAdmin(); status("prodStatus", "Foto lista. Tocá Guardar y publicar."); },
        function (err) { status("prodStatus", "No se pudo subir la foto: " + (err && err.message || "probá con un JPG o PNG"), "bad"); });
  }
});
$("dlg").addEventListener("click", function (e) { if (e.target === $("dlg")) $("dlg").close(); });
$("scrim").addEventListener("click", function () { openCart(false); });
document.addEventListener("submit", function (e) {
  e.preventDefault();
  var id = e.target.id;
  if (id === "loginForm") doLogin();
  if (id === "saleForm") saveSale();
  if (id === "legalForm") saveLegal();
  if (id === "newProdForm") addProduct();
  if (id === "arrForm") {
    var f = ["aName", "aContact", "aOrder", "aProd"].map(function (k) { return $(k).value.trim(); });
    if (f.some(function (v) { return !v; })) { $("aErr").textContent = "Completá todos los campos."; return; }
    $("aErr").textContent = "";
    var code = "ARR-" + Date.now().toString(36).toUpperCase().slice(-6);
    var txt = "Solicitud de arrepentimiento " + code + "\nNombre: " + f[0] + "\nContacto: " + f[1] + "\nPedido/fecha: " + f[2] + "\nProducto: " + f[3];
    $("aOut").innerHTML = '<div class="note" style="margin-top:8px">Tu código de solicitud es <b class="mono-sel">' + code + '</b>. Envianos la solicitud para iniciar la devolución:</div><div class="msg" style="margin-top:8px">' + esc(txt) + '</div><div class="send-row" style="margin-top:8px"><a class="btn" href="mailto:' + esc(S.email) + "?subject=" + encodeURIComponent("Arrepentimiento " + code) + "&body=" + encodeURIComponent(txt) + '">Enviar por mail</a><a class="btn sec" href="' + igLink() + '" target="_blank" rel="noopener">Abrir Instagram</a></div>';
  }
});

(function () { var c = ["var(--flag)", "var(--flag)", "var(--flag)", "#ffffff", "var(--sol)", "#ffffff", "var(--flag)", "var(--flag)", "var(--flag)"]; $("heroCube").innerHTML = c.map(function (x) { return '<i style="background:' + x + '"></i>'; }).join(""); })();
renderCart();
loadCatalog().then(function () { render(); checkSession(); }, function () { $("grid").innerHTML = '<div class="empty"><b>No pudimos cargar el catálogo</b>Probá recargar la página o escribinos por Instagram a @reycubearg.</div>'; });
})();
