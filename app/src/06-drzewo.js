const openGroups = new Set(store.get("open", ["podklad", "transport", "pogoda", "drogi", "kolej", "woda", "przeprawy", "lotnictwo", "granice", "kosmos"]));
function countFor(it) {
  if (it.pojazd) {
    const n = motisDane.filter(p => p.w === it.id).length;
    return n ? fmt(n) : "";
  }
  if (it.base || it.teren || it.raster) return "";
  if (it.grp) {
    const n = SAT.list.filter(s => s.g === it.grp).length;
    return n ? fmt(n) : "";
  }
  // Warstwy na żywo nie mają danych w D.layers: licznik pochodzi ze stanu źródła.
  if (it.live && S.src[it.live]) return S.src[it.live].n ? fmt(S.src[it.live].n) : "";
  const src = D.layers[it.src];
  if (!src) return "";
  if (src.features[0]?.geometry.type !== "Point") return "";
  return fmt(it.filter ? src.features.filter(f => evalFilter(it.filter, f.properties)).length : src.features.length);
}
// Podzbiór wyrażeń MapLibre do liczników drzewa. Każdy operator użyty w filtrach
// TREE musi być tu obsłużony, inaczej licznik pokaże wszystkie obiekty warstwy.
function evalFilter(f, p) {
  if (!f) return true;
  const [op, ...a] = f;
  const val = x => {
    if (!Array.isArray(x)) return x;
    if (x[0] === "get") return p[x[1]];
    if (x[0] === "to-number") { const n = Number(val(x[1])); return Number.isFinite(n) ? n : (x[2] ?? 0); }
    return x;
  };
  if (op === "all") return a.every(x => evalFilter(x, p));
  if (op === "any") return a.some(x => evalFilter(x, p));
  if (op === "!") return !evalFilter(a[0], p);
  if (op === "==") return val(a[0]) === val(a[1]);
  if (op === "!=") return val(a[0]) !== val(a[1]);
  if (op === ">=") return val(a[0]) >= val(a[1]);
  if (op === "<") return val(a[0]) < val(a[1]);
  // W MapLibre "in" dla napisu szuka podnapisu, dla tablicy sprawdza przynależność.
  if (op === "in") {
    const stog = val(a[1]);
    if (typeof stog === "string") return stog.includes(String(val(a[0])));
    const lista = Array.isArray(stog) && stog[0] === "literal" ? stog[1] : stog;
    return Array.isArray(lista) && lista.includes(val(a[0]));
  }
  return true;
}
const countCache = {};
// Używana też jako legenda w panelu startowym.
function probka(it, px = 16) {
  const [kind, col] = it.sw || [];
  if (!kind) return "";
  const ikona = (kind === "pt" || kind === "tr") && (ikonaGlowna(it.id) || (it.user && "flaga"));
  if (ikona) return svgIkony(ikona, col, px);
  return kind === "ln" ? `<i class="ln" style="border-color:${col}"></i>` : kind === "pt" ? `<i class="pt" style="background:${col}"></i>`
    : kind === "tr" ? `<i class="tr" style="border-bottom-color:${col}"></i>` : `<i class="ar" style="border-color:${col}"></i>`;
}

function renderTree() {
  const body = $("#treeBody");
  // innerHTML zeruje przewinięcie, a drzewo przerysowuje się samo przy danych
  // na żywo. Bez odtworzenia lista skacze na górę w trakcie klikania.
  const scroll = body.scrollTop;
  const h = [];
  for (const g of TREE) {
    const onN = g.items.filter(i => i.on).length;
    const selHtml = g.radio ? "" : `<span class="tgsel${onN === g.items.length ? " all" : onN ? " mix" : ""}"
      data-selg="${g.id}" title="${onN === g.items.length ? "Odznacz" : "Zaznacz"} wszystkie: ${esc(g.label)}"></span>`;
    h.push(`<div class="tnode${openGroups.has(g.id) ? " open" : ""}" data-g="${g.id}">
      <button data-tg="${g.id}">${selHtml}<svg class="tw" viewBox="0 0 10 10"><path d="M3 1.5L7 5 3 8.5"/></svg>${esc(g.label)}
      ${g.live ? '<span class="tgrp-live">NA ŻYWO</span>' : ""}<span class="tc">${onN}/${g.items.length}</span></button><div class="tkids">`);
    for (const it of g.items) {
      if (!(it.id in countCache) || it.live) countCache[it.id] = countFor(it);
      const sw = probka(it);
      const live = it.live ? `<span class="live ${S.src[it.live].state}" title="${esc(liveTitle(it.live))}"></span>` : "";
      const radio = g.radio && !it.osobno;
      h.push(`<label class="lyr${radio ? " rad" : ""}"><input type="${radio ? "radio" : "checkbox"}" ${radio ? `name="${g.radio}"` : ""} data-l="${it.id}" ${it.on ? "checked" : ""}><span class="cb"></span>
        <span class="sw">${sw}</span><span class="lb">${esc(it.label)}</span>${live}<span class="n">${countCache[it.id]}</span></label>`);
    }
    h.push("</div></div>");
  }
  body.innerHTML = h.join("");
  body.scrollTop = scroll;
}
function liveTitle(k) {
  const s = S.src[k];
  return {ok: "Dane aktualne", wait: "Pobieranie albo dane z migawki", err: "Źródło nie odpowiada", off: "Wyłączone"}[s.state] + (s.at ? " · " + s.at.toLocaleTimeString("pl-PL") : "");
}
// Jedno doładowanie danych na żywo dla całej listy zamiast po jednym na pozycję.
function applyBulkToggle(items, on) {
  let satTouched = false, pojazdTouched = false;
  const zywe = [];
  for (const it of items) {
    if (it.base || it.teren) continue;   // podkłady i teren mają własną logikę (radio, setTeren)
    it.on = on;
    if (it.grp) satTouched = true;
    if (it.pojazd) pojazdTouched = true;
    if (ZYWE[it.id]) zywe.push(it.id);
  }
  saveLayers(); applyVisibility();
  if (satTouched) { ensureSatGroups(); tickSats(true); }
  if (pojazdTouched) loadMotis(true);
  for (const id of zywe) przelaczZywe(id);
  renderTree();
}
// Preset zastępuje włączone warstwy, a nie dokłada, żeby dwa kliknięcia nie dały
// sumy dwóch tematów. Widoku mapy nie przesuwa. Widoki tematyczne, nie rankingi.
const SZKIELET = ["r-A", "r-S", "r-DK", "w-r", "b-l"];
const KAMERY = ["c-k", "c-d", "c-o", "c-g", "c-a", "c-z", "c-v", "c-l"];
const PRESETY = [
  {id: "start", label: "Start", opis: "Zestaw startowy: szkielet regionu", warstwy: () => ZESTAW_STARTOWY, podklad: "b-none"},
  {id: "kamery", label: "Kamery", opis: "Wszystkie kamery na tle dróg i rzek", warstwy: () => [...KAMERY]},
  {id: "drogi", label: "Drogi i ruch", opis: "Drogi, utrudnienia GDDKiA, kamery, tablice i drogowe stacje meteo",
   warstwy: () => ["r-DW", "d-ut", "m-tab", "m-dro", "p-d", "b-d", ...KAMERY]},
  {id: "kolej", label: "Kolej", opis: "Sieć kolejowa, pociągi na żywo, mosty, przejścia i kolej towarowa",
   warstwy: () => ["k-e", "k-n", "k-w", "k-b", "k-x", "p-dal", "p-reg", "p-k", "b-k", "g-t", "g-i"]},
  {id: "woda", label: "Woda", opis: "Rzeki, zbiorniki, wodowskazy, jazy, mosty, radar i ostrzeżenia",
   warstwy: () => ["w-k", "w-je", "w-zb", "w-st", "w-g", "m-wod", "e-sl", "e-oc", "p-d", "p-k", "p-p", "g-p", "w-radar", "w-ost"]},
  {id: "pogoda", label: "Pogoda", opis: "Chmury, radar, ostrzeżenia IMGW, powietrze i stacje meteo",
   warstwy: () => ["w-chm", "w-radar", "w-ost", "a-pm", "m-pog", "m-dro"]},
  {id: "gory", label: "Góry", opis: "Szczyty, kamery górskie, chmury i meteo; podkład turystyczny",
   warstwy: () => ["t-gl", "t-sz", "c-g", "c-v", "m-pog", "w-chm", "w-radar", "w-ost"], podklad: "b-topo"},
  {id: "energia", label: "Energetyka", opis: "Sieć 110 do 400 kV, stacje, elektrownie, OZE i gaz",
   warstwy: () => ["e-hi", "e-sth", "e-mid", "e-st1", "e-el", "e-pv", "e-wi", "e-gaz", "x-ga"]},
  {id: "surowce", label: "Surowce", opis: "Kopalnie, szyby, tereny przemysłowe i kolej towarowa",
   warstwy: () => ["x-ko", "x-sz", "x-te", "k-e", "k-n", "g-t"]},
  {id: "pomiary", label: "Pomiary", opis: "Wszystkie stacje i czujniki: meteo, woda, powietrze, inne",
   warstwy: () => ["m-pog", "m-wod", "m-pow", "m-dro", "m-inne", "w-g", "a-pm"]},
];
// Źródła wyłączone przy budowie zostają w ITEMS, ale preset nie może ich po cichu włączyć.
const zestawPresetu = p => {
  const wDrzewie = new Set(TREE.flatMap(g => g.items.map(i => i.id)));
  return new Set([...(p.id === "start" ? [] : SZKIELET), ...p.warstwy()].filter(id => wDrzewie.has(id)));
};
function zastosujPreset(id) {
  const p = PRESETY.find(x => x.id === id);
  if (!p) return;
  const zestaw = zestawPresetu(p);
  let satTouched = false, pojazdTouched = false;
  const zywe = [];
  for (const it of Object.values(ITEMS)) {
    if (it.base || it.teren) continue;
    const on = zestaw.has(it.id);
    if (it.on === on) continue;
    it.on = on;
    if (it.grp) satTouched = true;
    if (it.pojazd) pojazdTouched = true;
    if (ZYWE[it.id]) zywe.push(it.id);
  }
  if (p.podklad) for (const b of BASEMAPS) ITEMS[b.id].on = b.id === p.podklad;
  saveLayers(); applyVisibility();
  if (satTouched) { ensureSatGroups(); tickSats(true); }
  if (pojazdTouched) loadMotis(true);
  for (const z of zywe) przelaczZywe(z);
  renderTree();
}
// Podświetlenie tylko przy dokładnej zgodności stanu drzewa z presetem.
function renderPresety() {
  const el = $("#presety");
  if (!el) return;
  const wl = new Set(Object.values(ITEMS).filter(it => it.on && !it.base && !it.teren).map(it => it.id));
  el.innerHTML = PRESETY.map(p => {
    const z = zestawPresetu(p);
    const ten = z.size === wl.size && [...z].every(id => wl.has(id)) && (!p.podklad || ITEMS[p.podklad]?.on);
    return `<button class="pre${ten ? " on" : ""}" data-preset="${p.id}" title="${esc(p.opis)}">${esc(p.label)}</button>`;
  }).join("");
}
$("#presety")?.addEventListener("click", e => {
  const b = e.target.closest("[data-preset]");
  if (b) zastosujPreset(b.dataset.preset);
});
// renderTree musi pozostać deklaracją funkcji, żeby to nadpisanie zadziałało.
const _renderTree = renderTree;
renderTree = function () { _renderTree(); renderPresety(); };

function setGroupAll(groupId) {
  const g = TREE.find(x => x.id === groupId);
  if (!g) return;
  const onN = g.items.filter(i => i.on).length;
  applyBulkToggle(g.items, onN !== g.items.length);
}
$("#treeBody").addEventListener("click", e => {
  const sg = e.target.closest("[data-selg]");
  if (sg) { setGroupAll(sg.dataset.selg); return; }
  const tg = e.target.closest("[data-tg]");
  if (tg) {
    const id = tg.dataset.tg;
    openGroups.has(id) ? openGroups.delete(id) : openGroups.add(id);
    store.set("open", [...openGroups]);
    tg.parentElement.classList.toggle("open");
  }
});
$("#treeBody").addEventListener("change", e => {
  const id = e.target.dataset.l;
  if (!id) return;
  const it = ITEMS[id];
  if (it.teren) { setTeren(e.target.checked); return; }
  if (it.base) {
    for (const b of BASEMAPS) ITEMS[b.id].on = b.id === id;
  } else {
    it.on = e.target.checked;
  }
  saveLayers(); applyVisibility();
  if (it.grp) ensureSatGroups();
  if (it.pojazd) loadMotis(true);
  przelaczZywe(id);
  // Tylko warstwy satelitarne: propagacja SGP4 wszystkich obiektów jest kosztowna.
  if (it.grp) tickSats(true);
  renderTree();
});
