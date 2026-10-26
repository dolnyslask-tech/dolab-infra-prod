/* Polityka prywatności mapy. Lista połączeń jest źródłem prawdy dla okna
   „Polityka prywatności”: test dymny sprawdza, że każdy serwer, z którym
   przeglądarka się łączy, ma tu wpis. Nowe źródło bez wpisu = czerwony test.
   kiedy: start (od razu po otwarciu), warstwa (po włączeniu), klik (po
   wybraniu obiektu), menu (po wybraniu polecenia). */

const POLITYKA = {
  wersja: "26 października 2026",
  administrator: "Dolnośląskie Laboratorium Nowych Technologii (DoLab), stowarzyszenie z siedzibą we Wrocławiu",
  rejestr: "KRS 0001265266, NIP 8993064416, REGON 545266523",
  email: "dolab@dolnyslask.tech",
  pelna: "https://www.dolnyslask.tech/polityka-prywatnosci",
};

// Ta sama uwaga w polityce i w oknie „O danych i źródłach”, żeby nie rozjechały się słowa.
const UWAGA_BETA = `<div class="beta-uwaga"><b>Wersja beta: mapa może zawierać błędy.</b>
  <p>Mapa jest w fazie testów. Dane pochodzą z OpenStreetMap i od zewnętrznych dostawców, mogą być niepełne, nieaktualne, opóźnione albo błędne, a funkcje mogą działać nieprawidłowo lub być niedostępne. Mapa ma charakter wyłącznie informacyjny i poglądowy.</p>
  <p>Nie korzystaj z niej przy decyzjach dotyczących bezpieczeństwa, zdrowia, życia lub mienia. W takich sprawach sprawdzaj oficjalne źródła: ostrzeżenia IMGW-PIB, komunikaty GDDKiA, służb i przewoźników.</p>
  <p>W zakresie dopuszczalnym przez prawo DoLab nie odpowiada za błędy, braki i opóźnienia w danych ani za skutki decyzji podjętych na ich podstawie. Błąd zgłosisz przez <a href="https://www.dolnyslask.tech/kontakt" target="_blank" rel="noopener">dolnyslask.tech/kontakt</a>.</p></div>`;

const KIEDY = {
  start: "od razu po otwarciu mapy",
  warstwa: "po włączeniu warstwy",
  klik: "po kliknięciu obiektu",
  menu: "po wybraniu polecenia w menu",
};

const POLACZENIA = [
  {kto: "GitHub (GitHub, Inc., USA; GitHub B.V., Holandia)", co: "hosting pliku mapy", kiedy: "start",
   dane: "adres IP zapisywany przez GitHub w logach bezpieczeństwa; GitHub deklaruje udział w EU-US Data Privacy Framework",
   hosty: ["github.io", "github.com"], polityka: "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"},
  {kto: "Transitous (projekt społeczności, operator niewskazany)", co: "pociągi i autobusy na żywo", kiedy: "start",
   dane: "widoczny obszar mapy i powiększenie, co 30 s, gdy karta jest widoczna; logi do 2 dni",
   hosty: ["transitous.org"], polityka: "https://transitous.org/privacy/"},
  {kto: "RainViewer (MeteoLab Inc., USA)", co: "radar opadów", kiedy: "start",
   dane: "kafle widocznego obszaru; serwery w UE i poza UE, dostawca nie wskazuje podstawy przekazania",
   hosty: ["rainviewer.com"], polityka: "https://www.rainviewer.com/privacy.html"},
  {kto: "IMGW-PIB (Warszawa)", co: "ostrzeżenia, wodowskazy, odczyty stacji", kiedy: "start",
   dane: "nic poza standardowymi danymi połączenia; pełne listy, bez zapytań o miejsce",
   hosty: ["imgw.pl"], polityka: "https://danepubliczne.imgw.pl/docs/regulamin_udostepniania_danych.pdf"},
  {kto: "GDDKiA, Krajowy Punkt Dostępowy (Warszawa)", co: "utrudnienia w ruchu", kiedy: "start",
   dane: "nic poza standardowymi danymi połączenia; ruch przechodzi przez sieć Imperva",
   hosty: ["gddkia.gov.pl"], polityka: "https://kpd.gddkia.gov.pl/index.php/pl/polityka-prywatnosci-i-plikow-cookies/"},
  {kto: "Sensor.Community (projekt społeczności, Niemcy)", co: "jakość powietrza", kiedy: "start",
   dane: "stały prostokąt obejmujący region; nie znaleźliśmy polityki prywatności dostawcy",
   hosty: ["sensor.community"], polityka: "https://sensor.community/"},
  {kto: "CelesTrak (T.S. Kelso, USA)", co: "orbity satelitów", kiedy: "start",
   dane: "nazwa grupy satelitów; najwyżej raz na 2 h, kopia w pamięci przeglądarki; logi IP, bez cookies",
   hosty: ["celestrak.org"], polityka: "https://celestrak.org/webmaster.php"},
  {kto: "Open-Meteo (OpenMeteo GmbH, Szwajcaria)", co: "zachmurzenie", kiedy: "warstwa",
   dane: "współrzędne stałej siatki punktów regionu, nie Twoje położenie; logi do 90 dni",
   hosty: ["open-meteo.com"], polityka: "https://open-meteo.com/en/terms"},
  {kto: "GUGiK (Warszawa)", co: "ortofotomapa", kiedy: "warstwa",
   dane: "kafle widocznego obszaru", hosty: ["geoportal.gov.pl"], polityka: "https://www.geoportal.gov.pl/pl/polityka-prywatnosci/"},
  {kto: "EOX IT Services GmbH (Austria)", co: "mozaika Sentinel-2", kiedy: "warstwa",
   dane: "kafle widocznego obszaru", hosty: ["eox.at"], polityka: "https://eox.at/privacy-notice/"},
  {kto: "NASA GIBS (USA, instytucja rządowa)", co: "zdjęcie satelitarne, światła nocą", kiedy: "warstwa",
   dane: "kafle widocznego obszaru", hosty: ["nasa.gov"], polityka: "https://www.nasa.gov/privacy/"},
  {kto: "OpenTopoMap (projekt prywatny, Niemcy)", co: "mapa turystyczna", kiedy: "warstwa",
   dane: "kafle widocznego obszaru; dostawca nie publikuje polityki prywatności", hosty: ["opentopomap.org"], polityka: "https://opentopomap.org/credits"},
  {kto: "OpenRailwayMap (Michael Reichert, Niemcy)", co: "nakładka kolejowa", kiedy: "warstwa",
   dane: "kafle widocznego obszaru i adres strony (wymagany przez dostawcę); logi 7 dni, bez cookies",
   hosty: ["openrailwaymap.org"], polityka: "https://knallfrosch.openrailwaymap.org/en/imprint"},
  {kto: "Amazon Web Services (USA)", co: "dane wysokości do rzeźby terenu 3D", kiedy: "warstwa",
   dane: "kafle widocznego obszaru; serwer w USA (zbiór Tilezen nie jest dostępny publicznie z kopii w UE)",
   hosty: ["amazonaws.com"], polityka: "https://aws.amazon.com/privacy/"},
  {kto: "Wikimedia Foundation (USA)", co: "opisy i zdjęcia obiektów (Wikipedia, Wikidata, Commons)", kiedy: "klik",
   dane: "tytuł artykułu, identyfikator Wikidata i współrzędne wybranego obiektu, nie Twoje położenie; dane do 90 dni",
   hosty: ["wikipedia.org", "wikidata.org", "wikimedia.org"], polityka: "https://foundation.wikimedia.org/wiki/Policy:Privacy_policy"},
  {kto: "YouTube (Google Ireland Limited)", co: "podgląd jednej kamery górskiej", kiedy: "klik",
   dane: "identyfikator filmu; tryb rozszerzonej prywatności (youtube-nocookie.com), po odtworzeniu Google może zapisać dane w przeglądarce",
   hosty: ["youtube-nocookie.com", "youtube.com", "ytimg.com", "googlevideo.com", "google.com", "gstatic.com"], polityka: "https://policies.google.com/privacy"},
  {kto: "PSE S.A. (Konstancin-Jeziorna)", co: "stan systemu elektroenergetycznego", kiedy: "menu",
   dane: "data dnia; serwer w chmurze Microsoft Azure", hosty: ["pse.pl"], polityka: "https://www.pse.pl/zasady-przetwarzania-danych-osobowych"},
];

const hostPolaczenia = host => POLACZENIA.find(p => p.hosty.some(h => host === h || host.endsWith("." + h)));

const PAMIEC = [
  ["layers, layersV", "które warstwy są włączone"],
  ["open", "które grupy w drzewie są rozwinięte"],
  ["pw, tw", "szerokość paneli"],
  ["tle:*", "kopia orbit satelitów (do 2 h), żeby nie pytać CelesTrak przy każdym otwarciu"],
  ["tle-blokada:*", "przerwa w pytaniu CelesTrak po jego odmowie, zgodnie z zasadami dostawcy"],
];

function kluczePamieci() {
  try { return Object.keys(localStorage).filter(k => k.startsWith("infra:")); } catch (e) { return []; }
}
function usunPamiec() {
  for (const k of kluczePamieci()) try { localStorage.removeItem(k); } catch (e) {}
}

function politykaHtml() {
  const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
  const grupy = Object.keys(KIEDY).map(k => [k, POLACZENIA.filter(p => p.kiedy === k)]).filter(([, l]) => l.length);
  const wiersz = p => `<tr><td><b>${esc(p.kto)}</b><span>${esc(p.co)}</span></td><td>${esc(p.dane)}<span>${a(p.polityka, "zasady dostawcy")}</span></td></tr>`;
  const zapisane = kluczePamieci().length;
  return `${UWAGA_BETA}
    <h4>W skrócie</h4>
    <p>Mapa nie ma kont, formularzy, plików cookie, reklam ani narzędzi analitycznych. DoLab nie prowadzi serwera, który zbierałby dane odwiedzających: nie dostajemy od mapy żadnych informacji o Tobie.</p>
    <p>Mapa pokazuje jednak dane na żywo i zdjęcia, więc Twoja przeglądarka łączy się wprost z serwerami ich dostawców. Każdy z nich widzi wtedy Twój adres IP, typ przeglądarki i adres tej strony (bez ścieżki), tak jak przy każdej stronie internetowej. Poniżej jest pełna lista: kto, kiedy i co dostaje.</p>
    <h4>Kto odpowiada</h4>
    <p>${esc(POLITYKA.administrator)}, ${esc(POLITYKA.rejestr)}. Kontakt w sprawach danych osobowych: ${a("mailto:" + POLITYKA.email, POLITYKA.email)}. Nie powołaliśmy inspektora ochrony danych. Ta polityka uzupełnia ${a(POLITYKA.pelna, "politykę prywatności DoLab")}.</p>
    <h4>Połączenia z dostawcami</h4>
    <table class="lic prv"><thead><tr><th>Dostawca i do czego</th><th>Co dostaje poza adresem IP</th></tr></thead>${
      grupy.map(([k, l]) => `<tbody><tr><th colspan="2">${esc(KIEDY[k][0].toUpperCase() + KIEDY[k].slice(1))}</th></tr>${l.map(wiersz).join("")}</tbody>`).join("")}</table>
    <p class="note">Warstwy „od razu po otwarciu mapy” możesz wyłączyć w drzewie warstw; mapa zapamięta wybór. Plik mapy otwarty z dysku (bez internetu) działa bez żadnych połączeń, zostają tylko dane wbudowane.</p>
    <h4>Pamięć przeglądarki</h4>
    <p>Mapa zapisuje na Twoim urządzeniu (localStorage, klucze z przedrostkiem <code>infra:</code>) tylko ustawienia, których potrzebuje do działania tak, jak ją ustawisz. Nic z tego nie jest wysyłane.</p>
    <table class="lic prv"><tbody>${PAMIEC.map(([k, o]) => `<tr><td><code>${esc(k)}</code></td><td>${esc(o)}</td></tr>`).join("")}</tbody></table>
    <p>${zapisane ? `Zapisanych wpisów: ${zapisane}. <button class="btn" data-act="pamiec-usun">Usuń zapisane ustawienia</button>` : "Na tym urządzeniu mapa nie ma teraz żadnych zapisanych ustawień."}</p>
    <p class="note">Dostawcy danych mogą próbować ustawić własne pliki cookie. Przy pobieraniu danych i kafli przeglądarka je odrzuca, bo mapa pyta bez poświadczeń. Wyjątkiem jest odtwarzacz YouTube po uruchomieniu filmu.</p>
    <h4>Twoje pliki</h4>
    <p>Wczytana warstwa GeoJSON i zapis widoku jako PNG są obsługiwane wyłącznie w Twojej przeglądarce. Plik nie jest nigdzie wysyłany.</p>
    <h4>Odnośniki</h4>
    <p>Linki do kamer, źródeł i licencji otwierają strony innych podmiotów w nowej karcie. Od tej chwili obowiązują zasady tamtej strony.</p>
    <h4>Przekazywanie poza EOG</h4>
    <p>GitHub, RainViewer, CelesTrak, NASA, Amazon Web Services i Wikimedia Foundation mają siedzibę albo serwery w USA. Od razu po otwarciu mapy łączysz się z trzema z nich: GitHub (plik mapy), RainViewer (radar opadów) i CelesTrak (satelity). Radar i grupy satelitów możesz wyłączyć w drzewie warstw. Z pozostałymi łączysz się dopiero po włączeniu ich warstwy albo kliknięciu obiektu. Open-Meteo działa w Szwajcarii, dla której Komisja Europejska wydała decyzję o odpowiednim stopniu ochrony.</p>
    <h4>Podstawa i Twoje prawa</h4>
    <p>Przesłanie adresu IP do dostawcy w chwili pobrania danych opieramy na prawnie uzasadnionym interesie (art. 6 ust. 1 lit. f RODO): udostępnianiu aktualnych danych publicznych o infrastrukturze regionu. Za dalsze przetwarzanie u dostawcy odpowiada dostawca, na swoich zasadach. Mapa nie podejmuje zautomatyzowanych decyzji i nie profiluje odwiedzających.</p>
    <p>Masz prawo do dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania i sprzeciwu (art. 15 do 18 i 21 RODO) oraz do skargi do Prezesa Urzędu Ochrony Danych Osobowych. Napisz: ${a("mailto:" + POLITYKA.email, POLITYKA.email)}.</p>
    <p class="note">Wersja z ${esc(POLITYKA.wersja)}.</p>`;
}
