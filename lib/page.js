const s = (v, max) => String(v == null ? "" : v).slice(0, max);
const ids = (a) => (Array.isArray(a) ? a : []).map((x) => s(x, 60).replace(/[^a-z0-9-]/gi, "")).filter(Boolean).slice(0, 6);
export function cleanPage(p) {
if (typeof p === "string") { try { p = JSON.parse(p); } catch { return undefined; } }
if (!p || typeof p !== "object") return undefined;
const out = {};
if (p.announce) out.announce = { on: Boolean(p.announce.on), text: s(p.announce.text, 200), link: s(p.announce.link, 300) };
if (p.hero) out.hero = { title: s(p.hero.title, 80), highlight: s(p.hero.highlight, 60), text: s(p.hero.text, 400), pills: (p.hero.pills || []).map((x) => s(x, 60)).filter(Boolean).slice(0, 6) };
if (p.chooser) out.chooser = {
show: p.chooser.show !== false, title: s(p.chooser.title, 80), lead: s(p.chooser.lead, 300),
groups: (p.chooser.groups || []).slice(0, 6).map((g) => ({ t: s(g.t, 60), h: s(g.h, 60), d: s(g.d, 240), ids: ids(g.ids) })),
};
if (p.tips) out.tips = {
show: p.tips.show !== false, title: s(p.tips.title, 80), lead: s(p.tips.lead, 300),
items: (p.tips.items || []).slice(0, 12).map((t) => ({ tag: s(t.tag, 40), h: s(t.h, 80), p: s(t.p, 400) })),
};
if (p.wca) out.wca = { show: p.wca.show !== false };
if (p.news) out.news = { show: p.news.show !== false, title: s(p.news.title, 80), text: s(p.news.text, 300) };
return out;
}
