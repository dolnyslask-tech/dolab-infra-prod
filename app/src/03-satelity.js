// TLE pobieramy rzadko, pozycje liczy lokalnie SGP4 (satellite.js): ruch nie wymaga serwera.
const SAT = {list: [], byId: new Map(), loadedGroups: new Set(), fromSnapshot: new Set()};
const TLE_MAX_AGE = 2 * 3600e3;   // CelesTrak prosi o pobieranie nie częściej niż co 2 h

function parseTLE(txt, group) {
  const lines = txt.split(/\r?\n/).map(l => l.trimEnd()).filter(Boolean);
  const out = [];
  for (let i = 0; i + 2 < lines.length + 1; i++) {
    if (lines[i + 1]?.startsWith("1 ") && lines[i + 2]?.startsWith("2 ")) {
      try {
        const satrec = satellite.twoline2satrec(lines[i + 1], lines[i + 2]);
        if (satrec.error) continue;
        out.push({id: satrec.satnum.trim(), name: lines[i].replace(/^0 /, "").trim(), g: group, satrec,
          l1: lines[i + 1], l2: lines[i + 2]});
      } catch (e) {}
      i += 2;
    }
  }
  return out;
}

function registerSats(group, sats, snapshot) {
  SAT.list = SAT.list.filter(s => s.g !== group);
  for (const s of sats) {
    // Ten sam obiekt bywa w kilku grupach (ISS: stations i visual).
    // Zostaje w pierwszej, żeby nie rysować go dwa razy.
    const prev = SAT.byId.get(s.id);
    if (prev && prev.g !== group) continue;
    SAT.byId.set(s.id, s);
    SAT.list.push(s);
  }
  SAT.loadedGroups.add(group);
  snapshot ? SAT.fromSnapshot.add(group) : SAT.fromSnapshot.delete(group);
}

async function loadSatGroup(group, force) {
  const cacheKey = "tle:" + group;
  const cached = store.get(cacheKey, null);
  if (!force && cached && Date.now() - cached.at < TLE_MAX_AGE) {
    registerSats(group, parseTLE(cached.txt, group), false);
    return "cache";
  }
  try {
    // Polityka CelesTrak: po odpowiedzi innej niż 200 przestać pytać, inaczej IP
    // trafia na zaporę. Blokada jest w store, żeby przetrwała przeładowanie strony.
    // Błąd sieci (offline, CORS) to nie odpowiedź serwera, więc blokady nie zakłada.
    const blok = store.get("tle-blokada:" + group, 0);
    if (Date.now() - blok < TLE_MAX_AGE) throw new Error("CelesTrak odmówił niedawno, przerwa do " + new Date(blok + TLE_MAX_AGE).toLocaleTimeString("pl-PL"));
    const r = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`, {cache: "no-store"});
    if (!r.ok) { store.set("tle-blokada:" + group, Date.now()); throw new Error("HTTP " + r.status); }
    const txt = await r.text();
    const sats = parseTLE(txt, group);
    if (!sats.length) throw new Error("pusta odpowiedź");
    registerSats(group, sats, false);
    if (txt.length < 2e6) store.set(cacheKey, {at: Date.now(), txt});
    return "live";
  } catch (e) {
    if (cached) { registerSats(group, parseTLE(cached.txt, group), false); return "stale"; }
    if (D.tle && D.tle[group]) { registerSats(group, parseTLE(D.tle[group], group), true); return "snapshot"; }
    throw e;
  }
}

async function ensureSatGroups(force) {
  const want = Object.values(ITEMS).filter(it => it.grp && it.on).map(it => it.grp);
  const todo = want.filter(g => force || !SAT.loadedGroups.has(g));
  if (!todo.length) { updateSatSource(); return; }
  S.src.sat.state = "wait"; renderStatus(); renderTree();
  const res = [];
  for (const g of todo) {
    try { res.push(await loadSatGroup(g, force)); }
    catch (e) { res.push("err"); S.src.sat.err = e.message; }
  }
  S.src.sat.at = new Date();
  if (res.includes("snapshot")) toast("Brak połączenia z CelesTrak: satelity liczone z migawki orbit wbudowanej w program.");
  updateSatSource();
  passCache.clear();
  tickSats(true);
}
function updateSatSource() {
  const want = Object.values(ITEMS).filter(it => it.grp && it.on).map(it => it.grp);
  const loaded = want.filter(g => SAT.loadedGroups.has(g));
  if (!want.length) S.src.sat.state = "off";
  else if (!loaded.length) S.src.sat.state = "err";
  else if (loaded.some(g => SAT.fromSnapshot.has(g))) S.src.sat.state = "wait";
  else S.src.sat.state = "ok";
  renderStatus(); renderTree();
}

function satState(s, date) {
  const pv = satellite.propagate(s.satrec, date);
  if (!pv || !pv.position || typeof pv.position === "boolean") return null;
  const gmst = satellite.gstime(date);
  const gd = satellite.eciToGeodetic(pv.position, gmst);
  const v = pv.velocity;
  return {
    lon: satellite.degreesLong(gd.longitude), lat: satellite.degreesLat(gd.latitude), alt: gd.height,
    vel: v ? Math.hypot(v.x, v.y, v.z) : null, ecf: satellite.eciToEcf(pv.position, gmst),
  };
}
const obsGd = () => ({longitude: S.observer.lon * Math.PI / 180, latitude: S.observer.lat * Math.PI / 180, height: 0.15});
function look(st) {
  const la = satellite.ecfToLookAngles(obsGd(), st.ecf);
  return {el: la.elevation * 180 / Math.PI, az: (la.azimuth * 180 / Math.PI + 360) % 360, range: la.rangeSat};
}
const AZ = a => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(a / 45) % 8];

let lastSatTick = 0, overhead = [];
function tickSats(force) {
  const t = performance.now();
  const visible = SAT.list.filter(s => ITEMS["s-" + s.g]?.on);
  // Przy tysiącach obiektów (Starlink) liczymy rzadziej: 7 km/s to przy
  // zoomie regionu ułamek piksela na sekundę.
  const every = visible.length > 3000 ? 3000 : 1000;
  if (!force && t - lastSatTick < every) return;
  lastSatTick = t;
  const date = now();
  const feats = [], over = [];
  for (const s of visible) {
    const st = satState(s, date);
    if (!st || isNaN(st.lon)) continue;
    s.st = st;
    feats.push({type: "Feature", id: +s.id, properties: {id: s.id, g: s.g, n: s.name},
      geometry: {type: "Point", coordinates: [st.lon, st.lat]}});
    const la = look(st);
    s.look = la;
    if (la.el > 0) over.push(s);
  }
  map.getSource("sats")?.setData({type: "FeatureCollection", features: feats});
  overhead = over.sort((a, b) => b.look.el - a.look.el);
  if (S.selected?.kind === "sat") { drawSatExtras(); }
  // Panel odświeża się co sekundę, więc przewinięcie trzeba odtworzyć,
  // inaczej tabeli przelotów w niskim oknie nie da się przeczytać.
  if (!S.selected || S.selected.kind === "sat") {
    const pb = $("#pbody"), sc = pb ? pb.scrollTop : 0;
    renderPanelLive();
    if (pb) pb.scrollTop = sc;
  }
}

function drawSatExtras() {
  const s = SAT.byId.get(S.selected.id);
  if (!s || !s.st) return;
  const period = 1440 / (s.satrec.no * 1440 / (2 * Math.PI));   // minuty
  const P = isFinite(period) ? Math.min(period, 1440) : 95;
  const t0 = now().getTime();
  const seg = (from, to, part) => {
    const lines = [[]];
    let prev = null;
    for (let m = from; m <= to; m += P / 180) {
      const st = satState(s, new Date(t0 + m * 60000));
      if (!st) continue;
      // Rozcięcie na antypołudniku, inaczej linia przeciągnęłaby się przez całą mapę.
      if (prev != null && Math.abs(st.lon - prev) > 180) lines.push([]);
      lines[lines.length - 1].push([st.lon, st.lat]);
      prev = st.lon;
    }
    return lines.filter(l => l.length > 1).map(c => ({type: "Feature", properties: {part}, geometry: {type: "LineString", coordinates: c}}));
  };
  map.getSource("sat-track").setData({type: "FeatureCollection", features: [...seg(-P / 2, 0, "past"), ...seg(0, P, "next")]});
  // Zasięg: obszar Ziemi, z którego satelita jest nad horyzontem.
  const R = 6371, lam = Math.acos(R / (R + s.st.alt));
  const ring = [];
  const la1 = s.st.lat * Math.PI / 180, lo1 = s.st.lon * Math.PI / 180;
  for (let i = 0; i <= 96; i++) {
    const b = i / 96 * 2 * Math.PI;
    const la2 = Math.asin(Math.sin(la1) * Math.cos(lam) + Math.cos(la1) * Math.sin(lam) * Math.cos(b));
    let lo2 = lo1 + Math.atan2(Math.sin(b) * Math.sin(lam) * Math.cos(la1), Math.cos(lam) - Math.sin(la1) * Math.sin(la2));
    ring.push([((lo2 * 180 / Math.PI + 540) % 360) - 180, la2 * 180 / Math.PI]);
  }
  // Pierścienia przez antypołudnik lub biegun nie da się narysować jako jednego
  // wielokąta w Mercatorze, wtedy zostaje sam ślad.
  const wraps = ring.some((p, i) => i && Math.abs(p[0] - ring[i - 1][0]) > 180);
  map.getSource("sat-foot").setData(wraps ? {type: "FeatureCollection", features: []} :
    {type: "Feature", properties: {}, geometry: {type: "Polygon", coordinates: [ring]}});
  map.getSource("sel").setData({type: "Feature", properties: {}, geometry: {type: "Point", coordinates: [s.st.lon, s.st.lat]}});
}

// Przeloty w ciągu 24 h: krok 30 s, wschód i zachód doprecyzowane bisekcją do 2 s.
// Wynik w pamięci podręcznej, bo liczenie trwa kilkadziesiąt ms.
const passCache = new Map();
function passes(s) {
  const key = s.id + "@" + Math.floor(now().getTime() / 300000);
  if (passCache.has(key)) return passCache.get(key);
  const out = [];
  const start = now().getTime();
  const elAt = ms => { const st = satState(s, new Date(ms)); return st ? look(st).el : -90; };
  let prevEl = elAt(start), rise = prevEl > 0 ? start : null, maxEl = prevEl, maxT = start;
  for (let ms = start + 30000; ms < start + 86400000 && out.length < 6; ms += 30000) {
    const el = elAt(ms);
    if (el > 0 && prevEl <= 0) {
      let a = ms - 30000, b = ms;
      while (b - a > 2000) { const m = (a + b) / 2; elAt(m) > 0 ? b = m : a = m; }
      rise = b; maxEl = el; maxT = ms;
    }
    if (rise != null && el > maxEl) { maxEl = el; maxT = ms; }
    if (el <= 0 && prevEl > 0 && rise != null) {
      let a = ms - 30000, b = ms;
      while (b - a > 2000) { const m = (a + b) / 2; elAt(m) > 0 ? a = m : b = m; }
      // Przelot muskający horyzont (maks. poniżej 1°) to szum obliczeń.
      if (maxEl >= 1) out.push({rise, set: a, maxEl, maxT});
      rise = null; maxEl = -90;
    }
    prevEl = el;
  }
  passCache.set(key, out);
  return out;
}
