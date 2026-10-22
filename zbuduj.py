"""Składa aplikację, biblioteki i dane w jeden plik infra-podglad.html,
który działa bez internetu. Opcja --bez lubin,trax pomija wybrane źródła kamer."""
import base64
import json
import pathlib
import sys

# Ten sam plik działa w obu układach repozytorium: w roboczym leży
# w pipeline/, a dane w data/dist/; w publicznym leży w katalogu głównym,
# a dane w data/.
ROOT = pathlib.Path(__file__).resolve().parent
if ROOT.name == "pipeline":
    ROOT = ROOT.parent
DIST = ROOT / "data" / "dist" if (ROOT / "data" / "dist").is_dir() else ROOT / "data"
RAW = ROOT / "data" / "raw"
A = ROOT / "assets"
OUT = ROOT / "infra-podglad.html"

LAYERS = ["swiat", "gminy", "woj-obrys", "drogi", "kolej", "woda", "przeprawy", "granica",
          "przejscia", "lotniska", "logistyka", "miejscowosci", "energetyka", "infra-punkty",
          "kopalnie", "przemysl", "akweny", "kamery", "ulice-lok", "ulice-mia", "stacje",
          "tablice", "szczyty"]
# Brak tych warstw nie zatrzymuje budowy: starszy komplet danych ma działać dalej.
LAYERS_OPT = {"energetyka", "infra-punkty", "kopalnie", "przemysl", "akweny", "kamery",
              "ulice-lok", "ulice-mia", "stacje", "tablice", "szczyty"}

ZRODLA_ZR = {"windy", "trax", "osm", "gora", "airmax", "lubin", "zachodnia", "devices"}
WARSTWY_Z_ZR = ("kamery", "stacje", "tablice")

LICENCJE = [
    ("MapLibre GL JS (BSD-3-Clause, z notkami Mapbox, glfx.js, d3-color)", "vendor/LICENSE-maplibre.txt"),
    ("satellite.js (MIT)", "vendor/LICENSE-satellite.txt"),
    ("Inter (SIL Open Font License 1.1)", "fonts/LICENSE-Inter.txt"),
    ("JetBrains Mono (SIL Open Font License 1.1)", "fonts/LICENSE-JetBrainsMono.txt"),
    ("world-atlas / Natural Earth (ISC)", "world/LICENSE-world-atlas.txt"),
]
ODBL = ("Warstwy z OpenStreetMap wbudowane w ten plik to baza pochodna na licencji "
        "Open Database License (ODbL) 1.0: https://opendatacommons.org/licenses/odbl/1-0/\n"
        "Dane © współtwórcy OpenStreetMap: https://www.openstreetmap.org/copyright")


def fonts():
    faces = [("Inter", "inter-latin-wght-normal.woff2"), ("Inter", "inter-latin-ext-wght-normal.woff2"),
             ("JetBrains Mono", "jetbrains-mono-latin-wght-normal.woff2"),
             ("JetBrains Mono", "jetbrains-mono-latin-ext-wght-normal.woff2")]
    out = []
    for fam, f in faces:
        b64 = base64.b64encode((A / "fonts" / f).read_bytes()).decode()
        out.append("@font-face{font-family:'%s';font-style:normal;font-display:swap;font-weight:100 900;"
                   "src:url(data:font/woff2;base64,%s) format('woff2')}" % (fam, b64))
    return "\n".join(out)


def argumenty():
    bez = set()
    args = sys.argv[1:]
    for i, a in enumerate(args):
        if a == "--bez" and i + 1 < len(args):
            bez |= {x.strip() for x in args[i + 1].split(",") if x.strip()}
        elif a.startswith("--bez="):
            bez |= {x.strip() for x in a[6:].split(",") if x.strip()}
    zle = bez - ZRODLA_ZR
    if zle:
        raise SystemExit(f"--bez: nieznane źródło {sorted(zle)}. Dozwolone: {sorted(ZRODLA_ZR)}")
    return bez


def data_blob(bez=frozenset()):
    layers = {}
    for k in LAYERS:
        p = DIST / f"{k}.geojson"
        if not p.exists():
            if k in LAYERS_OPT:
                print(f"  uwaga: brak {p.name}, warstwa będzie pusta")
                layers[k] = {"type": "FeatureCollection", "features": []}
                continue
            raise SystemExit(f"Brak {p}.")
        layers[k] = json.loads(p.read_text("utf-8"))
        if bez and k in WARSTWY_Z_ZR:
            layers[k]["features"] = [f for f in layers[k]["features"] if f["properties"].get("zr") not in bez]
    tle = {}
    for p in sorted(RAW.glob("tle-*.txt")):
        if p.stem != "tle-starlink":   # Starlink tylko na żywo: kilka tysięcy obiektów
            tle[p.stem[4:]] = p.read_text("utf-8")
    meta = json.loads((DIST / "meta.json").read_text("utf-8"))
    # Źródło bez żadnej kamery w danych traktujemy jak --bez: pusta pozycja
    # w drzewie i atrybucja niewidocznego źródła tylko by myliły.
    obecne = {f["properties"].get("zr") for f in layers["kamery"]["features"]}
    meta["wylaczone"] = sorted(set(bez) | {zr for zr in ZRODLA_ZR - obecne if zr != "trax"})
    # ODbL 4.2: adres licencji ma być w samej bazie pochodnej, nie tylko w interfejsie.
    meta["licencja_danych"] = {"nazwa": "ODbL 1.0", "url": "https://opendatacommons.org/licenses/odbl/1-0/",
                               "zrodlo": "© współtwórcy OpenStreetMap",
                               "copyright": "https://www.openstreetmap.org/copyright"}
    tekst = json.dumps({"layers": layers, "tle": tle, "meta": meta}, ensure_ascii=False, separators=(",", ":"))
    # Dane trafiają do JSON.parse('...'), bo to parsuje się szybciej niż literał
    # obiektu JS. Kolejność ucieczek jest istotna: najpierw podwajamy ukośniki
    # (inaczej znikną ucieczki z JSON-a, np. \"), dopiero potem apostrofy.
    return "'" + tekst.replace("\\", "\\\\").replace("'", "\\'") + "'"


def licencje():
    # Licencje BSD, MIT, ISC i OFL wymagają notki w każdej kopii, także
    # w samym pliku HTML wysłanym osobno.
    czesci = ["=== Dane: OpenStreetMap ===\n" + ODBL]
    for nazwa, plik in LICENCJE:
        p = A / plik
        if not p.exists():
            raise SystemExit(f"Brak pliku licencji {p}")
        czesci.append(f"=== {nazwa} ===\n" + p.read_text("utf-8").strip())
    return "\n\n".join(czesci).replace("&", "&amp;").replace("<", "&lt;")


def app_js():
    # Pliki działają w jednym zasięgu zmiennych, więc numer w nazwie
    # wyznacza kolejność wykonania.
    pliki = sorted((ROOT / "app" / "src").glob("*.js"))
    if not pliki:
        raise SystemExit("Brak plików w app/src/.")
    return "\n".join(f"/* ===== {f.name} ===== */\n" + f.read_text("utf-8") for f in pliki)


def main():
    bez = argumenty()
    html = (ROOT / "app" / "index.html").read_text("utf-8")
    shell = ROOT / "shell" / "shell.css"
    # Dane i biblioteki podstawiamy na końcu: mogłyby przypadkiem zawierać
    # ciąg wyglądający jak znacznik, np. __APP_JS__.
    parts = [
        ("__FONTS__", fonts()),
        ("__LOGO__", base64.b64encode((A / "herb.png").read_bytes()).decode()),
        ("__LICENCJE__", licencje()),
        ("__SHELL_CSS__", shell.read_text("utf-8") if shell.exists() else ""),
        ("__APP_CSS__", (ROOT / "app" / "app.css").read_text("utf-8")),
        ("__MAPLIBRE_CSS__", (A / "vendor" / "maplibre-gl.css").read_text("utf-8")),
        ("__APP_JS__", app_js()),
        ("__SATELLITE_JS__", (A / "vendor" / "satellite.min.js").read_text("utf-8")),
        ("__MAPLIBRE_JS__", (A / "vendor" / "maplibre-gl.js").read_text("utf-8")),
        ("__DATA__", data_blob(bez)),
    ]
    for key, val in parts:
        if html.count(key) != 1:
            raise SystemExit(f"Szablon: znacznik {key} występuje {html.count(key)} razy, oczekiwano 1")
        head, tail = html.split(key)
        # Literał </script> w danych zamknąłby znacznik <script> przed czasem.
        if key in ("__DATA__", "__APP_JS__"):
            val = val.replace("</script", "<\\/script")
        html = head + val + tail
    OUT.write_text(html, "utf-8")
    print(f"{OUT.name}: {OUT.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
