/* Szukajka, okna, menu, skróty klawiszowe, pasek stanu i start programu.
   Pliki z app/src są sklejane alfabetycznie we wspólny zasięg zmiennych. */
let findIdx = null;
function buildFindIndex() {
  const idx = [];
  const add = (label, type, run, extra = "") => idx.push({label, type, run, key: (label + " " + extra).toLowerCase()});
  for (const f of D.layers.miejscowosci.features) add(f.properties.n, f.properties.p === "city" ? "miasto" : "miejscowość", () => map.flyTo({center: f.geometry.coordinates, zoom: 11.5}));
  for (const f of D.layers.gminy.features) add(f.properties.n, "gmina", () => { const b = new maplibregl.LngLatBounds(); f.geometry.coordinates.flat(2).forEach(c => b.extend(c)); map.fitBounds(b, {padding: 60}); selectFeature({source: "gminy", properties: f.properties, geometry: f.geometry}, null); });
  const pts = (src, lab) => { for (const f of D.layers[src].features) { const l = lab(f.properties); if (l) add(l[0], l[1], () => { map.flyTo({center: f.geometry.coordinates, zoom: 13}); selectFeature({source: src, properties: f.properties, geometry: f.geometry}, {lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1]}); }, l[2] || ""); } };
  pts("lotniska", p => p.n ? [p.n, AIR[p.kat], p.icao] : null);
  pts("przeprawy", p => p.typ === "prom" ? [p.n || "prom", "prom"] : p.rz ? [`${p.n ? p.n + " · " : ""}most ${p.typ}${p.ref ? " " + p.ref : ""} · ${p.rz}`, "przeprawa", p.rz] : null);
  pts("przejscia", p => [`${p.ref || p.n || "przekroczenie"} · ${KRAJ[p.kraj]}`, "granica", p.n]);
  pts("logistyka", p => p.n ? [p.n, LOGI[p.kat], p.op] : null);
  pts("szczyty", p => [p.ele ? `${p.n} · ${p.ele} m` : p.n, p.gl ? "szczyt · " + p.pas : "szczyt", p.pas]);
  const rivers = new Map();
  for (const f of D.layers.woda.features) if (f.properties.n && !rivers.has(f.properties.n)) rivers.set(f.properties.n, f);
  for (const [n, f] of rivers) add(n, "rzeka", () => { const b = new maplibregl.LngLatBounds(); D.layers.woda.features.filter(x => x.properties.n === n).forEach(x => x.geometry.coordinates.forEach(c => b.extend(c))); map.fitBounds(b, {padding: 40}); });
  const roads = new Map();
  for (const f of D.layers.drogi.features) if (f.properties.ref && !roads.has(f.properties.ref)) roads.set(f.properties.ref, f);
  for (const [r, f] of roads) add(r, ROAD[f.properties.k], () => { const b = new maplibregl.LngLatBounds(); D.layers.drogi.features.filter(x => x.properties.ref === r).forEach(x => x.geometry.coordinates.forEach(c => b.extend(c))); map.fitBounds(b, {padding: 40}); });
  return idx;
}
let findCur = 0, findRes = [];
function openFind() {
  if (!findIdx) findIdx = buildFindIndex();
  $("#find").classList.add("on"); $("#findIn").value = ""; renderFind(); $("#findIn").focus();
}
function renderFind() {
  const q = $("#findIn").value.trim().toLowerCase();
  const sats = SAT.list.map(s => ({label: s.name, type: "satelita", key: s.name.toLowerCase() + " " + s.id, run: () => selectSat(s.id, true)}));
  findRes = q.length < 2 ? [] : [...findIdx, ...sats].filter(x => x.key.includes(q))
    .sort((a, b) => (a.key.startsWith(q) ? 0 : 1) - (b.key.startsWith(q) ? 0 : 1) || a.label.length - b.label.length).slice(0, 40);
  findCur = 0;
  $("#findList").innerHTML = q.length < 2 ? `<div class="find-none">Wpisz co najmniej 2 znaki.</div>` : findRes.length ?
    findRes.map((r, i) => `<button data-i="${i}" class="${i === 0 ? "cur" : ""}">${esc(r.label)}<span class="ty">${esc(r.type)}</span></button>`).join("") :
    `<div class="find-none">Nic nie znaleziono.</div>`;
}
$("#findIn").addEventListener("input", renderFind);
$("#findIn").addEventListener("keydown", e => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    findCur = Math.max(0, Math.min(findRes.length - 1, findCur + (e.key === "ArrowDown" ? 1 : -1)));
    [...$("#findList").children].forEach((b, i) => b.classList.toggle("cur", i === findCur));
    $("#findList").children[findCur]?.scrollIntoView({block: "nearest"});
  }
  if (e.key === "Enter" && findRes[findCur]) { $("#find").classList.remove("on"); findRes[findCur].run(); }
  if (e.key === "Escape") $("#find").classList.remove("on");
});
$("#findList").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b) { $("#find").classList.remove("on"); findRes[+b.dataset.i].run(); } });
$("#find").addEventListener("click", e => { if (e.target.id === "find") $("#find").classList.remove("on"); });

function modal(title, html) { $("#modalT").textContent = title; $("#modalB").innerHTML = html; $("#scrim").classList.add("on"); }
$("#scrim").addEventListener("click", e => { if (e.target.id === "scrim") $("#scrim").classList.remove("on"); });
// Tabela budowana z rejestru ZRODLA, tak jak atrybucje, więc nie mogą się rozjechać.
// Pola robocze rejestru (kom, uwagi) celowo nie trafiają do okna.
function tabelaLicencji() {
  const zrodla = ZRODLA.filter(z => !WYLACZONE.has(z.id));
  const grupy = [...new Set(zrodla.map(z => z.grupa))];
  const lic = z => z.licUI || z.lic;
  const wiersz = z => `<tr><td><b>${esc(z.nazwa)}</b><span>${esc(z.co)}</span></td>
    <td>${z.warunki ? aHref(z.warunki, esc(lic(z))) : esc(lic(z))}</td></tr>`;
  return `<table class="lic"><thead><tr><th>Źródło</th><th>Licencja</th></tr></thead>${
    grupy.map(g => `<tbody><tr><th colspan="2">${esc(g)}</th></tr>${zrodla.filter(z => z.grupa === g).map(wiersz).join("")}</tbody>`).join("")}</table>`;
}
// Warstwy OSM są pobierane w różne dni, więc jedna data sugerowałaby stan
// całej mapy. Zakres mówi wprost, z kiedy są dane.
function zakresDat() {
  const d = Object.values(D.meta.warstwy || {}).map(w => w.stan_osm).filter(Boolean).sort();
  if (!d.length) return "";
  const f = t => new Date(t).toLocaleDateString("pl-PL");
  const a = f(d[0]), b = f(d[d.length - 1]);
  return a === b ? a : `od ${a} do ${b}`;
}
function aboutHtml() {
  return `<h4>O mapie</h4>
    <p>Mapa infrastruktury Dolnego Śląska z pasem przygranicznym w Czechach i Niemczech: sieć drogowa, kolejowa, energetyczna i wodna oraz dane na żywo (transport, pogoda, wodowskazy, satelity). Projekt DoLab, wersja beta.</p>
    <p>Dane OpenStreetMap pobrane ${zakresDat() || "(brak daty)"}. Dane na żywo pochodzą bezpośrednio od ich dostawców i odświeżają się przy otwartej mapie.</p>
    <h4>Źródła danych</h4>
    ${tabelaLicencji()}
    <h4>Licencja</h4>
    <p>Program © ${PROGRAM.rok} ${esc(PROGRAM.wlasciciel)}, licencja <b>${PROGRAM.licencjaKodu}</b>. Warstwy z OpenStreetMap: licencja <b>${PROGRAM.licencjaDanych}</b> (${aHref("https://opendatacommons.org/licenses/odbl/1-0/", "tekst licencji")}), © ${aHref("https://www.openstreetmap.org/copyright", "współtwórcy OpenStreetMap")}.</p>
    <details class="lic-pelne"><summary>Pełne teksty licencji składników</summary><pre>${document.getElementById("licencje-skladnikow")?.innerHTML || ""}</pre></details>
    <h4>Kontakt</h4>
    <p>${aHref(PROGRAM.kontakt, "dolnyslask.tech/kontakt")}</p>`;
}
// Jedna siatka dla wszystkich grup: osobne bloki rozjeżdżają wyrównanie kolumn.
const KEYS = `<div class="keys">
  <h4>Wyszukiwanie i panele</h4>
  <kbd>Ctrl+F</kbd><span>Szukaj obiektu, rzeki, drogi, satelity</span>
  <kbd>Ctrl+B</kbd><span>Pokaż lub schowaj panel warstw</span>
  <kbd>Ctrl+I</kbd><span>Pokaż lub schowaj panel szczegółów</span>
  <kbd>Esc</kbd><span>Zamknij okno, wyczyść zaznaczenie</span>
  <h4>Mapa</h4>
  <kbd>Home</kbd><span>Cały Dolny Śląsk</span>
  <kbd>G</kbd><span>Widok globu</span>
  <kbd>T</kbd><span>Rzeźba terenu 3D</span>
  <h4>Pliki</h4>
  <kbd>Ctrl+O</kbd><span>Wczytaj własną warstwę GeoJSON</span>
  <kbd>Ctrl+S</kbd><span>Zapisz widok jako PNG</span>
  <h4>Gdy coś nie działa</h4>
  <kbd>F8</kbd><span>Napraw widok, gdy przeglądarka przestała odrysowywać stronę</span></div>`;

function showTree(on) { $("#tree").classList.toggle("hide", on === undefined ? undefined : !on); refreshChecks(); setTimeout(() => map.resize(), 20); }
function showAside(on) {
  const a = $("#aside");
  a.classList.toggle("hide", on === undefined ? undefined : !on);
  $("#grid").classList.toggle("noaside", a.classList.contains("hide"));
  refreshChecks(); setTimeout(() => map.resize(), 20);
}
function setGlobe(on) {
  S.globe = on;
  map.setProjection({type: on ? "globe" : "mercator"});
  // Glob i teren 3D wykluczają się w MapLibre, więc glob zdejmuje teren.
  map.setTerrain(S.teren && !on ? {source: "dem", exaggeration: 1.35} : null);
  if (on && map.getZoom() > 4) map.easeTo({zoom: 2.2, duration: 900});
  refreshChecks();
}
function refreshChecks() {
  const st = {tree: !$("#tree").classList.contains("hide"), aside: !$("#aside").classList.contains("hide"),
              globe: S.globe, teren: S.teren};
  // Klasy pokazują uchwyty na krawędzi mapy, żeby schowany panel dało się
  // przywrócić bez skrótu i menu.
  const mc = $(".mapcol");
  mc?.classList.toggle("bez-drzewa", !st.tree);
  mc?.classList.toggle("bez-panelu", !st.aside);
  document.querySelectorAll("[data-check]").forEach(b => {
    const on = st[b.dataset.check];
    const ck = b.querySelector(".ck");
    if (ck) ck.textContent = on ? "✓" : "";
    else b.classList.toggle("on", on);
  });
}
// Atrybucja w rogu mapy to element HTML i nie trafia na płótno, a ODbL 4.3
// i warunki podkładów wymagają jej także na eksportowanym obrazie. Tekst
// bierzemy z rogu mapy, bo odpowiada temu, co jest teraz widoczne.
function savePng() {
  map.once("render", () => {
    const zr = map.getCanvas(), k = window.devicePixelRatio || 1;
    const c = document.createElement("canvas");
    c.width = zr.width; c.height = zr.height;
    const g = c.getContext("2d");
    g.drawImage(zr, 0, 0);
    const atrybucja = (document.querySelector(".maplibregl-ctrl-attrib-inner")?.textContent || "© współtwórcy OpenStreetMap (ODbL)")
      .replace(/\s*·?\s*Źródła i licencje\s*·?/, " · ").replace(/\s+/g, " ").trim();
    const tekst = `${atrybucja} · openstreetmap.org/copyright · ${PROGRAM.nazwa}`;
    const fs = 10 * k, pad = 5 * k, maks = c.width - 2 * pad - 8 * k;
    g.font = `${fs}px Inter, sans-serif`;
    const linie = [];
    for (const slowo of tekst.split(" ")) {
      const ost = linie[linie.length - 1];
      if (ost && g.measureText(ost + " " + slowo).width <= maks) linie[linie.length - 1] = ost + " " + slowo;
      else linie.push(slowo);
    }
    const lh = fs * 1.35, w = Math.min(maks, Math.max(...linie.map(l => g.measureText(l).width))) + 2 * pad, h = linie.length * lh + 2 * pad;
    g.fillStyle = "rgba(255,255,255,.88)"; g.fillRect(c.width - w - 4 * k, c.height - h - 4 * k, w, h);
    g.fillStyle = "#2E3238"; g.textBaseline = "top";
    linie.forEach((l, i) => g.fillText(l, c.width - w - 4 * k + pad, c.height - h - 4 * k + pad + i * lh));
    const a = document.createElement("a");
    a.download = `mapa-infrastruktury-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  });
  map.triggerRepaint();
}
// Dane PSE nie mają geometrii, więc są oknem, a nie warstwą. Raport pk5l-wp
// to plan dobowy, nie pomiar: napis „prognoza” musi zostać.
async function pokazKse() {
  modal("Krajowy System Elektroenergetyczny", '<p class="note">Pobieranie danych PSE…</p>');
  if (!pseDane || !pseDane.length) await loadPse();
  if (!pseDane || !pseDane.length) {
    $("#modalB").innerHTML = `<p class="note">Nie udało się pobrać danych z PSE${S.src.pse.note ? ` (${esc(S.src.pse.note)})` : ""}. Reszta mapy działa normalnie.</p>`;
    return;
  }
  const teraz = new Date().getHours();
  const biez = pseDane[Math.min(teraz, pseDane.length - 1)];
  const maks = Math.max(...pseDane.map(x => x.zapotrzebowanie));
  const mw = v => v == null ? "brak" : `${fmt(Math.round(v))} MW`;
  const slupki = pseDane.map((x, i) => {
    const h = Math.round(100 * x.zapotrzebowanie / maks);
    const oze = x.zapotrzebowanie ? Math.round(100 * ((x.wiatr || 0) + (x.pv || 0)) / x.zapotrzebowanie) : 0;
    return `<div class="kse-b${i === teraz ? " now" : ""}" title="${esc(x.godz)} · ${mw(x.zapotrzebowanie)} · OZE ${oze}%">
      <i style="height:${h}%"><u style="height:${Math.min(100, oze)}%"></u></i><span>${String(i).padStart(2, "0")}</span></div>`;
  }).join("");
  const oze = biez.zapotrzebowanie ? Math.round(100 * ((biez.wiatr || 0) + (biez.pv || 0)) / biez.zapotrzebowanie) : 0;
  $("#modalB").innerHTML = `
    <dl class="kv">
      <dt>Godzina</dt><dd>${esc(biez.godz)}</dd>
      <dt>Zapotrzebowanie sieci</dt><dd>${mw(biez.zapotrzebowanie)}</dd>
      <dt>Generacja wiatrowa</dt><dd>${mw(biez.wiatr)}</dd>
      <dt>Generacja fotowoltaiczna</dt><dd>${mw(biez.pv)}</dd>
      <dt>Udział wiatru i PV</dt><dd>${oze} %</dd>
      <dt>Wymiana z zagranicą</dt><dd>${mw(biez.wymiana)}${biez.wymiana < 0 ? " (eksport)" : biez.wymiana > 0 ? " (import)" : ""}</dd>
      <dt>Wymagana rezerwa mocy</dt><dd>${mw(biez.rezerwa)}</dd>
      <dt>Ubytki i niedyspozycyjność</dt><dd>${mw(biez.ubytki)}</dd>
    </dl>
    <div class="kse">${slupki}</div>
    <p class="note">Słupek to zapotrzebowanie w danej godzinie, jaśniejsza część u dołu, udział wiatru i fotowoltaiki. Podświetlona jest bieżąca godzina.</p>
    <p class="note"><b>To jest prognoza, nie pomiar.</b> Dane pochodzą z planu koordynacyjnego dobowego PSE (raport <code>pk5l-wp</code>) publikowanego rano na cały dzień. Pomiar bieżącej pracy systemu PSE udostępnia pod adresem, którego przeglądarka nie może odczytać (brak nagłówka CORS), więc mapa go nie pokazuje zamiast zgadywać.</p>
    <p class="note">Liczby dotyczą całego kraju, PSE nie publikuje ich w podziale na województwa. Dlatego nie ma tu warstwy na mapie.</p>
    <p class="note">${atr("pse")}</p>`;
}

async function pokazDiagnostyke() {
  const klatki = await new Promise(res => {
    let n = 0; const t0 = performance.now();
    const licz = () => { n++; performance.now() - t0 < 600 ? requestAnimationFrame(licz) : res(Math.round(n / ((performance.now() - t0) / 1000))); };
    requestAnimationFrame(licz);
  });
  const app = document.querySelector(".app").getBoundingClientRect();
  const gl = map.painter?.context?.gl;
  const info = gl && gl.getExtension("WEBGL_debug_renderer_info");
  const karta = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "nieznana";
  const zgubiony = gl ? gl.isContextLost() : true;
  const wlaczone = Object.values(ITEMS).filter(i => i.on && !i.base && !i.teren);
  const rysowane = map.queryRenderedFeatures().length;
  const wObiektach = Object.values(D.layers).reduce((s, l) => s + (l.features?.length || 0), 0);
  const pamiec = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + " MB z "
    + Math.round(performance.memory.jsHeapSizeLimit / 1048576) + " MB" : "przeglądarka nie podaje";
  const rozjazd = Math.abs(Math.round(app.height) - window.innerHeight);
  const problemy = [zgubiony && "kontekst WebGL utracony: odśwież stronę (Ctrl+R)",
    rozjazd > 2 && `układ rozjechany o ${rozjazd} px, program próbuje go naprawić`,
    klatki < 20 && `niska płynność (${klatki} kl./s): wyłącz najcięższe warstwy`].filter(Boolean);
  const sekcja = (t, wiersze) => `<h4>${t}</h4>${kv(wiersze)}`;
  modal("Diagnostyka", `<div class="diag-stan ${problemy.length ? "zle" : "ok"}">${problemy.length
      ? "<b>Wykryte problemy</b><br>" + problemy.map(esc).join("<br>")
      : "<b>Wszystko działa poprawnie</b><br>Mapa ma sprawny kontekst graficzny, płynność i poprawny układ okna."}</div>`
    + sekcja("Ekran i grafika", [
      ["Okno przeglądarki", `${window.innerWidth} × ${window.innerHeight} px, skala ${window.devicePixelRatio}`],
      ["Karta graficzna", esc(String(karta))],
      ["Kontekst WebGL", zgubiony ? "utracony" : "sprawny"]])
    + sekcja("Wydajność", [
      ["Płynność", `${klatki} klatek na sekundę`],
      ["Pamięć JavaScriptu", pamiec],
      ["Rysowane teraz", fmt(rysowane) + " obiektów"]])
    + sekcja("Dane na mapie", [
      ["Włączone warstwy", `${wlaczone.length} z ${Object.values(ITEMS).filter(i => !i.base && !i.teren).length}`],
      ["Obiekty w pliku", fmt(wObiektach)],
      ["Dane OpenStreetMap", zakresDat() || "brak daty"],
      ["Przybliżenie", map.getZoom().toFixed(1) + (S.teren ? " · rzeźba 3D" : "") + (S.globe ? " · globus" : "")]])
    + sekcja("Stabilność układu", [
      ["Wysokość aplikacji", `${Math.round(app.height)} px` + (rozjazd > 2 ? ` (rozjazd ${rozjazd} px)` : ", zgodna z oknem")],
      ["Naprawy widoku", napraw.ile ? `${napraw.ile}, ostatnia ${napraw.ostatnia.toLocaleTimeString("pl-PL")}` : "nie były potrzebne"],
      ["Cofnięte przewinięcia", przewiniecia ? String(przewiniecia) : "brak"]])
    + (napraw.pomiary.length ? `<details class="lic-pelne"><summary>Ostatnie pomiary układu (dla zgłoszenia błędu)</summary><pre>${
        napraw.pomiary.slice(-8).map(x => `${x.czas.toLocaleTimeString("pl-PL")}  okno ${x.okno} · app ${x.app} · css ${x.dvh} (${esc(x.powod)})`).join("\n")}</pre></details>` : "")
    + `<p class="note">Gdy mapa zwalnia, wyłącz najcięższe warstwy (stacje elektroenergetyczne, maszty, tereny przemysłowe, stawy) albo kliknij <b>Nic</b> nad drzewem i włącz tylko potrzebne.</p>`);
}
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 4200); }

const ACT = {
  import: () => $("#fileIn").click(), png: savePng, about: () => modal("O danych i źródłach", aboutHtml()),
  keys: () => modal("Skróty klawiszowe", KEYS), find: openFind, clear: clearSel,
  tree: () => showTree(), aside: () => showAside(), globe: () => setGlobe(!S.globe), teren: () => setTeren(!S.teren),
  home: () => { if (S.globe) setGlobe(false); map.fitBounds(HOME, {padding: 30}); },
  world: () => { map.easeTo({center: [17, 30], zoom: 1.3, duration: 900}); },
  full: () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(),
  refresh: () => {
    ensureSatGroups(true); loadMotis(true);
    for (const id in ZYWE) if (ITEMS[id].on) ZYWE[id].on();
    if (pseDane) loadPse();
  },
  zin: () => map.zoomIn(), zout: () => map.zoomOut(), "modal-x": () => $("#scrim").classList.remove("on"),
  napraw: () => naprawWidok(true),
  diag: pokazDiagnostyke,
  kse: pokazKse,
  // Bez podkładu, bo w nim może być włączony tylko jeden. Pytanie przed
  // włączeniem: kilkadziesiąt tysięcy obiektów potrafi zamrozić słabszy komputer.
  "layers-all": () => modal("Włączyć wszystkie warstwy?", `<p class="pyt">Mapa narysuje naraz kilkadziesiąt tysięcy obiektów
      i połączy się ze wszystkimi źródłami na żywo. Na słabszym komputerze może to na chwilę spowolnić
      albo zamrozić przeglądarkę.</p><p class="pyt">Wygodniej zacząć od gotowego <b>Widoku</b> nad listą warstw.</p>
    <div class="pyt-btn"><button class="btn" data-act="modal-x">Anuluj</button>
      <button class="btn on" data-act="layers-all-tak">Włącz wszystko</button></div>`),
  "layers-all-tak": () => {
    $("#scrim").classList.remove("on");
    applyBulkToggle(TREE.filter(g => g.id !== "podklad").flatMap(g => g.items), true);
    setTimeout(() => {
      const n = map.queryRenderedFeatures().length;
      if (n > 12000) toast(`Włączono wszystkie warstwy: ${fmt(n)} obiektów w widoku. Mapa może zwolnić, płynność sprawdzisz w Pomoc → Diagnostyka.`);
    }, 400);
  },
  "layers-none": () => applyBulkToggle(TREE.filter(g => g.id !== "podklad").flatMap(g => g.items), false),
};
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  // Odnośnik „Źródła i licencje” w rogu mapy to <a href="#">; bez
  // preventDefault dopisywałby „#” do adresu strony.
  if (b && ACT[b.dataset.act]) { e.preventDefault(); closeMenus(); ACT[b.dataset.act](); }
});

const closeMenus = () => document.querySelectorAll(".mb.open").forEach(m => m.classList.remove("open"));
document.querySelectorAll(".mb>button").forEach(btn => {
  btn.addEventListener("click", e => { e.stopPropagation(); const m = btn.parentElement, was = m.classList.contains("open"); closeMenus(); if (!was) { m.classList.add("open"); refreshChecks(); } });
  btn.addEventListener("mouseenter", () => { if (document.querySelector(".mb.open") && !btn.parentElement.classList.contains("open")) { closeMenus(); btn.parentElement.classList.add("open"); } });
});
document.addEventListener("click", e => { if (!e.target.closest(".mb")) closeMenus(); });

document.addEventListener("keydown", e => {
  const inInput = e.target.matches("input,textarea");
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && ["f", "b", "i", "o", "s"].includes(k)) {
    e.preventDefault();
    ({f: openFind, b: () => showTree(), i: () => showAside(), o: ACT.import, s: savePng})[k]();
    return;
  }
  if (inInput) return;
  if (e.key === "Escape") { closeMenus(); $("#scrim").classList.remove("on"); $("#find").classList.remove("on"); clearSel(); }
  else if (k === "g") setGlobe(!S.globe);
  else if (k === "t") setTeren(!S.teren);
  else if (e.key === "Home") ACT.home();
  else if (e.key === "F8") { e.preventDefault(); naprawWidok(true, "F8"); }
  else if (e.key === "?") ACT.keys();
});

// Panel puszczony poniżej ZWIN px chowa się, a szerokość wraca do ostatniej
// użytecznej, bo inaczej po przywróceniu miałby 0 px.
const ZWIN = 110, MIN_PANEL = 170;
function uchwytPanelu(grip, panel, zmienna, klucz, wLewo, schowaj) {
  let x0 = null, w0 = 0;
  const ustaw = w => { document.documentElement.style.setProperty(zmienna, w + "px"); map.resize(); };
  grip.addEventListener("pointerdown", e => { x0 = e.clientX; w0 = panel.offsetWidth; grip.classList.add("on"); grip.setPointerCapture(e.pointerId); });
  grip.addEventListener("pointermove", e => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    ustaw(Math.max(0, Math.min(760, w0 + (wLewo ? -dx : dx))));
  });
  grip.addEventListener("pointerup", () => {
    if (x0 == null) return;
    x0 = null; grip.classList.remove("on");
    const w = panel.offsetWidth;
    if (w < ZWIN) { ustaw(Math.max(MIN_PANEL, w0)); schowaj(); return; }
    const ok = Math.max(MIN_PANEL, w);
    ustaw(ok); store.set(klucz, ok);
  });
  const zapis = store.get(klucz, null);
  if (zapis) ustaw(Math.max(MIN_PANEL, zapis));
}
uchwytPanelu($("#grip"), $("#aside"), "--pw", "pw", true, () => showAside(false));
uchwytPanelu($("#gripL"), $("#tree"), "--tw", "tw", false, () => showTree(false));

// Rozmiar okna i aplikacji w pasku stanu: zrzut ekranu od razu pokazuje,
// czy układ się rozjechał. CSS wyświetla go tylko w stanie .zle.
function miaraWidoku() {
  const app = document.querySelector(".app");
  if (!app) return "";
  const h = Math.round(app.getBoundingClientRect().height);
  const zle = Math.abs(h - window.innerHeight) > 2;
  return `<span class="st-diag${zle ? " zle" : ""}"><span class="st-sep"></span><span class="st-miara${zle ? " zle" : ""}" title="Wysokość okna przeglądarki kontra wysokość aplikacji. Różnica oznacza rozjechany układ.">`
    + `okno ${window.innerWidth}×${window.innerHeight} · widok ${h}${napraw.ile ? ` · napraw ${napraw.ile}` : ""}</span></span>`;
}

function renderStatus() {
  const ts = zakresDat();
  // „© OpenStreetMap” stoi tu na stałe, bo pełna atrybucja w rogu startuje zwinięta.
  $("#status").innerHTML = `<a class="st-osm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>
    <span class="st-meta">${ts ? "dane OSM " + ts : ""}</span>
    ${miaraWidoku()}
    ${/* Transitous wymaga kontaktu na stronie, która odpytuje ich API. */""}
    <span class="st-dolab">${aHref(PROGRAM.www, "dolnyslask.tech")} · ${aHref(PROGRAM.kontakt, "kontakt")}</span>
    <button class="st-link" data-act="about">Źródła i licencje</button>`;
}

renderTree();
renderStatus();
refreshChecks();
if (innerWidth <= 1100) { showTree(false); showAside(false); }
map.on("load", () => {
  addLayers();
  updatePlaces();
  updatePeaks();
  renderPanel();
  ensureSatGroups();
  if (ITEMS["w-radar"].on) loadRadar();
  for (const id in ZYWE) if (ITEMS[id].on) ZYWE[id].on();
  if (ITEMS["b-teren"].on) setTeren(true);
  loadMotis(true);
  renderTree();
  setInterval(() => { if (!document.hidden) tickSats(); }, 250);
  // Bez odpytywania w karcie w tle: Transitous prosi o oszczędność, a każda
  // otwarta karta to około 2900 zapytań na dobę.
  setInterval(() => { if (!document.hidden && Object.values(ITEMS).some(i => i.pojazd && i.on)) loadMotis(); }, 30000);
  setInterval(() => { if (!document.hidden && motisDane.length) rysujPojazdy(); }, 1000);
  setInterval(() => { if (ITEMS["w-radar"].on) loadRadar(); }, 5 * 60e3);
  // Wodowskazy IMGW aktualizują się co 10 min, częściej nie ma sensu pytać.
  setInterval(() => { if (ITEMS["w-g"].on) loadImgw(); }, 10 * 60e3);
  setInterval(() => { if (!document.hidden && ITEMS["d-ut"].on) loadGddkia(); }, 10 * 60e3);
  setInterval(() => { if (!document.hidden && ITEMS["a-pm"].on) loadPowietrze(); }, 10 * 60e3);
  setInterval(() => { if (!document.hidden && ITEMS["w-ost"].on) loadOstrzezenia(); }, 20 * 60e3);
  // Open-Meteo przelicza „current” co 15 min; 30 min trzyma nas daleko od limitu dobowego.
  setInterval(() => { if (!document.hidden && ITEMS["w-chm"].on) loadChmury(); }, 30 * 60e3);
  const c = map.getCenter();
  $("#coord").textContent = `${c.lat.toFixed(4)}° N  ${c.lng.toFixed(4)}° E  ·  z ${map.getZoom().toFixed(1)}`;
  document.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
  window.addEventListener("resize", () => naprawWidok());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { naprawWidok(); tickSats(true); } });
  setInterval(() => naprawWidok(), 2000);

  window.__ready = true;
});
