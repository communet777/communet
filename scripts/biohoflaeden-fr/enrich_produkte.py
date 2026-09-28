#!/usr/bin/env python3
"""
Sortiment-Erkennung für französische Bio-Hofläden per Website-Abfrage (Version 2).

Für jeden Hofladen mit hinterlegter Website wird die Startseite geladen und der
sichtbare Text nach französischen Produktbegriffen durchsucht. Kein Sprachmodell,
reiner Stichwort-Abgleich, daher grobe Orientierung, keine geprüfte Angabe.

Verbesserungen gegenüber Version 1:
  - Social-Media-Links (Instagram, Facebook ...) werden übersprungen (blockieren
    Abrufe mit 429 und enthalten ohnehin keinen abrufbaren Text)
  - Findet die Startseite nichts, werden bis zu 3 Unterseiten geprüft, deren Link
    nach Produkten/Boutique aussieht
  - Stichwörter nur als ganze Wörter (vorher traf "vin" auch "provincial")
  - "panier" allein entfernt (meint auf Shop-Seiten meist den Warenkorb)
  - Bei Fehlern mit https wird einmal mit http erneut versucht

Umgebungsvariablen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DRY_RUN=1
"""
import json
import os
import re
import sys
import time
from urllib.parse import urljoin, urlparse

import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DRY = os.environ.get("DRY_RUN") == "1"
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if KEY and not KEY.startswith("sb_"):
    HEAD["Authorization"] = f"Bearer {KEY}"

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/124.0 Safari/537.36 Communet-Sortiment/2.0 (+https://communet.net)")

SOCIAL = ("instagram.com", "facebook.com", "fb.com", "fb.me", "tiktok.com",
          "youtube.com", "youtu.be", "linktr.ee", "twitter.com", "x.com")

KEYWORDS = {
    "Gemüse": ["légume", "maraîcher", "maraîchage"],
    "Obst": ["fruit", "verger", "pomme", "poire", "cerise", "fraise", "abricot", "pêche"],
    "Käse": ["fromage", "fromagerie", "chèvre", "tomme"],
    "Milchprodukte": ["produits laitiers", "lait cru", "lait", "yaourt", "yoghourt", "beurre", "crème"],
    "Eier": ["œuf", "oeuf"],
    "Fleisch": ["viande", "boucherie", "agneau", "porc", "bœuf", "boeuf", "volaille", "poulet", "canard", "veau", "charcuterie"],
    "Honig": ["miel", "apiculteur", "apiculture"],
    "Wein": ["vin", "vigneron", "viticulteur", "vigneronne", "domaine viticole"],
    "Cidre": ["cidre", "cidrerie"],
    "Brot/Getreide": ["pain", "boulangerie", "farine", "céréale", "blé", "lentille", "légumineuse"],
    "Öl": ["huile d'olive", "huile de colza", "huile de tournesol", "huilerie"],
    "Kräuter/Gewürze": ["plantes aromatiques", "tisane", "safran", "aromatiques"],
    "Konfitüre": ["confiture", "compote", "gelée"],
    "Gemüsekiste/Abo": ["amap", "panier de légumes", "paniers de légumes", "panier bio", "paniers bio", "panier garni"],
}
# Vorab kompiliert: ganze Wörter, optional Plural-s
PATTERNS = {k: re.compile(r"(?<![\wà-ÿ])(?:" + "|".join(re.escape(w) for w in ws) + r")s?(?![\wà-ÿ])")
            for k, ws in KEYWORDS.items()}

PRODUCT_LINK = re.compile(r"produit|boutique|vente|shop|catalogue|magasin|nos-|notre-ferme|carte|marché|marche", re.I)
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
            params={"select": "numero_bio,site_web", "location_precision": "eq.exact",
                    "site_web": "not.is.null", "produits_checked_at": "is.null"},
            timeout=60)
        r.raise_for_status()
        batch = r.json()
        rows.extend([row for row in batch if row.get("site_web")])
        if len(batch) < 1000:
            break
        offset += 1000
    return rows


def is_social(url: str) -> bool:
    host = urlparse(url if "://" in url else "https://" + url).netloc.lower()
    return any(host == s or host.endswith("." + s) for s in SOCIAL)


def extract_text(html: str) -> str:
    html = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", html)
    text = re.sub(r"(?s)<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).lower()


def detect_categories(text: str):
    return sorted(k for k, pat in PATTERNS.items() if pat.search(text))


def get_html(url: str) -> str:
    url = url.strip().replace(" ", "%20")
    if not url.startswith("http"):
        url = "https://" + url
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=FETCH_TIMEOUT, allow_redirects=True)
        r.raise_for_status()
    except Exception:
        if url.startswith("https://"):
            r = requests.get("http://" + url[len("https://"):], headers={"User-Agent": UA},
                              timeout=FETCH_TIMEOUT, allow_redirects=True)
            r.raise_for_status()
        else:
            raise
    r.encoding = r.apparent_encoding or r.encoding
    return r.text[:400000]


def product_links(html: str, base_url: str, limit: int = 3):
    base_host = urlparse(base_url if "://" in base_url else "https://" + base_url).netloc
    seen, out = set(), []
    for href, inner in re.findall(r'(?is)<a\s[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html):
        if href.startswith(("mailto:", "tel:", "#", "javascript:")):
            continue
        label = re.sub(r"(?s)<[^>]+>", " ", inner)
        if not (PRODUCT_LINK.search(href) or PRODUCT_LINK.search(label)):
            continue
        full = urljoin(base_url if "://" in base_url else "https://" + base_url, href)
        p = urlparse(full)
        if p.netloc != base_host or full in seen:
            continue
        seen.add(full)
        out.append(full)
        if len(out) >= limit:
            break
    return out


def analyse_site(url: str):
    """Gibt (kategorien, quelle) zurück; wirft bei nicht erreichbarer Startseite."""
    html = get_html(url)
    kategorien = detect_categories(extract_text(html))
    if kategorien:
        return kategorien
    text = ""
    for link in product_links(html, url):
        try:
            text += " " + extract_text(get_html(link))
        except Exception:
            continue
    return detect_categories(text)


def update_row(numero_bio: str, produits):
    payload = {"produits_web": produits,
               "produits_checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
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
    log(f"Start (v2): {len(rows)} Hofläden zu prüfen")
    hits = nohits = social = errors = 0
    for i, row in enumerate(rows):
        numero_bio, url = row["numero_bio"], row["site_web"]
        kategorien = []
        if is_social(url):
            social += 1
        else:
            try:
                kategorien = analyse_site(url)
            except Exception as e:
                errors += 1
                log(f"Fehler bei {numero_bio} ({url}): {str(e)[:150]}")
            if kategorien:
                hits += 1
            else:
                nohits += 1
        if not DRY:
            update_row(numero_bio, kategorien or None)
        if (i + 1) % 25 == 0:
            log(f"… {i + 1}/{len(rows)} ({hits} Treffer, {nohits} ohne, {social} Social-Link, {errors} Fehler)")
        time.sleep(0.3)
    log(f"Ende (v2): {hits} mit Sortiment, {nohits} ohne Treffer, {social} Social-Media-Links übersprungen, {errors} nicht erreichbar")


if __name__ == "__main__":
    main()
