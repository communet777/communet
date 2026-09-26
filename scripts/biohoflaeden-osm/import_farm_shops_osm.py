#!/usr/bin/env python3
"""
Bio-Hofläden Spanien & Portugal über OpenStreetMap statt Behörden-Register.

Grund: Beide Länder haben keine sauber abrufbare Behördendatenbank (Spanien:
17 getrennte Regionalregister ohne Bulk-Export; Portugal: Daten nur als
Power-BI-Dashboard, keine Liste zum Herunterladen). OSM-Tag shop=farm markiert
Hofläden direkt am Erzeugerbetrieb — echte GPS-Koordinaten, aber NICHT amtlich
bio-zertifiziert (nur was jemand selbst so eingetragen hat). Gleicher
Genauigkeits-Kompromiss wie bei den 60.211 Postleitzahl-Einträgen aus
Frankreich, hier aber mit echten Koordinaten statt Gemeinde-Mittelpunkt.

Quelle: Geofabrik (dieselbe wie beim Wasserquellen-Import), Filterung mit
osmium (muss auf dem Runner installiert werden).

Umgebungsvariablen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DRY_RUN=1,
ONLY_COUNTRY=ES|PT (nur ein Land, für schnellere Tests)
"""
import json
import os
import subprocess
import sys
import time

import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DRY = os.environ.get("DRY_RUN") == "1"
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if KEY and not KEY.startswith("sb_"):
    HEAD["Authorization"] = f"Bearer {KEY}"

UA = "Communet-BioHoflaeden-OSM/1.0 (+https://communet.net; communet@outlook.de)"

COUNTRIES = {
    "ES": "https://download.geofabrik.de/europe/spain-latest.osm.pbf",
    "PT": "https://download.geofabrik.de/europe/portugal-latest.osm.pbf",
}

WORKDIR = "/tmp/farm_shops_osm"


def log(msg: str) -> None:
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    if DRY or not SUPABASE_URL:
        return
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                      data=json.dumps({"msg": ("[FARM-OSM] " + line)[:2000]}), timeout=20)
    except Exception:
        pass


def run(cmd: list) -> None:
    log(f"$ {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


def download(url: str, dest: str) -> None:
    with requests.get(url, headers={"User-Agent": UA}, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)


def upsert(rows: list) -> None:
    if DRY or not rows:
        return
    for i in range(0, len(rows), 500):
        batch = rows[i:i + 500]
        for attempt in range(5):
            r = requests.post(f"{SUPABASE_URL}/rest/v1/farm_shops_osm?on_conflict=osm_id",
                              headers={**HEAD, "Prefer": "resolution=merge-duplicates,return=minimal"},
                              data=json.dumps(batch), timeout=120)
            if r.status_code < 300:
                break
            log(f"Upload-Fehler {r.status_code}: {r.text[:300]} (Versuch {attempt + 1})")
            time.sleep(4 * (attempt + 1))
        else:
            raise RuntimeError("Upload endgültig fehlgeschlagen")


def process_country(code: str, url: str) -> int:
    os.makedirs(WORKDIR, exist_ok=True)
    pbf = f"{WORKDIR}/{code}.osm.pbf"
    filtered = f"{WORKDIR}/{code}_farm.osm.pbf"
    geojson = f"{WORKDIR}/{code}_farm.geojson"

    log(f"[{code}] Lade {url} …")
    download(url, pbf)
    log(f"[{code}] Download fertig ({os.path.getsize(pbf) / 1e6:.0f} MB)")

    log(f"[{code}] Filtere shop=farm (nur Punkte) …")
    run(["osmium", "tags-filter", "-o", filtered, "--overwrite", pbf, "n/shop=farm"])
    log(f"[{code}] Gefilterte Datei: {os.path.getsize(filtered)} Bytes")

    log(f"[{code}] Exportiere als GeoJSON …")
    run(["osmium", "export", filtered, "-o", geojson, "--overwrite", "-f", "geojson"])
    log(f"[{code}] GeoJSON-Dateigröße: {os.path.getsize(geojson)} Bytes")

    with open(geojson) as f:
        data = json.load(f)
    all_features = data.get("features", [])
    log(f"[{code}] Rohes GeoJSON: {len(all_features)} Features insgesamt")
    if all_features:
        log(f"[{code}] Beispiel-Feature: {json.dumps(all_features[0], ensure_ascii=False)[:800]}")

    rows = []
    for feat in all_features:
        geom = feat.get("geometry") or {}
        if geom.get("type") != "Point":
            continue
        lon, lat = geom["coordinates"][0], geom["coordinates"][1]
        tags = feat.get("properties", {}) or {}
        osm_id = feat.get("id") or tags.get("@id")
        if not osm_id:
            continue
        rows.append({
            "osm_id": str(osm_id),
            "country": code,
            "name": tags.get("name"),
            "lat": lat,
            "lon": lon,
            "organic": tags.get("organic"),
            "website": tags.get("website") or tags.get("contact:website"),
            "phone": tags.get("phone") or tags.get("contact:phone"),
            "email": tags.get("email") or tags.get("contact:email"),
            "addr_street": tags.get("addr:street"),
            "addr_housenumber": tags.get("addr:housenumber"),
            "addr_city": tags.get("addr:city"),
            "addr_postcode": tags.get("addr:postcode"),
            "opening_hours": tags.get("opening_hours"),
            "raw": tags,
            "imported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })

    log(f"[{code}] {len(rows)} Hofläden gefunden, speichere …")
    upsert(rows)

    for p in (pbf, filtered, geojson):
        try:
            os.remove(p)
        except OSError:
            pass

    return len(rows)


def main():
    if not DRY and (not SUPABASE_URL or not KEY):
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen", file=sys.stderr)
        sys.exit(1)
    countries = COUNTRIES
    only = os.environ.get("ONLY_COUNTRY")
    if only:
        countries = {only: COUNTRIES[only]}
    log(f"Start: Bio-Hofläden über OSM für {', '.join(countries)}")
    total = 0
    failed = []
    for code, url in countries.items():
        try:
            total += process_country(code, url)
        except Exception as e:
            failed.append(code)
            log(f"[{code}] FEHLER: {e}")
    log(f"Ende: {total} Hofläden insgesamt gespeichert" + (f", fehlgeschlagen: {', '.join(failed)}" if failed else ""))
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
