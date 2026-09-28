#!/usr/bin/env python3
"""
Bildnachweise für die Wikipedia-Bilder der Wasserquellen.

Die gespeicherte Bild-URL zeigt auf eine Datei bei Wikimedia (meist Commons).
Für Weitergabe unter CC-Lizenzen gehören Urheber und Lizenz dazu. Dieses Skript
liest sie über die offizielle Wikimedia-API (imageinfo/extmetadata) aus und
speichert Urheber, Lizenzname, Lizenz-Link und den Link zur Dateiseite.

Umgebungsvariablen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DRY_RUN=1
"""
import html
import json
import os
import re
import sys
import time
from urllib.parse import unquote, urlparse

import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DRY = os.environ.get("DRY_RUN") == "1"
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if KEY and not KEY.startswith("sb_"):
    HEAD["Authorization"] = f"Bearer {KEY}"
UA = "Communet-Wasserquellen-Credits/1.0 (+https://communet.net; communet@outlook.de)"


def log(msg: str) -> None:
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    if DRY or not SUPABASE_URL:
        return
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                      data=json.dumps({"msg": ("[WIKI-CREDITS] " + line)[:2000]}), timeout=20)
    except Exception:
        pass


def parse_file_url(url: str):
    """Aus einer upload.wikimedia.org-URL: (Wiki-Host, Dateiname) oder None."""
    parts = [p for p in urlparse(url).path.split("/") if p]
    # /wikipedia/commons/d/dc/Ahr01.jpg   oder   /wikipedia/de/thumb/a/ab/Name.jpg/330px-Name.jpg
    if len(parts) < 4 or parts[0] != "wikipedia":
        return None
    wiki = parts[1]
    if "thumb" in parts:
        idx = parts.index("thumb")
        name = parts[idx + 3] if len(parts) > idx + 3 else None
    else:
        name = parts[-1]
    if not name:
        return None
    host = "commons.wikimedia.org" if wiki == "commons" else f"{wiki}.wikipedia.org"
    return host, unquote(name)


def strip_html(value: str) -> str:
    text = re.sub(r"(?s)<[^>]+>", "", value or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def fetch_credit(host: str, name: str):
    r = requests.get(f"https://{host}/w/api.php", timeout=30, headers={"User-Agent": UA},
                     params={"action": "query", "titles": f"File:{name}", "prop": "imageinfo",
                             "iiprop": "extmetadata", "format": "json", "formatversion": 2})
    r.raise_for_status()
    pages = (r.json().get("query") or {}).get("pages") or []
    if not pages or "imageinfo" not in pages[0]:
        return None
    meta = pages[0]["imageinfo"][0].get("extmetadata") or {}
    def val(key):
        return strip_html((meta.get(key) or {}).get("value", ""))
    file_url = f"https://{host}/wiki/File:{name.replace(' ', '_')}"
    return {
        "wiki_image_author": val("Artist") or None,
        "wiki_image_license": val("LicenseShortName") or val("UsageTerms") or None,
        "wiki_image_license_url": val("LicenseUrl") or None,
        "wiki_image_file_url": file_url,
    }


def fetch_rows():
    rows, offset = [], 0
    while True:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/water_sources",
                         headers={**HEAD, "Range": f"{offset}-{offset + 999}"},
                         params={"select": "osm_id,wiki_image_url", "wiki_image_url": "not.is.null",
                                 "wiki_credit_checked_at": "is.null"}, timeout=60)
        r.raise_for_status()
        batch = r.json()
        rows.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return rows


def update(osm_id: str, data: dict):
    payload = {**data, "wiki_credit_checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    r = requests.patch(f"{SUPABASE_URL}/rest/v1/water_sources", headers={**HEAD, "Prefer": "return=minimal"},
                       params={"osm_id": f"eq.{osm_id}"}, data=json.dumps(payload), timeout=30)
    if r.status_code >= 300:
        log(f"Update-Fehler {osm_id}: {r.status_code} {r.text[:200]}")


def main():
    if not DRY and (not SUPABASE_URL or not KEY):
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen", file=sys.stderr)
        sys.exit(1)
    rows = fetch_rows()
    log(f"Start: {len(rows)} Bilder ohne Bildnachweis")
    ok = missing = errors = 0
    for i, row in enumerate(rows):
        try:
            parsed = parse_file_url(row["wiki_image_url"])
            credit = fetch_credit(*parsed) if parsed else None
        except Exception as e:
            errors += 1
            credit = None
            log(f"Fehler bei {row['osm_id']}: {str(e)[:150]}")
        if credit and (credit["wiki_image_author"] or credit["wiki_image_license"]):
            ok += 1
        else:
            missing += 1
        if not DRY:
            update(row["osm_id"], credit or {})
        if (i + 1) % 50 == 0:
            log(f"… {i + 1}/{len(rows)} ({ok} mit Nachweis, {missing} ohne, {errors} Fehler)")
        time.sleep(0.2)
    log(f"Ende: {ok} mit Urheber/Lizenz, {missing} ohne Angaben, {errors} Fehler")


if __name__ == "__main__":
    main()
