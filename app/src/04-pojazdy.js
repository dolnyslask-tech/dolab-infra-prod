// Transitous (GTFS + GTFS-RT) zwraca odcinki kursów, nie pozycje GPS. Pozycję
// interpolujemy po geometrii odcinka proporcjonalnie do czasu: to przybliżenie,
// bo publicznych pozycji GPS pojazdów w Polsce nie ma.
const MOTIS = "https://api.transitous.org/api/v1/map/trips";
let motisDane = [], motisFetch = 0, motisBusy = false;

function decodePolyline(str, prec = 5) {
  let i = 0, lat = 0, lng = 0, out = [];
  const f = Math.pow(10, prec);
  while (i < str.length) {
    let b, sh = 0, res = 0;
    do { b = str.charCodeAt(i++) - 63; res |= (b & 31) << sh; sh += 5; } while (b >= 32);
    lat += (res & 1) ? ~(res >> 1) : (res >> 1);
    sh = 0; res = 0;
    do { b = str.charCodeAt(i++) - 63; res |= (b & 31) << sh; sh += 5; } while (b >= 32);
    lng += (res & 1) ? ~(res >> 1) : (res >> 1);
    out.push([lng / f, lat / f]);
  }
  return out;
}

const warstwaPojazdu = mode => Object.keys(POJAZDY).find(k => POJAZDY[k].mody.includes(mode));

async function loadMotis(force) {
  const chce = Object.values(ITEMS).filter(it => it.pojazd && it.on);
  if (!chce.length) { S.src.motis.state = "off"; motisDane = []; rysujPojazdy(); renderStatus(); renderTree(); return; }
  if (motisBusy || (!force && Date.now() - motisFetch < 25000)) return;
  if (map.getZoom() < 7) { S.src.motis.state = "wait"; S.src.motis.note = "przybliż mapę"; renderStatus(); renderTree(); return; }
  motisBusy = true;
  S.src.motis.state = S.src.motis.state === "ok" ? "ok" : "wait";
  renderTree();
  try {
    const b = map.getBounds();
    const t0 = new Date(), t1 = new Date(Date.now() + 60000);
    const u = `${MOTIS}?min=${b.getSouth().toFixed(3)},${b.getWest().toFixed(3)}&max=${b.getNorth().toFixed(3)},${b.getEast().toFixed(3)}`
            + `&zoom=${Math.round(map.getZoom())}&startTime=${t0.toISOString()}&endTime=${t1.toISOString()}`;
    const r = await fetch(u, {cache: "no-store"});
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    motisDane = [];
    for (const seg of j) {
      const w = warstwaPojazdu(seg.mode);
      if (!w || !seg.polyline) continue;
      const linia = decodePolyline(seg.polyline);
      if (linia.length < 2) continue;
      // Długości cząstkowe liczone raz przy pobraniu: pozycja odświeża się
      // co sekundę i nie może za każdym razem przechodzić całej geometrii.
      const d = [0];
      for (let i = 1; i < linia.length; i++) d.push(d[i - 1] + dystans(linia[i - 1], linia[i]));
      const trip = (seg.trips && seg.trips[0]) || {};
      motisDane.push({
        w, linia, d, dl: d[d.length - 1],
        dep: Date.parse(seg.departure), arr: Date.parse(seg.arrival),
        depR: Date.parse(seg.scheduledDeparture), arrR: Date.parse(seg.scheduledArrival),
        rt: !!seg.realTime, mode: seg.mode,
        nazwa: trip.routeShortName || seg.mode, tripId: trip.tripId,
        skad: seg.from?.name, dokad: seg.to?.name, kolor: seg.routeColor,
        id: (trip.tripId || seg.mode) + "@" + seg.departure,
      });
    }
    S.src.motis = {state: "ok", at: new Date(), n: motisDane.length};
  } catch (e) {
    S.src.motis = {state: "err", at: new Date(), note: e.message};
    toast("Transitous nie odpowiada. Pojazdy na żywo są niedostępne, reszta mapy działa.");
  }
  motisFetch = Date.now();
  motisBusy = false;
  rysujPojazdy();
  renderStatus(); renderTree();
}

const dystans = (a, b) => Math.hypot((a[0] - b[0]) * 0.63, a[1] - b[1]);

function pozycjaPojazdu(p, t) {
  const f = p.arr > p.dep ? Math.min(1, Math.max(0, (t - p.dep) / (p.arr - p.dep))) : 0;
  const cel = f * p.dl;
  let i = 1;
  while (i < p.d.length - 1 && p.d[i] < cel) i++;
  const a = p.linia[i - 1], b = p.linia[i];
  const odc = p.d[i] - p.d[i - 1] || 1;
  const u = (cel - p.d[i - 1]) / odc;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, f];
}

// Strażnik układu: `pomiary` (ostatnie 20) trafiają do Pomoc > Diagnostyka.
// Naprawa najpierw wymusza przeliczenie układu; przypięcie wysokości na sztywno
// to ostateczność, bo potrafi utrwalić zły stan.
let napraw = {ile: 0, ostatnia: null, pomiary: []};

function zmierzWidok(powod) {
  const app = document.querySelector(".app");
  const wynik = {
    czas: new Date(),
    okno: window.innerHeight,
    app: Math.round(app.getBoundingClientRect().height),
    dvh: Math.round(parseFloat(getComputedStyle(app).height)),
    powod: powod || "cykl",
  };
  napraw.pomiary.push(wynik);
  if (napraw.pomiary.length > 20) napraw.pomiary.shift();
  return wynik;
}

function naprawWidok(recznie, powod) {
  const app = document.querySelector(".app");
  const m = zmierzWidok(powod || (recznie ? "recznie" : "cykl"));
  const rozjazd = Math.abs(m.app - m.okno);

  // Przeglądarka potrafi przestać przemalowywać przy poprawnych wymiarach, czego
  // JS nie wykryje. Dlatego ręczna naprawa zawsze wymusza nową klatkę.
  if (!recznie && rozjazd <= 2) {
    if (app.style.height) { app.style.height = ""; map.resize(); }
    return false;
  }
  naprawaUkladu(app, m, rozjazd, recznie);
  return true;
}

// Strona mieści się w oknie i nie może się przewijać. Przeglądarka przewija ją
// sama, np. pokazując element z fokusem, więc każde przewinięcie poza tymi
// elementami jest cofane i liczone dla diagnostyki.
let przewiniecia = 0;
const WOLNO_PRZEWIJAC = ["treeBody", "pbody", "findList", "modalB"];

function pilnujPrzewijania() {
  const dozwolony = el => !el || !el.id ? false : WOLNO_PRZEWIJAC.includes(el.id);
  const cofnij = e => {
    const cel = e && e.target;
    if (!cel || cel === document || cel === window || cel === document.documentElement || cel === document.body) {
      const y = document.documentElement.scrollTop || document.body.scrollTop || 0;
      const x = document.documentElement.scrollLeft || document.body.scrollLeft || 0;
      if (!y && !x) return;
      przewiniecia++;
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = document.body.scrollTop = 0;
      document.documentElement.scrollLeft = document.body.scrollLeft = 0;
      console.warn("[uklad] strona przewinela sie o", y, "px - cofniete");
      return;
    }
    if (cel.nodeType === 1 && !dozwolony(cel) && !cel.closest(".maplibregl-map")) {
      if (cel.scrollTop || cel.scrollLeft) {
        przewiniecia++;
        const y = cel.scrollTop;
        cel.scrollTop = 0; cel.scrollLeft = 0;
        console.warn("[uklad] element", cel.className || cel.tagName, "przewinal sie o", y, "px - cofniete");
      }
    }
  };
  window.addEventListener("scroll", cofnij, {passive: true});
  document.addEventListener("scroll", cofnij, {passive: true, capture: true});
}
pilnujPrzewijania();

function przemaluj() {
  // Trzy bodźce, bo różne wersje Chrome reagują na różne: przeliczenie układu,
  // nowa warstwa kompozytora i przerysowanie płótna mapy.
  const app = document.querySelector(".app");
  app.style.display = "none";
  void app.offsetHeight;
  app.style.display = "";
  app.style.transform = "translateZ(0)";
  void app.offsetHeight;
  app.style.transform = "";
  map.resize();
  map.triggerRepaint();
  requestAnimationFrame(() => { map.resize(); map.triggerRepaint(); });
}

function naprawaUkladu(app, m, rozjazd, recznie) {
  app.style.height = "";
  przemaluj();
  const po = Math.round(app.getBoundingClientRect().height);
  const dalej = Math.abs(po - window.innerHeight);
  if (dalej > 2) {
    app.style.height = window.innerHeight + "px";
    map.resize();
  }
  napraw = {...napraw, ile: napraw.ile + 1, ostatnia: new Date()};
  if (rozjazd > 2) {
    toast(`Widok rozjechał się o ${rozjazd} px (okno ${m.okno}, aplikacja ${m.app}) i został naprawiony${dalej > 2 ? " na siłę" : ""}.`);
    console.warn("[uklad] rozjazd", m, "-> po naprawie", po);
  } else if (recznie) {
    toast(`Przemalowano. Okno ${m.okno} px, aplikacja ${m.app} px, układ jest poprawny, więc problem był po stronie przeglądarki.`);
  }
  renderStatus();
}

let ostatniPanelPojazdu = 0;
function rysujPojazdy() {
  const t = Date.now();
  const feats = [];
  for (const p of motisDane) {
    if (!ITEMS[p.w].on || t > p.arr + 60000) continue;
    const [lon, lat, f] = pozycjaPojazdu(p, t);
    feats.push({type: "Feature", id: feats.length,
      properties: {id: p.id, w: p.w, n: p.nazwa, skad: p.skad, dokad: p.dokad, f: Math.round(f * 100),
                   rt: p.rt ? 1 : 0, mode: p.mode},
      geometry: {type: "Point", coordinates: [lon, lat]}});
  }
  map.getSource("pojazdy")?.setData({type: "FeatureCollection", features: feats});
  if (S.selected?.kind === "pojazd") {
    const p = motisDane.find(x => x.id === S.selected.id);
    map.getSource("pojazd-trasa")?.setData(p ?
      {type: "Feature", properties: {}, geometry: {type: "LineString", coordinates: p.linia}} :
      {type: "FeatureCollection", features: []});
    // Rysowanie idzie co sekundę, a panel zmienia się wolno. Częstsza
    // przebudowa kasowałaby przewinięcie panelu.
    if (p && performance.now() - ostatniPanelPojazdu > 3000) { ostatniPanelPojazdu = performance.now(); renderPojazdPanel(p); }
  }
}
