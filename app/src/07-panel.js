const KIND = {
  drogi: "Droga", kolej: "Linia kolejowa", woda: "Ciek wodny", przeprawy: "Przeprawa", granica: "Granica państwa",
  przejscia: "Przekroczenie granicy", lotniska: "Lotnictwo", logistyka: "Logistyka", gminy: "Gmina", imgw: "Wodowskaz IMGW",
  energetyka: "Sieć przesyłowa", "infra-punkty": "Infrastruktura",
  kopalnie: "Górnictwo", przemysl: "Przemysł", akweny: "Wody powierzchniowe", kamery: "Kamera internetowa",
  sats: "Satelita", "ulice-lok": "Droga lokalna", "ulice-mia": "Ulica",
  stacje: "Stacja pomiarowa", tablice: "Tablica zmiennej treści",
  gddkia: "Utrudnienie w ruchu", ostrzezenia: "Ostrzeżenie IMGW", powietrze: "Stacja jakości powietrza",
  szczyty: "Szczyt górski", chmury: "Pogoda teraz (model)", miejscowosci: "Miejscowość",
};
const ROAD = {A: "autostrada", S: "droga ekspresowa", DK: "droga krajowa", DW: "droga wojewódzka"};
const AIR = {port: "port lotniczy", lot: "lotnisko lub lądowisko", wojsk: "lotnisko wojskowe", heli: "lądowisko dla śmigłowców"};
const LOGI = {intermodal: "terminal intermodalny", stacja_tow: "stacja towarowa / rozrządowa", magazyn: "magazyn / centrum logistyczne", port: "port rzeczny"};
const KRAJ = {DE: "Niemcy", CZ: "Czechy"};
const SUROWCE = {coal: "węgiel", lignite: "węgiel brunatny", "brown coal": "węgiel brunatny",
  "hard coal": "węgiel kamienny", copper_ore: "ruda miedzi", copper: "miedź", sand: "piasek",
  gravel: "żwir", limestone: "wapień", granite: "granit", basalt: "bazalt", clay: "glina",
  gypsum: "gips", kaolinite: "kaolin", marble: "marmur", sandstone: "piaskowiec", silver: "srebro",
  gold: "złoto", salt: "sól", peat: "torf", dolomite: "dolomit", aggregate: "kruszywo"};
const TRESC = {gas: "gaz", lpg: "LPG", oil: "ropa lub olej", fuel: "paliwo", diesel: "olej napędowy",
  petrol: "benzyna", water: "woda", slurry: "szlam", chemical: "chemikalia", cement: "cement"};
const HW = {motorway: "autostrada", trunk: "droga ekspresowa", primary: "droga krajowa", secondary: "droga wojewódzka",
  tertiary: "droga powiatowa", unclassified: "droga lokalna", residential: "ulica", track: "droga gruntowa",
  rail: "linia kolejowa", narrow_gauge: "kolej wąskotorowa", disused: "nieczynna linia kolejowa"};

const kv = rows => `<dl class="kv">${rows.filter(r => r[1] != null && r[1] !== "").map(([k, v, m]) =>
  `<dt>${esc(k)}</dt><dd${m ? ' class="m"' : ""}>${v}</dd>`).join("")}</dl>`;
const gminaRow = t => t && GMINY[t] ? [["Gmina", `${esc(GMINY[t].n)} <span style="color:var(--ink-4)">(${["", "miejska", "wiejska", "miejsko-wiejska"][GMINY[t].t] || ""})</span>`], ["TERYT", esc(t), 1]] : [["Gmina", '<span style="color:var(--ink-4)">poza województwem dolnośląskim</span>']];
const osmLink = (src, id) => {
  if (id == null) return "";
  const s = String(id);
  const type = /^[nwr]/.test(s) ? {n: "node", w: "way", r: "relation"}[s[0]] : "way";
  const num = /^[nwr]/.test(s) ? s.slice(1) : s;
  return `<p class="note">Obiekt w OpenStreetMap: <a href="https://www.openstreetmap.org/${type}/${num}" target="_blank" rel="noopener">${type}/${num}</a></p>`;
};

// Windy bez ciasteczek przekierowuje /webcams/ID na swoją mapę główną; z parametrem
// ?webcams,szer,dł,zoom otwiera kamerę już przy pierwszym wejściu.
function linkWindy(www, ll) {
  const id = /webcams\/(\d+)/.exec(www || "")?.[1];
  if (!id) return www;
  const c = ll ? `${ll.lat.toFixed(3)},${ll.lng.toFixed(3)}` : "51.000,16.300";
  return `https://www.windy.com/webcams/${id}?webcams,${c},12`;
}
function describe(sel) {
  const p = sel.props, src = sel.src;
  let kind = KIND[src] || "Obiekt", title = p.n || "", sub = "", rows = [], extra = "";
  switch (src) {
    case "drogi":
      title = p.ref ? `${p.ref}${p.n ? " · " + p.n : ""}` : (p.n || "Droga bez numeru");
      sub = ROAD[p.k] + (p.lnk ? " (łącznica)" : "");
      rows = [["Klasa", ROAD[p.k]], ["Numer", esc(p.ref), 1], ["Pasy ruchu", esc(p.lan)], ["Prędkość maks.", p.vmax ? esc(p.vmax) + " km/h" : null],
        ["Obiekt", p.b ? "most / wiadukt" : p.tun ? "tunel" : null]];
      break;
    // Pozostałe tagi OSM dróg lokalnych są zbyt niekompletne, żeby je pokazywać.
    case "ulice-lok":
      title = p.ref ? `${p.ref}${p.n ? " · " + p.n : ""}` : (p.n || (p.kl === "P" ? "Droga powiatowa bez nazwy" : "Droga lokalna bez nazwy"));
      sub = p.kl === "P" ? "droga powiatowa" : "droga gminna lub lokalna";
      rows = [["Klasa", sub], ["Numer", esc(p.ref), 1], ["Nazwa", esc(p.n)]];
      extra = `<p class="note">Klasa wynika z tagu <b>highway</b> w OSM: <b>tertiary</b> to zwykle droga powiatowa, <b>unclassified</b> gminna. W terenie bywa inaczej, OSM nie zna podziału administracyjnego dróg.</p>`;
      break;
    case "ulice-mia":
      title = p.n || {os: "Ulica bez nazwy", pie: "Ciąg pieszy", sl: "Droga wewnętrzna"}[p.kl];
      sub = {os: "ulica osiedlowa", pie: "ciąg pieszy lub deptak", sl: "droga wewnętrzna / dojazdowa"}[p.kl] || "ulica";
      rows = [["Rodzaj", sub], ["Miasto", esc(p.m)], ...gminaRow(p.teryt)];
      break;
    case "gddkia": {
      const dt = x => x ? new Date(+x).toLocaleString("pl-PL", {dateStyle: "short", timeStyle: "short"}) : null;
      title = `${p.droga ? "DK " + p.droga : "Droga krajowa"}${p.km != null ? ` · km ${p.km}` : ""}`;
      sub = p.typ || p.klasa || "utrudnienie";
      rows = [["Rodzaj", esc(p.typ)], ["Kategoria", esc(p.klasa)], ["Droga", esc(p.droga), 1],
        ["Kilometraż", p.km != null ? `${p.km} km` : null], ["Długość odcinka", p.dlug ? `${p.dlug} km` : null],
        ["Od", dt(p.od)], ["Do", dt(p.do)], ["Szacowane opóźnienie", p.zwloka ? esc(p.zwloka) : null]];
      extra = [p.opis && `<p class="note">${esc(p.opis)}</p>`,
               p.skutki && `<p class="note"><b>Skutki:</b> ${esc(p.skutki)}</p>`,
               p.rada && `<p class="note"><b>Dla kierowców:</b> ${esc(p.rada)}</p>`,
               `<p class="note">Źródło: Kanał Punktu Dostępowego GDDKiA. Obejmuje tylko drogi krajowe i autostrady zarządzane przez GDDKiA, utrudnień na drogach wojewódzkich i miejskich tu nie będzie.</p>`]
        .filter(Boolean).join("");
      break;
    }
    case "ostrzezenia": {
      const NAZ = {3: "III stopień", 2: "II stopień", 1: "I stopień"};
      title = p.zdarzenia || "Ostrzeżenie meteorologiczne";
      sub = NAZ[p.st] || "ostrzeżenie bez stopnia (susza)";
      rows = [["Stopień", esc(sub)], ["Powiat (TERYT)", esc(p.pow), 1], ["Gmina", esc(p.gmina)],
        ["Obowiązuje od", esc(p.od)], ["Obowiązuje do", esc(p.do)],
        ["Prawdopodobieństwo", p.szansa ? esc(p.szansa) + " %" : null], ["Biuro", esc(p.biuro)]];
      extra = [p.tresc && `<p class="note">${esc(p.tresc).replace(/\n/g, "<br>")}</p>`,
               `<p class="note">Obszarem ostrzeżenia IMGW jest <b>powiat</b>. Mapa rysuje go wielobokami gmin, bo tylko takie granice ma, kolor całego powiatu jest ten sam.</p>`,
               ostrzHydro.length ? `<p class="note"><b>Ostrzeżenia hydrologiczne dla Dolnego Śląska (${ostrzHydro.length}):</b><br>${
                 ostrzHydro.slice(0, 6).map(o => esc(`${o.zdarzenie}: ${(o.obszary || []).map(x => x.opis).join("; ")}`)).join("<br>")
               }<br><span style="color:var(--ink-4)">Te ostrzeżenia mają w API tylko nazwę województwa i kody zlewni, bez granic, dlatego nie ma ich na mapie.</span></p>` : ""]
        .filter(Boolean).join("");
      break;
    }
    // Liczba mieszkańców to tag OSM z różnych lat i źródeł, a nie dane urzędowe,
    // więc panel mówi to przy liczbie. Pole simc służy jako klucz złączenia.
    case "miejscowosci": {
      const RODZ = {city: "miasto", town: "miasto", village: "wieś"};
      title = p.n; sub = RODZ[p.p] || p.p;
      rows = [["Rodzaj", esc(RODZ[p.p] || p.p)],
        ["Mieszkańcy", p.pop ? `${fmt(p.pop)} <span style="color:var(--ink-4)">(OSM${p.pop_d ? ", " + esc(p.pop_d) : ""})</span>` : null],
        ...gminaRow(p.teryt), ["TERYT SIMC", esc(p.simc), 1], ["Nazwa niemiecka", esc(p.de)]];
      extra = `<p class="note">Położenie, nazwa i liczba mieszkańców z OpenStreetMap. Liczba mieszkańców bywa nieaktualna, wpisują ją mapujący, z różnych lat i źródeł.${p.pop ? "" : " Ta miejscowość nie ma jej w OSM."}</p>`;
      break;
    }
    case "chmury":
      title = p.opis ? p.opis[0].toUpperCase() + p.opis.slice(1) : "Zachmurzenie";
      sub = `gmina ${p.n} · zachmurzenie ${p.cc} %`;
      rows = [["Zachmurzenie", `${p.cc} %`], ["Pogoda", esc(p.opis)], ["Opad", p.opad != null ? `${fmt(p.opad, 1)} mm` : null],
        ["Stan na", esc(String(p.t).replace("T", " ")), 1], ...gminaRow(p.teryt), ["Kod WMO", esc(p.kod), 1]];
      extra = `<p class="note">To wynik <b>modelu pogody</b> (Open-Meteo: DWD, ECMWF i inne), a nie obserwacja z satelity ani radaru. Model liczy punkty co ok. 25 km; zachmurzenie gminy to średnia ważona 4 najbliższych punktów, rodzaj pogody, z najbliższego punktu o najgroźniejszej pogodzie. Gdzie faktycznie pada, pokazuje warstwa <b>Radar opadów</b>.</p><p class="note">${atr("openmeteo")}</p>`;
      break;
    case "powietrze":
      title = `Stacja ${p.id}`;
      sub = "pomiar amatorski (Sensor.Community)";
      rows = [["PM2,5", p.pm25 != null ? `${p.pm25.toFixed(1)} µg/m³` : null],
        ["PM10", p.pm10 != null ? `${p.pm10.toFixed(1)} µg/m³` : null],
        ["Temperatura", p.temp != null ? `${p.temp.toFixed(1)} °C` : null],
        ["Wilgotność", p.wilg != null ? `${Math.round(p.wilg)} %` : null],
        ["Ciśnienie", p.cisn != null ? `${p.cisn} hPa` : null],
        ["Pomiar", esc(p.t)], ["Położenie", p.dok ? "dokładne" : "przybliżone przez właściciela"]];
      extra = `<p class="note">Sensor.Community to sieć czujników budowanych i utrzymywanych przez ludzi prywatnych. <b>Nie są wzorcowane</b> i przy dużej wilgotności zawyżają odczyt pyłu. Dobowa norma WHO 2021 dla PM2,5 to 15 µg/m³, polski poziom informowania to 100 µg/m³. Do porównań urzędowych służy GIOŚ, którego serwer nie pozwala na odczyt z przeglądarki.</p>`;
      break;
    case "kolej":
      title = p.nr ? `Linia kolejowa nr ${p.nr.split(",").join(", ")}` : (p.n || "Linia kolejowa");
      sub = {czynna: "linia czynna", waskotorowa: "kolej wąskotorowa", budowa: "w budowie", nieczynna: "linia nieczynna"}[p.st] || p.st;
      rows = [["Stan", esc(sub)], ["Elektryfikacja", p.e ? "tak" : "nie"], ["Znaczenie", {main: "magistralna / pierwszorzędna", branch: "drugorzędna / lokalna", industrial: "przemysłowa"}[p.u] || esc(p.u)],
        ["Tory", esc(p.tor)], ["Prędkość maks.", p.vmax ? esc(p.vmax) + " km/h" : null], ["Nazwa w OSM", esc(p.n)]];
      extra = `<p class="note">Numer linii pochodzi z relacji <b>route=railway</b> w OSM i odpowiada numeracji PKP PLK. Odcinek może należeć do kilku linii.</p>`;
      break;
    case "woda":
      title = p.n || (p.w === "canal" ? "Kanał bez nazwy" : "Rzeka bez nazwy");
      sub = p.w === "canal" ? "kanał" : "rzeka";
      rows = [["Rodzaj", sub], ["Żeglowność w OSM", p.nav ? "oznaczona jako żeglowna" : null]];
      break;
    case "przeprawy":
      if (p.typ === "prom") { title = p.n || "Przeprawa promowa"; sub = "prom"; rows = [["Rodzaj", "prom"]]; break; }
      title = p.n || `Most ${p.typ} ${p.ref ? p.ref + " " : ""}na ${p.rz || "rzece bez nazwy"}`;
      sub = `most ${p.typ} nad ${p.rzw === "canal" ? "kanałem" : "rzeką"}`;
      rows = [["Rzeka / kanał", esc(p.rz) || "bez nazwy w OSM"], ["Rodzaj", `most ${p.typ}`],
        ["Droga", p.typ === "drogowy" ? `${esc(p.ref) || "bez numeru"} (${HW[p.dr] || esc(p.dr)})` : null],
        ["Linia", p.typ === "kolejowy" && p.ref ? esc(p.ref) : null],
        ["Długość obiektu", p.dl ? fmt(p.dl) + " m" : null], ["Jezdnie / obiekty", p.nob ? `${p.nob} osobne obiekty OSM połączone w jedną przeprawę` : null],
        ...gminaRow(p.teryt)];
      extra = `<p class="note">Przeprawa wyznaczona automatycznie: oś mostu z OSM przecina linię rzeki lub kanału. Wiadukty nad drogami i torami tu nie trafiają.</p>`;
      break;
    case "granica":
      title = "Granica państwa"; sub = "Polska"; rows = [];
      break;
    case "przejscia":
      title = p.ref ? `${p.ref}${p.n ? " · " + p.n : ""}` : (p.n || `Przekroczenie ${p.typ}`);
      sub = `przekroczenie ${p.typ} · ${KRAJ[p.kraj] || p.kraj}`;
      rows = [["Kierunek", `Polska / ${KRAJ[p.kraj] || esc(p.kraj)}`], ["Rodzaj", p.typ], ["Klasa drogi / toru", HW[p.kl] || esc(p.kl)], ["Numer", esc(p.ref), 1], ...gminaRow(p.teryt)];
      extra = `<p class="note">Punkt, w którym droga lub tor z OSM przecina granicę państwa. Granica z Czechami i Niemcami leży w strefie Schengen: nie ma tu kontroli ani mierzonego czasu oczekiwania. Część punktów to drogi lokalne i gruntowe.</p>`;
      break;
    case "lotniska":
      title = p.n || AIR[p.kat]; sub = AIR[p.kat];
      rows = [["Rodzaj", AIR[p.kat]], ["ICAO", esc(p.icao), 1], ["IATA", esc(p.iata), 1], ["Typ w OSM", esc(p.typ)],
        ["Wysokość", p.ele ? esc(p.ele) + " m n.p.m." : null], ["Zarządca", esc(p.op)], ...gminaRow(p.teryt)];
      break;
    case "logistyka":
      title = p.n || LOGI[p.kat]; sub = LOGI[p.kat];
      rows = [["Rodzaj", LOGI[p.kat]], ["Operator", esc(p.op)], ...gminaRow(p.teryt)];
      extra = `<p class="note">Warstwa z OSM jest niepełna: wiele magazynów nie ma w OSM nazwy ani oznaczenia. Brak obiektu na mapie nie oznacza, że go nie ma.</p>`;
      break;
    case "energetyka": {
      const kl = {najwyzsze: "linia najwyższych napięć", wysokie: "linia wysokiego napięcia", inne: "linia niższego napięcia"};
      if (p.kat === "rurociag") {
        title = p.n || `Rurociąg${p.sub ? " · " + p.sub : ""}`; sub = "rurociąg";
        rows = [["Przesyłany czynnik", {gas: "gaz ziemny", oil: "ropa naftowa", water: "woda", sewage: "ścieki", heat: "ciepło"}[p.sub] || esc(p.sub)],
                ["Przebieg", {underground: "podziemny", overground: "naziemny"}[p.loc] || esc(p.loc)], ["Operator", esc(p.op)]];
      } else {
        title = p.ref ? `Linia ${esc(p.ref)}` : (kl[p.kl] || "Linia elektroenergetyczna");
        sub = kl[p.kl];
        sub = (p.kab ? "kabel podziemny · " : "linia napowietrzna · ") + kl[p.kl];
        rows = [["Napięcie", p.v ? fmt(p.v / 1000) + " kV" : "nieoznaczone w OSM"], ["Przebieg", p.kab ? "pod ziemią (kabel)" : "napowietrzny"],
                ["Operator", esc(p.op)], ["Oznaczenie", esc(p.ref)]];
      }
      extra = `<p class="note">Linie 220 i 400 kV to sieć przesyłowa (PSE), 110 kV to sieć dystrybucyjna. Linie średniego i niskiego napięcia są w OSM zmapowane wyrywkowo.</p>`;
      break;
    }
    case "infra-punkty": {
      const KAT = {elektrownia: "elektrownia", wiatrak: "turbina wiatrowa", stacja: "stacja elektroenergetyczna",
        maszt: "maszt telekomunikacyjny", sluza: "śluza", jaz: "jaz lub zapora", pv: "instalacja fotowoltaiczna",
        oczyszczalnia: "oczyszczalnia ścieków", wodociag: "ujęcie lub stacja wody"};
      const ZR = {wind: "wiatr", hydro: "woda", coal: "węgiel", gas: "gaz", biomass: "biomasa",
        solar: "słońce", nuclear: "paliwo jądrowe", oil: "olej opałowy"};
      title = p.n || KAT[p.kat]; sub = KAT[p.kat];
      rows = [["Rodzaj", KAT[p.kat]], ["Źródło energii", ZR[p.zrodlo] || esc(p.zrodlo)],
        ["Moc", esc(p.moc)], ["Napięcie", p.v ? fmt(p.v / 1000) + " kV" : null],
        ["Wysokość", p.h ? esc(p.h) + " m" : null], ["Operator", esc(p.op)], ...gminaRow(p.teryt)];
      break;
    }
    case "kamery": {
      const droga = p.zr === "trax", zOsm = p.zr === "osm", gora = p.zr === "gora", airmax = p.zr === "airmax", lubin = p.zr === "lubin";
      // `kotw`: kamera zakotwiczona w obiekcie OSM, operator w `op`.
      const ztv = p.zr === "zachodnia", dev = p.zr === "devices", kotw = zOsm || gora || airmax || lubin || ztv || dev;
      kind = droga ? "Kamera drogowa" : zOsm ? "Kamera z OpenStreetMap"
        : gora ? "Kamera górska" : airmax ? "Kamera AirMAX" : lubin ? "Kamera monitoringu miejskiego"
        : (ztv || dev) ? "Kamera widokowa" : "Kamera internetowa";
      title = p.n || "Kamera";
      sub = droga ? "GDDKiA · system TRAX" : kotw ? (esc(p.op) || "kamera otagowana w OSM")
        : ([p.msc, p.kraj].filter(Boolean).join(", ") || "kamera internetowa");
      const akt = p.akt ? new Date((typeof p.akt === "number" ? p.akt * 1000 : Date.parse(p.akt))) : null;
      rows = [["Lokalizacja", [esc(p.msc), esc(p.kraj)].filter(Boolean).join(", ") || null],
        ["Stan", p.stan === "active" ? "czynna" : esc(p.stan)],
        [droga ? "Droga" : "Kategoria", esc(p.kat)],
        ["Operator", droga ? "GDDKiA (stacja TRAX Elektronik)" : kotw ? (esc(p.op) || "nie podany w OSM") : "Windy.com"],
        // Współrzędnych operatora nie kopiujemy, położenie pochodzi z obiektu OSM.
        ["Położenie", (ztv || dev) ? (p.przybl ? "środek miejscowości (przybliżone)" : "obiekt z OpenStreetMap")
          : (droga || lubin) ? "najbliższe skrzyżowanie lub obiekt z OpenStreetMap" : null],
        ["Lista pobrana", akt && !isNaN(akt) ? akt.toLocaleString("pl-PL") : null]];
      // Adresy zdjęć Windy (token na 10 min) i TRAX (godzina w nazwie) są
      // jednorazowe, więc w pliku jest tylko klatka z budowy, a obraz bieżący u źródła.
      // Odtwarzacz YouTube wymaga Referera, którego file:// nie wysyła: wtedy link.
      extra = (p.yt ? (location.protocol === "file:"
        ? `<p class="note">${aHref(`https://www.youtube.com/watch?v=${encodeURIComponent(p.yt)}`, "Podgląd na żywo w YouTube")}, otwiera się w nowej karcie.</p>`
        : `<iframe class="cam-embed" src="https://www.youtube-nocookie.com/embed/${esc(p.yt)}?rel=0" title="${esc(p.n)}, podgląd na żywo" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media" allowfullscreen></iframe>`) : "")
        + (p.klatka ? `<img class="foto" src="${esc(p.klatka)}" alt="" loading="lazy">
          <p class="foto-cap">Klatka zgrana przy budowie mapy, nie obraz na żywo.</p>` : "")
        + (p.www ? `<p class="note"><a href="${esc(p.zr === "windy" ? linkWindy(p.www, sel.lngLat) : p.www)}" target="_blank" rel="noopener"><b>${droga ? "Otwórz bieżący obraz w serwisie TRAX" : kotw ? "Otwórz podgląd u operatora" : "Otwórz podgląd na żywo w Windy"}</b></a></p>` : "")
        // Kamery na jednym skrzyżowaniu mają ten sam punkt i nakładające się ikony.
        + (() => {
          const obok = p.osm && (lubin || droga) ? D.layers.kamery.features
            .filter(f => f.properties.osm === p.osm && f.properties.id !== p.id) : [];
          return obok.length ? `<div class="sec"><h3>Inne kamery w tym punkcie (${obok.length})</h3>${obok.map(f =>
            `<p class="note">${f.properties.www ? `<a href="${esc(f.properties.www)}" target="_blank" rel="noopener">${esc(f.properties.n)}</a>` : esc(f.properties.n)}</p>`).join("")}</div>` : "";
        })()
        + (droga
          ? `<p class="note">Kamera przy drodze krajowej, przy stacji pogodowej GDDKiA. Punkt to najbliższy obiekt z OpenStreetMap (${esc(p.osm)}): stacja pomiarowa albo skrzyżowanie, do kilkudziesięciu metrów od kamery. Obraz odświeża się co kilka minut u operatora; adres zdjęcia zmienia się przy każdym ujęciu, więc mapa nie może pokazać go u siebie.</p>`
          : gora
          ? (p.yt
            ? `<p class="note">Punkt to środek trasy wyciągu krzesełkowego w OpenStreetMap (${esc(p.osm)}), nie miejsce montażu kamery, strona ośrodka współrzędnych nie podaje. Ta kamera transmituje na żywo przez YouTube (operator „Mieszko Zieleniec”), więc, jako jedyna dotąd w projekcie, jest osadzona wprost powyżej, nie tylko punktem i linkiem.</p>`
            : `<p class="note">Położenie pochodzi z obiektu w OpenStreetMap (${esc(p.osm)}), a nie ze strony ośrodka, strony ośrodków współrzędnych nie podają, a samych nazw nie da się użyć: „Czarna Góra" to w OSM pięć różnych szczytów. Obraz idzie przez odtwarzacz na stronie operatora i nie ma stałego adresu, więc mapa pokazuje punkt i odnośnik, nie zdjęcie.</p>`)
          : airmax
          ? `<p class="note">AirMAX nie publikuje współrzędnych kamer, punkt to środek miejscowości z OpenStreetMap (${esc(p.osm)}), do którego nazwa kamery została dopasowana ręcznie, nie dokładne miejsce montażu. Kilka kamer w tej samej miejscowości pokazuje więc ten sam punkt. Obraz idzie przez odtwarzacz na stronie operatora, więc mapa pokazuje punkt i odnośnik, nie zdjęcie.</p>`
          : (ztv || dev)
          ? `<p class="note">${ztv ? "Zachodnia TV" : "devices.pl"} nie podaje współrzędnych kamer. ${p.przybl
              ? `Podpis kamery nie wskazuje konkretnego obiektu, więc punkt to środek miejscowości z OpenStreetMap (${esc(p.osm)}), nie miejsce montażu.`
              : `Punkt to obiekt z OpenStreetMap (${esc(p.osm)}) wskazany w nazwie albo opisie kamery (${esc(p.kat)}), a nie dokładne miejsce montażu; błąd to zwykle kilkadziesiąt, najwyżej kilkaset metrów.`}
              Obraz otwiera się u operatora; mapa nie osadza podglądu.</p><p class="note">${atr(ztv ? "zachodnia" : "devices")}</p>`
          : lubin
          ? `<p class="note">Kamera monitoringu miejskiego Lubina, nie kamera widokowa. Punkt to skrzyżowanie z OpenStreetMap (${esc(p.osm)}), przy którym kamera wisi, a nie dokładne miejsce montażu; od portalu mapa bierze tylko adres kamery i link. Obraz otwiera się u operatora, mapa nie osadza podglądu.</p>`
          : zOsm
          ? `<p class="note">Położenie pochodzi z OpenStreetMap, adres podglądu z tagu <b>contact:webcam</b>. Mapa pokazuje tylko kamery z podanym adresem podglądu, kamery monitoringu miejskiego, których nie da się obejrzeć, są pomijane celowo.</p>`
          : `<p class="note">Obraz na żywo otwiera się w serwisie Windy: ich API podpisuje adresy zdjęć tokenem ważnym 10 minut i nie pozwala pytać o nie z poziomu strony, więc mapa nie może pokazać klatki u siebie.</p>`
            // Warunki Windy Webcams API wymagają atrybucji przy kamerze w tym brzmieniu.
            + `<p class="note">${atr("windy")}</p>`);
      break;
    }
    case "stacje": {
      const CO = {pogoda: "meteorologiczna", woda: "wodowskazowa", powietrze: "jakości powietrza",
        ruch: "pomiaru ruchu", promieniowanie: "pomiaru promieniowania", sejsmika: "sejsmiczna",
        gps: "geodezyjna (GNSS)", droga: "drogowa meteo", inna: "bez określonego rodzaju"};
      const co = String(p.co || "inna").split(",").map(x => CO[x] || x);
      kind = "Stacja pomiarowa";
      title = p.n || (p.ref ? "Stacja " + p.ref : "Stacja pomiarowa");
      sub = "stacja " + co.join(", ");
      rows = [["Mierzy", co.join(", ")], ["Operator", esc(p.op) || "nie podany"],
        ["Numer stacji", esc(p.ref), 1], ...gminaRow(p.teryt)];
      extra = p.zr === "trax"
        ? `<p class="note">Drogowa stacja meteo GDDKiA (system TRAX). Stoi przy samej jezdni i mierzy co innego niż stacja IMGW: temperaturę nawierzchni, stan opadu i oblodzenie, a nie pogodę w okolicy. Punkt to najbliższy obiekt z OpenStreetMap (${esc(p.osm)}), nie współrzędne operatora.</p>`
        : `<p class="note">Położenie i rodzaj pomiaru pochodzą z OpenStreetMap (<b>man_made=monitoring_station</b>). Mapa pokazuje, <b>gdzie</b> stacja stoi i kto ją prowadzi, nie ma jej własnych odczytów. Dla stacji meteo, wodowskazów i powietrza niżej jest odczyt <b>najbliższej</b> stacji z otwartego źródła na żywo.</p>`;
      break;
    }
    case "tablice":
      kind = "Tablica zmiennej treści";
      title = p.n || "Tablica zmiennej treści";
      sub = "znak o zmiennej treści przy drodze krajowej";
      rows = [["Lokalizacja", esc(p.n)], ["Zarząd", esc(p.op)], ...gminaRow(p.teryt)];
      extra = `<p class="note">Tablica sterowana przez GDDKiA (system TRAX). Punkt to najbliższe skrzyżowanie z OpenStreetMap (${esc(p.osm)}). Mapa pokazuje położenie, nie wyświetlaną treść, tej operator nie udostępnia publicznie.</p>`;
      break;
    case "akweny": {
      const KAT = {jezioro: "jezioro", zbiornik: "zbiornik wodny", staw: "staw lub osadnik",
        rzeka: "powierzchnia cieku", inny: "akwen"};
      title = p.n || KAT[p.kat]; sub = KAT[p.kat];
      rows = [["Rodzaj", KAT[p.kat]], ["Powierzchnia", p.ha != null ? fmt(p.ha, 1) + " ha" : null],
        ["Typ w OSM", esc(p.typ)], ["Operator", esc(p.op)], ...gminaRow(p.teryt)];
      extra = `<p class="note">Powierzchnia policzona z obrysu OSM, przy normalnym stanie wody. Zbiornik zaporowy przy niskim stanie bywa o kilkanaście procent mniejszy.</p>`;
      break;
    }
    case "kopalnie":
      title = p.n || "Kopalnia odkrywkowa"; sub = "wyrobisko odkrywkowe";
      rows = [["Wydobywany surowiec", SUROWCE[p.sur] || esc(p.sur)], ["Operator", esc(p.op)],
        ["Powierzchnia", p.ha ? fmt(p.ha) + " ha" : null], ...gminaRow(p.teryt)];
      extra = `<p class="note">Obrys z OSM obejmuje teren wyrobiska, a nie obszar koncesji górniczej. Kopalnie podziemne (szyby KGHM) są w warstwie „Szyby i sztolnie”.</p>`;
      break;
    case "przemysl": {
      const KAT = {szyb: "szyb lub sztolnia", kopalnia: "zakład górniczy", zaklad: "zakład przemysłowy",
        terminal: "terminal lub baza paliw", zbiornik: "zbiornik magazynowy", odwiert: "odwiert",
        gaz: "obiekt gazowniczy", teren: "teren przemysłowy"};
      title = p.n || KAT[p.kat]; sub = KAT[p.kat];
      rows = [["Rodzaj", KAT[p.kat]], ["Operator", esc(p.op)],
        ["Zawartość", TRESC[p.co] || esc(p.co)], ["Produkt", esc(p.prod)],
        ["Surowiec", SUROWCE[p.sur] || esc(p.sur)], ["Głębokość", p.gleb ? esc(p.gleb) + " m" : null],
        ...gminaRow(p.teryt)];
      break;
    }
    case "szczyty":
      title = p.n;
      sub = p.gl ? `najwyższy szczyt pasma · ${p.pas}` : p.wulk ? "szczyt, dawny wulkan" : "szczyt";
      rows = [["Wysokość", p.ele ? `<b>${fmt(p.ele)} m n.p.m.</b>` : "brak w OSM"],
        ["Pasmo", esc(p.pas)], ["Wysokość w OSM", p.ele_osm ? fmt(p.ele_osm) + " m" : null], ...gminaRow(p.teryt)];
      extra = [
        p.gl && `<p class="note">Najwyższy szczyt pasma w polskiej części Sudetów. Wysokość według Korony Gór Polski i Korony Sudetów Polskich${p.ele_osm ? "; OSM podaje inną, bo mapujący wpisują wynik własnego pomiaru albo tablicy na szczycie" : ""}.</p>`,
        p.uw && `<p class="note">${esc(p.uw[0].toUpperCase() + p.uw.slice(1))}.</p>`,
        p.zrw && `<p class="note">Położenie z listy szczytów głównych (${esc(p.zrw)}), bo w pobranych danych OSM nie ma tego wierzchołka.</p>`,
        !p.gl && `<p class="note">Wysokość z tagu <b>ele</b> w OSM. Wpisują ją mapujący, zwykle z mapy albo tablicy, więc bywa rozbieżna o kilka metrów z innymi źródłami.</p>`,
      ].filter(Boolean).join("");
      break;
    case "gminy":
      title = p.n; kind = "Gmina"; sub = ["", "gmina miejska", "gmina wiejska", "gmina miejsko-wiejska"][p.t];
      rows = [["TERYT", esc(p.teryt), 1]];
      extra = `<p class="note">Granice z Atlasu Dolnego Śląska. Wskaźniki GUS dla tej gminy są w Atlasie (klucz złączenia: TERYT).</p>`;
      break;
    case "imgw":
      title = p.n; sub = `wodowskaz · ${p.rz || ""}`;
      rows = [["Rzeka", esc(p.rz)], ["Stan wody", p.stan != null ? `<b>${fmt(p.stan)} cm</b>` : "brak pomiaru"], ["Pomiar", esc(p.stan_t), 1],
        ["Temperatura wody", p.temp != null ? fmt(p.temp, 1) + " °C" : null], ["Województwo", esc(p.woj)], ["Kod stacji", esc(p.id), 1]];
      extra = `<p class="note">Stan wody to wysokość zwierciadła nad zerem wodowskazu, w centymetrach. Wartości z różnych stacji nie są porównywalne wprost, bo każda ma inne zero.</p>`;
      break;
    case "user":
      title = p.name || p.nazwa || p.n || "Obiekt"; kind = "Własna warstwa · " + sel.userName;
      rows = Object.entries(p).slice(0, 30).map(([k, v]) => [k, esc(typeof v === "object" ? JSON.stringify(v) : v)]);
      break;
  }
  // `id` tych źródeł pochodzi z obcego systemu (Windy, GUID GDDKiA, TERYT), więc
  // link do OSM prowadziłby do przypadkowego obiektu.
  const bezOsm = ["user", "imgw", "gminy", "kamery", "pojazdy", "sats",
                  "gddkia", "ostrzezenia", "powietrze", "ulice-lok", "ulice-mia", "tablice", "chmury"];
  // Warstwa "stacje" miesza OSM z TRAX, którego id to nazwa stacji, nie numer OSM.
  const pomijOsm = bezOsm.includes(src) || p.zr === "trax";
  return {kind, title, sub, body: `<div class="sec">${kv(rows)}${extra}${pomijOsm ? "" : osmLink(src, p.id)}</div>`};
}

function renderPanel() {
  const sel = S.selected;
  if (!sel) { renderPanelStart(); return; }
  if (sel.kind === "sat") { renderSatPanel(); return; }
  const d = describe(sel);
  $("#phead").innerHTML = `<div class="p-kind">${esc(d.kind)}</div><div class="p-title">${esc(d.title)}</div><div class="p-sub">${esc(d.sub)}</div>`;
  // Stacje z OSM nie mają własnych odczytów: dokładamy odczyt najbliższej stacji
  // otwartego źródła, osobno dla każdego mierzonego rodzaju.
  const odczyt = sel.src === "stacje" && sel.lngLat ? ["pogoda", "woda", "powietrze"].filter(co => p_ma(sel.props, co)) : [];
  $("#pbody").innerHTML = d.body
    + (odczyt.length ? `<div class="sec" id="odczytSec"><h3>Odczyt na żywo</h3>${odczyt.map(co => `<div data-odczyt="${co}"><p class="foto-wait">Pobieram odczyt…</p></div>`).join("")}</div>` : "")
    + `<div class="sec" id="fotoSec"><h3>Zdjęcia</h3><p class="foto-wait">Szukam zdjęć…</p></div>`
    + (sel.lngLat ? `<div class="sec"><h3>Położenie</h3>${kv([["Współrzędne", `${sel.lngLat.lat.toFixed(5)}, ${sel.lngLat.lng.toFixed(5)}`, 1]])}</div>` : "");
  for (const co of odczyt) wstawOdczyt(sel, co);
  loadFoto(sel.props, sel.lngLat, promienFoto(sel.src, sel.props));
}
const p_ma = (p, co) => String(p.co || "").split(",").includes(co);

// IMGW podaje nazwy wersalikami; wielka litera także po łączniku
// ("Wrocław-Strachowice").
const nazwaWlasna = s => String(s || "").toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const godzOdcz = t => t ? String(t).replace("T", " ").slice(11, 16) : "";
const wartOdcz = (v, j, t, m = 1) => v == null || v === "" ? null : `${fmt(+v, m)} ${j}${t ? ` <span style="color:var(--ink-4)">· ${godzOdcz(t)}</span>` : ""}`;
const ODCZYT = {
  pogoda: {
    zrodlo: "IMGW", pobierz: () => pobierzMeteoImgw(), lonlat: s => [s.lon, s.lat], prog: 15,
    // Stacje opadowe IMGW nie mają temperatury ani wiatru.
    ma: s => s.temperatura_powietrza != null || s.wiatr_srednia_predkosc != null,
    nazwa: s => `${esc(nazwaWlasna(s.nazwa_stacji))}</b>, automatyczna stacja IMGW`,
    wiersze: s => {
      const kier = d => d == null ? "" : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(+d / 45) % 8];
      return [["Temperatura", wartOdcz(s.temperatura_powietrza, "°C", s.temperatura_powietrza_data)],
        ["Wilgotność", wartOdcz(s.wilgotnosc_wzgledna, "%", s.wilgotnosc_wzgledna_data, 0)],
        ["Wiatr", s.wiatr_srednia_predkosc != null ? `${fmt(+s.wiatr_srednia_predkosc, 1)} m/s ${kier(s.wiatr_kierunek)} <span style="color:var(--ink-4)">· ${godzOdcz(s.wiatr_srednia_predkosc_data)}</span>` : null],
        ["Wiatr maks.", wartOdcz(s.wiatr_predkosc_maksymalna, "m/s", s.wiatr_predkosc_maksymalna_data)],
        ["Opad (10 min)", wartOdcz(s.opad_10min, "mm", s.opad_10min_data)],
        ["Temperatura gruntu", wartOdcz(s.temperatura_gruntu, "°C", s.temperatura_gruntu_data)]];
    },
    atr: () => atr("imgw")},
  woda: {
    zrodlo: "IMGW", pobierz: () => pobierzHydro(), lonlat: s => [s.lon, s.lat], prog: 10,
    ma: s => s.stan_wody != null,
    nazwa: s => `${esc(s.stacja)}</b>, wodowskaz IMGW${s.rzeka ? ` na rzece ${esc(s.rzeka)}` : ""}`,
    wiersze: s => [["Stan wody", s.stan_wody != null ? `<b>${fmt(+s.stan_wody)} cm</b> <span style="color:var(--ink-4)">· ${godzOdcz(s.stan_wody_data_pomiaru)}</span>` : null],
      ["Stan ostrzegawczy", wartOdcz(s.stan_ostrzegawczy, "cm", null, 0)],
      ["Stan alarmowy", wartOdcz(s.stan_alarmowy, "cm", null, 0)],
      ["Przepływ", wartOdcz(s.przeplyw, "m³/s", s.przeplyw_data, 2)],
      ["Temperatura wody", wartOdcz(s.temperatura_wody, "°C", s.temperatura_wody_data_pomiaru)],
      ["Zjawisko lodowe", jestLod(s.zjawisko_lodowe, s.zjawisko_lodowe_data_pomiaru) ? "tak" : null]],
    uwaga: "Stan wody to wysokość nad zerem wodowskazu, nie da się go porównać wprost z innym posterunkiem. Wodowskaz na innej rzece niż ta przy stacji mówi niewiele.",
    atr: () => atr("imgw")},
  powietrze: {
    zrodlo: "Sensor.Community", pobierz: () => pobierzPowietrze(), lonlat: f => f.geometry.coordinates, prog: 3,
    ma: f => f.properties.pm25 != null || f.properties.pm10 != null,
    nazwa: f => `Czujnik ${f.properties.id}</b>, sieć społeczna Sensor.Community`,
    wiersze: f => { const p = f.properties; return [["PM2,5", wartOdcz(p.pm25, "µg/m³", p.t)], ["PM10", wartOdcz(p.pm10, "µg/m³", p.t)],
      ["Temperatura", wartOdcz(p.temp, "°C")], ["Wilgotność", wartOdcz(p.wilg, "%", null, 0)]]; },
    uwaga: "To czujnik amatorski, niewzorcowany, przy dużej wilgotności zawyża pył. Urzędowe pomiary GIOŚ (prawdopodobnie z tej stacji) nie dają się odczytać z przeglądarki.",
    atr: () => atr("sensor")},
};

async function wstawOdczyt(sel, co) {
  const O = ODCZYT[co], tu = [sel.lngLat.lng, sel.lngLat.lat];
  let html;
  try {
    const z = (await O.pobierz()).filter(O.ma)
      .map(s => ({s, km: odlKm(tu, O.lonlat(s))})).sort((a, b) => a.km - b.km)[0];
    if (!z) throw new Error("brak stacji z odczytem");
    // Poniżej 300 m to w praktyce ten sam maszt.
    const gdzie = z.km < .3 ? "w tym samym miejscu" : `${fmt(z.km, 1)} km stąd`;
    const wys = co === "pogoda" && z.s.wysokosc_npm ? ` · ${esc(z.s.wysokosc_npm)} m n.p.m.` : "";
    html = `<p class="note"><b>${O.nazwa(z.s)}, ${gdzie}${wys}</p>` + kv(O.wiersze(z.s))
      + `<p class="note">${z.km > O.prog ? `<b>Najbliższy punkt pomiarowy jest daleko</b>, odczyt tylko orientacyjny. ` : ""}`
      + `To odczyt ${O.zrodlo}, nie tej stacji z OpenStreetMap: jej własnych pomiarów nikt publicznie nie udostępnia.${O.uwaga ? " " + O.uwaga : ""}</p>`
      + `<p class="note" style="color:var(--ink-4)">${O.atr()}</p>`;
  } catch (e) {
    html = `<p class="note">${O.zrodlo} nie odpowiada (${esc(e.message)}). Reszta panelu działa.</p>`;
  }
  // Panel mógł się w tym czasie zmienić.
  const el = document.querySelector(`#odczytSec [data-odczyt="${co}"]`);
  if (el && S.selected === sel) el.innerHTML = html;
}

function renderPanelStart() {
  const logo = $(".mb-logo")?.src || "";
  $("#phead").innerHTML = `<div class="p-kind">Mapa infrastruktury · wersja beta</div>
    <div class="p-dolab">${logo ? `<img class="p-logo" src="${logo}" alt="">` : ""}
      <div class="p-title">Dolnośląskie Laboratorium<br>Nowych Technologii</div></div>`;
  const grupy = TREE.filter(g => g.id !== "podklad" && g.id !== "kosmos" && g.id !== "user").map(g => {
    const on = g.items.filter(it => it.on && !it.raster && !it.teren);
    if (!on.length) return "";
    return `<div class="leg-g">${esc(g.label)}</div>` + on.map(it => `<div class="leg-r"><span class="sw">${probka(it, 15)}</span>`
      + `<span class="lb">${esc(it.label)}</span>`
      + `<span class="n">${countCache[it.id] ?? ""}</span></div>`).join("");
  }).join("");
  const kosmos = Object.values(ITEMS).some(i => i.grp && i.on);
  $("#pbody").innerHTML = `<div class="sec"><h3>Na mapie</h3>${grupy ? `<div class="leg">${grupy}</div>` : `<p class="note">Żadna warstwa nie jest włączona.</p>`}
      <p class="note">Gotowe zestawy warstw są w Widokach nad listą warstw po lewej. Pojedyncze warstwy włączysz w drzewie.</p></div>
    <div id="overhead"></div>
    <div class="sec"><h3>Jak korzystać</h3>
      <p class="note">Kliknij obiekt na mapie, żeby zobaczyć jego dane. Najedź kursorem, żeby zobaczyć nazwę.</p>
</div>`;
  renderPanelLive();
}

function renderPanelLive() {
  if (S.selected?.kind === "sat") { renderSatPanel(true); return; }
  const el = $("#overhead");
  if (!el) return;
  const onGroups = Object.values(ITEMS).filter(i => i.grp && i.on);
  if (!onGroups.length) { el.innerHTML = ""; return; }
  const rows = overhead.slice(0, 18).map(s => `<tr class="click" data-sat="${s.id}">
    <td class="nm"><span class="gdot" style="background:${SAT_GROUPS[s.g].color}"></span>${esc(s.name)}</td>
    <td class="num">${fmt(s.look.el, 0)}°</td><td class="num">${AZ(s.look.az)}</td><td class="num">${fmt(s.st.alt, 0)}</td></tr>`).join("");
  el.innerHTML = `<div class="sec"><h3>Nad horyzontem teraz<span class="r">${fmt(overhead.length)} z ${fmt(SAT.list.filter(s => ITEMS["s-" + s.g]?.on).length)}</span></h3>
    ${overhead.length ? `<table class="tbl"><thead><tr><th>Obiekt</th><th class="num">Wys.</th><th class="num">Kier.</th><th class="num">km</th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="note">${S.src.sat.state === "wait" ? "Pobieranie orbit…" : "Żaden obiekt z włączonych grup nie jest teraz nad horyzontem."}</p>`}
    <p class="note">Widok z punktu <b>${esc(S.observer.name)}</b>. Wys. to kąt nad horyzontem, kier. to strona świata, km to wysokość orbity.</p></div>`;
}

const MODE_PL = {LONG_DISTANCE: "pociąg dalekobieżny", HIGHSPEED_RAIL: "pociąg dużych prędkości",
  NIGHT_RAIL: "pociąg nocny", REGIONAL_RAIL: "pociąg regionalny", REGIONAL_FAST_RAIL: "pociąg przyspieszony",
  RAIL: "pociąg", METRO: "metro", TRAM: "tramwaj", BUS: "autobus", COACH: "autokar", FERRY: "prom",
  SUBWAY: "metro", CABLE_CAR: "kolej linowa", FUNICULAR: "kolej linowo-terenowa", AERIAL_LIFT: "wyciąg", OTHER: "inny"};

function renderPojazdPanel(p) {
  const T = ms => isNaN(ms) ? "brak" : new Date(ms).toLocaleTimeString("pl-PL", {hour: "2-digit", minute: "2-digit"});
  const op = (real, plan) => {
    if (isNaN(real) || isNaN(plan)) return null;
    const m = Math.round((real - plan) / 60000);
    return m === 0 ? "punktualnie" : (m > 0 ? `<b>${m} min opóźnienia</b>` : `${-m} min przed czasem`);
  };
  const [lon, lat, f] = pozycjaPojazdu(p, Date.now());
  $("#phead").innerHTML = `<div class="p-kind">${esc(MODE_PL[p.mode] || p.mode)} · na żywo</div>
    <div class="p-title">${esc(p.nazwa)}</div>
    <div class="p-sub">${esc(p.skad || "")} → ${esc(p.dokad || "")}</div>`;
  $("#pbody").innerHTML = `<div class="sec"><h3>Odcinek<span class="r">${p.rt ? "rozkład skorygowany" : "rozkład planowy"}</span></h3>${kv([
      ["Odjazd", `${T(p.dep)} z ${esc(p.skad || "")}`],
      ["Przyjazd", `${T(p.arr)} do ${esc(p.dokad || "")}`],
      ["Punktualność", p.rt ? (op(p.dep, p.depR) || null) : null],
      ["Przejechane", `${Math.round(f * 100)} % odcinka`, 1],
      ["Położenie", `${lat.toFixed(4)}, ${lon.toFixed(4)}`, 1],
      ["Kurs", esc(p.tripId || ""), 1],
    ])}
    <p class="note">Pozycja jest <b>wyliczona</b>: pojazd przesuwa się po trasie proporcjonalnie do czasu między stacjami. ${p.rt ? "Rozkład tego kursu jest korygowany o zgłoszone opóźnienie." : "Ten przewoźnik nie podaje opóźnień, więc to rozkład planowy."} Nikt w Polsce nie udostępnia publicznie pozycji GPS pociągów.</p>
    <p class="note">Źródło: Transitous (MOTIS), dane rozkładowe GTFS przewoźników.</p></div>`;
}

let lastSatPanel = 0;
function renderSatPanel(liveOnly) {
  const s = SAT.byId.get(S.selected.id);
  if (!s) return;
  if (liveOnly && performance.now() - lastSatPanel < 900) return;
  lastSatPanel = performance.now();
  const st = s.st || satState(s, now());
  const la = st ? look(st) : null;
  const epoch = new Date(Date.UTC(2000 + (s.satrec.epochyr < 57 ? s.satrec.epochyr : s.satrec.epochyr - 100), 0, 1) + (s.satrec.epochdays - 1) * 864e5);
  const ageH = (now() - epoch) / 36e5;
  const period = 2 * Math.PI / s.satrec.no;             // minuty
  const incl = s.satrec.inclo * 180 / Math.PI;
  const geo = period > 1300 && period < 1580;
  const ps = geo ? [] : passes(s);
  const T = ms => new Date(ms).toLocaleTimeString("pl-PL", {hour: "2-digit", minute: "2-digit"});
  const D_ = ms => new Date(ms).toLocaleDateString("pl-PL", {day: "numeric", month: "short"});
  const rows = ps.map(p => `<tr><td>${D_(p.rise)}</td><td class="num">${T(p.rise)}</td><td class="num">${T(p.set)}</td><td class="num">${fmt(p.maxEl, 0)}°</td><td class="num">${fmt((p.set - p.rise) / 60000, 0)} min</td></tr>`).join("");
  $("#phead").innerHTML = `<div class="p-kind">Satelita · ${esc(SAT_GROUPS[s.g].label)}</div><div class="p-title">${esc(s.name)}</div>
    <div class="p-sub">NORAD ${esc(s.id)} · ${SAT.fromSnapshot.has(s.g) ? "orbita z migawki offline" : "orbita z CelesTrak"}</div>`;
  $("#pbody").innerHTML = `<div class="sec"><h3>Teraz</h3>${kv([
      ["Położenie", st ? `${st.lat.toFixed(2)}°, ${st.lon.toFixed(2)}°` : "brak", 1],
      ["Wysokość orbity", st ? fmt(st.alt, 0) + " km" : null, 1],
      ["Prędkość", st?.vel ? fmt(st.vel, 2) + " km/s" : null, 1],
      [`Nad ${S.observer.name}`, la ? (la.el > 0 ? `<b>${fmt(la.el, 0)}° nad horyzontem</b>, kierunek ${AZ(la.az)}` : `pod horyzontem (${fmt(la.el, 0)}°)`) : null],
      ["Odległość", la ? fmt(la.range, 0) + " km" : null, 1],
    ])}</div>
    <div class="sec"><h3>Przeloty nad punktem<span class="r">24 h</span></h3>
    ${geo ? `<p class="note">Satelita geostacjonarny: wisi nad jednym punktem równika, więc nie ma przelotów. Z ${esc(S.observer.name)} jest ${la && la.el > 0 ? `stale widoczny ${fmt(la.el, 0)}° nad horyzontem, kierunek ${AZ(la.az)}` : "stale pod horyzontem"}.</p>` :
      ps.length ? `<table class="tbl"><thead><tr><th>Dzień</th><th class="num">Wschód</th><th class="num">Zachód</th><th class="num">Maks.</th><th class="num">Czas</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="note">Maks. to najwyższy kąt nad horyzontem. Przelot poniżej 10° zwykle zasłaniają budynki i drzewa. Widoczność gołym okiem zależy też od oświetlenia, tego tabela nie uwzględnia.</p>` :
      `<p class="note">W ciągu 24 godzin brak przelotów nad punktem obserwacji.</p>`}</div>
    <div class="sec"><h3>Orbita</h3>${kv([
      ["Okres obiegu", fmt(period, 1) + " min", 1], ["Nachylenie", fmt(incl, 1) + "°", 1],
      ["Mimośród", s.satrec.ecco.toFixed(5), 1], ["Epoka TLE", epoch.toLocaleString("pl-PL"), 1],
      ["Wiek danych", ageH < 48 ? fmt(ageH, 1) + " h" : fmt(ageH / 24, 1) + " dni", 1],
    ])}
    <p class="note">${ageH > 72 ? "<b>Dane orbity mają ponad 3 doby.</b> Dla niskiej orbity położenie może się różnić od rzeczywistego o kilkadziesiąt km. " : ""}Linia ciągła to jeden obieg naprzód, przerywana to pół obiegu wstecz. Żółty obszar to miejsca, z których satelita jest teraz nad horyzontem.</p></div>`;
}

$("#pbody").addEventListener("click", e => {
  const tr = e.target.closest("[data-sat]");
  if (tr) selectSat(tr.dataset.sat, true);
});

const FOTO = {cache: new Map()};

// CC BY-SA wymaga autora i licencji, więc wyświetlamy tylko pliki z Commons
// (przez licencjaCommons). Tag `image` z OSM i lokalne pliki Wikipedii (fair use)
// mają nieznaną licencję, dlatego tylko je linkujemy.
function plikCommons(url) {
  const s = String(url || "");
  let m = s.match(/upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/i);
  if (m) return decodeURIComponent(m[1]).replace(/_/g, " ");
  m = s.match(/commons\.wikimedia\.org\/wiki\/(?:File|Plik):([^?#]+)/i);
  if (m) return decodeURIComponent(m[1]).replace(/_/g, " ");
  return null;
}
// extmetadata podaje autora jako HTML; DOMParser wydobywa tekst i rozpakowuje encje.
function tekstZHtml(v) {
  const h = String(v?.value ?? "");
  return h ? (new DOMParser().parseFromString(h, "text/html").body.textContent || "").replace(/\s+/g, " ").trim() : "";
}
function metaCommons(ii) {
  const m = ii?.extmetadata || {};
  // Brak pola Artist nie znaczy, że autor jest nieznany: odsyłamy do opisu pliku.
  return {autor: tekstZHtml(m.Artist) || "autor: zob. opis pliku", lic: tekstZHtml(m.LicenseShortName) || "licencja w opisie pliku",
          licUrl: m.LicenseUrl?.value || null, strona: ii?.descriptionurl || null};
}
async function licencjaCommons(plik, szer = 640) {
  const u = "https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url%7Cextmetadata"
    + `&iiurlwidth=${szer}&format=json&origin=*&titles=${encodeURIComponent("File:" + plik)}`;
  const r = await fetch(u);
  if (!r.ok) return null;
  const j = await r.json();
  const ii = Object.values(j.query?.pages || {})[0]?.imageinfo?.[0];
  if (!ii) return null;                    // plik spoza Commons (lokalny w Wikipedii)
  return {src: ii.thumburl || ii.url, ...metaCommons(ii)};
}
// Podpis według zalecenia Commons (TASL): autor, licencja, źródło.
function podpisFoto(f) {
  if (!f) return "";
  const lic = f.licUrl ? `<a href="${esc(f.licUrl)}" target="_blank" rel="noopener">${esc(f.lic)}</a>` : esc(f.lic);
  const zr = f.strona ? `<a href="${esc(f.strona)}" target="_blank" rel="noopener">Wikimedia Commons</a>` : "Wikimedia Commons";
  return `fot. ${esc(f.autor)}, ${lic} · ${zr}`;
}

async function wikiGlowne(p) {
  if (p.img) {
    const plik = plikCommons(p.img);
    const f = plik && await licencjaCommons(plik).catch(() => null);
    if (f) return {src: f.src, foto: f};
    return {link: p.img};
  }
  if (p.wp) {
    const [lang, ...reszta] = String(p.wp).split(":");
    const tytul = reszta.join(":") || lang;
    const kod = /^[a-z-]{2,10}$/.test(lang) && reszta.length ? lang : "pl";
    const r = await fetch(`https://${kod}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(tytul)}`);
    if (r.ok) {
      const j = await r.json();
      const src = j.originalimage?.source || j.thumbnail?.source;
      const plik = plikCommons(src);
      const f = plik && await licencjaCommons(plik).catch(() => null);
      const strona = j.content_urls?.desktop?.page;
      if (f) return {src: f.src, foto: f, opis: j.extract, zrodlo: strona, autor: "Wikipedia"};
      if (j.extract) return {opis: j.extract, zrodlo: strona, autor: "Wikipedia"};
    }
  }
  if (p.wd) {
    const r = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(p.wd)}&props=claims&format=json&origin=*`);
    if (r.ok) {
      const j = await r.json();
      const plik = j.entities?.[p.wd]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      const f = plik && await licencjaCommons(plik).catch(() => null);
      if (f) return {src: f.src, foto: f};
    }
  }
  return null;
}

async function commonsOkolica(lon, lat, promien) {
  const u = "https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch"
    + `&ggscoord=${lat}%7C${lon}&ggsradius=${promien}&ggslimit=10&ggsnamespace=6`
    + "&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=240&format=json&origin=*";
  const r = await fetch(u);
  if (!r.ok) return [];
  const j = await r.json();
  const strony = Object.values(j.query?.pages || {});
  return strony.map(s => {
    const ii = s.imageinfo?.[0];
    if (!ii) return null;
    return {thumb: ii.thumburl, full: ii.descriptionurl || ii.url, tytul: s.title.replace(/^File:/, ""), ...metaCommons(ii)};
  }).filter(Boolean).slice(0, 8);
}

async function loadFoto(p, lngLat, promien) {
  const el = $("#fotoSec");
  if (!el) return;
  const klucz = [p.wd, p.wp, p.img, lngLat && lngLat.lng.toFixed(4), promien].join("|");
  try {
    let dane = FOTO.cache.get(klucz);
    if (!dane) {
      const [glowne, okolica] = await Promise.all([
        wikiGlowne(p).catch(() => null),
        lngLat ? commonsOkolica(lngLat.lng.toFixed(5), lngLat.lat.toFixed(5), promien).catch(() => []) : [],
      ]);
      dane = {glowne, okolica};
      FOTO.cache.set(klucz, dane);
    }
    if ($("#fotoSec") !== el) return;         // panel zdążył się zmienić
    const h = [], g = dane.glowne;
    if (g?.src) {
      h.push(`<img class="foto" src="${esc(g.src)}" alt="" loading="lazy">`);
      h.push(`<p class="foto-cap">${podpisFoto(g.foto)}</p>`);
    }
    if (g?.link) {
      h.push(`<p class="foto-cap">Obiekt ma w OSM <a href="${esc(g.link)}" target="_blank" rel="noopener">odnośnik do zdjęcia</a> spoza Wikimedia Commons. Licencja nieznana, więc mapa go nie wyświetla.</p>`);
    }
    if (g?.opis) {
      h.push(`<p class="foto-cap">${esc(g.opis)}${g.zrodlo ? ` <a href="${esc(g.zrodlo)}" target="_blank" rel="noopener">Wikipedia</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>` : ""}</p>`);
    }
    if (dane.okolica.length) {
      h.push(`<div class="fotos">${dane.okolica.map(f =>
        `<a href="${esc(f.full)}" target="_blank" rel="noopener" title="${esc(`${f.tytul}, fot. ${f.autor}, ${f.lic}`)}"><img src="${esc(f.thumb)}" alt="" loading="lazy"></a>`).join("")}</div>`);
      // CC BY-SA wymaga widocznego autora, a "title" nie działa na ekranie dotykowym.
      const autorzy = [...new Map(dane.okolica.map(f => [f.autor + "|" + f.lic, f])).values()]
        .map(f => `${esc(f.autor)} (${esc(f.lic)})`).join(", ");
      h.push(`<p class="foto-cap">Zdjęcia z Wikimedia Commons z okolicy ${promien >= 1000 ? (promien / 1000) + " km" : promien + " m"}. fot.: ${autorzy}. Kliknij miniaturę, żeby zobaczyć pełny opis i licencję.</p>`);
    }
    el.innerHTML = h.length
      ? `<h3>Zdjęcia</h3>${h.join("")}`
      : `<h3>Zdjęcia</h3><p class="note">Brak zdjęć w Wikimedia Commons dla tego miejsca. Obiekt bez tagu <b>wikidata</b> albo okolica niesfotografowana.</p>`;
  } catch (e) {
    el.innerHTML = `<h3>Zdjęcia</h3><p class="note">Brak połączenia z Wikimedia, zdjęcia niedostępne.</p>`;
  }
}

const promienFoto = (src, p) => src === "akweny" || src === "kopalnie" ? 2000
  : src === "gminy" || src === "miejscowosci" ? 1200
  : src === "lotniska" ? 1500 : src === "szczyty" ? 700 : 400;
