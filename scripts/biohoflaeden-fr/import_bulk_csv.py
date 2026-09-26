#!/usr/bin/env python3
"""
Bio-Hofläden Frankreich, zweite Quelle: kompletter CSV-Export von data.gouv.fr
(Agence Bio, "Professionnels engagés en BIO"), umgeht das 100er-Limit der
Live-API vollständig. Trade-off: nur Postleitzahl (kein genauer Standort),
keine Direktverkauf-Kennzeichnung — daher erstmal nur nach Tätigkeit
"Production" gefiltert (kann später feiner nachgezogen werden, sobald wir
z.B. jeden Betrieb einzeln über die Live-API abgleichen).

Ergänzt NUR neue Betriebe (numero_bio nicht bereits vorhanden) — überschreibt
nie die bereits vorhandenen, präzisen Einträge aus der Live-API.
location_precision='postal_code' markiert diese ungenaueren Einträge.

Umgebungsvariablen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DRY_RUN=1
"""
import csv
import io
import json
import os
import sys
import time

import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DRY = os.environ.get("DRY_RUN") == "1"
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if KEY and not KEY.startswith("sb_"):
    HEAD["Authorization"] = f"Bearer {KEY}"

CSV_URL = "https://www.data.gouv.fr/api/1/datasets/r/657789db-d349-4554-aef6-eabde4bd1c57"
GEO_API = "https://geo.api.gouv.fr/communes"
UA = "Communet-Wasserquellen-BioFR/1.0 (+https://communet.net; communet@outlook.de)"


def log(msg: str) -> None:
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    if DRY or not SUPABASE_URL:
        return
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                      data=json.dumps({"msg": ("[FR-BIO-BULK] " + line)[:2000]}), timeout=20)
    except Exception:
        pass


def fetch_existing_numeros():
    ids, offset = set(), 0
    while True:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/farm_shops_fr",
                          headers={**HEAD, "Range": f"{offset}-{offset + 9999}"},
                          params={"select": "numero_bio"}, timeout=60)
        r.raise_for_status()
        batch = r.json()
        ids.update(row["numero_bio"] for row in batch)
        if len(batch) < 10000:
            break
        offset += 10000
    return ids


def download_csv():
    r = requests.get(CSV_URL, timeout=120, headers={"User-Agent": UA})
    r.raise_for_status()
    text = r.content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    return list(reader)


def geocode_postal_codes(codes):
    """codePostal -> {lat, lon, ville, departement} über geo.api.gouv.fr, gecacht."""
    cache = {}
    codes = sorted(codes)
    for i, cp in enumerate(codes):
        try:
            r = requests.get(GEO_API, params={"codePostal": cp, "fields": "nom,centre,codeDepartement"},
                              headers={"User-Agent": UA}, timeout=15)
            if r.status_code == 200:
                data = r.json()
                if data:
                    c = data[0]
                    coords = (c.get("centre") or {}).get("coordinates")
                    if coords:
                        cache[cp] = {"lon": coords[0], "lat": coords[1],
                                     "ville": c.get("nom"), "departement": c.get("codeDepartement")}
        except Exception as e:
            log(f"Geocoding-Fehler für {cp}: {e}")
        if (i + 1) % 500 == 0:
            log(f"… Postleitzahlen geokodiert: {i + 1}/{len(codes)}")
        time.sleep(0.05)
    return cache


def upsert(rows):
    if DRY or not rows:
        return
    for i in range(0, len(rows), 500):
        batch = rows[i:i + 500]
        for attempt in range(5):
            r = requests.post(f"{SUPABASE_URL}/rest/v1/farm_shops_fr?on_conflict=numero_bio",
                              headers={**HEAD, "Prefer": "resolution=merge-duplicates,return=minimal"},
                              data=json.dumps(batch), timeout=120)
            if r.status_code < 300:
                break
            log(f"Upload-Fehler {r.status_code}: {r.text[:300]} (Versuch {attempt + 1})")
            time.sleep(4 * (attempt + 1))
        else:
            raise RuntimeError("Upload endgültig fehlgeschlagen")


def main():
    if not DRY and (not SUPABASE_URL or not KEY):
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen", file=sys.stderr)
        sys.exit(1)

    log("Lade bereits vorhandene numero_bio (aus der Live-API, präzise) …")
    existing = fetch_existing_numeros() if not DRY else set()
    log(f"{len(existing)} bereits vorhanden, werden nicht überschrieben")

    log("Lade CSV-Gesamtexport …")
    all_rows = download_csv()
    log(f"{len(all_rows)} Zeilen insgesamt im Export")

    candidates = [r for r in all_rows
                  if "Production" in (r.get("ACTIVITES") or "")
                  and r.get("NUMERO BIO") not in existing
                  and (r.get("CODE POSTAL SIEGE SOCIAL") or "").strip()]
    log(f"{len(candidates)} neue Erzeuger-Betriebe (Tätigkeit 'Production', noch nicht vorhanden)")

    postal_codes = {c["CODE POSTAL SIEGE SOCIAL"].strip() for c in candidates}
    log(f"Geokodiere {len(postal_codes)} verschiedene Postleitzahlen über geo.api.gouv.fr …")
    geo = geocode_postal_codes(postal_codes)
    log(f"{len(geo)} Postleitzahlen erfolgreich geokodiert")

    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    rows = []
    skipped_no_geo = 0
    for c in candidates:
        cp = c["CODE POSTAL SIEGE SOCIAL"].strip()
        g = geo.get(cp)
        if not g:
            skipped_no_geo += 1
            continue
        rows.append({
            "numero_bio": c["NUMERO BIO"],
            "siret": c.get("SIRET"),
            "name": c.get("DENOMINATION"),
            "categories": None,
            "productions_etat": None,
            "organisme_certificateur": c.get("ORGANISME CERTIFICATEUR"),
            "adresse": None,
            "code_postal": cp,
            "ville": g["ville"],
            "departement": g["departement"],
            "lat": g["lat"],
            "lon": g["lon"],
            "site_web": None,
            "location_precision": "postal_code",
            "raw": {"source": "data.gouv.fr-bulk-csv", "activites": c.get("ACTIVITES"),
                    "dateEngagement": c.get("DATEENGAGEMENT")},
            "imported_at": now,
        })
    log(f"{skipped_no_geo} übersprungen (Postleitzahl nicht geokodierbar)")

    log(f"Speichere {len(rows)} neue Betriebe …")
    upsert(rows)
    log(f"Ende: {len(rows)} neue Betriebe (grobe Lage per Postleitzahl) ergänzt")


if __name__ == "__main__":
    main()
