#!/usr/bin/env python3
"""
Qualitätsprüfung der Bio-Hofläden für Communet.

Prüft für jeden Hofladen:
  - Website erreichbar? (ok / tot / geparkt / fehler)
  - Deutschland: steht der Eintrag noch auf bio-hof-direkt.de (Quelle)? Dabei werden Adresse und
    Koordinaten aus der Seite gelesen (schema.org-Daten), falls vorhanden.
Ergebnisse landen in public.farm_quality (eigene Tabelle, überlebt Neu-Importe).
Ob ein Eintrag ausgeblendet wird, entscheidet danach eine Auswertung in der Datenbank.

Umgebungsvariablen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LIMIT (optional, zum Testen)
"""
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if KEY and not KEY.startswith("sb_"):
    HEAD["Authorization"] = f"Bearer {KEY}"
LIMIT = int(os.environ.get("LIMIT") or 0)
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 "
      "Communet-Hofladen-Pruefung (+https://communet.net)")

PARK_HOSTS = ("sedo", "parkingcrew", "bodis", "hugedomains", "dan.com", "afternic", "godaddy", "uniregistry",
              "above.com", "domainmarket", "parklogic", "sedoparking", "namebright")
PARK_TEXT = re.compile(
    r"(domain\s+(is\s+)?for\s+sale|this\s+domain\s+may\s+be\s+for\s+sale|diese\s+domain\s+(steht|ist|kann)[^.]{0,40}(verkauf|kaufen)|"
    r"domain\s+kaufen|ce\s+nom\s+de\s+domaine\s+(est\s+)?(à|a)\s+vendre|dominio\s+in\s+vendita|parked\s+domain|"
    r"domain\s+geparkt|website\s+coming\s+soon|under\s+construction\s*</title>|account\s+suspended|"
    r"webhosting\s+is\s+not\s+configured|hier\s+entsteht\s+eine\s+neue\s+(internet)?präsenz)", re.I)


def log(msg):
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                      data=json.dumps({"msg": ("[HOF-QA] " + line)[:2000]}), timeout=20)
    except Exception:
        pass


def fetch_all(table, select, extra=""):
    rows, start = [], 0
    while True:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?select={select}{extra}",
                         headers={**HEAD, "Range": f"{start}-{start + 999}"}, timeout=60)
        r.raise_for_status()
        part = r.json()
        rows += part
        if len(part) < 1000:
            return rows
        start += 1000


def norm_url(u):
    if not u:
        return None
    u = u.strip().split()[0].split(";")[0]
    if not re.match(r"^https?://", u, re.I):
        u = "http://" + u
    try:
        p = urlparse(u)
        if not p.netloc or "." not in p.netloc:
            return None
    except Exception:
        return None
    return u


def get(url):
    """GET mit Weiterleitungen; liefert (http, final_url, text[:300kB], fehler)."""
    try:
        with requests.get(url, headers={"User-Agent": UA, "Accept-Language": "de,en;q=0.8,fr;q=0.6"},
                          timeout=(8, 15), allow_redirects=True, stream=True) as r:
            body = b""
            for chunk in r.iter_content(65536):
                body += chunk
                if len(body) > 300_000:
                    break
            text = body.decode(r.encoding or "utf-8", errors="replace")
            return r.status_code, r.url, text, None
    except requests.exceptions.SSLError:
        # Viele kleine Hof-Websites haben abgelaufene Zertifikate: ohne Prüfung erneut versuchen
        try:
            r = requests.get(url, headers={"User-Agent": UA}, timeout=(8, 15), verify=False)
            return r.status_code, r.url, r.text[:300_000], "ssl"
        except Exception as e:
            return None, None, "", type(e).__name__
    except Exception as e:
        return None, None, "", type(e).__name__


def title_of(text):
    m = re.search(r"<title[^>]*>(.*?)</title>", text, re.I | re.S)
    return re.sub(r"\s+", " ", m.group(1)).strip()[:200] if m else None


def check_website(url):
    code, final, text, err = get(url)
    res = {"website_url": url, "website_http": code, "website_final_url": final}
    if code is None:
        res["website_status"] = "tot"
        res["_err"] = err
        return res
    host = (urlparse(final or url).netloc or "").lower()
    if any(p in host for p in PARK_HOSTS) or PARK_TEXT.search(text[:60000]):
        res["website_status"] = "geparkt"
    elif code in (404, 410):
        res["website_status"] = "tot"
    elif code >= 400:
        res["website_status"] = "fehler"   # z. B. 403 durch Bot-Schutz: nicht eindeutig
    else:
        res["website_status"] = "ok"
    res["_title"] = title_of(text)
    if err:
        res["_err"] = err
    return res


def parse_source(text):
    """Adresse/Koordinaten aus schema.org-Daten (JSON-LD oder Microdata) einer Verzeichnisseite."""
    out = {}
    for m in re.finditer(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', text, re.I | re.S):
        raw = m.group(1).strip()
        try:
            data = json.loads(raw)
        except Exception:
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            d = stack.pop()
            if isinstance(d, dict):
                if "@graph" in d:
                    stack += d["@graph"] if isinstance(d["@graph"], list) else [d["@graph"]]
                a = d.get("address")
                if isinstance(a, dict):
                    out.setdefault("strasse", a.get("streetAddress"))
                    out.setdefault("plz", a.get("postalCode"))
                    out.setdefault("ort", a.get("addressLocality"))
                g = d.get("geo")
                if isinstance(g, dict) and g.get("latitude"):
                    out.setdefault("lat", g.get("latitude"))
                    out.setdefault("lon", g.get("longitude"))
                for k in ("telephone", "url", "openingHours"):
                    if d.get(k):
                        out.setdefault(k, d.get(k))
            elif isinstance(d, list):
                stack += d
    for key, pat in (("strasse", r'itemprop="streetAddress"[^>]*>([^<]+)<'),
                     ("plz", r'itemprop="postalCode"[^>]*>([^<]+)<'),
                     ("lat", r'(?:data-lat|"lat"|latitude)["\']?\s*[:=]\s*["\']?(-?\d{1,2}\.\d{3,})'),
                     ("lon", r'(?:data-lng|data-lon|"lng"|"lon"|longitude)["\']?\s*[:=]\s*["\']?(-?\d{1,3}\.\d{3,})')):
        if not out.get(key):
            m = re.search(pat, text, re.I)
            if m:
                out[key] = m.group(1).strip()
    return {k: v for k, v in out.items() if v}


def check_farm(f):
    # Alle Zeilen brauchen dieselben Felder (PostgREST-Sammel-Upload)
    row = {"farm_id": f["farm_id"], "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "source_status": None}
    details = {}
    url = norm_url(f.get("website"))
    if url:
        w = check_website(url)
        details["website_title"] = w.pop("_title", None)
        if w.get("_err"):
            details["website_error"] = w.pop("_err")
        row.update(w)
    else:
        row.update({"website_url": None, "website_status": None, "website_http": None, "website_final_url": None})
    src = f.get("quelle_url")
    if src and "bio-hof-direkt.de" in src:
        code, final, text, err = get(src)
        if code == 200 and final and urlparse(final).path.rstrip("/") == urlparse(src).path.rstrip("/"):
            row["source_status"] = "ok"
            details["source"] = parse_source(text)
            details["source_title"] = title_of(text)
        elif code in (404, 410) or (code == 200 and final and urlparse(final).path.rstrip("/") != urlparse(src).path.rstrip("/")):
            row["source_status"] = "entfernt"
            details["source_final_url"] = final
        else:
            row["source_status"] = "fehler"
            details["source_http"] = code
            details["source_error"] = err
    row["details"] = details
    return row


def upsert(rows):
    for i in range(0, len(rows), 200):
        batch = rows[i:i + 200]
        for attempt in range(4):
            r = requests.post(f"{SUPABASE_URL}/rest/v1/farm_quality?on_conflict=farm_id",
                              headers={**HEAD, "Prefer": "resolution=merge-duplicates,return=minimal"},
                              data=json.dumps(batch), timeout=120)
            if r.status_code < 300:
                break
            log(f"Upload-Fehler {r.status_code}: {r.text[:200]}")
            time.sleep(3 * (attempt + 1))


def main():
    if not SUPABASE_URL or not KEY:
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen", file=sys.stderr)
        sys.exit(1)
    requests.packages.urllib3.disable_warnings()
    farms = []
    for r in fetch_all("farm_shops", "id,website,quelle_url"):
        farms.append({"farm_id": r["id"], "website": r.get("website"), "quelle_url": r.get("quelle_url")})
    for r in fetch_all("farm_shops_fr", "numero_bio,site_web", "&location_precision=eq.exact"):
        farms.append({"farm_id": f"fr_{r['numero_bio']}", "website": r.get("site_web")})
    for r in fetch_all("farm_shops_osm", "osm_id,website"):
        farms.append({"farm_id": f"osm_{r['osm_id']}", "website": r.get("website")})
    todo = [f for f in farms if f.get("website") or f.get("quelle_url")]
    if LIMIT:
        todo = todo[:LIMIT]
    log(f"Start: {len(farms)} Hofläden, davon {len(todo)} mit Website oder Quellseite zu prüfen")
    results, t0 = [], time.time()
    with ThreadPoolExecutor(max_workers=40) as ex:
        for i, res in enumerate(ex.map(check_farm, todo), 1):
            results.append(res)
            if len(results) >= 200:
                upsert(results)
                results = []
                log(f"{i}/{len(todo)} geprüft ({time.time() - t0:.0f} s)")
    upsert(results)
    log(f"Fertig: {len(todo)} geprüft in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    log("Prüfung gestartet")
    try:
        main()
    except Exception as e:
        log(f"Abbruch: {type(e).__name__}: {str(e)[:500]}")
        raise
