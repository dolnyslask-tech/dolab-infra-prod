# Dane, źródła i licencje

Kod programu jest na licencji MIT (plik `LICENSE`). Dane i składniki
wbudowane w mapę mają własne licencje, opisane niżej. Tabelę wszystkich
źródeł z linkami do warunków pokazuje też sama mapa: menu Pomoc,
„Źródła i licencje”.

## Warstwy z OpenStreetMap: ODbL 1.0

Pliki w `data/` zbudowane z OpenStreetMap: `drogi`, `ulice-lok`,
`ulice-mia`, `kolej`, `woda`, `akweny`, `przeprawy`, `granica`, `przejscia`,
`lotniska`, `logistyka`, `energetyka`, `infra-punkty`, `kopalnie`, `przemysl`,
`miejscowosci`, `szczyty`, `stacje` oraz położenia wszystkich kamer.

> Zawiera informacje z OpenStreetMap, udostępniane na licencji Open Database
> License (ODbL) 1.0: https://opendatacommons.org/licenses/odbl/1-0/
> © współtwórcy OpenStreetMap: https://www.openstreetmap.org/copyright

To baza pochodna w rozumieniu ODbL: dane OSM przefiltrowane, sklejone
i uzupełnione o kod TERYT gminy. Udostępniamy ją na tej samej licencji.
Kto z niej korzysta, podaje źródło (OpenStreetMap), a własną bazę pochodną
udostępnia publicznie także na ODbL. Obiekty punktowe mają identyfikator
OSM (`id`); drogi i linie kolejowe są sklejone z wielu odcinków i go nie mają.

## Pozostałe dane w repozytorium

| Pliki | Źródło | Warunki |
|---|---|---|
| `gminy`, `woj-obrys` | Państwowy Rejestr Granic, GUGiK | dane otwarte PZGiK |
| `swiat`, `assets/world/` | Natural Earth przez world-atlas | domena publiczna, ISC |
| nazwy kamer i linki do podglądu | operatorzy kamer (lista niżej) | nie są objęte MIT ani ODbL |

Od operatorów kamer mapa bierze tylko nazwę kamery i link do podglądu na ich
stronie. Położenie każdej kamery pochodzi z obiektu OpenStreetMap
(skrzyżowania, stacji, budynku), nie ze współrzędnych operatora. Obraz
otwiera się u operatora; mapa go nie kopiuje.

## Dane pobierane na żywo

Tych danych nie ma w repozytorium. Pobiera je przeglądarka w chwili
wyświetlania, na warunkach dostawców:

- Źródłem pochodzenia danych jest Instytut Meteorologii i Gospodarki Wodnej – Państwowy Instytut Badawczy. Dane Instytutu Meteorologii i Gospodarki Wodnej – Państwowego Instytutu Badawczego zostały przetworzone.
- GDDKiA, Krajowy Punkt Dostępowy; PSE S.A., Raporty OSP
- © Sensor.Community, ODbL 1.0
- Transitous i dostawcy danych: https://transitous.org/sources/
- Weather data by RainViewer: https://www.rainviewer.com
- Open-Meteo, CC BY 4.0; CelesTrak: https://celestrak.org
- Wikipedia (CC BY-SA 4.0), Wikidata (CC0), Wikimedia Commons (licencja przy każdym pliku)
- Ortofotomapa: GUGiK; VIIRS: NASA EOSDIS GIBS
- Sentinel-2 cloudless, https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2020), CC BY-NC-SA 4.0
- OpenTopoMap (CC BY-SA 3.0), OpenRailwayMap (CC BY-SA 2.0)
- Wysokości: Tilezen Joerd; SRTM data courtesy of the U.S. Geological Survey; EU-DEM: Produced using Copernicus data and information funded by the European Union
- Kamery: GDDKiA / TRAX Elektronik, AirMAX, kamery.lubin.pl, Zachodnia TV, kamery.devices.pl, strony ośrodków sudeckich, YouTube

## Składniki wbudowane w plik HTML

| Składnik | Licencja | Tekst licencji |
|---|---|---|
| MapLibre GL JS, © MapLibre contributors | BSD-3-Clause | `assets/vendor/LICENSE-maplibre.txt` |
| satellite.js, © Shashwat Kandadai, UCSC | MIT | `assets/vendor/LICENSE-satellite.txt` |
| Inter, © The Inter Project Authors | SIL OFL 1.1 | `assets/fonts/LICENSE-Inter.txt` |
| JetBrains Mono, © The JetBrains Mono Project Authors | SIL OFL 1.1 | `assets/fonts/LICENSE-JetBrainsMono.txt` |
| world-atlas, © Michael Bostock (dane Natural Earth) | ISC | `assets/world/LICENSE-world-atlas.txt` |
| ikony obiektów, 18 zestawów z katalogu Iconify | MIT, ISC, Apache 2.0, CC0 1.0 | lista w `NOTICE.md` |
| ikony Game Icons, Lorc, Delapouite i in. | CC BY 3.0 | https://game-icons.net |
| ikony Streamline, Sharp free icons | CC BY 4.0 | https://github.com/webalys-hq/streamline-vectors |

Ikony są zmienione: biały znak na barwnej plakietce, zmieniona grubość
linii i rozmiar. Która ikona z którego zestawu: `app/src/01a-znaki.js`.

## Znak DoLab

`assets/herb.png` i obrazy w `.github/media/` to znak Dolnośląskiego
Laboratorium Nowych Technologii. Wszelkie prawa zastrzeżone, poza licencją
MIT. Fork programu musi używać własnego znaku.

## Pola w danych

Nazwy pól są krótkie, bo powtarzają się przy każdym obiekcie.

| Pole | Znaczenie |
|---|---|
| `n` | nazwa własna (bywa pusta) |
| `id` | identyfikator OSM z prefiksem: `n` węzeł, `w` linia, `r` relacja |
| `teryt` | 7-cyfrowy kod gminy |
| `op` | operator lub zarządca |
| `kat` | rodzaj obiektu w warstwie |
| `wd`, `wp`, `img`, `www` | Wikidata, artykuł Wikipedii, zdjęcie, strona obiektu |
| `ha` | powierzchnia w hektarach |

| Warstwa | Najważniejsze pola |
|---|---|
| `drogi` | `k` klasa (`A`, `S`, `DK`, `DW`), `ref` numer, `lnk` łącznica |
| `kolej` | `st` stan (`czynna`, `waskotorowa`, `budowa`, `nieczynna`), `e` elektryfikacja 0/1, `nr` numery linii PLK |
| `woda`, `akweny` | `w` rzeka lub kanał, `nav` żeglowna; `kat` jezioro, zbiornik, staw |
| `przeprawy` | `typ` (`drogowy`, `kolejowy`, `prom`), `rz` nazwa cieku, `dl` długość w m |
| `przejscia` | `typ` (`drogowe`, `kolejowe`), `kraj` (`DE`, `CZ`) |
| `lotniska` | `kat` (`port`, `lot`, `wojsk`, `heli`), `icao`, `iata` |
| `energetyka` | `kat` (`linia`, `rurociag`), `kl` klasa napięcia, `v` napięcie w V, `kab` kabel podziemny |
| `infra-punkty` | `kat` (`elektrownia`, `pv`, `wiatrak`, `stacja`, `maszt`, `sluza`, `jaz`, ...), `moc`, `v`, `h` |
| `kopalnie`, `przemysl` | `kat`, `sur` surowiec, `prod` produkt |
| `kamery` | `zr` źródło, `www` podgląd u operatora, `osm` obiekt OSM, do którego kamera jest przypięta |
| `stacje`, `tablice` | `co` mierzone zjawiska, `zr` źródło, `osm` obiekt OSM |
| `gminy` | `teryt`, `n`, `t` typ (1 miejska, 2 wiejska, 3 miejsko-wiejska) |
| `miejscowosci`, `szczyty` | `p` rodzaj, `pop` liczba mieszkańców; `ele` wysokość w m |
