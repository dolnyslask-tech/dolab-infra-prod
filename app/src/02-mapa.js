/* Pliki z app/src są sklejane alfabetycznie w jeden skrypt o wspólnym zasięgu
   zmiennych: kolejność plików to kolejność wykonania. */

const style = {
  version: 8,
  sources: {},
  // Tło to morze; od z6 przechodzi w ląd, bo obrysy Natural Earth rozjeżdżają się z OSM o kilka km.
  layers: [{id: "bg", type: "background", paint: {"background-color": ["interpolate", ["linear"], ["zoom"], 5, "#dde5ec", 6.5, "#eef0ee"]}}],
};
const map = new maplibregl.Map({
  container: "map",
  style,
  bounds: HOME,
  fitBoundsOptions: {padding: 30},
  attributionControl: false,
  maxPitch: 60,
  dragRotate: false,
  // Bez preserveDrawingBuffer (szybciej); savePng czyta płótno w zdarzeniu "render".
});
map.touchZoomRotate.disableRotation();
map.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-left");
// Stała część atrybucji: dane wbudowane w plik. Źródła na żywo i podkłady mają
// `attribution` w addSource, więc MapLibre pokazuje je tylko przy widocznej warstwie.
// Zwinięcie do „i” jest dopuszczalne, bo oznaczenie OSM stale widać w pasku stanu (renderStatus).
map.addControl(new maplibregl.AttributionControl({compact: true, customAttribution:
  `${atr("osm", "prg", "ne")} · <a href="#" data-act="about">Źródła i licencje</a> · © ${PROGRAM.rok} DoLab (${PROGRAM.licencjaKodu})`}), "bottom-right");

const W = z => ["interpolate", ["linear"], ["zoom"], ...z];   // szerokość zależna od zoomu

/* Warstwy leniwe: ulice to największy zbiór geometrii, a addSource blokuje wątek na sekundę
   lub dwie. Źródło powstaje, gdy zoom dojdzie do progu (najniższy minzoom jego warstw)
   i jakaś pozycja drzewa z niego jest włączona; raz zbudowane zostaje. */
// Warunki Windy wymagają napisu „Webcams provided by windy.com” zawsze, gdy kamery
// są widoczne, dlatego atrybucja siedzi na źródle, nie tylko w oknie licencji.
const ATR_WARSTW = {
  kamery: atr("windy", "trax", "airmax", "lubin", "zachodnia", "devices"),
  stacje: atr("trax"),
  tablice: atr("trax"),
};

const LENIWE = {
  "ulice-lok": {prog: 10, buduj: () => {
    ulica("u-l", C.ulLok, [11, .4, 14, 1.1, 17, 2.6], 11);
    ulica("u-p", C.ulPow, [10, .5, 13, 1.4, 16, 3.2], 10);
  }},
  "ulice-mia": {prog: 13, buduj: () => {
    ulica("u-s", C.ulSerw, [14, .4, 17, 1.8], 14);
    ulica("u-m", C.ulMia, [13, .6, 16, 2.4, 18, 5], 13);
  }},
};
const leniweGotowe = new Set();

// Ulice pod "r-DW", najniższą klasą dróg głównych: inaczej sieć osiedlowa
// przykryłaby drogę wojewódzką w mieście.
function ulica(id, col, w, minzoom) {
  const it = ITEMS[id];
  map.addLayer({id, type: "line", source: it.src, filter: it.filter, minzoom,
    layout: {"line-join": "round", "line-cap": "round", visibility: it.on ? "visible" : "none"},
    paint: {"line-color": col, "line-width": W(w)}}, map.getLayer("r-DW") ? "r-DW" : undefined);
}

function sprawdzLeniwe() {
  // addSource przed `load` rzuca wyjątek; "gminy" powstaje zawsze synchronicznie
  // w addLayers(), więc służy za wskaźnik gotowości stylu.
  if (!map.getSource("gminy")) return false;
  const z = map.getZoom();
  let zbudowano = false;
  for (const [nazwa, cfg] of Object.entries(LENIWE)) {
    if (leniweGotowe.has(nazwa) || z < cfg.prog) continue;
    if (!Object.values(ITEMS).some(it => it.src === nazwa && it.on)) continue;
    leniweGotowe.add(nazwa);                 // także gdy danych brak: nie próbujemy w kółko
    const dane = D.layers[nazwa];
    if (!dane || !dane.features.length) continue;
    map.addSource(nazwa, {type: "geojson", data: dane, promoteId: "id"});
    cfg.buduj();
    zbudowano = true;
  }
  return zbudowano;
}

// Najcięższe źródła widoczne już przy całym regionie: budujemy je po pierwszej klatce
// (requestIdleCallback), żeby nie blokowały pierwszego renderu.
const ODROCZONE = ["drogi", "energetyka", "infra-punkty"];
// Limit 1,5 s: migające pojazdy przerysowują mapę bez przerwy, więc przeglądarka
// nigdy nie bywa bezczynna i bez limitu energetyka nie zbudowałaby się wcale.
const idleCb = window.requestIdleCallback ? fn => window.requestIdleCallback(fn, {timeout: 1500}) : fn => setTimeout(fn, 0);

// Jedna, dokładna linia na granicy województwa z Czechami i Niemcami.
// Obrys województwa (z Atlasu, uproszczony: 320 punktów) i granica państwa
// (OSM, dokładna) biegną tam wzdłuż siebie, ale rozjeżdżają się o kilkaset
// metrów i wyglądały jak dwie granice. Ma być jedna linia, gruba (styl
// województwa) i dokładna. Dlatego:
// - odcinki granicy państwa leżące przy obrysie przechodzą do obrysu
//   województwa (rysują się grubo, z dokładnym przebiegiem z OSM),
// - uproszczone odcinki obrysu leżące przy granicy państwa wypadają,
// - reszta granicy państwa (poza województwem) zostaje cienka.
// Białe tło województwa dalej idzie po uproszczonych gminach z Atlasu.
// 4 km, nie 2: przy worku turoszowskim (Bogatynia) uproszczony obrys odstaje
// od granicy o ponad 2 km i zostawaly tam dwie linie.
const GRANICA_BLISKO_KM = 4;
// Sklejanie stykajacych sie odcinkow w dlugie linie. Granica z OSM to
// kilkaset krotkich drog; wzor kreska-kropka zaczyna sie od nowa na kazdej
// z nich, wiec w oddaleniu linia wygladala na ciagla.
function polaczLinie(linie) {
  const k = p => p[0].toFixed(6) + "," + p[1].toFixed(6);
  const wolne = linie.map(l => l.slice());
  const wynik = [];
  while (wolne.length) {
    let l = wolne.pop(), dolaczono = true;
    while (dolaczono) {
      dolaczono = false;
      for (let i = 0; i < wolne.length; i++) {
        const m = wolne[i], a = k(l[0]), z = k(l[l.length - 1]), ma = k(m[0]), mz = k(m[m.length - 1]);
        if (z === ma) l = l.concat(m.slice(1));
        else if (z === mz) l = l.concat(m.slice(0, -1).reverse());
        else if (a === mz) l = m.concat(l.slice(1));
        else if (a === ma) l = m.slice().reverse().concat(l.slice(1));
        else continue;
        wolne.splice(i, 1); dolaczono = true; break;
      }
    }
    wynik.push(l);
  }
  return wynik;
}
function podzielGranice(granica, obrys) {
  if (!granica?.features || !obrys?.features) return {granica, obrys};
  const kx = 111.32 * Math.cos(51 * Math.PI / 180), ky = 110.57;
  const linieZ = g => g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" || g.type === "Polygon" ? g.coordinates : [];
  const odcinki = fc => {
    const o = [];
    for (const f of fc.features) for (const l of linieZ(f.geometry))
      for (let i = 1; i < l.length; i++) o.push([l[i - 1][0] * kx, l[i - 1][1] * ky, l[i][0] * kx, l[i][1] * ky]);
    return o;
  };
  const blisko = odc => ([lon, lat]) => {
    const x = lon * kx, y = lat * ky;
    for (const [ax, ay, bx, by] of odc) {
      const dx = bx - ax, dy = by - ay, d2 = dx * dx + dy * dy;
      const t = d2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / d2)) : 0;
      if (Math.hypot(x - ax - t * dx, y - ay - t * dy) < GRANICA_BLISKO_KM) return true;
    }
    return false;
  };
  // Dzieli linie warstwy na biegi "przy drugiej linii" i "z dala od niej".
  const podziel = (fc, czyBlisko) => {
    const przy = [], zDala = [];
    for (const f of fc.features) for (const l of linieZ(f.geometry)) {
      let bieg = [], stan = null;
      const zamknij = () => { if (bieg.length > 1) (stan ? przy : zDala).push(bieg); };
      for (const p of l) {
        const b = czyBlisko(p);
        if (stan !== null && b !== stan) { zamknij(); bieg = [bieg[bieg.length - 1]]; }
        stan = b; bieg.push(p);
      }
      zamknij();
    }
    return {przy, zDala};
  };
  const g = podziel(granica, blisko(odcinki(obrys)));
  const o = podziel(obrys, blisko(odcinki(granica)));
  const fc = linie => ({type: "FeatureCollection", features: linie.length ? [{type: "Feature", properties: {}, geometry: {type: "MultiLineString", coordinates: linie}}] : []});
  return {granica: {...granica, ...fc(polaczLinie(g.zDala))}, obrys: {...obrys, ...fc(polaczLinie([...o.zDala, ...g.przy]))}};
}
{
  const p = podzielGranice(D.layers.granica, D.layers["woj-obrys"]);
  D.layers.granica = p.granica;
  D.layers["woj-obrys"] = p.obrys;
}

function addLayers() {
  for (const [k, gj] of Object.entries(D.layers)) {
    if (k in LENIWE || ODROCZONE.includes(k)) continue;   // patrz LENIWE i ODROCZONE
    map.addSource(k, {type: "geojson", data: gj, promoteId: "id", ...(ATR_WARSTW[k] ? {attribution: ATR_WARSTW[k]} : {})});
  }
  for (const b of BASEMAPS) {
    if (b.tiles) map.addSource(b.id, {type: "raster", tiles: b.tiles, tileSize: 256, maxzoom: b.max, attribution: b.attr});
  }
  // Kafel ORM ma 512 px, ale rysunek jest w skali kafla 256 (wersja dla ekranów
  // HiDPI). Przy tileSize 512 linie i napisy wychodziły dwa razy za grube.
  map.addSource("orm", {type: "raster", tileSize: 256, maxzoom: 19,
    // Subdomeny a/b/c są wycofane przez ORM.
    tiles: ["https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"],
    attribution: atr("orm")});
  map.addSource("dem", {type: "raster-dem", tiles: DEM_TILES, tileSize: 256, maxzoom: 13, encoding: "terrarium",
    attribution: atr("tilezen")});
  // RainViewer ma mozaikę tylko do z7, wyżej zwraca planszę „Zoom Level Not Supported”;
  // maxzoom 7 każe MapLibre rozciągać ostatni poziom.
  map.addSource("radar", {type: "raster", tiles: ["https://tilecache.rainviewer.com/v2/radar/0/512/{z}/{x}/{y}/2/1_1.png"],
    tileSize: 512, maxzoom: 7,
    attribution: atr("rainviewer")});
  map.addSource("pojazdy", {type: "geojson", data: {type: "FeatureCollection", features: []}, promoteId: "id", attribution: atr("transitous")});
  map.addSource("pojazd-trasa", {type: "geojson", data: {type: "FeatureCollection", features: []}});
  map.addSource("imgw", {type: "geojson", data: {type: "FeatureCollection", features: []}, promoteId: "id", attribution: atr("imgw")});
  map.addSource("sats", {type: "geojson", data: {type: "FeatureCollection", features: []}, promoteId: "id", attribution: atr("celestrak")});
  map.addSource("sat-track", {type: "geojson", data: {type: "FeatureCollection", features: []}});
  map.addSource("sat-foot", {type: "geojson", data: {type: "FeatureCollection", features: []}});
  map.addSource("sel", {type: "geojson", data: {type: "FeatureCollection", features: []}});
  map.addSource("gddkia", {type: "geojson", data: {type: "FeatureCollection", features: []}, promoteId: "id", attribution: atr("gddkia")});
  map.addSource("ostrzezenia", {type: "geojson", data: {type: "FeatureCollection", features: []}, promoteId: "id", attribution: atr("imgw")});
  map.addSource("powietrze", {type: "geojson", data: {type: "FeatureCollection", features: []}, promoteId: "id", attribution: atr("sensor")});
  map.addSource("chmury", {type: "geojson", data: {type: "FeatureCollection", features: []}, promoteId: "id", attribution: atr("openmeteo")});

  const L = (spec, before) => map.addLayer(spec, before);

  // Bez podkładu szare tło poza województwem pokazuje granicę obszaru pełnych danych.
  L({id: "land", type: "fill", source: "swiat", maxzoom: 6.5, paint: {"fill-color": "#eef0ee"}});
  L({id: "land-l", type: "line", source: "swiat", maxzoom: 6, paint: {"line-color": "#b8c2cc", "line-width": .7}});
  for (const b of BASEMAPS) {
    if (b.tiles) L({id: b.id, type: "raster", source: b.id, layout: {visibility: "none"}, paint: {"raster-opacity": .95}});
  }
  L({id: "hillshade", type: "hillshade", source: "dem", layout: {visibility: "none"},
     paint: {"hillshade-exaggeration": .45, "hillshade-shadow-color": "#4a5568", "hillshade-accent-color": "#6b7f99",
             "hillshade-highlight-color": "#ffffff"}});
  L({id: "gm-fill", type: "fill", source: "gminy", paint: {"fill-color": "#ffffff", "fill-opacity": 0.92}});
  L({id: "b-g", type: "line", source: "gminy", paint: {"line-color": "#cbd5e1", "line-width": W([6, .3, 10, .9, 13, 1.4])}});

  // Obszarem ostrzeżenia jest powiat, ale rysujemy go wielobokami gmin, bo tylko
  // takie mamy; gminy z tym samym wypełnieniem czytają się jako jeden obszar.
  const OSTRZ_KOLOR = ["match", ["get", "st"], 3, C.ostrz3, 2, C.ostrz2, 1, C.ostrz1, C.ostrzS];
  const zjMatch = f => { const e = ["match", ["get", "zj"]]; for (const k in ZJAWISKA) if (k !== "inne") e.push(k, f(k)); e.push(f("inne")); return e; };
  L({id: "w-ost", type: "fill", source: "ostrzezenia", layout: {visibility: "none"},
     paint: {"fill-color": zjMatch(k => ZJAWISKA[k].kolor), "fill-opacity": .1}});
  L({id: "w-ost-w", type: "fill", source: "ostrzezenia", layout: {visibility: "none"},
     paint: {"fill-pattern": zjMatch(obrazWzoru), "fill-opacity": .95}});
  // Obwódka biegnie wokół każdej gminy, więc cienka i półprzezroczysta, inaczej rysuje siatkę.
  L({id: "w-ost-l", type: "line", source: "ostrzezenia", layout: {visibility: "none"},
     paint: {"line-color": OSTRZ_KOLOR, "line-width": W([6, .6, 10, 1.2]), "line-opacity": .55}});
  // Ten sam wzór co granica państwa (kreska-kropka). Na podkładach z obrysKD ciemna
  // linia ginie; applyVisibility() zmienia ją na pomarańcz z ciemną otoczką "woj-c".
  L({id: "woj-c", type: "line", source: "woj-obrys", layout: {"line-join": "round"},
     paint: {"line-color": "#1c1917", "line-width": W([6, 5.5, 10, 9, 14, 12]), "line-opacity": 0}});
  L({id: "woj", type: "line", source: "woj-obrys", layout: {"line-join": "round"},
     paint: {"line-color": C.border, "line-width": W([6, 2.2, 10, 3.6, 14, 5]), "line-opacity": .9,
       "line-dasharray": [4, 2, 1, 2]}});

  // Akweny pod liniami cieków: linia rzeki ma biec po środku swojej powierzchni.
  for (const [id, col, op] of [["w-je", C.jezioro, .55], ["w-zb", C.zbiornik_w, .65], ["w-st", C.staw, .5]]) {
    L({id, type: "fill", source: "akweny", filter: ITEMS[id].filter,
       minzoom: id === "w-st" ? 9 : 0,        // stawy to setki drobnych plam
       paint: {"fill-color": col, "fill-opacity": op}});
    L({id: id + "-l", type: "line", source: "akweny", filter: ITEMS[id].filter,
       minzoom: 9, paint: {"line-color": col, "line-width": .8, "line-opacity": .9}});
  }

  const water = (id, f, dash) => L({id, type: "line", source: "woda", filter: f,
    layout: {"line-join": "round", "line-cap": "round"},
    paint: {"line-color": C.river, "line-width": W([6, .5, 9, 1.1, 12, 2.4, 15, 5]), ...(dash ? {"line-dasharray": [3, 1.5]} : {})}});
  water("w-r", ITEMS["w-r"].filter);
  water("w-k", ITEMS["w-k"].filter, true);

  // Punkt tam, gdzie OSM ma tylko relację bez geometrii (pt() niżej).
  L({id: "x-ko", type: "fill", source: "kopalnie", filter: ["!=", ["geometry-type"], "Point"],
     paint: {"fill-color": C.kopalnia, "fill-opacity": .3}});
  L({id: "x-ko-l", type: "line", source: "kopalnie", filter: ["!=", ["geometry-type"], "Point"],
     paint: {"line-color": C.kopalnia, "line-width": W([7, .6, 13, 1.8])}});

  L({id: "b-l", type: "line", source: "granica", paint: {"line-color": C.border, "line-width": W([6, 1.4, 10, 2.6]), "line-dasharray": [4, 2, 1, 2]}});

  const rail = (id, col, w, dash) => L({id, type: "line", source: "kolej", filter: ITEMS[id].filter,
    layout: {"line-join": "round"},
    paint: {"line-color": col, "line-width": W(w), ...(dash ? {"line-dasharray": dash} : {})}});
  rail("k-x", C.railOld, [7, .5, 12, 1.4], [2, 2]);
  rail("k-w", C.railNar, [7, .5, 12, 1.4], [3, 1]);
  rail("k-n", C.railN, [6, .5, 9, 1, 13, 2]);
  rail("k-e", C.railE, [6, .7, 9, 1.3, 13, 2.6]);
  rail("k-b", C.railBud, [6, .8, 12, 2.4], [2, 1.2]);

  // Przygaszone barwy: kolorowe napisy ORM (stacje, numery linii) mają wyglądać
  // jak podpisy mapy, a barwy linii i tak niosą warstwy kolei pod spodem.
  L({id: "k-orm", type: "raster", source: "orm", layout: {visibility: "none"}, paint: {"raster-opacity": .85, "raster-saturation": -.7}});
  L({id: "w-radar", type: "raster", source: "radar", layout: {visibility: "none"}, paint: {"raster-opacity": .55}});
  // Chmury pod ikonami obiektów, żeby nie zasłaniały klikalnych punktów.
  const CHM_ODCIEN = {biala: "#b8c2ce", szara: "#8b97a6", mgla: "#cfd6de", deszcz: "#5f6c7d", snieg: "#b3c0cf", burza: "#323b49"};
  L({id: "w-chm", type: "fill", source: "chmury", layout: {visibility: "none"},
     paint: {"fill-color": ["match", ["get", "typ"], ...Object.entries(CHM_ODCIEN).flat(), "#8b97a6"],
       "fill-opacity": ["interpolate", ["linear"], ["get", "cc"], 20, .1, 60, .22, 100, .38]}});
  // allow-overlap i ignore-placement: obiekt nie znika dlatego, że obok stoi inny.
  // Mapa pokazuje stan, a nie wybiera za użytkownika, co jest ważne.
  const pt = (id, src, f, extra = {}) => L({id, type: "symbol", source: src, ...(f ? {filter: f} : {}),
    minzoom: extra.minzoom || 0,
    layout: {"icon-image": ikonaWarstwy(id), "icon-size": extra.rozmiar || rozmiarIkony(id),
             "icon-allow-overlap": true, "icon-ignore-placement": true},
    ...(extra.paint ? {paint: extra.paint} : {})}, extra.before);

  pt("g-t", "logistyka", ITEMS["g-t"].filter);
  pt("g-m", "logistyka", ITEMS["g-m"].filter);
  pt("g-i", "logistyka", ITEMS["g-i"].filter);
  pt("g-p", "logistyka", ITEMS["g-p"].filter);

  pt("p-p", "przeprawy", ITEMS["p-p"].filter);
  pt("p-k", "przeprawy", ITEMS["p-k"].filter);
  pt("p-d", "przeprawy", ITEMS["p-d"].filter);

  pt("l-h", "lotniska", ITEMS["l-h"].filter);
  pt("l-l", "lotniska", ITEMS["l-l"].filter);
  pt("l-w", "lotniska", ITEMS["l-w"].filter);
  pt("l-p", "lotniska", ITEMS["l-p"].filter);

  pt("b-k", "przejscia", ITEMS["b-k"].filter);
  // Przejścia na drogach głównych większe niż na lokalnych.
  const glowna = ["match", ["get", "kl"], ["motorway", "trunk", "primary"], 1, .75];
  pt("b-d", "przejscia", ITEMS["b-d"].filter, {rozmiar: ["interpolate", ["linear"], ["zoom"],
    6, ["*", .7, glowna], 9, ["*", .9, glowna], 12, ["*", 1.15, glowna], 15, ["*", 1.4, glowna]]});

  pt("x-ko-p", "kopalnie", ["==", ["geometry-type"], "Point"]);
  pt("x-te", "przemysl", ITEMS["x-te"].filter);
  pt("x-sz", "przemysl", ITEMS["x-sz"].filter);
  pt("x-za", "przemysl", ITEMS["x-za"].filter);
  pt("x-ga", "przemysl", ITEMS["x-ga"].filter);
  pt("x-pa", "przemysl", ITEMS["x-pa"].filter);

  // Symbol bez tekstu nie potrzebuje serwera glifów, więc działa offline.
  dodajIkonySzczytow();
  const szczyt = (id, ikona, rozmiar, minzoom) => L({id, type: "symbol", source: "szczyty", filter: ITEMS[id].filter, minzoom,
    layout: {"icon-image": ikona, "icon-size": W(rozmiar), "icon-allow-overlap": true, "icon-ignore-placement": true,
             "symbol-sort-key": ["-", 0, ["coalesce", ["get", "ele"], 0]]}});
  szczyt("t-sz", "szczyt", [6, .45, 10, .7, 14, 1], 0);
  szczyt("t-gl", "szczyt-gl", [6, .8, 10, 1.05, 14, 1.3], 0);

  pt("c-k", "kamery", ITEMS["c-k"].filter);
  pt("c-d", "kamery", ITEMS["c-d"].filter);
  pt("c-o", "kamery", ITEMS["c-o"].filter);
  pt("c-g", "kamery", ITEMS["c-g"].filter);
  pt("c-a", "kamery", ITEMS["c-a"].filter);
  pt("c-z", "kamery", ITEMS["c-z"].filter);
  pt("c-v", "kamery", ITEMS["c-v"].filter);
  pt("c-l", "kamery", ITEMS["c-l"].filter);

  // Pod wodowskazami IMGW, bo te niosą odczyt, a stacje tylko położenie.
  pt("m-tab", "tablice", null);
  pt("m-inne", "stacje", ITEMS["m-inne"].filter);
  pt("m-dro", "stacje", ITEMS["m-dro"].filter);
  pt("m-pow", "stacje", ITEMS["m-pow"].filter);
  pt("m-wod", "stacje", ITEMS["m-wod"].filter);
  pt("m-pog", "stacje", ITEMS["m-pog"].filter);

  pt("w-g", "imgw", null);
  pt("d-ut", "gddkia", null);

  // Progi PM2,5 (IK["a-pm"]) według WHO 2021 i indeksu GIOŚ: 10/25/50/75 µg/m³.
  pt("a-pm", "powietrze", null);

  L({id: "pojazd-trasa", type: "line", source: "pojazd-trasa", layout: {"line-join": "round"},
     paint: {"line-color": "#0f172a", "line-width": 2.4, "line-opacity": .55, "line-dasharray": [2, 1.5]}});
  for (const id of Object.keys(POJAZDY)) pt(id, "pojazdy", ["==", ["get", "w"], id]);

  L({id: "sat-foot", type: "fill", source: "sat-foot", paint: {"fill-color": "#E7A900", "fill-opacity": .08}});
  L({id: "sat-foot-l", type: "line", source: "sat-foot", paint: {"line-color": "#a06b02", "line-width": 1, "line-dasharray": [2, 2]}});
  L({id: "sat-track", type: "line", source: "sat-track", layout: {"line-join": "round"},
    paint: {"line-color": ["match", ["get", "part"], "past", "#94a3b8", "#0f172a"], "line-width": 1.6,
      "line-dasharray": ["match", ["get", "part"], "past", ["literal", [2, 2]], ["literal", [1, 0]]]}});
  for (const g of Object.keys(SAT_GROUPS))
    pt("s-" + g, "sats", ["==", ["get", "g"], g], {rozmiar: rozmiarIkony("s-" + g, true)});
  // Zaznaczenie na końcu: warstwy malują się w kolejności dodania.
  L({id: "sel-l", type: "line", source: "sel", filter: ["==", ["geometry-type"], "LineString"],
    paint: {"line-color": "#E7A900", "line-width": 7, "line-opacity": .55}});
  L({id: "sel-p", type: "circle", source: "sel", filter: ["==", ["geometry-type"], "Point"],
    paint: {"circle-color": "rgba(0,0,0,0)", "circle-radius": 11, "circle-stroke-color": "#E7A900", "circle-stroke-width": 3}});

  applyVisibility();

  // Odroczone warstwy dostają `before` wskazujące warstwę, która w kolejności
  // synchronicznej szła zaraz po nich: energetyka przed "b-l", drogi przed "k-orm",
  // infra-punkty przed "c-k". Bez tego wylądowałyby nad zaznaczeniem i satelitami.
  function budujOdroczone() {
    for (const k of ODROCZONE) {
      if (!map.getSource(k)) map.addSource(k, {type: "geojson", data: D.layers[k], promoteId: "id"});
    }
    pwr("e-low", C.pwrLow, [8, .4, 12, 1.2]);
    pwr("e-gaz", C.pipe, [7, .5, 12, 1.6], [4, 2]);
    pwr("e-mid", C.pwrMid, [7, .5, 12, 1.6]);
    pwr("e-hi", C.pwrHi, [6, .8, 12, 2.4]);

    road("r-DW", C.DW, [7, .4, 10, 1, 14, 3]);
    road("r-DK", C.DK, [6, .6, 10, 1.6, 14, 4.5], true);
    road("r-S", C.S, [6, 1, 10, 2.2, 14, 6], true);
    road("r-A", C.A, [6, 1.2, 10, 2.8, 14, 7], true);

    pt("e-ma", "infra-punkty", ITEMS["e-ma"].filter, {before: "c-k"});
    pt("e-oc", "infra-punkty", ITEMS["e-oc"].filter, {before: "c-k"});
    pt("e-st", "infra-punkty", ITEMS["e-st"].filter, {before: "c-k"});
    pt("e-st1", "infra-punkty", ITEMS["e-st1"].filter, {before: "c-k"});
    pt("e-sth", "infra-punkty", ITEMS["e-sth"].filter, {before: "c-k"});
    pt("e-pv", "infra-punkty", ITEMS["e-pv"].filter, {before: "c-k"});
    pt("e-wi", "infra-punkty", ITEMS["e-wi"].filter, {before: "c-k"});
    pt("e-sl", "infra-punkty", ITEMS["e-sl"].filter, {before: "c-k"});
    pt("e-el", "infra-punkty", ITEMS["e-el"].filter, {before: "c-k"});

    applyVisibility();
  }
  // Kable (pole kab) w osobnej warstwie, bo line-dasharray nie przyjmuje wyrażeń z danych.
  const pwr = (id, col, w, dash) => {
    const f = ITEMS[id].filter;
    if (ITEMS[id].ml) {
      L({id, type: "line", source: "energetyka", filter: ["all", f, ["!", ["has", "kab"]]], layout: {"line-join": "round"},
        paint: {"line-color": col, "line-width": W(w), "line-opacity": .85}}, "b-l");
      L({id: id + "-k", type: "line", source: "energetyka", filter: ["all", f, ["has", "kab"]], layout: {"line-join": "round"},
        paint: {"line-color": col, "line-width": W(w), "line-opacity": .85, "line-dasharray": [1.6, 1.4]}}, "b-l");
      return;
    }
    L({id, type: "line", source: "energetyka", filter: f, layout: {"line-join": "round"},
      paint: {"line-color": col, "line-width": W(w), "line-opacity": .85, ...(dash ? {"line-dasharray": dash} : {})}}, "b-l");
  };
  const road = (id, col, w, casing) => {
    if (casing) L({id: id + "-c", type: "line", source: "drogi", filter: ITEMS[id].filter,
      layout: {"line-join": "round", "line-cap": "round"},
      paint: {"line-color": "#ffffff", "line-width": W(w.map((v, i) => i % 2 ? v + 1.6 : v))}}, "k-orm");
    L({id, type: "line", source: "drogi", filter: ITEMS[id].filter,
      layout: {"line-join": "round", "line-cap": "round"}, paint: {"line-color": col, "line-width": W(w)}}, "k-orm");
  };
  idleCb(budujOdroczone);
}

const mlIds = it => it.ml || [it.id];
// Zmieniamy tylko to, co naprawdę się zmienia: każde setLayoutProperty lub
// setPaintProperty unieważnia warstwę, a applyVisibility() przechodzi po wszystkich,
// więc bez tego strażnika jedno kliknięcie przerysowuje całą mapę.
function ustawWidocznosc(id, widoczna) {
  if (!map.getLayer(id)) return;
  const chce = widoczna ? "visible" : "none";
  if ((map.getLayoutProperty(id, "visibility") || "visible") !== chce) map.setLayoutProperty(id, "visibility", chce);
}
function ustawFarbe(id, wlasciwosc, wartosc) {
  if (!map.getLayer(id)) return;
  if (JSON.stringify(map.getPaintProperty(id, wlasciwosc)) !== JSON.stringify(wartosc)) map.setPaintProperty(id, wlasciwosc, wartosc);
}
function applyVisibility() {
  sprawdzLeniwe();
  updatePeaks();
  for (const it of Object.values(ITEMS)) {
    if (it.teren) continue;                       // teren to tryb mapy, nie warstwa
    for (const id of mlIds(it)) ustawWidocznosc(id, it.on);
  }
  if (!S.selected && typeof renderPanel === "function" && document.getElementById("phead")) renderPanel();
  // Na zdjęciu lotniczym wypełnienie gmin musi zniknąć, inaczej zakrywa zdjęcie.
  const b = BASEMAPS.find(b => b.tiles && ITEMS[b.id]?.on);
  if (map.getLayer("gm-fill")) {
    ustawFarbe("gm-fill", "fill-opacity", b ? (b.ciemny ? 0 : .3) : .92);
    ustawFarbe("b-g", "line-color", b && b.ciemny ? "#f8fafc" : "#cbd5e1");
    ustawFarbe("b-g", "line-opacity", b && b.ciemny ? .45 : 1);
    ustawFarbe("land", "fill-opacity", b ? 0 : 1);
    const kd = !!(b && b.obrysKD);
    ustawFarbe("woj", "line-color", kd ? C.kd : "#0f172a");
    ustawFarbe("woj", "line-width", kd ? W([6, 3, 10, 5, 14, 7]) : W([6, 2.2, 10, 3.6, 14, 5]));
    ustawFarbe("woj", "line-opacity", kd ? 1 : .9);
    ustawFarbe("woj-c", "line-opacity", kd ? .6 : 0);
  }
}
const INTERACTIVE = () => Object.values(ITEMS).filter(it => it.on && !it.base && !it.teren && !it.raster)
  .flatMap(mlIds).filter(id => map.getLayer(id) && map.getLayer(id).type !== "raster");

// Stałe nazwy "szczyt-gl" i "szczyt": odwołują się do nich warstwy szczytów.
function dodajIkonySzczytow() {
  for (const [nazwa, id] of [["szczyt-gl", "t-gl"], ["szczyt", "t-sz"]]) {
    obrazZnaku(IK[id].ik, IK[id].kol, ksztaltWarstwy(id), nazwa);
  }
}

// `var`, nie `const`: applyVisibility() bywa wołane, zanim skrypt dojdzie do tej
// linii, a dostęp do `const` przed deklaracją rzuca wyjątek (TDZ).
var peakMarkers = (D.layers.szczyty?.features || []).map(f => {
  const el = document.createElement("div");
  const p = f.properties;
  el.className = "pk" + (p.gl ? " gl" : "");
  el.innerHTML = `${esc(p.n)}${p.ele ? `<span class="h">${p.ele}</span>` : ""}`;
  return {m: new maplibregl.Marker({element: el, anchor: "left", offset: [7, 1]}).setLngLat(f.geometry.coordinates),
          f, el, shown: false};
});
// Od najwyższego szczytu (tak sortuje build.py), z pominięciem nachodzących podpisów.
// Szerokość z liczby znaków, bo pomiar DOM przy każdym ruchu mapy jest za drogi.
let peakRaf = 0;
function updatePeaks() {
  if (!peakMarkers || peakRaf) return;
  peakRaf = requestAnimationFrame(() => {
    peakRaf = 0;
    const z = map.getZoom(), b = map.getBounds();
    const glOn = ITEMS["t-gl"]?.on, szOn = ITEMS["t-sz"]?.on;
    const zajete = [];
    for (const p of peakMarkers) {
      const pr = p.f.properties, c = p.f.geometry.coordinates;
      let want = pr.gl ? glOn && z >= 7.4 : szOn && z >= 11.5;
      if (want) want = b.contains(c);
      if (want) {
        const s = map.project(c);
        const w = (pr.n.length + String(pr.ele || "").length + 1) * (pr.gl ? 6.6 : 6) + 10;
        const r = [s.x + 4, s.y - 8, s.x + 4 + w, s.y + 8];
        want = !zajete.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
        if (want) zajete.push(r);
      }
      if (want && !p.shown) { p.m.addTo(map); p.shown = true; }
      else if (!want && p.shown) { p.m.remove(); p.shown = false; }
    }
  });
}

const placeMarkers = D.layers.miejscowosci.features.map(f => {
  const el = document.createElement("div");
  const pop = f.properties.pop || 0;
  el.className = "plc " + f.properties.p + (f.properties.p === "city" ? (pop > 300000 ? " xl" : pop > 70000 ? " l" : "") : "");
  el.textContent = f.properties.n;
    // Znacznik HTML leży nad płótnem, więc zdarzenie "click" mapy go nie widzi.
  el.addEventListener("click", e => {
    e.stopPropagation();
    const [lng, lat] = f.geometry.coordinates;
    selectFeature({source: "miejscowosci", properties: f.properties, geometry: f.geometry}, {lng, lat});
  });
  return {m: new maplibregl.Marker({element: el, anchor: "bottom"}).setLngLat(f.geometry.coordinates), f, el, shown: false};
});
// Kilka tysięcy wsi: każdy podpis to element DOM, więc pokazujemy je od z11
// i tylko w widoku, z zapasem 20 %.
const ZOOM_WSI = 11;
function updatePlaces() {
  const z = map.getZoom();
  const b = z >= ZOOM_WSI ? map.getBounds() : null;
  const dx = b ? (b.getEast() - b.getWest()) * .2 : 0, dy = b ? (b.getNorth() - b.getSouth()) * .2 : 0;
  for (const p of placeMarkers) {
    const pr = p.f.properties, pop = pr.pop || 0;
    let want;
    if (pr.p === "village") {
      const [x, y] = p.f.geometry.coordinates;
      want = !!b && x > b.getWest() - dx && x < b.getEast() + dx && y > b.getSouth() - dy && y < b.getNorth() + dy;
    } else {
      want = pr.p === "city" ? z >= 6.3 : (pop > 20000 ? z >= 8.4 : z >= 9.6);
    }
    if (want && !p.shown) { p.m.addTo(map); p.shown = true; }
    else if (!want && p.shown) { p.m.remove(); p.shown = false; }
  }
}
map.on("moveend", updatePlaces);

function nearestPlace(lon, lat) {
  let best = null, bd = 1e9;
  for (const f of D.layers.miejscowosci.features) {
    const [x, y] = f.geometry.coordinates;
    const d = Math.hypot((x - lon) * 0.63, y - lat);
    if (d < bd) { bd = d; best = f.properties.n; }
  }
  return bd < 0.08 ? best : `${lat.toFixed(3)}° N, ${lon.toFixed(3)}° E`;
}
