// Ścieżka najnowszej klatki RainViewer zmienia się co 10 min, więc adres
// kafelków trzeba podmieniać według pliku indeksu.
async function loadRadar() {
  if (!ITEMS["w-radar"].on) { S.src.radar.state = "off"; renderStatus(); renderTree(); return; }
  S.src.radar.state = "wait"; renderTree();
  try {
    const r = await fetch("https://api.rainviewer.com/public/weather-maps.json", {cache: "no-store"});
    const j = await r.json();
    const ost = j.radar.past[j.radar.past.length - 1];
    // Schemat kolorów 2 (Universal Blue) to jedyny dostępny w darmowym API.
    map.getSource("radar").setTiles([`${j.host}${ost.path}/512/{z}/{x}/{y}/2/1_1.png`]);
    S.src.radar = {state: "ok", at: new Date(ost.time * 1000)};
  } catch (e) {
    S.src.radar = {state: "err", at: new Date(), note: e.message};
    toast("Radar opadów jest niedostępny.");
  }
  renderStatus(); renderTree();
}

// Przy globie teren jest wyłączany: MapLibre nie łączy obu trybów.
function setTeren(on) {
  S.teren = on;
  ITEMS["b-teren"].on = on;
  map.setLayoutProperty("hillshade", "visibility", on ? "visible" : "none");
  map.setTerrain(on && !S.globe ? {source: "dem", exaggeration: 1.35} : null);
  if (on) {
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();
    if (map.getPitch() < 10) map.easeTo({pitch: 55, duration: 900});
  } else {
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    if (map.getPitch() > 0) map.easeTo({pitch: 0, bearing: 0, duration: 700});
  }
  saveLayers(); renderTree(); refreshChecks();
}

// Kod zjawiska lodowego IMGW: "0", pusty napis i null znaczą brak zjawiska. Pole
// trzyma ostatnią obserwację, nawet sprzed miesięcy, więc liczy się tylko
// obserwacja nie starsza niż 3 doby.
const jestLod = (v, t) => (v != null && !["", "0", "null"].includes(String(v).trim())
  && !(t && Date.now() - Date.parse(String(t).replace(" ", "T")) > 3 * 86400e3)) ? 1 : 0;

async function loadImgw() {
  S.src.imgw.state = "wait"; renderStatus(); renderTree();
  try {
    const r = await fetch("https://danepubliczne.imgw.pl/api/data/hydro/", {cache: "no-store"});
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const b = D.meta.bbox;
    const feats = [];
    for (const s of j) {
      const lon = parseFloat(s.lon), lat = parseFloat(s.lat);
      if (!(lon >= b.w && lon <= b.e && lat >= b.s && lat <= b.n)) continue;
      feats.push({type: "Feature", id: +s.id_stacji, geometry: {type: "Point", coordinates: [lon, lat]},
        properties: {id: s.id_stacji, n: s.stacja, rz: s.rzeka, woj: s.wojewodztwo,
          stan: s.stan_wody == null ? null : +s.stan_wody, stan_t: s.stan_wody_data_pomiaru,
          temp: s.temperatura_wody == null ? null : +s.temperatura_wody, temp_t: s.temperatura_wody_data_pomiaru,
          zjaw: s.zjawisko_lodowe, zjaw_z: s.zjawisko_zarastania, lod: jestLod(s.zjawisko_lodowe, s.zjawisko_lodowe_data_pomiaru)}});
    }
    map.getSource("imgw").setData({type: "FeatureCollection", features: feats});
    S.src.imgw = {state: "ok", at: new Date(), n: feats.length};
  } catch (e) {
    S.src.imgw = {state: "err", at: new Date(), note: e.message};
    toast("IMGW nie odpowiada. Wodowskazy są niedostępne, reszta mapy działa.");
  }
  renderStatus(); renderTree();
}

// Wspólny cykl stanu źródła na żywo (wait, potem ok albo err). Nowe źródła
// powinny przez niego przechodzić, żeby żadne nie utknęło w "wait".
async function zywe(klucz, komunikat, robota) {
  S.src[klucz] = {...S.src[klucz], state: "wait"};
  renderStatus(); renderTree();
  try {
    const n = await robota();
    S.src[klucz] = {state: "ok", at: new Date(), n};
  } catch (e) {
    S.src[klucz] = {state: "err", at: new Date(), note: e.message};
    if (komunikat) toast(komunikat);
  }
  renderStatus(); renderTree();
}

const wBbox = (lon, lat) => {
  const b = D.meta.bbox;
  return lon >= b.w && lon <= b.e && lat >= b.s && lat <= b.n;
};

// Słownik situation_type GDDKiA nie jest opublikowany, więc rodzaj rozpoznajemy
// po słowach. Nierozpoznane zdarzenie dostaje ikonę robót, a nie znika z mapy.
function rodzajUtrudnienia(z) {
  const t = [z.situation_type, z.situation_class, z.description, z.effects].filter(Boolean).join(" ").toLowerCase();
  // Tylko zamknięcie całej drogi, zamknięcie pasa to zwykle roboty.
  if (/całkowit\S* zamkn|zamkni[eę]t\S* (dla ruchu|droga|jezdnia|most|wiadukt|przejazd)|(droga|jezdnia|most|wiadukt|przejazd) zamkni|road closed/.test(t)) return "zamkniecie";
  if (/wypad|koliz|zdarzen|accident|collision/.test(t)) return "wypadek";
  return "roboty";
}

// Odpowiedź obejmuje całą Polskę i nie da się jej zawęzić, a pole `province`
// to GUID, nie nazwa województwa. Dlatego filtr po współrzędnych.
const GDDKIA_URL = "https://kpd.gddkia.gov.pl/amp/api/waypoints/situations.json";
async function loadGddkia() {
  await zywe("gddkia", "GDDKiA nie odpowiada. Utrudnienia są niedostępne, reszta mapy działa.", async () => {
    const r = await fetch(GDDKIA_URL, {cache: "no-store"});
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const feats = [];
    for (const z of (j.response || [])) {
      const lon = +z.longitude, lat = +z.latitude;
      if (!isFinite(lon) || !isFinite(lat) || !wBbox(lon, lat)) continue;
      feats.push({type: "Feature", id: feats.length + 1,
        geometry: {type: "Point", coordinates: [lon, lat]},
        properties: {id: z.id, droga: z.road_number || "", km: z.mileage, dlug: z.length,
          typ: z.situation_type || "", klasa: z.situation_class || "",
          opis: z.description || "", skutki: z.effects || "", rada: z.hints_for_drivers || "",
          od: z.start_date || null, do: z.expiration_date || null, zwloka: z.delay_time_value,
          rodz: rodzajUtrudnienia(z)}});
    }
    map.getSource("gddkia").setData({type: "FeatureCollection", features: feats});
    return feats.length;
  });
}

// warningsmeteo podaje TERYT powiatów, więc trafia na mapę. warningshydro ma tylko
// województwo i kody zlewni: bez geometrii zlewni idzie do panelu jako tekst.
// Stopnie 1 do 3; -1 to susza hydrologiczna, spoza tej skali.
const OSTRZ_METEO = "https://danepubliczne.imgw.pl/api/data/warningsmeteo";
const OSTRZ_HYDRO = "https://danepubliczne.imgw.pl/api/data/warningshydro";
let ostrzHydro = [];
let ostrzPowiaty = {};        // kod powiatu: {st, lista[]}

async function loadOstrzezenia() {
  await zywe("ostrz", "IMGW nie odpowiada. Ostrzeżenia są niedostępne, reszta mapy działa.", async () => {
    const [m, h] = await Promise.all([
      fetch(OSTRZ_METEO, {cache: "no-store"}).then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))),
      fetch(OSTRZ_HYDRO, {cache: "no-store"}).then(r => r.ok ? r.json() : []).catch(() => []),
    ]);
    ostrzHydro = (Array.isArray(h) ? h : []).filter(o =>
      (o.obszary || []).some(x => /dolno/i.test(x.wojewodztwo || "")));

    ostrzPowiaty = {};
    const teraz = Date.now();
    for (const o of (Array.isArray(m) ? m : [])) {
      const doKiedy = Date.parse((o.obowiazuje_do || "").replace(" ", "T"));
      if (doKiedy && doKiedy < teraz) continue;
      const st = parseInt(o.stopien, 10);
      for (const t of (o.teryt || [])) {
        if (!String(t).startsWith("02")) continue;          // 02: dolnośląskie
        const w = ostrzPowiaty[t] || (ostrzPowiaty[t] = {st: -1, lista: []});
        w.lista.push(o);
        if (st > w.st) w.st = st;
      }
    }
    // Gmina dziedziczy stopień po powiecie: IMGW nie schodzi niżej niż powiat.
    const feats = [];
    for (const f of D.layers.gminy.features) {
      const kod = String(f.properties.teryt || "");
      const w = ostrzPowiaty[kod.slice(0, 4)];
      if (!w) continue;
      const glowne = w.lista.reduce((a, o) => parseInt(o.stopien, 10) > parseInt(a.stopien, 10) ? o : a);
      feats.push({type: "Feature", id: feats.length + 1, geometry: f.geometry,
        properties: {id: kod, st: w.st, zj: rodzajZjawiska(glowne.nazwa_zdarzenia), pow: kod.slice(0, 4), gmina: f.properties.n,
          zdarzenia: w.lista.map(o => o.nazwa_zdarzenia).join(", "),
          tresc: w.lista.map(o => o.tresc).join("\n\n"),
          od: w.lista[0].obowiazuje_od, do: w.lista[0].obowiazuje_do,
          szansa: w.lista[0].prawdopodobienstwo, biuro: w.lista[0].biuro}});
    }
    map.getSource("ostrzezenia").setData({type: "FeatureCollection", features: feats});
    return Object.keys(ostrzPowiaty).length;
  });
}

// Sensor.Community zamiast GIOŚ, bo api.gios.gov.pl nie wysyła nagłówka CORS.
// Czujniki są amatorskie i niewzorcowane, co panel musi mówić wprost.
const POWIETRZE_URL = ({n, w, s, e}) =>
  `https://data.sensor.community/airrohr/v1/filter/box=${n},${w},${s},${e}`;
// Wspólne dla warstwy i panelu stacji z OSM. Wynik trzymany 10 min, żeby
// klikanie kolejnych stacji nie pytało serwera za każdym razem.
let powietrzeCache = null;
function pobierzPowietrze(swieze = false) {
  if (!swieze && powietrzeCache && Date.now() - powietrzeCache.at < 10 * 60e3) return powietrzeCache.p;
  const p = (async () => {
    const r = await fetch(POWIETRZE_URL(D.meta.bbox), {cache: "no-store"});
    if (!r.ok) throw new Error("HTTP " + r.status);
    return czujnikiPowietrza(await r.json());
  })().catch(e => { powietrzeCache = null; throw e; });
  powietrzeCache = {at: Date.now(), p};
  return p;
}
async function loadPowietrze() {
  await zywe("powietrze", "Sensor.Community nie odpowiada. Jakość powietrza jest niedostępna.", async () => {
    const feats = await pobierzPowietrze(true);
    map.getSource("powietrze").setData({type: "FeatureCollection", features: feats});
    return feats.length;
  });
}
function czujnikiPowietrza(j) {
    const stacje = new Map();
    for (const o of j) {
      const L = o.location || {};
      if (+L.indoor) continue;                  // czujnik w mieszkaniu nie mówi nic o mieście
      const lon = +L.longitude, lat = +L.latitude;
      if (!isFinite(lon) || !isFinite(lat)) continue;
      const k = L.id;                           // kilka czujników w jednej lokalizacji: jeden punkt
      const st = stacje.get(k) || {lon, lat, id: k, t: o.timestamp, dok: !+L.exact_location};
      for (const v of (o.sensordatavalues || [])) {
        const x = parseFloat(v.value);
        if (!isFinite(x)) continue;
        // Nazwy z protokołu airRohr: P1 to PM10, P2 to PM2,5.
        if (v.value_type === "P1") st.pm10 = x;
        else if (v.value_type === "P2") st.pm25 = x;
        else if (v.value_type === "temperature") st.temp = x;
        else if (v.value_type === "humidity") st.wilg = x;
        else if (v.value_type === "pressure") st.cisn = Math.round(x / 100);
      }
      if (o.timestamp > st.t) st.t = o.timestamp;
      stacje.set(k, st);
    }
    const feats = [];
    for (const st of stacje.values()) {
      if (st.pm25 == null && st.pm10 == null) continue;
      feats.push({type: "Feature", id: st.id, geometry: {type: "Point", coordinates: [st.lon, st.lat]},
        properties: {id: st.id, pm25: st.pm25 ?? null, pm10: st.pm10 ?? null,
          temp: st.temp ?? null, wilg: st.wilg ?? null, cisn: st.cisn ?? null,
          t: st.t, dok: st.dok ? 1 : 0}});
    }
    return feats;
}

// Kopia listy wodowskazów na 10 min dla panelu posterunku z OSM; warstwa ma
// własne pobieranie w loadImgw.
let hydroCache = null;
function pobierzHydro() {
  if (hydroCache && Date.now() - hydroCache.at < 10 * 60e3) return hydroCache.p;
  const p = fetch("https://danepubliczne.imgw.pl/api/data/hydro/", {cache: "no-store"})
    .then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
    .then(l => (Array.isArray(l) ? l : []).map(s => ({...s, lon: parseFloat(s.lon), lat: parseFloat(s.lat)}))
      .filter(s => Number.isFinite(s.lon) && Number.isFinite(s.lat)))
    .catch(e => { hydroCache = null; throw e; });
  hydroCache = {at: Date.now(), p};
  return p;
}

// `pk5l-wp` to dobowy plan koordynacyjny, czyli prognoza, nie pomiar: podpis
// w oknie "Stan KSE" musi to mówić. Pomiar (transmissionMapService) nie ma CORS.
const PSE_URL = d => `https://api.raporty.pse.pl/api/pk5l-wp?$filter=business_date%20eq%20'${d}'`;
let pseDane = null;
async function loadPse() {
  await zywe("pse", null, async () => {
    const d = new Date();
    const dzis = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const r = await fetch(PSE_URL(dzis), {cache: "no-store"});
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    pseDane = (j.value || []).map(x => ({
      godz: x.period, t: x.plan_dtime,
      zapotrzebowanie: x.grid_demand_fcst, wiatr: x.fcst_wi_tot_gen, pv: x.fcst_pv_tot_gen,
      wymiana: x.planned_exchange, rezerwa: x.req_pow_res, ubytki: x.fcst_unav_energy,
    })).filter(x => x.zapotrzebowanie != null);
    return pseDane.length;
  });
}

// Open-Meteo liczy każdy punkt siatki jako osobne zapytanie: gęstsza siatka
// lub częstsze odświeżanie przekroczy dobowy limit darmowego API.
// To model pogody, nie obserwacja, co panel i dymek mówią wprost.
const CHMURY_URL = "https://api.open-meteo.com/v1/forecast";
const WMO = {0: "bezchmurnie", 1: "przeważnie pogodnie", 2: "częściowe zachmurzenie", 3: "pochmurno",
  45: "mgła", 48: "mgła osadzająca szadź", 51: "słaba mżawka", 53: "mżawka", 55: "gęsta mżawka",
  56: "marznąca mżawka", 57: "marznąca mżawka", 61: "słaby deszcz", 63: "deszcz", 65: "silny deszcz",
  66: "marznący deszcz", 67: "marznący deszcz", 71: "słaby śnieg", 73: "śnieg", 75: "intensywny śnieg",
  77: "ziarna śniegu", 80: "przelotny deszcz", 81: "przelotny deszcz", 82: "ulewa",
  85: "przelotny śnieg", 86: "przelotny śnieg", 95: "burza", 96: "burza z gradem", 99: "burza z gradem"};
function typChmury(kod, cc) {
  if (kod >= 95) return "burza";
  if ((kod >= 71 && kod <= 77) || kod === 85 || kod === 86) return "snieg";
  if ((kod >= 51 && kod <= 67) || (kod >= 80 && kod <= 82)) return "deszcz";
  if (kod === 45 || kod === 48) return "mgla";
  return cc >= 80 ? "szara" : cc >= 20 ? "biala" : null;
}
async function loadChmury() {
  await zywe("chmury", "Open-Meteo nie odpowiada. Chmury są niedostępne, reszta mapy działa.", async () => {
    const pkt = [];
    // Siatka tylko nad województwem: chmury rysujemy w gminach, a gmin poza
    // Dolnym Śląskiem nie mamy.
    for (let lat = 50.0; lat <= 51.95; lat += .25) for (let lon = 14.7; lon <= 18.0; lon += .4) pkt.push([+lon.toFixed(2), +lat.toFixed(2)]);
    const q = `?latitude=${pkt.map(p => p[1]).join(",")}&longitude=${pkt.map(p => p[0]).join(",")}`
      + "&current=cloud_cover,weather_code,precipitation&timezone=Europe%2FWarsaw";
    const r = await fetch(CHMURY_URL + q, {cache: "no-store"});
    if (!r.ok) throw new Error("HTTP " + r.status);
    const dane = await r.json();
    const siatka = (Array.isArray(dane) ? dane : [dane]).map((d, i) => {
      const c = d.current || {};
      return {xy: pkt[i], cc: c.cloud_cover ?? 0, kod: c.weather_code ?? 0, opad: c.precipitation ?? null, t: c.time || ""};
    });
    // Zachmurzenie: średnia ważona 1/d² z 4 najbliższych punktów. Rodzaj pogody:
    // najgroźniejszy z 2 najbliższych, bo średnia z deszczu i burzy nie ma sensu.
    const groza = k => k >= 95 ? 4 : (k >= 71 && k <= 77) || k === 85 || k === 86 ? 3 : (k >= 51 && k <= 67) || (k >= 80 && k <= 82) ? 2 : k === 45 || k === 48 ? 1 : 0;
    const feats = [];
    for (const f of D.layers.gminy.features) {
      const sr = srodekGminy(f);
      const najbl = siatka.map(s => ({s, d: odlKm(sr, s.xy)})).sort((a, b) => a.d - b.d).slice(0, 4);
      let w = 0, cc = 0;
      for (const {s, d} of najbl) { const wi = 1 / Math.max(1, d * d); w += wi; cc += wi * s.cc; }
      cc = Math.round(cc / w);
      const glowny = najbl.slice(0, 2).reduce((a, b) => groza(b.s.kod) > groza(a.s.kod) ? b : a).s;
      const typ = typChmury(glowny.kod, cc);
      if (!typ) continue;
      feats.push({type: "Feature", id: feats.length + 1, geometry: f.geometry,
        properties: {id: f.properties.teryt, n: f.properties.n, teryt: f.properties.teryt, typ, cc,
          st: cc < 40 ? 1 : cc < 60 ? 2 : cc < 80 ? 3 : 4, kod: glowny.kod,
          opis: WMO[glowny.kod] || "kod WMO " + glowny.kod, opad: glowny.opad, t: glowny.t}});
    }
    map.getSource("chmury").setData({type: "FeatureCollection", features: feats});
    return feats.length;
  });
}
// Średnia wierzchołków największego pierścienia: wystarcza do wyboru punktów
// siatki, nie nadaje się do rysowania.
const srodkiGmin = new Map();
function srodekGminy(f) {
  const k = f.properties.teryt;
  if (srodkiGmin.has(k)) return srodkiGmin.get(k);
  const g = f.geometry;
  const pierscienie = g.type === "Polygon" ? [g.coordinates[0]] : g.coordinates.map(p => p[0]);
  const r = pierscienie.reduce((a, b) => b.length > a.length ? b : a);
  const s = r.reduce((a, [x, y]) => [a[0] + x / r.length, a[1] + y / r.length], [0, 0]);
  srodkiGmin.set(k, s);
  return s;
}

// Stacja meteo z OSM zna tylko położenie, więc panel pokazuje odczyt najbliższej
// stacji IMGW wraz z odległością, a nie jako pomiar z tego punktu.
const METEO_IMGW = "https://danepubliczne.imgw.pl/api/data/meteo";
let meteoImgw = null;
function pobierzMeteoImgw() {
  if (meteoImgw && Date.now() - meteoImgw.at < 10 * 60e3) return meteoImgw.p;
  const p = fetch(METEO_IMGW, {cache: "no-store"})
    .then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
    .then(l => (Array.isArray(l) ? l : []).map(s => ({...s, lon: parseFloat(s.lon), lat: parseFloat(s.lat)}))
      .filter(s => Number.isFinite(s.lon) && Number.isFinite(s.lat)))
    .catch(e => { meteoImgw = null; throw e; });
  meteoImgw = {at: Date.now(), p};
  return p;
}
const odlKm = (a, b) => {
  const r = Math.PI / 180, dl = (b[0] - a[0]) * r * Math.cos((a[1] + b[1]) / 2 * r), df = (b[1] - a[1]) * r;
  return 6371 * Math.hypot(dl, df);
};

// Nowe źródło na żywo dopisuje się tutaj: drzewo warstw woła tylko przelaczZywe.
const ZYWE = {
  "w-radar": {on: loadRadar, off: () => (S.src.radar.state = "off")},
  "w-g":     {on: () => { if (S.src.imgw.state !== "ok") loadImgw(); }, off: () => (S.src.imgw.state = "off")},
  "d-ut":    {on: () => { if (S.src.gddkia.state !== "ok") loadGddkia(); }, off: () => (S.src.gddkia.state = "off")},
  "w-ost":   {on: () => { if (S.src.ostrz.state !== "ok") loadOstrzezenia(); }, off: () => (S.src.ostrz.state = "off")},
  "a-pm":    {on: () => { if (S.src.powietrze.state !== "ok") loadPowietrze(); }, off: () => (S.src.powietrze.state = "off")},
  "w-chm":   {on: () => { if (S.src.chmury.state !== "ok") loadChmury(); }, off: () => (S.src.chmury.state = "off")},
};
function przelaczZywe(id) {
  const akcja = ZYWE[id];
  if (!akcja) return;
  akcja[ITEMS[id].on ? "on" : "off"]();
  renderStatus();
}
