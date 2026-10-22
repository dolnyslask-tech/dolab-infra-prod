/* Zaznaczanie obiektów, zdarzenia mapy i własne warstwy GeoJSON.
   Pliki z app/src są sklejane alfabetycznie we wspólny zasięg zmiennych. */
function clearSel() {
  S.selected = null;
  for (const id of ["sel", "sat-track", "sat-foot", "pojazd-trasa"]) map.getSource(id)?.setData({type: "FeatureCollection", features: []});
  renderPanel();
}
function selectFeature(f, lngLat) {
  const src = f.source;
  if (src === "sats") { selectSat(String(f.properties.id)); return; }
  if (src === "pojazdy") { selectPojazd(String(f.properties.id)); return; }
  const userName = src.startsWith("user-") ? USER[src]?.name : null;
  S.selected = {kind: "feature", src: userName ? "user" : src, props: f.properties, lngLat, userName};
  map.getSource("sat-track").setData({type: "FeatureCollection", features: []});
  map.getSource("sat-foot").setData({type: "FeatureCollection", features: []});
  const g = f.geometry;
  map.getSource("sel").setData(g.type === "Polygon" || g.type === "MultiPolygon" ?
    {type: "FeatureCollection", features: []} : {type: "Feature", properties: {}, geometry: g});
  showAside(true);
  renderPanel();
}
function selectPojazd(id) {
  const p = motisDane.find(x => x.id === id);
  if (!p) return;
  S.selected = {kind: "pojazd", id};
  map.getSource("sat-track").setData({type: "FeatureCollection", features: []});
  map.getSource("sat-foot").setData({type: "FeatureCollection", features: []});
  map.getSource("sel").setData({type: "FeatureCollection", features: []});
  showAside(true);
  rysujPojazdy();
  renderPojazdPanel(p);
}

function selectSat(id, fly) {
  const s = SAT.byId.get(String(id));
  if (!s) return;
  S.selected = {kind: "sat", id: s.id};
  showAside(true);
  tickSats(true);
  drawSatExtras();
  renderSatPanel();
  if (fly && s.st) map.easeTo({center: [s.st.lon, s.st.lat], zoom: Math.min(map.getZoom(), 3.2), duration: 800});
}

const tip = $("#tip");
function pick(point) {
  const box = [[point.x - 6, point.y - 6], [point.x + 6, point.y + 6]];
  const fs = map.queryRenderedFeatures(box, {layers: [...INTERACTIVE(), ...Object.keys(USER).flatMap(k => USER[k].layers)]});
  // Punkty mają pierwszeństwo przed liniami, a linie przed obszarami.
  const rank = f => f.geometry.type === "Point" ? 0 : f.geometry.type.includes("Line") ? 1 : 2;
  return fs.sort((a, b) => rank(a) - rank(b))[0];
}
function tipText(f) {
  const p = f.properties;
  switch (f.source) {
    case "sats": { const s = SAT.byId.get(String(p.id)); return [p.n, s?.st ? `${fmt(s.st.alt, 0)} km · ${SAT_GROUPS[p.g].label}` : "", ""]; }
    case "pojazdy": return [p.n, `${MODE_PL[p.mode] || p.mode}${p.rt ? " · na żywo" : ""}`, `${p.skad || ""} → ${p.dokad || ""}`];
    case "drogi": return [p.ref || p.n || "droga", ROAD[p.k], p.n && p.ref ? p.n : ""];
    case "kolej": return [p.nr ? "Linia nr " + p.nr : (p.n || "linia kolejowa"), p.e ? "zelektryfikowana" : "niezelektryfikowana", ""];
    case "woda": return [p.n || "ciek bez nazwy", p.w === "canal" ? "kanał" : "rzeka", ""];
    case "przeprawy": return [p.typ === "prom" ? (p.n || "prom") : `most ${p.typ}${p.ref ? " · " + p.ref : ""}`, p.rz ? "nad: " + p.rz : "", p.teryt && GMINY[p.teryt] ? "gm. " + GMINY[p.teryt].n : ""];
    case "przejscia": return [p.ref || p.n || "przekroczenie granicy", `${p.typ} · ${KRAJ[p.kraj]}`, HW[p.kl] || ""];
    case "lotniska": return [p.n || AIR[p.kat], AIR[p.kat], p.icao || ""];
    case "logistyka": return [p.n || LOGI[p.kat], LOGI[p.kat], p.op || ""];
    case "akweny": return [p.n || {jezioro: "jezioro", zbiornik: "zbiornik", staw: "staw", rzeka: "koryto rzeki"}[p.kat] || "akwen", p.ha != null ? fmt(p.ha, 1) + " ha" : "", p.teryt && GMINY[p.teryt] ? "gm. " + GMINY[p.teryt].n : ""];
    case "kamery": return [p.n || "kamera", p.zr === "trax" ? "kamera drogowa GDDKiA" : [p.msc, p.kraj].filter(Boolean).join(", "), p.stan === "active" ? "czynna" : (p.stan || "")];
    case "kopalnie": return [p.n || "kopalnia odkrywkowa", SUROWCE[p.sur] || p.sur || "", p.ha ? fmt(p.ha) + " ha" : ""];
    case "przemysl": return [p.n || p.kat, p.op || "", TRESC[p.co] || p.prod || SUROWCE[p.sur] || ""];
    case "energetyka": return [p.kat === "rurociag" ? (p.n || "rurociąg") : (p.v ? fmt(p.v / 1000) + " kV" : "linia elektroenergetyczna") + (p.kab ? " · kabel podziemny" : ""), p.op || "", p.ref || ""];
    case "infra-punkty": return [p.n || p.kat, p.kat, p.moc || (p.v ? fmt(p.v / 1000) + " kV" : "")];
    case "imgw": return [p.n, p.stan != null ? `stan wody ${p.stan} cm` : "brak pomiaru", p.rz || ""];
    case "gminy": return [p.n, "gmina", p.teryt];
    case "szczyty": return [p.n, p.ele ? `${fmt(p.ele)} m n.p.m.` : "szczyt", p.pas || (p.teryt && GMINY[p.teryt] ? "gm. " + GMINY[p.teryt].n : "")];
    case "granica": return ["Granica państwa", "", ""];
    // Napisy zgodne z describe() w 07-panel.js.
    case "ostrzezenia": return [p.zdarzenia || "Ostrzeżenie meteorologiczne",
      ({3: "III stopień", 2: "II stopień", 1: "I stopień"})[p.st] || "ostrzeżenie IMGW", p.do ? "do " + p.do : ""];
    case "gddkia": return [p.typ || p.klasa || "Utrudnienie w ruchu", `${p.droga ? "DK " + p.droga : "droga krajowa"}${p.km != null ? ` · km ${p.km}` : ""}`, p.zwloka || ""];
    case "powietrze": return [p.pm25 != null ? `PM2,5: ${p.pm25.toFixed(1)} µg/m³` : "Czujnik jakości powietrza", "czujnik Sensor.Community", p.t || ""];
    case "stacje": return [p.n || (p.ref ? "Stacja " + p.ref : "Stacja pomiarowa"), p.zr === "trax" ? "drogowa stacja meteo GDDKiA" : "stacja pomiarowa", p.op || ""];
    case "tablice": return [p.n || "Tablica zmiennej treści", "tablica zmiennej treści", p.op || ""];
    case "ulice-lok": return [p.ref || p.n || (p.kl === "P" ? "droga powiatowa" : "droga lokalna"), p.kl === "P" ? "droga powiatowa" : "droga gminna lub lokalna", p.ref && p.n ? p.n : ""];
    case "ulice-mia": return [p.n || "ulica bez nazwy", p.m || "", ""];
    case "chmury": return [`${p.opis || "zachmurzenie"} · ${p.cc} %`, `gm. ${p.n}${p.opad ? ` · opad ${fmt(p.opad, 1)} mm` : ""}`, "model Open-Meteo"];
    // Źródło bez własnego przypadku dostaje rodzaj z KIND, żeby dymek
    // zawsze mówił przynajmniej, z jakiej warstwy jest obiekt.
    default: return [p.name || p.nazwa || p.n || USER[f.source]?.name || KIND[f.source] || "Obiekt bez nazwy", USER[f.source] ? "własna warstwa" : (KIND[f.source] || ""), ""];
  }
}
map.on("mousemove", e => {
  $("#coord").textContent = `${e.lngLat.lat.toFixed(4)}° N  ${e.lngLat.lng.toFixed(4)}° E  ·  z ${map.getZoom().toFixed(1)}`;
  const f = pick(e.point);
  map.getCanvas().style.cursor = f ? "pointer" : "";
  if (!f) { tip.classList.remove("on"); return; }
  const [t, v, p] = tipText(f);
  tip.innerHTML = `<div class="t">${esc(t)}</div>${v ? `<div class="v">${esc(v)}</div>` : ""}${p ? `<div class="p">${esc(p)}</div>` : ""}`;
  const box = $(".mapcol").getBoundingClientRect();
  let x = e.point.x + 14, y = e.point.y + 14;
  if (x + 260 > box.width) x = e.point.x - 14 - tip.offsetWidth;
  if (y + 90 > box.height) y = e.point.y - 14 - tip.offsetHeight;
  tip.style.left = x + "px"; tip.style.top = y + "px";
  tip.classList.add("on");
});
map.on("mouseout", () => tip.classList.remove("on"));
map.on("click", e => {
  const f = pick(e.point);
  if (!f) { clearSel(); return; }
  // Gminy są ostatnie w kolejności pick(): klik otwiera gminę tylko wtedy,
  // gdy pod kursorem nie ma żadnej infrastruktury.
  selectFeature(f, e.lngLat);
});
map.on("contextmenu", e => e.preventDefault());
// Sterownik GPU potrafi odebrać kontekst WebGL (uśpienie, reset sterownika).
// Mapa wtedy gaśnie, a bez komunikatu wygląda to na zawieszenie programu.
map.on("webglcontextlost", () => {
  toast("Przeglądarka straciła kontekst grafiki (WebGL). Odśwież stronę: Ctrl+R.");
  console.warn("webglcontextlost: mapa wymaga odswiezenia strony");
});
map.on("zoom", updatePlaces);
map.on("move", updatePeaks);
map.on("moveend", () => { if (Object.values(ITEMS).some(i => i.pojazd && i.on)) loadMotis(); });
// Ulice ładują się leniwie po osiągnięciu progu zoomu. Przy przesunięciu mapy
// sprawdza to tylko ten handler, przy przełączeniu warstwy applyVisibility().
map.on("moveend", () => { sprawdzLeniwe(); });
map.on("moveend", () => { const c = map.getCenter(); $("#coord").textContent = `${c.lat.toFixed(4)}° N  ${c.lng.toFixed(4)}° E  ·  z ${map.getZoom().toFixed(1)}`; });

const USER = {};
let userN = 0;
function addUserLayer(name, gj) {
  const id = "user-" + (++userN);
  const col = ["#be185d", "#0e7490", "#4d7c0f", "#b45309", "#6d28d9"][(userN - 1) % 5];
  gj.features?.forEach((f, i) => { if (f.id == null) f.id = i; });
  map.addSource(id, {type: "geojson", data: gj});
  const layers = [id + "-f", id + "-l", id + "-p"];
  map.addLayer({id: id + "-f", type: "fill", source: id, filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]], paint: {"fill-color": col, "fill-opacity": .18}}, "sat-foot");
  map.addLayer({id: id + "-l", type: "line", source: id, filter: ["!=", ["geometry-type"], "Point"], paint: {"line-color": col, "line-width": 2}}, "sat-foot");
  map.addLayer({id: id + "-p", type: "symbol", source: id, filter: ["==", ["geometry-type"], "Point"],
    layout: {"icon-image": obrazIkony("flaga", col), "icon-size": rozmiarIkony(id), "icon-allow-overlap": true, "icon-ignore-placement": true}}, "sat-foot");
  USER[id] = {name, layers, n: gj.features?.length || 0, col};
  let grp = TREE.find(g => g.id === "user");
  if (!grp) { grp = {id: "user", label: "Własne warstwy", items: []}; TREE.push(grp); openGroups.add("user"); }
  const it = {id, label: name, sw: ["pt", col], on: true, group: "user", src: null, user: true};
  grp.items.push(it); ITEMS[id] = it;
  countCache[id] = fmt(USER[id].n);
  renderTree(); applyUserVisibility();
  const b = new maplibregl.LngLatBounds();
  const walk = c => typeof c[0] === "number" ? b.extend(c) : c.forEach(walk);
  gj.features?.forEach(f => f.geometry && walk(f.geometry.coordinates));
  if (!b.isEmpty()) map.fitBounds(b, {padding: 60, maxZoom: 13});
  toast(`Wczytano ${name}: ${fmt(USER[id].n)} obiektów`);
}
function applyUserVisibility() {
  for (const id in USER) for (const l of USER[id].layers) ustawWidocznosc(l, ITEMS[id].on);
}
const _applyVisibility = applyVisibility;
applyVisibility = function () { _applyVisibility(); applyUserVisibility(); };
$("#fileIn").addEventListener("change", async e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const gj = JSON.parse(await file.text());
    if (gj.type !== "FeatureCollection" && gj.type !== "Feature") throw new Error("to nie jest GeoJSON");
    addUserLayer(file.name.replace(/\.(geo)?json$/i, ""), gj.type === "Feature" ? {type: "FeatureCollection", features: [gj]} : gj);
  } catch (err) { toast("Nie udało się wczytać pliku: " + err.message); }
});
