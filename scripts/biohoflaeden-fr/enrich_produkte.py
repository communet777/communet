#!/usr/bin/env python3
"""
Sortiment-Erkennung für französische Bio-Hofläden per Website-Abfrage.

Für jeden Hofladen mit hinterlegter Website (site_web) wird die Startseite
geladen und der sichtbare Text nach gängigen französischen Produktbegriffen
durchsucht (Käse, Wein, Gemüse, Eier, ...). Kein Sprachmodell, keine externe
API — reiner Stichwort-Abgleich, daher als grobe Orientierung zu verstehen,
nicht als geprüfte Angabe.

Umgebungsvariablen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DRY_RUN=1
"""
import json
import os
import re
import sys
import time

import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DRY = os.environ.get("DRY_RUN") == "1"
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if KEY and not KEY.startswith("sb_"):
    HEAD["Authorization"] = f"Bearer {KEY}"

UA = "Mozilla/5.0 (compatible; Communet-Sortiment/1.0; +https://communet.net; communet@outlook.de)"

# Suchbegriff -> Anzeige-Kategorie. Ein Fund reicht, mehrere Wortformen pro Kategorie.
KEYWORDS = {
    "Gemüse": ["légume", "légumes", "maraîch"],
    "Obst": ["fruit", "fruits", "verger", "pomme", "poire", "cerise", "fraise"],
    "Käse": ["fromage", "fromagerie"],
    "Milchprodukte": ["produits laitiers", "lait cru", "yaourt", "yoghourt"],
    "Eier": ["œuf", "oeuf", "œufs", "oeufs"],
    "Fleisch": ["viande", "boucherie", "agneau", "porc", "bœuf", "boeuf", "volaille", "poulet", "canard"],
    "Honig": ["miel", "apiculture", "apiculteur"],
    "Wein": ["vin", "vigneron", "viticulteur", "cave à vin", "domaine viticole"],
    "Cidre": ["cidre", "cidrerie"],
    "Brot/Getreide": ["pain", "boulangerie", "farine", "céréale", "céréales", "blé"],
    "Öl": ["huile d'olive", "huile de colza", "huile de tournesol", "huilerie"],
    "Kräuter/Gewürze": ["plantes aromatiques", "herbes", "tisane", "safran"],
    "Konfitüre": ["confiture", "confitures"],
    "Gemüsekiste/Abo": ["panier", "paniers", "amap", "abonnement légumes"],
}

FETCH_TIMEOUT = 15


def log(msg: str) -> None:
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    if DRY or not SUPABASE_URL:
        return
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                      data=json.dumps({"msg": ("[FR-PRODUKTE] " + line)[:2000]}), timeout=20)
    except Exception:
        pass


def fetch_candidates():
    rows, offset = [], 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/farm_shops_fr",
            headers={**HEAD, "Range": f"{offset}-{offset + 999}"},
            params={
                "select": "numero_bio,site_web",
                "location_precision": "eq.exact",
                "site_web": "not.is.null",
                "produits_checked_at": "is.null",
            }, timeout=60)
        r.raise_for_status()
        batch = r.json()
        rows.extend([row for row in batch if row.get("site_web")])
        if len(batch) < 1000:
            break
        offset += 1000
    return rows


def extract_text(html: str) -> str:
    """Sehr einfache Text-Extraktion ohne externe Bibliothek: Tags entfernen,
    Skripte/Styles vorher rauswerfen."""
    html = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html)
    text = re.sub(r"(?s)<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).lower()


def detect_categories(text: str):
    found = []
    for kategorie, words in KEYWORDS.items():
        if any(w in text for w in words):
            found.append(kategorie)
    return sorted(found)


def fetch_site_text(url: str):
    if not url.startswith("http"):
        url = "https://" + url
    r = requests.get(url, headers={"User-Agent": UA}, timeout=FETCH_TIMEOUT, allow_redirects=True)
    r.raise_for_status()
    return extract_text(r.text[:400000])  # Deckel gegen sehr große Seiten


def update_row(numero_bio: str, produits):
    payload = {
        "produits_web": produits,
        "produits_checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    r = requests.patch(f"{SUPABASE_URL}/rest/v1/farm_shops_fr",
                        headers={**HEAD, "Prefer": "return=minimal"},
                        params={"numero_bio": f"eq.{numero_bio}"},
                        data=json.dumps(payload), timeout=30)
    if r.status_code >= 300:
        log(f"Update-Fehler {numero_bio}: {r.status_code} {r.text[:200]}")


def main():
    if not DRY and (not SUPABASE_URL or not KEY):
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen", file=sys.stderr)
        sys.exit(1)
    rows = fetch_candidates()
    log(f"Start: {len(rows)} Hofläden mit Website zu prüfen")
    found_any, found_none, errors = 0, 0, 0
    for i, row in enumerate(rows):
        numero_bio = row["numero_bio"]
        url = row["site_web"]
        try:
            text = fetch_site_text(url)
            kategorien = detect_categories(text)
        except Exception as e:
            errors += 1
            kategorien = []
            log(f"Fehler bei {numero_bio} ({url}): {e}")
        if kategorien:
            found_any += 1
        else:
            found_none += 1
        if not DRY:
            update_row(numero_bio, kategorien or None)
        if (i + 1) % 25 == 0:
            log(f"… {i + 1}/{len(rows)} geprüft ({found_any} mit Treffer, {found_none} ohne, {errors} Fehler)")
        time.sleep(0.3)
    log(f"Ende: {found_any} mit erkanntem Sortiment, {found_none} ohne Treffer, {errors} Fehler (nicht erreichbar o.ä.)")


if __name__ == "__main__":
    main()
