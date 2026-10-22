"use strict";
/* Rejestr źródeł danych i licencji: jedyne miejsce, z którego pochodzą napisy
   atrybucji (róg mapy, podkłady, warstwy na żywo) i tabela okna „Źródła i licencje”.
   Numer 00, bo 01-podstawy.js i 02-mapa.js czytają z niego napisy już przy starcie.

   Okno pokazuje `licUI` (a bez niego `lic`); `kom` i `uwagi` to notatki wewnętrzne.
   `kom` mówi, czy warunki pozwalają na użycie komercyjne:
     "tak"       licencja otwarta albo dane publiczne bez zastrzeżeń,
     "umowa"     bezpłatnie tylko niekomercyjnie, komercyjnie wymaga umowy,
     "nie"       warunki wprost wykluczają użycie komercyjne,
     "niejasne"  brak opublikowanego regulaminu, nie zakładać niczego. */

const PROGRAM = {
  nazwa: "Mapa infrastruktury Dolnego Śląska",
  wlasciciel: "Dolnośląskie Laboratorium Nowych Technologii (DoLab)",
  rok: "2026",
  licencjaKodu: "MIT",
  licencjaDanych: "ODbL 1.0",
  www: "https://www.dolnyslask.tech",
  kontakt: "https://www.dolnyslask.tech/kontakt",
};

const aHref = (href, txt) => `<a href="${href}" target="_blank" rel="noopener">${txt}</a>`;

const ZRODLA = [
  {id: "osm", grupa: "Dane stałe", nazwa: "OpenStreetMap", co: "drogi, ulice, kolej, woda, przeprawy, lotniska, logistyka, energetyka, przemysł, granice, stacje, część kamer",
   lic: "ODbL 1.0", warunki: "https://www.openstreetmap.org/copyright", kom: "tak",
   atr: `© ${aHref("https://www.openstreetmap.org/copyright", "współtwórcy OpenStreetMap")} (ODbL)`,
   uwagi: "Warstwy w pliku to baza pochodna, udostępniana dalej na tej samej licencji (ODbL)."},
  {id: "prg", grupa: "Dane stałe", nazwa: "PRG, Państwowy Rejestr Granic (GUGiK)", co: "granice gmin i województwa, przez Atlas Dolnego Śląska",
   lic: "dane otwarte PZGiK", warunki: "https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/", kom: "tak",
   atr: `granice gmin: ${aHref("https://www.geoportal.gov.pl", "PRG, GUGiK")}`},
  {id: "ne", grupa: "Dane stałe", nazwa: "Natural Earth (world-atlas)", co: "kontury państw w oddaleniu",
   lic: "domena publiczna", warunki: "https://www.naturalearthdata.com/about/terms-of-use/", kom: "tak",
   atr: `${aHref("https://www.naturalearthdata.com", "Natural Earth")}`},

  {id: "celestrak", grupa: "Na żywo", nazwa: "CelesTrak", co: "parametry orbit satelitów (TLE)",
   licUI: "zasady korzystania CelesTrak", lic: "bez licencji, polityka zapytań", warunki: "https://celestrak.org/usage-policy.php", kom: "tak",
   atr: `orbity: ${aHref("https://celestrak.org", "CelesTrak")}`,
   uwagi: "Nie częściej niż raz na 2 h na grupę; przy błędzie HTTP przestać pytać."},
  {id: "imgw", grupa: "Na żywo", nazwa: "IMGW-PIB", co: "wodowskazy, ostrzeżenia meteorologiczne i hydrologiczne, odczyty automatycznych stacji meteo",
   lic: "regulamin IMGW-PIB", warunki: "https://danepubliczne.imgw.pl/regulations", kom: "umowa",
   atr: "Źródłem pochodzenia danych jest Instytut Meteorologii i Gospodarki Wodnej – Państwowy Instytut Badawczy. "
      + "Dane Instytutu Meteorologii i Gospodarki Wodnej – Państwowego Instytutu Badawczego zostały przetworzone.",
   uwagi: "Bezpłatnie do celów niekomercyjnych; komercyjnie umowa, chyba że dane są „o wysokiej wartości”."},
  {id: "gddkia", grupa: "Na żywo", nazwa: "GDDKiA, Krajowy Punkt Dostępowy", co: "utrudnienia na drogach krajowych",
   lic: "informacja sektora publicznego", warunki: "https://kpd.gddkia.gov.pl", kom: "niejasne",
   atr: `utrudnienia: ${aHref("https://kpd.gddkia.gov.pl", "GDDKiA, Krajowy Punkt Dostępowy")}`},
  {id: "pse", grupa: "Na żywo", nazwa: "PSE S.A.", co: "plan koordynacyjny dobowy KSE (okno, nie warstwa)",
   lic: "informacja sektora publicznego", warunki: "https://raporty.pse.pl", kom: "niejasne",
   atr: `Źródło: ${aHref("https://raporty.pse.pl", "PSE S.A., Raporty OSP")}`},
  {id: "sensor", grupa: "Na żywo", nazwa: "Sensor.Community", co: "jakość powietrza z czujników społecznościowych",
   lic: "ODbL 1.0 / DbCL 1.0 (zawartość)", warunki: "https://opendatacommons.org/licenses/dbcl/1-0/", kom: "tak",
   atr: `powietrze: © ${aHref("https://sensor.community", "Sensor.Community")} (ODbL)`},
  {id: "transitous", grupa: "Na żywo", nazwa: "Transitous (MOTIS)", co: "rozkłady i opóźnienia transportu publicznego",
   lic: "zasady API Transitous", warunki: "https://transitous.org/api/", kom: "nie",
   atr: `transport: ${aHref("https://transitous.org/sources/", "Transitous i dostawcy danych")}`,
   uwagi: "Tylko projekty open source i niekomercyjne; kod musi być opublikowany przed wdrożeniem."},
  {id: "rainviewer", grupa: "Na żywo", nazwa: "RainViewer", co: "mozaika radarowa opadów",
   lic: "warunki API RainViewer", warunki: "https://www.rainviewer.com/api.html", kom: "umowa",
   atr: `${aHref("https://www.rainviewer.com", "Weather data by RainViewer")}`,
   uwagi: "Darmowe API tylko do użytku osobistego i edukacyjnego, zoom do 7, schemat Universal Blue. Ryzyko przyjęte."},
  // Darmowe API tylko niekomercyjnie, poniżej 10 tys. zapytań na dobę; dane
  // CC BY 4.0 wymagają linku „Weather data by Open-Meteo.com”.
  {id: "openmeteo", grupa: "Na żywo", nazwa: "Open-Meteo", co: "zachmurzenie i pogoda bieżąca z modeli numerycznych (warstwa „Chmury teraz”)",
   licUI: "CC BY 4.0", lic: "CC BY 4.0, darmowe API niekomercyjnie", warunki: "https://open-meteo.com/en/terms", kom: "umowa",
   atr: `${aHref("https://open-meteo.com/", "Weather data by Open-Meteo.com")} (${aHref("https://creativecommons.org/licenses/by/4.0/", "CC BY 4.0")}; dane przetworzone: zachmurzenie uśrednione na gminy)`,
   uwagi: "Wersja płatna wymaga subskrypcji Open-Meteo. Dane to model (DWD, ECMWF i in.), nie obserwacja."},
  {id: "wikimedia", grupa: "Na żywo", nazwa: "Wikipedia, Wikidata, Wikimedia Commons", co: "zdjęcia i opisy obiektów",
   lic: "licencja każdego pliku osobno; tekst CC BY-SA 4.0; Wikidata CC0", warunki: "https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia", kom: "tak",
   atr: "", uwagi: "Autor i licencja są podawane przy każdym zdjęciu w panelu."},

  {id: "gugik", grupa: "Podkłady", nazwa: "GUGiK, ortofotomapa", co: "podkład ze zdjęć lotniczych",
   lic: "dane otwarte PZGiK", warunki: "https://www.geoportal.gov.pl", kom: "tak",
   atr: `ortofotomapa: ${aHref("https://www.geoportal.gov.pl", "Główny Urząd Geodezji i Kartografii")}`},
  {id: "eox", grupa: "Podkłady", nazwa: "EOX Sentinel-2 cloudless 2020", co: "bezchmurna mozaika satelitarna",
   lic: "CC BY-NC-SA 4.0", warunki: "https://s2maps.eu", kom: "nie",
   atr: `${aHref("https://s2maps.eu", "Sentinel-2 cloudless - https://s2maps.eu")} by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2020), ${aHref("https://creativecommons.org/licenses/by-nc-sa/4.0/", "CC BY-NC-SA 4.0")}`,
   uwagi: "Wersja komercyjna tylko na osobnej licencji EOX."},
  {id: "gibs", grupa: "Podkłady", nazwa: "NASA GIBS", co: "dobowe zdjęcie VIIRS, światła nocą",
   lic: "dane otwarte NASA", warunki: "https://www.earthdata.nasa.gov/engage/open-data-services-software-policies", kom: "tak",
   atr: `zdjęcie: ${aHref("https://earthdata.nasa.gov/gibs", "NASA GIBS (ESDIS)")}, VIIRS/Suomi NPP`,
   uwagi: "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)."},
  {id: "opentopomap", grupa: "Podkłady", nazwa: "OpenTopoMap", co: "mapa turystyczna",
   lic: "CC BY-SA 3.0", warunki: "https://opentopomap.org/about", kom: "tak",
   atr: `mapa: © ${aHref("https://opentopomap.org", "OpenTopoMap")} (${aHref("https://creativecommons.org/licenses/by-sa/3.0/", "CC-BY-SA")}) · dane: OpenStreetMap, SRTM`,
   uwagi: "Serwer kafelków utrzymywany społecznie; przy dużym ruchu autorzy proszą o kontakt."},
  {id: "orm", grupa: "Podkłady", nazwa: "OpenRailwayMap", co: "nakładka kolejowa",
   lic: "CC BY-SA 2.0", warunki: "https://wiki.openstreetmap.org/wiki/OpenRailwayMap/API", kom: "nie",
   atr: `styl: © ${aHref("https://www.openrailwaymap.org", "OpenRailwayMap")} (${aHref("https://creativecommons.org/licenses/by-sa/2.0/", "CC-BY-SA 2.0")})`,
   uwagi: "Polityka: aplikacja publiczna i bezpłatna, przeglądarka musi wysłać Referer; dla zysku, własny serwer. Z file:// Referera nie ma, więc offline nakładka może zostać zablokowana; nagłówków nie podrabiamy."},
  {id: "tilezen", grupa: "Podkłady", nazwa: "Terrain Tiles (Tilezen Joerd, AWS Open Data)", co: "wysokości do rzeźby 3D",
   lic: "atrybucja źródeł wysokości", warunki: "https://github.com/tilezen/joerd/blob/master/docs/attribution.md", kom: "tak",
   atr: `wysokości: ${aHref("https://github.com/tilezen/joerd/blob/master/docs/attribution.md", "Tilezen Joerd")}; SRTM and GMTED2010 data courtesy of the U.S. Geological Survey; EU-DEM: Produced using Copernicus data and information funded by the European Union`},

  {id: "windy", grupa: "Kamery", nazwa: "Windy Webcams", co: "kamery internetowe (lista pobierana przy budowie)",
   lic: "warunki Windy Webcams API", warunki: "https://account.windy.com/agreements/windy-api-webcams-terms-of-use", kom: "umowa",
   atr: `Webcams provided by ${aHref("https://www.windy.com/", "windy.com")} - ${aHref("https://www.windy.com/webcams/add", "add new webcam")}`,
   uwagi: "Plan darmowy: z reklamami, nie wolno go wbudować wyłącznie w płatną część usługi."},
  {id: "trax", grupa: "Kamery", nazwa: "GDDKiA / TRAX Elektronik", co: "kamery i stacje drogowe, tablice zmiennej treści",
   licUI: "strona operatora", lic: "brak opublikowanych warunków", warunki: "https://www.traxelektronik.pl/pogoda/", kom: "niejasne",
   atr: `kamery drogowe: ${aHref("https://www.traxelektronik.pl/pogoda/", "GDDKiA / TRAX Elektronik")}`,
   uwagi: "Od operatora tylko nazwa, droga i link; położenie z obiektu OSM. Mapa pokazuje punkt i link, nie obraz."},
  {id: "airmax", grupa: "Kamery", nazwa: "AirMAX", co: "kamery widokowe",
   licUI: "strona operatora", lic: "brak opublikowanych warunków", warunki: "https://airmax.pl/streaming-kamery", kom: "niejasne",
   atr: `kamery: ${aHref("https://airmax.pl/streaming-kamery", "AirMAX")}`,
   uwagi: "Tylko nazwa i link do podglądu u operatora; położenie z OSM."},
  {id: "lubin", grupa: "Kamery", nazwa: "kamery.lubin.pl", co: "monitoring miejski Lubina",
   licUI: "strona operatora", lic: "brak opublikowanych warunków", warunki: "https://kamery.lubin.pl", kom: "niejasne",
   atr: `kamery: ${aHref("https://kamery.lubin.pl", "kamery.lubin.pl")}`,
   uwagi: "Portal nie podaje operatora ani regulaminu. Od portalu tylko adres kamery i link; położenie ze skrzyżowania w OSM. Kamery przy szkołach pominięte na stałe."},
  {id: "zachodnia", grupa: "Kamery", nazwa: "Zachodnia TV", co: "kamery widokowe Karkonoszy i Izer (link do operatora)",
   licUI: "strona operatora", lic: "brak regulaminu kamer; operator oferuje bezpłatne osadzenie po kontakcie", warunki: "https://zachodnia.tv/umiesc-obraz-z-naszych-kamer-na-swojej-stronie/", kom: "niejasne",
   atr: `kamery: ${aHref("https://zachodnia.tv/kamery/", "Zachodnia TV")}`,
   uwagi: "Tylko nazwa i link do strony kamery; położenie z obiektu OSM. Osadzenie obrazu wymaga kontaktu z operatorem."},
  {id: "devices", grupa: "Kamery", nazwa: "kamery.devices.pl (brk network devices)", co: "kamery widokowe Kotliny Kłodzkiej",
   licUI: "strona operatora", lic: "brak opublikowanych warunków", warunki: "https://kamery.devices.pl/", kom: "niejasne",
   atr: `kamery: ${aHref("https://kamery.devices.pl/", "devices.pl")}`,
   uwagi: "Tylko nazwa i link do odtwarzacza operatora; położenie z obiektu OSM."},
  {id: "gory", grupa: "Kamery", nazwa: "Ośrodki sudeckie", co: "kamery szczytowe (link do operatora)",
   lic: "strony operatorów", warunki: "", kom: "niejasne",
   atr: "kamery górskie: strony ośrodków", uwagi: "Tylko link do strony ośrodka; jedna kamera przez oficjalny odtwarzacz YouTube."},
  {id: "youtube", grupa: "Kamery", nazwa: "YouTube (osadzony odtwarzacz)", co: "podgląd kamery „Mieszko” w Zieleńcu",
   lic: "Warunki korzystania z YouTube", warunki: "https://www.youtube.com/t/terms", kom: "tak",
   atr: "", uwagi: "Tryb youtube-nocookie.com; odtwarzacz oficjalny, bez kopiowania strumienia."},

  {id: "maplibre", grupa: "Biblioteki", nazwa: "MapLibre GL JS", co: "silnik mapy", lic: "BSD-3-Clause", warunki: "https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt", kom: "tak", atr: ""},
  {id: "satellitejs", grupa: "Biblioteki", nazwa: "satellite.js", co: "model SGP4", lic: "MIT", warunki: "https://github.com/shashwatak/satellite-js/blob/develop/LICENSE", kom: "tak", atr: ""},
  {id: "fonty", grupa: "Biblioteki", nazwa: "Inter, JetBrains Mono", co: "czcionki", lic: "SIL OFL 1.1", warunki: "https://openfontlicense.org", kom: "tak", atr: ""},
  // Röntgen wymaga podania autora; jak przy bibliotekach wystarcza wpis w oknie
  // „Źródła i licencje”, bez napisu w rogu mapy.
  {id: "pinhead", grupa: "Biblioteki", nazwa: "Pinhead, ikony (Quincy Morgan)", co: "ikony obiektów na mapie i w drzewie warstw",
   lic: "CC0 1.0", warunki: "https://github.com/waysidemapping/pinhead", kom: "tak", atr: ""},
  {id: "roentgen", grupa: "Biblioteki", nazwa: "Röntgen, ikony (Sergey Vartanov)", co: "ikony: kamera drogowa, suwnica, panel PV, transformator, pociąg, autokar, satelita",
   lic: "CC BY 4.0", warunki: "https://creativecommons.org/licenses/by/4.0/", kom: "tak",
   atr: `ikony: ${aHref("https://github.com/enzet/Roentgen", "Röntgen")} © Sergey Vartanov, CC BY 4.0`,
   uwagi: "Ikony przerysowane (kolor, obwódka, rozmiar), zmiana zaznaczona w NOTICE.md."},
];

// Źródła wyłączone przy budowie. W danych kamery górskie mają kod `zr` "gora",
// a w rejestrze identyfikator "gory".
const WYLACZONE_ZR = new Set(window.INFRA?.meta?.wylaczone || []);
const WYLACZONE = new Set([...WYLACZONE_ZR].map(z => z === "gora" ? "gory" : z));

const ZR = Object.fromEntries(ZRODLA.map(z => [z.id, z]));
// Nieznany identyfikator to błąd w kodzie: wyjątek zamiast pustego napisu,
// który po cichu pominąłby wymaganą atrybucję.
function atr(...ids) {
  return ids.map(id => {
    if (!ZR[id]) throw new Error("Brak zrodla w rejestrze licencji: " + id);
    return WYLACZONE.has(id) ? "" : ZR[id].atr;
  }).filter(Boolean).join(" · ");
}
