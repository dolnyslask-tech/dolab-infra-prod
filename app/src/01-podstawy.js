"use strict";
const D = window.INFRA;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt = (n, d = 0) => n == null || isNaN(n) ? "brak" : Number(n).toLocaleString("pl-PL", {minimumFractionDigits: d, maximumFractionDigits: d});
const store = {
  // Tylko wygody jednego użytkownika (warstwy, cache TLE). W trybie prywatnym
  // i w podglądzie localStorage potrafi rzucić wyjątkiem.
  get(k, def) { try { const v = localStorage.getItem("infra:" + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem("infra:" + k, JSON.stringify(v)); } catch (e) {} },
};

const HOME = [[14.80, 50.08], [17.86, 51.83]];
const GMINY = {};
for (const f of D.layers.gminy.features) GMINY[f.properties.teryt] = f.properties;

/* Kolor oznacza rodzinę warstw, kształt ikony (01b-ikony.js) rodzaj obiektu.
   Pomarańcz należy do sieci przesyłowej, dlatego drogi krajowe są żółte. Złoto
   (#E7A900) to akcent interfejsu, nie kolor danych. Nowa warstwa: odcień rodziny. */
const C = {
  A: "#b4232a", S: "#d0362b", DK: "#e9b308", DW: "#cbb98a",
  railE: "#1e293b", railN: "#64748b", railOld: "#b8c2cf", railNar: "#8b5e3c", railBud: "#334155",
  river: "#3c86c6", canal: "#3c86c6",
  jezioro: "#2f7fc0", zbiornik_w: "#1f5f96", staw: "#6aa6cf",
  brRoad: "#0f172a", brRail: "#475569", ferry: "#0d9488",
  // Obrys województwa na podkładach: celowo bardziej żółty niż sieć przesyłowa
  // (pwrHi), żeby się z nią nie mylił.
  kd: "#f39200",
  border: "#0f172a", xRoad: "#1e3a8a", xRail: "#1e3a8a",
  port: "#0f172a", airfield: "#334155", heli: "#64748b", mil: "#475569",
  log: "#14b8a6", intermodal: "#0f766e", yard: "#0d9488", harbour: "#0369a1",
  gauge: "#1d6fb8",
  pwrHi: "#ff6a00", pwrMid: "#fb923c", pwrLow: "#fdba74", pipe: "#7c5e10",
  stacja: "#fb923c", stHi: "#c2410c", st110: "#ea580c", elektrownia: "#4c1d95", wiatrak: "#6d28d9", pv: "#9333ea", maszt: "#6b7280",
  sluza: "#0369a1", oczysz: "#0e7490",
  kopalnia: "#8a5a2b", szyb: "#5b4636", zaklad: "#92400e", paliwa: "#9a3412",
  gaz: "#ca8a04", teren: "#a8a29e", kamera: "#be123c", kameraDroga: "#be123c",
  // Ulice celowo wyblakłe: jest ich kilkadziesiąt razy więcej niż dróg głównych
  // i w mocnych kolorach zagłuszyłyby mapę.
  ulPow: "#9c7f5f", ulLok: "#b5a58c", ulMia: "#8f98a4", ulSerw: "#bcc2ca",
  utrud: "#d94f04",
  // Kolory stopni jak u IMGW; susza (stopień -1) jest długotrwała, więc spokojna.
  ostrz1: "#fbbf24", ostrz2: "#f97316", ostrz3: "#dc2626", ostrzS: "#a16207",
  stPog: "#0284c7", stWod: "#0e7490", stPow: "#65a30d", stDro: "#a16207",
  stInna: "#94a3b8", tablica: "#475569", kameraOsm: "#881337", kameraGora: "#be123c",
  kameraAirmax: "#be123c", kameraLubin: "#881337",
  kameraZtv: "#be123c", kameraDev: "#be123c",
  szczyt: "#4a3f2a", szczytInny: "#9a8a66",
};
// Każdy podkład musi wysyłać Access-Control-Allow-Origin, inaczej WebGL nie
// przyjmie kafelka i warstwa zostanie pusta.
const GIBS_DATE = (() => {
  // Mozaika dobowa NASA pojawia się z opóźnieniem; dzisiejszej często jeszcze nie ma.
  const d = new Date(Date.now() - 30 * 3600e3);
  return d.toISOString().slice(0, 10);
})();
const BASEMAPS = [
  {id: "b-none", label: "Bez podkładu", tiles: null},
  {id: "b-orto", label: "Ortofotomapa GUGiK", max: 18, ciemny: true, obrysKD: true,
   tiles: ["https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTOFOTOMAPA&TILEMATRIXSET=EPSG:3857&TILEMATRIX=EPSG:3857:{z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg&STYLE=default"],
   attr: atr("gugik")},
  {id: "b-s2", label: "Sentinel-2 bezchmurny", max: 14, ciemny: true, obrysKD: true,
   tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"],
   attr: atr("eox")},
  {id: "b-nasa", label: "Zdjęcie satelitarne z wczoraj", max: 9, ciemny: true, obrysKD: true,
   tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${GIBS_DATE}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`],
   attr: atr("gibs")},
  {id: "b-noc", label: "Światła miast nocą", max: 8, ciemny: true, obrysKD: true,
   tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_At_Sensor_Radiance/default/${GIBS_DATE}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`],
   attr: atr("gibs")},
  {id: "b-topo", label: "OpenTopoMap (turystyczna)", max: 16, obrysKD: true,
   tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png", "https://b.tile.opentopomap.org/{z}/{x}/{y}.png"],
   attr: atr("opentopomap")},
  // Bez CARTO: jego kafelki wymagają klucza API, a klucza w pliku otwieranym
  // z file:// nie da się ograniczyć do domeny.
];
const DEM_TILES = ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"];

// Kilkanaście trybów MOTIS w trzech warstwach: na mapie i tak rozróżnia się
// głównie kolej od reszty.
const POJAZDY = {
  "p-dal": {label: "Pociągi dalekobieżne", color: "#1e3a8a", r: 4.2,
            mody: ["LONG_DISTANCE", "HIGHSPEED_RAIL", "NIGHT_RAIL", "COACH"]},
  "p-reg": {label: "Pociągi regionalne", color: "#2563eb", r: 3.6,
            mody: ["REGIONAL_RAIL", "REGIONAL_FAST_RAIL", "RAIL", "METRO"]},
  "p-msc": {label: "Tramwaje i autobusy", color: "#0d9488", r: 2.6,
            mody: ["TRAM", "BUS", "FERRY", "OTHER", "SUBWAY", "CABLE_CAR", "FUNICULAR", "AERIAL_LIFT"]},
};

const SAT_GROUPS = {
  stations: {label: "Stacje kosmiczne", color: "#dc2626", r: 5},
  visual:   {label: "Najjaśniejsze (widoczne okiem)", color: "#E7A900", r: 3.5},
  gnss:     {label: "Nawigacja GNSS (GPS, Galileo…)", color: "#16a34a", r: 3},
  weather:  {label: "Meteorologiczne", color: "#0891b2", r: 3},
  resource: {label: "Obserwacja Ziemi", color: "#7c3aed", r: 3},
  science:  {label: "Naukowe", color: "#db2777", r: 3},
  geo:      {label: "Geostacjonarne", color: "#475569", r: 2.5},
  starlink: {label: "Starlink", color: "#94a3b8", r: 1.8},
};

const TREE = [
  {id: "podklad", label: "Podkład", radio: "base", items: BASEMAPS.map((b, i) => (
    {id: b.id, label: b.label, sw: [null, null], on: i === 0, base: b}
  )).concat([
    {id: "b-teren", label: "Rzeźba terenu 3D", sw: ["ar", "#a08a5b"], on: false, teren: true, osobno: true},
  ])},
  {id: "transport", label: "Transport na żywo", live: true, items: Object.entries(POJAZDY).map(([id, v]) => (
    {id, label: v.label, sw: ["pt", v.color], on: false, live: "motis", pojazd: id}
  ))},
  {id: "kamery", label: "Kamery", items: [
    // Równość, nie negacja: `!= trax` wciągnęłoby kamery innych źródeł i zdublowało punkty.
    {id: "c-k", label: "Kamery internetowe (Windy)", sw: ["pt", C.kamera], on: false, src: "kamery", filter: ["==", ["get", "zr"], "windy"]},
    {id: "c-d", label: "Kamery drogowe (GDDKiA)", sw: ["pt", C.kameraDroga], on: false, src: "kamery", filter: ["==", ["get", "zr"], "trax"]},
    {id: "c-o", label: "Kamery z OpenStreetMap", sw: ["pt", C.kameraOsm], on: false, src: "kamery", filter: ["==", ["get", "zr"], "osm"]},
    {id: "c-g", label: "Kamery górskie (ośrodki)", sw: ["pt", C.kameraGora], on: false, src: "kamery", filter: ["==", ["get", "zr"], "gora"]},
    {id: "c-a", label: "Kamery AirMAX", sw: ["pt", C.kameraAirmax], on: false, src: "kamery", filter: ["==", ["get", "zr"], "airmax"]},
    {id: "c-z", label: "Kamery Zachodniej TV", sw: ["pt", C.kameraZtv], on: false, src: "kamery", filter: ["==", ["get", "zr"], "zachodnia"]},
    {id: "c-v", label: "Kamery Kotliny Kłodzkiej (devices.pl)", sw: ["pt", C.kameraDev], on: false, src: "kamery", filter: ["==", ["get", "zr"], "devices"]},
    {id: "c-l", label: "Kamery monitoringu (Lubin)", sw: ["pt", C.kameraLubin], on: false, src: "kamery", filter: ["==", ["get", "zr"], "lubin"]},
  ]},
  // Osobne pozycje, bo źródła mierzą co innego: sieć urzędowa z OSM pogodę
  // w okolicy, stacje drogowe GDDKiA stan nawierzchni.
  {id: "pomiary", label: "Pomiary i telemetria", items: [
    {id: "m-pog", label: "Stacje meteorologiczne", sw: ["pt", C.stPog], on: false, src: "stacje", filter: ["in", "pogoda", ["get", "co"]]},
    {id: "m-wod", label: "Posterunki wodowskazowe", sw: ["pt", C.stWod], on: false, src: "stacje", filter: ["in", "woda", ["get", "co"]]},
    {id: "m-pow", label: "Stacje jakości powietrza", sw: ["pt", C.stPow], on: false, src: "stacje", filter: ["in", "powietrze", ["get", "co"]]},
    {id: "m-dro", label: "Drogowe stacje meteo (GDDKiA)", sw: ["pt", C.stDro], on: false, src: "stacje", filter: ["==", ["get", "zr"], "trax"]},
    {id: "m-inne", label: "Inne stacje (promieniowanie, sejsmika, bez rodzaju)", sw: ["pt", C.stInna], on: false, src: "stacje", filter: ["in", ["get", "co"], ["literal", ["inna", "promieniowanie", "sejsmika"]]]},
    {id: "m-tab", label: "Tablice zmiennej treści", sw: ["pt", C.tablica], on: false, src: "tablice"},
  ]},
  {id: "pogoda", label: "Pogoda", live: true, items: [
    {id: "w-radar", label: "Radar opadów", sw: ["ar", "#5b8ff9"], on: true, live: "radar"},
    {id: "w-chm", label: "Chmury teraz (model)", sw: ["ar", "#9aa6b5"], on: false, live: "chmury", ml: ["w-chm"]},
    {id: "w-ost", label: "Ostrzeżenia IMGW", sw: ["ar", C.ostrz2], on: false, live: "ostrz", ml: ["w-ost", "w-ost-w", "w-ost-l"]},
    {id: "a-pm", label: "Jakość powietrza (PM2,5)", sw: ["pt", "#16a34a"], on: false, live: "powietrze"},
  ]},
  {id: "drogi", label: "Drogi", items: [
    {id: "r-A", label: "Autostrady", sw: ["ln", C.A], on: true, src: "drogi", ml: ["r-A-c", "r-A"], filter: ["==", ["get", "k"], "A"]},
    {id: "r-S", label: "Drogi ekspresowe", sw: ["ln", C.S], on: true, src: "drogi", ml: ["r-S-c", "r-S"], filter: ["==", ["get", "k"], "S"]},
    {id: "r-DK", label: "Drogi krajowe", sw: ["ln", C.DK], on: true, src: "drogi", ml: ["r-DK-c", "r-DK"], filter: ["==", ["get", "k"], "DK"]},
    {id: "r-DW", label: "Drogi wojewódzkie", sw: ["ln", C.DW], on: false, src: "drogi", filter: ["==", ["get", "k"], "DW"]},
    {id: "d-ut", label: "Utrudnienia (GDDKiA)", sw: ["pt", C.utrud], on: false, live: "gddkia"},
  ]},
  // Źródła ulic powstają leniwie (LENIWE w 02-mapa.js) dopiero od progu zoomu,
  // więc włączona pozycja przy małym zoomie nic nie pokazuje i nic nie kosztuje.
  {id: "ulice", label: "Ulice i drogi lokalne", items: [
    {id: "u-p", label: "Drogi powiatowe (od z10)", sw: ["ln", C.ulPow], on: false, src: "ulice-lok", filter: ["==", ["get", "kl"], "P"]},
    {id: "u-l", label: "Drogi gminne i lokalne (od z11)", sw: ["ln", C.ulLok], on: false, src: "ulice-lok", filter: ["==", ["get", "kl"], "L"]},
    {id: "u-m", label: "Ulice miejskie (od z13)", sw: ["ln", C.ulMia], on: false, src: "ulice-mia", filter: ["!=", ["get", "kl"], "sl"]},
    {id: "u-s", label: "Drogi wewnętrzne i dojazdowe (od z14)", sw: ["ln", C.ulSerw], on: false, src: "ulice-mia", filter: ["==", ["get", "kl"], "sl"]},
  ]},
  {id: "kolej", label: "Kolej", items: [
    {id: "k-e", label: "Linie zelektryfikowane", sw: ["ln", C.railE], on: true, src: "kolej", filter: ["all", ["==", ["get", "st"], "czynna"], ["==", ["get", "e"], 1]]},
    {id: "k-n", label: "Linie niezelektryfikowane", sw: ["ln", C.railN], on: true, src: "kolej", filter: ["all", ["==", ["get", "st"], "czynna"], ["==", ["get", "e"], 0]]},
    {id: "k-w", label: "Wąskotorowe", sw: ["ln", C.railNar], on: false, src: "kolej", filter: ["==", ["get", "st"], "waskotorowa"]},
    {id: "k-b", label: "W budowie", sw: ["ln", C.railBud], on: false, src: "kolej", filter: ["==", ["get", "st"], "budowa"]},
    {id: "k-x", label: "Nieczynne", sw: ["ln", C.railOld], on: false, src: "kolej", filter: ["==", ["get", "st"], "nieczynna"]},
    {id: "k-orm", label: "Nakładka OpenRailwayMap", sw: ["ar", "#6b7280"], on: false, raster: true},
  ]},
  {id: "woda", label: "Woda", items: [
    {id: "w-r", label: "Rzeki", sw: ["ln", C.river], on: true, src: "woda", filter: ["==", ["get", "w"], "river"]},
    {id: "w-k", label: "Kanały", sw: ["ln", C.canal], on: false, src: "woda", filter: ["==", ["get", "w"], "canal"]},
    {id: "w-je", label: "Jeziora i rzeki (powierzchnie)", sw: ["ar", C.jezioro], on: true, src: "akweny", ml: ["w-je", "w-je-l"], filter: ["in", ["get", "kat"], ["literal", ["jezioro", "rzeka", "inny"]]]},
    {id: "w-zb", label: "Zbiorniki zaporowe i retencyjne", sw: ["ar", C.zbiornik_w], on: true, src: "akweny", ml: ["w-zb", "w-zb-l"], filter: ["==", ["get", "kat"], "zbiornik"]},
    {id: "w-st", label: "Stawy i osadniki", sw: ["ar", C.staw], on: false, src: "akweny", ml: ["w-st", "w-st-l"], filter: ["==", ["get", "kat"], "staw"]},
    {id: "w-g", label: "Wodowskazy IMGW", sw: ["pt", C.gauge], on: false, live: "imgw"},
  ]},
  {id: "przeprawy", label: "Przeprawy", items: [
    {id: "p-d", label: "Mosty drogowe nad rzekami", sw: ["pt", C.brRoad], on: false, src: "przeprawy", filter: ["==", ["get", "typ"], "drogowy"]},
    {id: "p-k", label: "Mosty kolejowe nad rzekami", sw: ["pt", C.brRail], on: false, src: "przeprawy", filter: ["==", ["get", "typ"], "kolejowy"]},
    {id: "p-p", label: "Promy", sw: ["pt", C.ferry], on: false, src: "przeprawy", filter: ["==", ["get", "typ"], "prom"]},
  ]},
  {id: "lotnictwo", label: "Lotnictwo", items: [
    {id: "l-p", label: "Porty lotnicze", sw: ["pt", C.port], on: true, src: "lotniska", filter: ["==", ["get", "kat"], "port"]},
    {id: "l-l", label: "Lotniska i lądowiska", sw: ["pt", C.airfield], on: false, src: "lotniska", filter: ["==", ["get", "kat"], "lot"]},
    {id: "l-w", label: "Lotniska wojskowe", sw: ["pt", C.mil], on: false, src: "lotniska", filter: ["==", ["get", "kat"], "wojsk"]},
    {id: "l-h", label: "Lądowiska dla śmigłowców", sw: ["pt", C.heli], on: false, src: "lotniska", filter: ["==", ["get", "kat"], "heli"]},
  ]},
  {id: "logistyka", label: "Logistyka", items: [
    {id: "g-i", label: "Terminale intermodalne", sw: ["pt", C.intermodal], on: false, src: "logistyka", filter: ["==", ["get", "kat"], "intermodal"]},
    {id: "g-t", label: "Stacje towarowe i rozrządowe", sw: ["pt", C.yard], on: false, src: "logistyka", filter: ["==", ["get", "kat"], "stacja_tow"]},
    {id: "g-m", label: "Magazyny i centra logistyczne", sw: ["pt", C.log], on: false, src: "logistyka", filter: ["==", ["get", "kat"], "magazyn"]},
    {id: "g-p", label: "Porty rzeczne", sw: ["pt", C.harbour], on: false, src: "logistyka", filter: ["==", ["get", "kat"], "port"]},
  ]},
  {id: "energia", label: "Infrastruktura krytyczna", items: [
    {id: "e-hi", label: "Linie 220 i 400 kV", sw: ["ln", C.pwrHi], on: true, src: "energetyka", ml: ["e-hi", "e-hi-k"], filter: ["all", ["==", ["get", "kat"], "linia"], ["==", ["get", "kl"], "najwyzsze"]]},
    // Stacje według napięcia: wśród tysięcy małych stacji SN/nn węzły sieci
    // 220/400 kV i 110 kV byłyby niewidoczne.
    {id: "e-sth", label: "Stacje 220/400 kV (PSE)", sw: ["pt", C.stHi], on: true, src: "infra-punkty", filter: ["all", ["==", ["get", "kat"], "stacja"], [">=", ["to-number", ["get", "v"], 0], 220000]]},
    {id: "e-mid", label: "Linie 110 kV", sw: ["ln", C.pwrMid], on: false, src: "energetyka", ml: ["e-mid", "e-mid-k"], filter: ["all", ["==", ["get", "kat"], "linia"], ["==", ["get", "kl"], "wysokie"]]},
    {id: "e-st1", label: "Stacje 110 kV (GPZ)", sw: ["pt", C.st110], on: false, src: "infra-punkty", filter: ["all", ["==", ["get", "kat"], "stacja"], [">=", ["to-number", ["get", "v"], 0], 100000], ["<", ["to-number", ["get", "v"], 0], 220000]]},
    {id: "e-low", label: "Pozostałe linie", sw: ["ln", C.pwrLow], on: false, src: "energetyka", ml: ["e-low", "e-low-k"], filter: ["all", ["==", ["get", "kat"], "linia"], ["==", ["get", "kl"], "inne"]]},
    {id: "e-gaz", label: "Rurociągi i gazociągi", sw: ["ln", C.pipe], on: false, src: "energetyka", filter: ["==", ["get", "kat"], "rurociag"]},
    {id: "e-el", label: "Elektrownie", sw: ["pt", C.elektrownia], on: true, src: "infra-punkty", filter: ["==", ["get", "kat"], "elektrownia"]},
    {id: "e-pv", label: "Instalacje fotowoltaiczne", sw: ["pt", C.pv], on: false, src: "infra-punkty", filter: ["==", ["get", "kat"], "pv"]},
    {id: "e-wi", label: "Turbiny wiatrowe", sw: ["pt", C.wiatrak], on: false, src: "infra-punkty", filter: ["==", ["get", "kat"], "wiatrak"]},
    {id: "e-st", label: "Stacje SN i nn (transformatorowe)", sw: ["pt", C.stacja], on: false, src: "infra-punkty", filter: ["all", ["==", ["get", "kat"], "stacja"], ["<", ["to-number", ["get", "v"], 0], 100000]]},
    {id: "e-ma", label: "Maszty telekomunikacyjne", sw: ["pt", C.maszt], on: false, src: "infra-punkty", filter: ["==", ["get", "kat"], "maszt"]},
    {id: "e-sl", label: "Śluzy, jazy i zapory", sw: ["pt", C.sluza], on: false, src: "infra-punkty", filter: ["in", ["get", "kat"], ["literal", ["sluza", "jaz"]]]},
    {id: "e-oc", label: "Oczyszczalnie i wodociągi", sw: ["pt", C.oczysz], on: false, src: "infra-punkty", filter: ["in", ["get", "kat"], ["literal", ["oczyszczalnia", "wodociag"]]]},
  ]},
  {id: "przemysl", label: "Przemysł i surowce", items: [
    {id: "x-ko", label: "Kopalnie odkrywkowe", sw: ["ar", C.kopalnia], on: false, src: "kopalnie", ml: ["x-ko", "x-ko-l", "x-ko-p"]},
    {id: "x-sz", label: "Szyby i sztolnie", sw: ["pt", C.szyb], on: false, src: "przemysl", filter: ["in", ["get", "kat"], ["literal", ["szyb", "kopalnia"]]]},
    {id: "x-za", label: "Zakłady przemysłowe", sw: ["pt", C.zaklad], on: false, src: "przemysl", filter: ["==", ["get", "kat"], "zaklad"]},
    {id: "x-pa", label: "Terminale i zbiorniki paliw", sw: ["pt", C.paliwa], on: false, src: "przemysl", filter: ["in", ["get", "kat"], ["literal", ["terminal", "zbiornik", "odwiert"]]]},
    {id: "x-ga", label: "Gazownictwo (tłocznie, gazometry)", sw: ["pt", C.gaz], on: false, src: "przemysl", filter: ["==", ["get", "kat"], "gaz"]},
    {id: "x-te", label: "Tereny przemysłowe", sw: ["pt", C.teren], on: false, src: "przemysl", filter: ["==", ["get", "kat"], "teren"]},
  ]},
  {id: "gory", label: "Góry", items: [
    {id: "t-gl", label: "Najwyższe szczyty pasm", sw: ["tr", C.szczyt], on: true, src: "szczyty", filter: ["==", ["get", "gl"], 1]},
    {id: "t-sz", label: "Pozostałe szczyty", sw: ["tr", C.szczytInny], on: false, src: "szczyty", filter: ["!=", ["get", "gl"], 1]},
  ]},
  {id: "granice", label: "Granice", items: [
    {id: "b-l", label: "Granica państwa", sw: ["ln", C.border], on: true, src: "granica"},
    {id: "b-d", label: "Przekroczenia drogowe", sw: ["pt", C.xRoad], on: true, src: "przejscia", filter: ["==", ["get", "typ"], "drogowe"]},
    {id: "b-k", label: "Przekroczenia kolejowe", sw: ["pt", C.xRail], on: true, src: "przejscia", filter: ["==", ["get", "typ"], "kolejowe"]},
    {id: "b-g", label: "Granice gmin", sw: ["ar", "#94a3b8"], on: true, src: "gminy"},
  ]},
  {id: "kosmos", label: "Kosmos", live: true, items: Object.entries(SAT_GROUPS).map(([g, v]) => (
    {id: "s-" + g, label: v.label, sw: ["pt", v.color], on: false, live: "sat", grp: g}
  ))},
];
const ITEMS = {};
for (const g of TREE) for (const it of g.items) { it.group = g.id; ITEMS[it.id] = it; }
// START nadpisuje flagi `on:` z TREE (poza podkładem i terenem). Bez kamer
// Windy: kilkaset punktów zasłoniłoby region.
const START = [
  "p-dal", "p-reg", "p-msc",
  "c-d", "c-o", "c-g", "c-a", "c-z", "c-v", "c-l",
  "m-pog", "m-wod", "m-dro", "m-inne",
  "w-radar", "w-ost", "a-pm",
  "r-A", "r-S", "r-DK", "r-DW", "d-ut",
  "u-p", "u-l", "u-m", "u-s",
  "k-e",
  "w-r", "w-je", "w-zb", "w-st",
  "l-p", "l-l", "l-w", "l-h",
  "e-sth", "e-wi",
  "x-ko", "x-pa", "x-ga",
  "b-l",
  ...Object.keys(SAT_GROUPS).map(g => "s-" + g),
];
for (const it of Object.values(ITEMS)) if (!it.base && !it.teren) it.on = START.includes(it.id);
// Zapamiętany przed wczytaniem stanu z localStorage: preset „Start”
// (06-drzewo.js) wraca do niego, a nie do ostatniego stanu.
const ZESTAW_STARTOWY = Object.values(ITEMS).filter(it => it.on && !it.base && !it.teren).map(it => it.id);

// Zmiana zestawu startowego nie dotrze do kogoś, kto ma stan w localStorage.
// Podbicie WERSJA_WARSTW jednorazowo odrzuca zapamiętany stan.
const WERSJA_WARSTW = 4;
const saved = store.get("layersV", 0) === WERSJA_WARSTW ? store.get("layers", null) : null;
if (saved) for (const id in saved) if (ITEMS[id]) ITEMS[id].on = saved[id];
// Źródła wyłączone przy budowie znikają z drzewa (pusta pozycja wyglądałaby
// na awarię), ale zostają w ITEMS, bo addLayers() szuka warstw po identyfikatorach.
if (WYLACZONE_ZR.size) for (const g of TREE) g.items = g.items.filter(it => {
  const zr = Array.isArray(it.filter) && it.filter[0] === "==" && it.filter[1]?.[1] === "zr" ? it.filter[2] : null;
  const out = (zr && WYLACZONE_ZR.has(zr)) || (it.src === "tablice" && WYLACZONE_ZR.has("trax"));
  if (out) it.on = false;
  return !out;
});
const saveLayers = () => { const o = {}; for (const id in ITEMS) o[id] = ITEMS[id].on; store.set("layers", o); store.set("layersV", WERSJA_WARSTW); };

const S = {
  selected: null,           // {kind, id, props, lngLat}
  observer: {lon: 17.0327, lat: 51.1097, name: "Wrocław"},
  globe: false,
  src: {                     // stan źródeł na żywo
    sat: {state: "wait", note: "", at: null},
    imgw: {state: "off", note: "", at: null},
    motis: {state: "off", note: "", at: null},
    radar: {state: "off", note: "", at: null},
    gddkia: {state: "off", note: "", at: null},
    ostrz: {state: "off", note: "", at: null},
    powietrze: {state: "off", note: "", at: null},
    chmury: {state: "off", note: "", at: null},
    pse: {state: "off", note: "", at: null},
  },
  teren: false,
};
const now = () => new Date();
