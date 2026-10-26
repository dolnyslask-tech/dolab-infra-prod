/* Ikony obiektów: znak z zestawu ikon (01a-znaki.js, wybór z edytora ikon) na
   plakietce. Kształt plakietki mówi, z której grupy warstw jest obiekt, a odcień
   barwy grupy, z której warstwy. Przy 18 px same koła różniły się tylko kolorem
   i grupy zlewały się w jedno, dlatego każda grupa ma własny kształt.

   Znaki to SVG z obrysami, więc rysuje je przeglądarka z obrazu SVG, a to trwa
   asynchronicznie. MapLibre musi mieć obraz, zanim narysuje warstwę, dlatego
   wszystkie obrazy powstają przed addLayers() (ZNAKI_GOTOWE w 09-ui.js).
   Numer 01b, bo korzysta z C, ITEMS, TREE i SAT_GROUPS z 01-podstawy.js. */

// Flaga warstw użytkownika: Pinhead (CC0 1.0), rysowana od razu przez Path2D,
// bo własną warstwę można dodać w dowolnej chwili, a nie tylko przy starcie.
const IKONY = {
  "flaga": {zr: "pinhead", sym: "flag", vb: [0, 0, 15, 15], d: ["M4.42 1.08C2.38 1.08.8 3.63.18 4.44c-.11.17-.18.37-.18.59v8.12c-.02.44.3.83.7.85.18.02.37-.06.5-.19.78-1.16 1.93-1.93 3.22-2.16 2.34 0 3.24 2.35 5.69 2.35 1.65-.19 3.23-.89 4.55-2.01.22-.17.33-.45.33-.74V1.91c.05-.44-.25-.85-.65-.9a.633.633 0 0 0-.38.07 9.343 9.343 0 0 1-3.85 1.96c-2.45.03-3.25-1.96-5.69-1.96Z"]},
};

/* ik:  klucz z ZNAKI albo {pole, mapa: {wartość: klucz}, dom: klucz}, gdy rodzaj zależy od danych.
   kol: barwa plakietki; bez niej odcień grupy (tonWarstwy). {pole, progi}, gdy
        kolor niesie wartość (PM2,5): tam skala znaczy więcej niż przynależność do grupy.
   s:   mnożnik rozmiaru: obiekty ważne większe, gęsto rozsiane mniejsze. */
const IK = {
  "c-k": {ik: "kamera-widokowa"}, "c-g": {ik: "kamera-widokowa"}, "c-a": {ik: "kamera-widokowa"},
  "c-z": {ik: "kamera-widokowa"}, "c-v": {ik: "kamera-widokowa"},
  "c-d": {ik: "kamera-drogowa"},
  "c-o": {ik: "kamera-monitoringu"},
  "c-l": {ik: "kamera-monitoringu", s: .85},

  "m-pog": {ik: "stacja-meteo"},
  "m-dro": {ik: "stacja-drogowa-meteo"},
  "m-wod": {ik: "wodowskaz"},
  "m-pow": {ik: "stacja-powietrza"},
  "m-inne": {ik: {pole: "co", mapa: {promieniowanie: "promieniowanie"}, dom: "stacja-pomiarowa"}, s: .85},
  "m-tab": {ik: "tablica-zmiennej-tresci", s: .9},

  "w-g": {ik: {pole: "lod", mapa: {1: "lod-na-rzece"}, dom: "wodowskaz"}},
  "d-ut": {ik: {pole: "rodz", mapa: {zamkniecie: "zamkniecie-drogi", wypadek: "wypadek"}, dom: "roboty-drogowe"}},
  "a-pm": {ik: "stacja-powietrza", kol: {pole: "pm25", progi: [[null, "#94a3b8"], [0, "#16a34a"], [10, "#84cc16"], [25, "#eab308"], [50, "#f97316"], [75, "#b91c1c"]]}},

  "p-dal": {ik: {pole: "mode", mapa: {NIGHT_RAIL: "pociag-nocny", COACH: "autokar"}, dom: "pociag-dalekobiezny"}},
  "p-reg": {ik: "pociag-regionalny", s: .95},
  "p-msc": {ik: {pole: "mode", mapa: {TRAM: "tramwaj", FERRY: "prom-kursowy", CABLE_CAR: "kolej-linowa",
            AERIAL_LIFT: "kolej-linowa", FUNICULAR: "kolej-linowa"}, dom: "autobus"}, s: .85},

  "p-d": {ik: "most-drogowy", s: .9},
  "p-k": {ik: "most-kolejowy", s: .9},
  "p-p": {ik: "przeprawa-promowa"},

  "l-p": {ik: "port-lotniczy", s: 1.3},
  "l-l": {ik: "lotnisko"},
  "l-w": {ik: "lotnisko-wojskowe"},
  "l-h": {ik: "ladowisko-smiglowcow", s: .9},

  "g-i": {ik: "terminal-intermodalny", s: 1.15},
  "g-t": {ik: "stacja-towarowa"},
  "g-m": {ik: "magazyn", s: .85},
  "g-p": {ik: "port-rzeczny", s: 1.1},

  // Ikona według paliwa (plant:source): większość to małe elektrownie wodne,
  // przy których chłodnia kominowa wprowadzałaby w błąd.
  "e-el": {ik: {pole: "zrodlo", mapa: {
             coal: "elektrownia-weglowa", "coal;biomass": "elektrownia-weglowa", "gas;coal": "elektrownia-weglowa",
             gas: "elektrownia-gazowa", oil: "elektrownia-gazowa", hydro: "elektrownia-wodna",
             biomass: "elektrownia-biomasa", biogas: "elektrownia-biomasa",
             waste: "spalarnia", battery: "magazyn-energii"}, dom: "elektrownia"}, s: 1.2},
  "e-pv": {ik: "farma-fotowoltaiczna"},
  "e-wi": {ik: "turbina-wiatrowa"},
  "e-sth": {ik: "stacja-elektroenergetyczna", s: 1.35},
  "e-st1": {ik: "stacja-elektroenergetyczna", s: 1.05},
  "e-st": {ik: "stacja-elektroenergetyczna", s: .75},
  "e-ma": {ik: "maszt-telekomunikacyjny", s: .85},
  "e-sl": {ik: "sluza-jaz"},
  "e-oc": {ik: {pole: "kat", mapa: {wodociag: "wieza-cisnien"}, dom: "oczyszczalnia-sciekow"}},

  "x-ko-p": {ik: "kopalnia-odkrywkowa", s: 1.1},
  "x-sz": {ik: {pole: "kat", mapa: {kopalnia: "kopalnia-podziemna"}, dom: "szyb-kopalni"}},
  "x-za": {ik: "zaklad-przemyslowy"},
  "x-pa": {ik: {pole: "kat", mapa: {odwiert: "odwiert"}, dom: "zbiornik-paliw"}},
  "x-ga": {ik: "gazownictwo"},
  "x-te": {ik: "teren-przemyslowy", s: .85},

  "b-d": {ik: "przejscie-graniczne"},
  "b-k": {ik: "przejscie-kolejowe"},

  "t-gl": {ik: "szczyt-glowny"},
  "t-sz": {ik: "szczyt"},
};
for (const g of Object.keys(SAT_GROUPS))
  IK["s-" + g] = {ik: "satelita", s: g === "stations" ? 1.1 : g === "starlink" ? .45 : .65};

/* Kształt i barwa grupy (kształty z rodziny Material 3: koło, ciastka, słońca,
   wielokąty o zaokrąglonych rogach). Barwy żywe, w stylu DoLab: złoty, czarny
   i biały marki plus kilka czystych barw. znak: kolor rysunku na ciemnej
   plakietce; na jasnej (złoto) rysunek jest zawsze czarny, dla kontrastu.
   Trójkąt dla utrudnień, bo tak wygląda znak ostrzegawczy. */
const GRUPY_ZNAKOW = {
  transport: {ksz: "kolo", kol: "#0B0B0B", znak: "#FABC06"},
  kamery:    {ksz: "ciastko4", kol: "#0B0B0B"},
  pomiary:   {ksz: "ciastko9", kol: "#0284C7"},
  pogoda:    {ksz: "slonce", kol: "#10B981"},
  woda:      {ksz: "klejnot", kol: "#1D4ED8"},
  drogi:     {ksz: "trojkat", kol: "#E11D48"},
  przeprawy: {ksz: "pigulka", kol: "#0D9488"},
  lotnictwo: {ksz: "wachlarz", kol: "#4F46E5"},
  logistyka: {ksz: "muszla", kol: "#EA580C"},
  energia:   {ksz: "romb", kol: "#FABC06"},
  przemysl:  {ksz: "pieciokat", kol: "#2E3238", znak: "#FABC06"},
  gory:      {ksz: "strzalka", kol: "#16A34A"},
  granice:   {ksz: "ciastko6", kol: "#C026D3"},
  kosmos:    {ksz: "rozblysk", kol: "#7C3AED"},
};

// Punkty odkrywek (x-ko-p) to podwarstwa pozycji x-ko z drzewa.
const pozycjaWarstwy = id => ITEMS[id] ? id : ITEMS[id.replace(/-p$/, "")] ? id.replace(/-p$/, "") : null;
const grupaWarstwy = id => ITEMS[pozycjaWarstwy(id)]?.group;
const ksztaltWarstwy = id => GRUPY_ZNAKOW[grupaWarstwy(id)]?.ksz || "kolo";

function naHsl(hex) {
  const n = parseInt(hex.slice(1), 16), [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map(x => x / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

// Jasność względna (WCAG): od niej zależy, czy rysunek ma być czarny, czy jasny.
function luminancja(hex) {
  const n = parseInt(hex.slice(1), 16);
  const k = x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; };
  return .2126 * k(n >> 16) + .7152 * k((n >> 8) & 255) + .0722 * k(n & 255);
}

function kolorZnaku(kol, ksz) {
  if (luminancja(kol) > .3) return "#0B0B0B";
  return Object.values(GRUPY_ZNAKOW).find(g => g.ksz === ksz)?.znak || STYL_ZNAKOW.znakKol;
}

function hsl(h, s, l) {
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, hh = h / 360;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return "#" + [f(hh + 1 / 3), f(hh), f(hh - 1 / 3)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

// Ton warstwy: jasność barwy grupy przesunięta o najwyżej ±0,09, rozłożona
// złotym podziałem, a nie po kolei: sąsiednie pozycje w drzewie (np. stacje
// 400 kV i 110 kV) dostają wyraźnie różne tony. Barwa i nasycenie zostają.
function tonWarstwy(id) {
  const g = grupaWarstwy(id), gr = GRUPY_ZNAKOW[g];
  if (!gr) return "#2E3238";
  const czlonkowie = TREE.find(x => x.id === g).items.map(it => it.id)
    .filter(i => Object.keys(IK).some(k => pozycjaWarstwy(k) === i));
  const i = czlonkowie.indexOf(pozycjaWarstwy(id)), n = czlonkowie.length;
  if (n < 2) return gr.kol;
  const [h, s, l] = naHsl(gr.kol), poz = (i * .618034) % 1;
  // Czarny jaśnieje w stronę grafitu, złoto ciemnieje w stronę bursztynu.
  const dl = l < .15 ? .2 * poz : l > .5 ? -.1 * poz : .18 * (poz - .5);
  return hsl(h, s, Math.min(.85, Math.max(.04, l + dl)));
}
for (const [id, s] of Object.entries(IK)) if (!s.kol) s.kol = tonWarstwy(id);

/* Kształty plakietek w polu 64 × 64. znak: wielkość znaku względem koła
   (trójkąt i romb mają mniej miejsca w środku), dy: przesunięcie znaku w dół
   o ułamek pola, bo środek ciężkości trójkąta leży niżej niż środek pola. */
const KSZTALTY = (() => {
  const S = 64, c = S / 2, R = c - 1.5, f = x => +x.toFixed(2);
  const biegun = (r, obrot = 0, n = 144) => "M" + Array.from({length: n}, (_, i) => {
    const t = i / n * 2 * Math.PI, q = R * r(t - obrot);
    return f(c + q * Math.cos(t)) + " " + f(c + q * Math.sin(t));
  }).join("L") + "Z";
  const fala = (n, a, p = 1) => t => 1 - a + a * Math.pow((1 + Math.cos(n * t)) / 2, p);
  // Każdy róg ścięty krzywą przez wierzchołek, w odległości t długości boku.
  const wielokat = (pkt, t = .22) => pkt.map((v, i) => {
    const p = pkt[(i + pkt.length - 1) % pkt.length], nx = pkt[(i + 1) % pkt.length];
    const a = [v[0] + (p[0] - v[0]) * t, v[1] + (p[1] - v[1]) * t], b = [v[0] + (nx[0] - v[0]) * t, v[1] + (nx[1] - v[1]) * t];
    return `${i ? "L" : "M"}${f(a[0])} ${f(a[1])}Q${f(v[0])} ${f(v[1])} ${f(b[0])} ${f(b[1])}`;
  }).join("") + "Z";
  const foremny = (n, r, cy = c) => Array.from({length: n}, (_, i) => {
    const t = -Math.PI / 2 + i / n * 2 * Math.PI; return [c + r * Math.cos(t), cy + r * Math.sin(t)];
  });
  return {
    kolo:      {d: biegun(() => 1), znak: 1, dy: 0},
    ciastko4:  {d: biegun(fala(4, .14), Math.PI / 4), znak: .98, dy: 0},
    ciastko6:  {d: biegun(fala(6, .1), -Math.PI / 2), znak: .95, dy: 0},
    ciastko9:  {d: biegun(fala(9, .08), -Math.PI / 2), znak: .95, dy: 0},
    slonce:    {d: biegun(fala(8, .16)), znak: .86, dy: 0},
    rozblysk:  {d: biegun(fala(8, .28, 3), -Math.PI / 2), znak: .74, dy: 0},
    trojkat:   {d: wielokat([[32, 2.5], [61.5, 58], [2.5, 58]], .2), znak: .66, dy: .1},
    strzalka:  {d: wielokat([[32, 2.5], [61.5, 60], [32, 48], [2.5, 60]], .2), znak: .64, dy: .05},
    romb:      {d: wielokat([[32, 1.5], [62.5, 32], [32, 62.5], [1.5, 32]], .2), znak: .76, dy: 0},
    pieciokat: {d: wielokat(foremny(5, 31.5, 34), .2), znak: .84, dy: .03},
    klejnot:   {d: wielokat(foremny(6, 31), .22), znak: .9, dy: 0},
    muszla:    {d: wielokat([[17, 8], [47, 8], [62, 32], [47, 56], [17, 56], [2, 32]], .3), znak: .86, dy: 0},
    pigulka:   {d: "M21 13H43A19 19 0 0 1 43 51H21A19 19 0 0 1 21 13Z", znak: .78, dy: 0},
    wachlarz:  {d: "M9 2.5H30A31.5 31.5 0 0 1 61.5 34V55.5Q61.5 61.5 55.5 61.5H9Q2.5 61.5 2.5 55.5V9Q2.5 2.5 9 2.5Z", znak: .96, dy: .02},
  };
})();

/* Plakietka ze znakiem jako SVG: ten sam rysunek trafia do drzewa warstw (wprost)
   i na mapę (przez obraz). marg: miejsce na cień poza plakietką, w pikselach. */
let _uidZnaku = 0;
function svgZnaku(klucz, kol, ksztalt, px, marg = 0) {
  const z = ZNAKI[klucz], K = KSZTALTY[ksztalt], st = STYL_ZNAKOW, S = 64, n = ++_uidZnaku;
  if (!z || !K) return "";
  const m = S * marg / px, r = S * z.znak / 100 * K.znak, x = (S - r) / 2, y = (S - r) / 2 + K.dy * S;
  const cien = st.cien > 0 ? `<filter id="zc${n}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="${st.cienY}" stdDeviation="${st.cienRoz}" flood-color="#0f172a" flood-opacity="${st.cien / 100}"/></filter>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px + 2 * marg}" height="${px + 2 * marg}" viewBox="${f2(-m)} ${f2(-m)} ${f2(S + 2 * m)} ${f2(S + 2 * m)}" color="${kolorZnaku(kol, ksztalt)}" style="overflow:visible" aria-hidden="true">`
    + `<defs>${cien}<linearGradient id="zp${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${st.polysk / 100}"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`
    + `<path d="${K.d}" fill="${kol}" fill-opacity="${st.tloAlfa / 100}"${cien ? ` filter="url(#zc${n})"` : ""}/>`
    + (st.polysk ? `<path d="${K.d}" fill="url(#zp${n})"/>` : "")
    + `<svg x="${f2(x)}" y="${f2(y)}" width="${f2(r)}" height="${f2(r)}" viewBox="0 0 ${z.w} ${z.h}">${z.b}</svg></svg>`;
}
const f2 = x => +x.toFixed(2);

const ZNAK_MARG = 3, ZNAK_SKALA = 2;
const OBRAZY_ZNAKOW = new Map();
let ZNAKI_ZASTEPCZE = 0;
const idZnaku = (klucz, kol, ksz) => `zn:${klucz}:${kol}:${ksz}`;

// Wszystkie pary (znak, barwa) potrzebne warstwom: tę samą listę przechodzi ikonaWarstwy().
function wariantyZnakow() {
  const w = [];
  for (const [id, s] of Object.entries(IK)) {
    const klucze = typeof s.ik === "string" ? [s.ik] : [...Object.values(s.ik.mapa), s.ik.dom];
    const kolory = s.kol.progi ? s.kol.progi.map(([, k]) => k) : [s.kol];
    for (const k of klucze) for (const kol of kolory) w.push([k, kol, ksztaltWarstwy(id)]);
  }
  return w;
}

async function rastrujZnak(klucz, kol, ksz) {
  const px = STYL_ZNAKOW.rozmiar * ZNAK_SKALA, marg = ZNAK_MARG * ZNAK_SKALA, wym = px + 2 * marg;
  const img = new Image(wym, wym);
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgZnaku(klucz, kol, ksz, px, marg));
  await img.decode();
  const c = document.createElement("canvas");
  c.width = c.height = wym;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0, wym, wym);
  return g.getImageData(0, 0, wym, wym);
}

// Gdy przeglądarka nie zdekoduje SVG, zostaje sama plakietka w barwie warstwy:
// obiekt stoi na mapie, tylko bez rysunku. Lepsze to niż pusta warstwa.
function znakZastepczy(kol, ksz) {
  ZNAKI_ZASTEPCZE++;
  const k = ZNAK_SKALA, wym = (STYL_ZNAKOW.rozmiar + 2 * ZNAK_MARG) * k, c = document.createElement("canvas");
  c.width = c.height = wym;
  const g = c.getContext("2d"), sk = STYL_ZNAKOW.rozmiar * k / 64;
  g.translate(ZNAK_MARG * k, ZNAK_MARG * k); g.scale(sk, sk);
  g.fillStyle = kol; g.fill(new Path2D(KSZTALTY[ksz].d));
  return g.getImageData(0, 0, wym, wym);
}

// Nigdy nie odrzuca: błąd jednego znaku nie może zatrzymać startu mapy.
const ZNAKI_GOTOWE = Promise.all(wariantyZnakow().map(async ([klucz, kol, ksz]) => {
  const id = idZnaku(klucz, kol, ksz);
  if (OBRAZY_ZNAKOW.has(id)) return;
  OBRAZY_ZNAKOW.set(id, null);
  try { OBRAZY_ZNAKOW.set(id, await rastrujZnak(klucz, kol, ksz)); }
  catch (e) { console.warn("Ikona " + klucz + " bez rysunku:", e); }
}));

function obrazZnaku(klucz, kol, ksz, wlasneId) {
  const id = wlasneId || idZnaku(klucz, kol, ksz);
  if (map.hasImage(id)) return id;
  map.addImage(id, OBRAZY_ZNAKOW.get(idZnaku(klucz, kol, ksz)) || znakZastepczy(kol, ksz), {pixelRatio: ZNAK_SKALA});
  return id;
}

// to-string, żeby liczby (lod: 1) i napisy dopasowywały się tak samo.
function ikonaWarstwy(id) {
  const s = IK[id];
  if (!s) throw new Error("Warstwa bez ikony: " + id);
  const ksz = ksztaltWarstwy(id);
  if (s.kol.progi) {
    const [[, k0], ...reszta] = s.kol.progi;
    const e = ["step", ["coalesce", ["get", s.kol.pole], -1], obrazZnaku(s.ik, k0, ksz)];
    for (const [prog, k] of reszta) e.push(prog, obrazZnaku(s.ik, k, ksz));
    return e;
  }
  if (typeof s.ik === "string") return obrazZnaku(s.ik, s.kol, ksz);
  const e = ["match", ["to-string", ["get", s.ik.pole]]];
  for (const [w, n] of Object.entries(s.ik.mapa)) e.push(String(w), obrazZnaku(n, s.kol, ksz));
  e.push(obrazZnaku(s.ik.dom, s.kol, ksz));
  return e;
}

const ikonaGlowna = id => { const s = IK[id]; return s && (typeof s.ik === "string" ? s.ik : s.ik.dom); };

// Próbka w drzewie warstw i legendzie. PM2,5 pokazuje barwę dobrego powietrza.
function svgWarstwy(id, px = 16) {
  const s = IK[id];
  if (!s) return "";
  return svgZnaku(ikonaGlowna(id), s.kol.progi ? s.kol.progi[1][1] : s.kol, ksztaltWarstwy(id), px);
}

// Cienki kształt w jasnym kolorze znika na jasnej mapie, więc jasne kolory
// przyciemniamy o 30 %; odcień zostaje zgodny z legendą.
function kolorIkony(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const jasnosc = (.2126 * r + .7152 * g + .0722 * b) / 255;
  if (jasnosc < .55) return "#" + m[1];
  const t = x => Math.round(x * .7).toString(16).padStart(2, "0");
  return "#" + t(r) + t(g) + t(b);
}

/* Flaga: kształt w kolorze warstwy z białą obwódką, która utrzymuje czytelność
   na zdjęciu lotniczym. Podwójna rozdzielczość dla ekranów HiDPI. */
const IKONA_PX = 20, IKONA_SKALA = 2;
function rysujIkone(nazwa, kolor) {
  const ik = IKONY[nazwa];
  if (!ik) throw new Error("Nieznana ikona: " + nazwa);
  const px = IKONA_PX * IKONA_SKALA, k = IKONA_SKALA, c = document.createElement("canvas");
  c.width = c.height = px;
  const g = c.getContext("2d"), [vx, vy, vw, vh] = ik.vb, sk = (px - 4.4 * k) / Math.max(vw, vh);
  g.translate((px - vw * sk) / 2, (px - vh * sk) / 2);
  g.scale(sk, sk); g.translate(-vx, -vy);
  g.lineJoin = "round"; g.lineCap = "round";
  const sciezki = ik.d.map(d => new Path2D(d));
  g.lineWidth = 3.2 * k / sk; g.strokeStyle = "#fff"; for (const p of sciezki) g.stroke(p);
  g.fillStyle = kolorIkony(kolor); for (const p of sciezki) g.fill(p);
  return c;
}

function obrazIkony(nazwa, kolor, wlasneId) {
  const id = wlasneId || `ik:${nazwa}:${kolor}`;
  if (map.hasImage(id)) return id;
  const c = rysujIkone(nazwa, kolor);
  map.addImage(id, c.getContext("2d").getImageData(0, 0, c.width, c.height), {pixelRatio: IKONA_SKALA});
  return id;
}

function svgIkony(nazwa, kolor, px = 16) {
  const ik = IKONY[nazwa];
  if (!ik) return "";
  return `<svg viewBox="${ik.vb.join(" ")}" width="${px}" height="${px}" aria-hidden="true">`
    + ik.d.map(d => `<path fill="${kolorIkony(kolor)}" d="${d}"/>`).join("") + "</svg>";
}

// Poniżej z6 ikony maleją dalej, inaczej region zlewa się w plamę.
// Satelity są widoczne od z1, więc mają łagodniejszą skalę.
const rozmiarIkony = (id, satelita = false) => {
  const s = IK[id]?.s || 1;
  return satelita
    ? ["interpolate", ["linear"], ["zoom"], 1, .5 * s, 6, .7 * s, 12, s]
    : ["interpolate", ["linear"], ["zoom"], 4, .3 * s, 6, .55 * s, 9, .75 * s, 12, s, 15, 1.25 * s];
};


/* Faktura obszaru ostrzeżenia oznacza zjawisko, stopień zostaje w kolorze obwódki
   jak u IMGW. API nie podaje kodu rodzaju, więc rozpoznajemy go po nazwie
   zdarzenia; nieznana nazwa daje "inne", nic nie znika. */
const ZJAWISKA = {
  mgla:   {nazwa: "mgła",              kolor: "#64748b", re: /mgł|szadź/i},
  burza:  {nazwa: "burza",             kolor: "#7c3aed", re: /burz|grad/i},
  snieg:  {nazwa: "śnieg",             kolor: "#0369a1", re: /śnie|zawiej|zamie/i},
  lod:    {nazwa: "oblodzenie",        kolor: "#0891b2", re: /marzn|oblodz|gołoled/i},
  mroz:   {nazwa: "mróz",              kolor: "#1d4ed8", re: /mróz|mroz|przymroz/i},
  deszcz: {nazwa: "deszcz",            kolor: "#2563eb", re: /deszcz|opad|roztop/i},
  wiatr:  {nazwa: "wiatr",             kolor: "#0f766e", re: /wiatr/i},
  upal:   {nazwa: "upał",              kolor: "#dc2626", re: /upał|upal/i},
  inne:   {nazwa: "inne zjawisko",     kolor: "#a16207", re: null},
};
// Kolejność kluczy to priorytet dopasowania: "burze z opadami deszczu" to burza,
// "opady marznące" to oblodzenie, a nie deszcz.
const rodzajZjawiska = nazwa => Object.keys(ZJAWISKA).find(k => ZJAWISKA[k].re?.test(nazwa || "")) || "inne";

// Kafel powtarzany bez szwu: każdy kształt rysujemy też przesunięty o ±S w obu
// osiach, więc to, co wystaje za krawędź, wraca z drugiej strony.
const WZOR_PX = 64;
function obrazWzoru(rodzaj) {
  const id = "wz:" + rodzaj;
  if (map.hasImage(id)) return id;
  // Mgła i opady na większym kaflu: na 64 px powtórzenie widać gołym okiem.
  const zOpadem = ["burza", "deszcz", "snieg"].includes(rodzaj);
  const S = rodzaj === "mgla" || zOpadem ? 2 * WZOR_PX : WZOR_PX, k = 2, c = document.createElement("canvas");
  c.width = c.height = S * k;
  const g = c.getContext("2d");
  g.scale(k, k); g.lineCap = "round"; g.lineJoin = "round";
  let z = 7;                                        // stały los: ten sam wzór przy każdym starcie
  const los = () => ((z = (z * 16807) % 2147483647) / 2147483647);
  const wokol = f => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.save(); g.translate(dx, dy); f(); g.restore(); } };
  const kol = ZJAWISKA[rodzaj]?.kolor || ZJAWISKA.inne.kolor;
  const punkty = (n, f) => { for (let i = 0; i < n; i++) { const x = los() * S, y = los() * S; wokol(() => f(x, y, i)); } };
  if (rodzaj === "deszcz") {
    g.strokeStyle = kol; g.globalAlpha = .6; g.lineWidth = 1.4;
    punkty(22, (x, y) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 9); g.stroke(); });
  } else if (rodzaj === "burza") {
    g.fillStyle = "#facc15"; g.strokeStyle = "#7c5a00"; g.lineWidth = 1; g.lineJoin = "round";
    punkty(5, (x, y) => {
      g.beginPath(); g.moveTo(x + 4, y); g.lineTo(x - 2, y + 11); g.lineTo(x + 2, y + 11); g.lineTo(x - 2, y + 21);
      g.lineTo(x + 8, y + 8); g.lineTo(x + 3, y + 8); g.lineTo(x + 7, y); g.closePath(); g.fill(); g.stroke();
    });
  } else if (rodzaj === "snieg") {
    g.strokeStyle = kol; g.globalAlpha = .65; g.lineWidth = 1.2;
    punkty(12, (x, y) => {
      for (let a = 0; a < 3; a++) { const t = a * Math.PI / 3; g.beginPath(); g.moveTo(x - 4 * Math.cos(t), y - 4 * Math.sin(t)); g.lineTo(x + 4 * Math.cos(t), y + 4 * Math.sin(t)); g.stroke(); }
    });
  } else if (rodzaj === "mgla") {
    // Przeglądarka bez filtra canvasu narysuje po prostu ostrzejsze krawędzie.
    g.filter = "blur(2px)";
    punkty(16, (x, y, i) => {
      const r = 8 + 9 * los(), sx = 1.8 + los();
      g.translate(x, y); g.scale(sx, 1);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, `rgba(100,116,139,${.16 + .1 * (i % 3) / 2})`); gr.addColorStop(1, "rgba(100,116,139,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    });
    g.filter = "blur(.8px)";
    g.strokeStyle = "rgba(100,116,139,.28)"; g.lineWidth = 1.6;
    punkty(7, (x, y) => {
      const dl = 24 + 30 * los();
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + dl / 3, y - 2.5, x + 2 * dl / 3, y + 2.5, x + dl, y); g.stroke();
    });
    g.filter = "none";
  } else if (rodzaj === "mroz") {
    g.strokeStyle = kol; g.globalAlpha = .55; g.lineWidth = 1.1;
    punkty(5, (x, y) => {
      const r = 5;
      for (let a = 0; a < 3; a++) { const t = a * Math.PI / 3; g.beginPath(); g.moveTo(x - r * Math.cos(t), y - r * Math.sin(t)); g.lineTo(x + r * Math.cos(t), y + r * Math.sin(t)); g.stroke(); }
    });
  } else if (rodzaj === "wiatr") {
    g.strokeStyle = kol; g.globalAlpha = .5; g.lineWidth = 1.3;
    for (const y of [10, 32, 54]) wokol(() => {
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= S; x += 2) g.lineTo(x, y + 3 * Math.sin(x / S * 4 * Math.PI));
      g.stroke();
    });
  } else if (rodzaj === "lod") {
    g.strokeStyle = kol; g.globalAlpha = .4; g.lineWidth = 1;
    for (let i = -S; i <= S; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.moveTo(i + S, 0); g.lineTo(i, S); g.stroke(); }
  } else if (rodzaj === "upal") {
    g.strokeStyle = kol; g.globalAlpha = .45; g.lineWidth = 1.3;
    for (const x of [10, 32, 54]) wokol(() => {
      g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= S; y += 2) g.lineTo(x + 2.5 * Math.sin(y / S * 6 * Math.PI), y);
      g.stroke();
    });
  } else {
    g.strokeStyle = kol; g.globalAlpha = .45; g.lineWidth = 1.2;
    // Odstęp musi dzielić 64, inaczej na łączeniu kafli widać szew.
    for (let i = -S; i <= S; i += 8) { g.beginPath(); g.moveTo(i, S); g.lineTo(i + S, 0); g.stroke(); }
  }
  map.addImage(id, g.getImageData(0, 0, S * k, S * k), {pixelRatio: k});
  return id;
}
