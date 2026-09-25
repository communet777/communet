#!/usr/bin/env python3
"""
Wikipedia-Anreicherung für Wasserquellen.

Für Quellen mit einem OSM-Tag wikipedia="<lang>:<Titel>" oder wikidata="Q..." wird
über die offizielle Wikimedia-REST-API (page/summary) Artikel-URL, Vorschaubild und
Kurzbeschreibung geladen und in water_sources gespeichert.
  - wikipedia-Tag direkt nutzbar (Sprache + Titel bereits bekannt)
  - wikidata-Tag: über die Wikidata-API die "sitelinks" auflösen (bevorzugt die
    Sprache passend zur Region, sonst Deutsch, sonst Englisch, sonst irgendein Wiki)

Umgebungsvariablen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DRY_RUN=1
"""
import json
import os
import sys
import time
import urllib.parse

import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DRY = os.environ.get("DRY_RUN") == "1"
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if KEY and not KEY.startswith("sb_"):
    HEAD["Authorization"] = f"Bearer {KEY}"

UA = "Communet-Wasserquellen-WikiEnrich/1.0 (+https://communet.net; communet@outlook.de)"
REGION_LANG = {"PT": "pt", "ES": "es", "FR": "fr", "DE": "de"}
FALLBACK_LANGS = ["de", "en", "fr", "es", "pt"]


def log(msg: str) -> None:
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    if DRY or not SUPABASE_URL:
        return
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                      data=json.dumps({"msg": ("[WIKI] " + line)[:2000]}), timeout=20)
    except Exception:
        pass


def fetch_candidates():
    """Holt alle noch nicht geprüften Quellen (paginiert) und filtert client-seitig
    auf ein vorhandenes wikipedia- oder wikidata-Tag, statt sich auf eine komplexe
    JSON-Filter-Syntax bei PostgREST zu verlassen."""
    rows, offset = [], 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/water_sources",
            headers={**HEAD, "Range": f"{offset}-{offset + 999}"},
            params={"select": "osm_id,name,region,tags", "wiki_checked_at": "is.null"},
            timeout=60)
        r.raise_for_status()
        batch = r.json()
        for row in batch:
            tags = row.get("tags") or {}
            if tags.get("wikipedia") or tags.get("wikidata"):
                rows.append(row)
        if len(batch) < 1000:
            break
        offset += 1000
    return rows


def summary(lang: str, title: str):
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
    r = requests.get(url, headers={"User-Agent": UA, "Accept": "application/json"}, timeout=20)
    if r.status_code != 200:
        return None
    d = r.json()
    if d.get("type") == "disambiguation":
        return None
    return {
        "wiki_url": (d.get("content_urls", {}).get("desktop", {}) or {}).get("page"),
        "wiki_title": d.get("title"),
        "wiki_image_url": (d.get("thumbnail") or {}).get("source"),
        "wiki_extract": (d.get("extract") or "")[:500],
    }


def resolve_wikidata(qid: str, region: str):
    r = requests.get(f"https://www.wikidata.org/wiki/Special:EntityData/{qid}.json",
                      headers={"User-Agent": UA}, timeout=20)
    if r.status_code != 200:
        return None
    entity = (r.json().get("entities") or {}).get(qid) or {}
    sitelinks = entity.get("sitelinks") or {}
    order = ([REGION_LANG[region]] if region in REGION_LANG else []) + FALLBACK_LANGS
    for lang in order:
        key = f"{lang}wiki"
        if key in sitelinks:
            return lang, sitelinks[key]["title"]
    for key, val in sitelinks.items():
        if key.endswith("wiki") and len(key) <= 6:  # z.B. "cawiki", keine z.B. "commonswiki"
            return key[:-4], val["title"]
    return None


def enrich_one(row):
    tags = row.get("tags") or {}
    wp = tags.get("wikipedia")
    wd = tags.get("wikidata")
    lang = title = None
    if wp and ":" in wp:
        lang, title = wp.split(":", 1)
    elif wd:
        resolved = resolve_wikidata(wd, row.get("region"))
        if resolved:
            lang, title = resolved
    if not lang or not title:
        return None
    return summary(lang.strip().lower(), title.strip())


def update_row(osm_id: str, data: dict):
    payload = {**data, "wiki_checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    r = requests.patch(f"{SUPABASE_URL}/rest/v1/water_sources",
                        headers={**HEAD, "Prefer": "return=minimal"},
                        params={"osm_id": f"eq.{osm_id}"},
                        data=json.dumps(payload), timeout=30)
    if r.status_code >= 300:
        log(f"Update-Fehler {osm_id}: {r.status_code} {r.text[:200]}")


def main():
    if not DRY and (not SUPABASE_URL or not KEY):
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen", file=sys.stderr)
        sys.exit(1)
    rows = fetch_candidates()
    log(f"Start: {len(rows)} Quellen mit Wikipedia/Wikidata-Tag zu prüfen")
    found, empty, errors = 0, 0, 0
    for i, row in enumerate(rows):
        try:
            data = enrich_one(row)
        except Exception as e:
            errors += 1
            data = None
            log(f"Fehler bei {row.get('osm_id')} ({row.get('name')}): {e}")
        if data and data.get("wiki_url"):
            found += 1
            if not DRY:
                update_row(row["osm_id"], data)
        else:
            empty += 1
            if not DRY:
                update_row(row["osm_id"], {"wiki_url": None, "wiki_title": None,
                                            "wiki_image_url": None, "wiki_extract": None})
        if (i + 1) % 50 == 0:
            log(f"… {i + 1}/{len(rows)} geprüft ({found} mit Artikel, {empty} ohne)")
        time.sleep(0.1)
    log(f"Ende: {found} mit Wikipedia-Artikel/Bild, {empty} ohne Treffer, {errors} Fehler")


if __name__ == "__main__":
    main()
