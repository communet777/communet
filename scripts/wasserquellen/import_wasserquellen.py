#!/usr/bin/env python3
"""
Wasserquellen-Import für Communet.

Ablauf pro Land:
  1. OSM-Länderdatei von Geofabrik laden
  2. mit osmium auf Quellen (natural=spring/hot_spring) und Straßen/Feldwege (highway=...) filtern
  3. für jede Quelle die Entfernung zur nächsten befahrbaren Straße und zum nächsten Feldweg berechnen
  4. Quellen mit höchstens 250 m Entfernung (Straße ODER Feldweg) nach Supabase public.water_sources schreiben

Umgebungsvariablen:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   Ziel-Datenbank
  WORKDIR                                   Arbeitsordner (Standard /tmp/osm)
  EXTRACTS                                  optional, z. B. "PT:europe/portugal" für Teilläufe
  DRY_RUN=1                                 nichts hochladen, nur zählen (für Tests)
  LOCAL_PBF                                 optional: lokale Datei statt Download (für Tests)
"""
import json
import math
import os
import subprocess
import sys
import time
from collections import defaultdict

import osmium
import requests

MAX_M = 250
CELL = 0.005  # Rasterzelle in Grad: >= ca. 300 m in Ost-West-Richtung bis 55° Nord, also > MAX_M
ROAD_TYPES = {
    "motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential",
    "living_street", "service", "road", "motorway_link", "trunk_link", "primary_link",
    "secondary_link", "tertiary_link",
}
TRACK = "track"
DEFAULT_EXTRACTS = [
    ("PT", "europe/portugal"),
    ("ES", "europe/spain"),
    ("ES", "africa/canary-islands"),
    ("FR", "europe/france"),
    ("DE", "europe/germany"),
]

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
WORK = os.environ.get("WORKDIR", "/tmp/osm")
DRY = os.environ.get("DRY_RUN") == "1"
HEAD = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


def log(msg: str) -> None:
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    if DRY or not SUPABASE_URL:
        return
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                      data=json.dumps({"msg": line[:2000]}), timeout=20)
    except Exception:
        pass


def classify(tags: dict) -> str:
    import re
    name = (tags.get("name") or "").lower()
    st = (tags.get("spring:type") or tags.get("spring") or "").lower()
    if (tags.get("natural") == "hot_spring"
            or re.search(r"mineral|thermal|hot|carbon|sulph|sulf|heil", st)
            or tags.get("drinking_water:mineral") == "yes"
            or re.search(r"heilquell|mineralquell|sauerbrunn|säuerling|thermal|termal|terma|fuente agria|"
                         r"agua agria|source thermale|source min[ée]rale|caldas", name)):
        return "Heilquelle"
    if tags.get("drinking_water") == "yes":
        return "Trinkwasserquelle"
    return "Wasserquelle zur Versorgung"


def cell(lat: float, lon: float):
    return (math.floor(lat / CELL), math.floor(lon / CELL))


def seg_dist(slat, slon, alat, alon, blat, blon) -> float:
    """Abstand Punkt (Quelle) zu Strecke A-B in Metern (lokale Projektion, genau genug < 1 km)."""
    k = math.cos(math.radians(slat)) * 111320.0
    ax, ay = (alon - slon) * k, (alat - slat) * 110540.0
    bx, by = (blon - slon) * k, (blat - slat) * 110540.0
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    t = 0.0 if l2 == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / l2))
    return math.hypot(ax + t * dx, ay + t * dy)


class SpringCollector(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.springs = {}

    def node(self, n):
        nat = n.tags.get("natural")
        if nat == "spring" or nat == "hot_spring":
            self.springs[n.id] = (n.location.lat, n.location.lon, {t.k: t.v for t in n.tags})


class RoadMatcher(osmium.SimpleHandler):
    def __init__(self, springs, grid, interest):
        super().__init__()
        self.springs = springs
        self.grid = grid
        self.interest = interest
        self.road = {}   # spring_id -> (dist, highway)
        self.track = {}  # spring_id -> dist
        self.ways = 0

    def way(self, w):
        hw = w.tags.get("highway")
        if hw is None or (hw not in ROAD_TYPES and hw != TRACK):
            return
        pts = []
        for nd in w.nodes:
            loc = nd.location
            if loc.valid():
                pts.append((loc.lat, loc.lon))
        if len(pts) < 2:
            return
        self.ways += 1
        interest = self.interest
        grid = self.grid
        springs = self.springs
        is_track = hw == TRACK
        for i in range(len(pts) - 1):
            alat, alon = pts[i]
            blat, blon = pts[i + 1]
            c0y, c0x = cell(min(alat, blat), min(alon, blon))
            c1y, c1x = cell(max(alat, blat), max(alon, blon))
            # Zellen der Strecke durchgehen; nur weiter, wenn eine davon in der Nähe einer Quelle liegt
            hit = False
            for cy in range(c0y, c1y + 1):
                for cx in range(c0x, c1x + 1):
                    if (cy, cx) in interest:
                        hit = True
                        break
                if hit:
                    break
            if not hit:
                continue
            seen = set()
            for cy in range(c0y - 1, c1y + 2):
                for cx in range(c0x - 1, c1x + 2):
                    for sid in grid.get((cy, cx), ()):
                        if sid in seen:
                            continue
                        seen.add(sid)
                        slat, slon, _ = springs[sid]
                        d = seg_dist(slat, slon, alat, alon, blat, blon)
                        if d > MAX_M:
                            continue
                        if is_track:
                            if d < self.track.get(sid, 1e18):
                                self.track[sid] = d
                        else:
                            cur = self.road.get(sid)
                            if cur is None or d < cur[0]:
                                self.road[sid] = (d, hw)


def upsert(rows):
    if DRY:
        return
    for i in range(0, len(rows), 1000):
        batch = rows[i:i + 1000]
        for attempt in range(5):
            r = requests.post(f"{SUPABASE_URL}/rest/v1/water_sources?on_conflict=osm_id",
                              headers={**HEAD, "Prefer": "resolution=merge-duplicates,return=minimal"},
                              data=json.dumps(batch), timeout=120)
            if r.status_code < 300:
                break
            log(f"Upload-Fehler {r.status_code}: {r.text[:300]} (Versuch {attempt + 1})")
            time.sleep(5 * (attempt + 1))
        else:
            raise RuntimeError("Upload endgültig fehlgeschlagen")


def process(region: str, path: str) -> dict:
    os.makedirs(WORK, exist_ok=True)
    name = path.split("/")[-1]
    raw = os.environ.get("LOCAL_PBF") or os.path.join(WORK, f"{name}.osm.pbf")
    flt = os.path.join(WORK, f"{name}-filtered.osm.pbf")

    if not os.environ.get("LOCAL_PBF"):
        t0 = time.time()
        log(f"[{region}] Lade {path} …")
        subprocess.run(["curl", "-sSfL", "--retry", "5", "--retry-delay", "10", "-o", raw,
                        f"https://download.geofabrik.de/{path}-latest.osm.pbf"], check=True)
        log(f"[{region}] {name}: {os.path.getsize(raw) / 1e9:.2f} GB in {time.time() - t0:.0f} s geladen")

    t0 = time.time()
    hw = ",".join(sorted(ROAD_TYPES | {TRACK}))
    subprocess.run(["osmium", "tags-filter", "--overwrite", "-o", flt, raw,
                    "n/natural=spring,hot_spring", f"w/highway={hw}"], check=True)
    if not os.environ.get("LOCAL_PBF"):
        os.remove(raw)
    log(f"[{region}] gefiltert in {time.time() - t0:.0f} s ({os.path.getsize(flt) / 1e6:.0f} MB)")

    sc = SpringCollector()
    sc.apply_file(flt)
    springs = sc.springs
    grid = defaultdict(list)
    for sid, (lat, lon, _) in springs.items():
        grid[cell(lat, lon)].append(sid)
    interest = set()
    for (cy, cx) in grid:
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                interest.add((cy + dy, cx + dx))
    log(f"[{region}] {len(springs)} Quellen gefunden, suche Straßen in der Nähe …")

    t0 = time.time()
    rm = RoadMatcher(springs, dict(grid), interest)
    rm.apply_file(flt, locations=True, idx="flex_mem")
    os.remove(flt)
    log(f"[{region}] {rm.ways} Straßen/Wege geprüft in {time.time() - t0:.0f} s")

    rows = []
    stats = defaultdict(int)
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    for sid, (lat, lon, tags) in springs.items():
        road = rm.road.get(sid)
        track = rm.track.get(sid)
        if road is None and track is None:
            continue
        typ = classify(tags)
        stats[typ] += 1
        rows.append({
            "osm_id": f"node/{sid}",
            "lat": round(lat, 7),
            "lon": round(lon, 7),
            "name": tags.get("name"),
            "typ": typ,
            "road_distance_m": round(road[0]) if road else None,
            "road_type": road[1] if road else None,
            "track_distance_m": round(track) if track is not None else None,
            "drinking_water": tags.get("drinking_water"),
            "region": region,
            "tags": tags,
            "imported_at": now,
        })
    upsert(rows)
    summary = {"region": region, "extract": path, "quellen": len(springs), "gespeichert": len(rows), **stats}
    log(f"[{region}] fertig: {json.dumps(summary, ensure_ascii=False)}")
    return summary


def main():
    if not DRY and (not SUPABASE_URL or not KEY):
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen", file=sys.stderr)
        sys.exit(1)
    extracts = DEFAULT_EXTRACTS
    if os.environ.get("EXTRACTS"):
        extracts = [tuple(x.split(":", 1)) for x in os.environ["EXTRACTS"].split(",")]
    log(f"Start Wasserquellen-Import: {', '.join(p for _, p in extracts)} (max. {MAX_M} m zur Straße/Feldweg)")
    total = 0
    failed = []
    for region, path in extracts:
        try:
            total += process(region, path)["gespeichert"]
        except Exception as e:
            failed.append(path)
            log(f"[{region}] FEHLER bei {path}: {e}")
    log(f"Ende: {total} Quellen gespeichert" + (f", fehlgeschlagen: {', '.join(failed)}" if failed else ""))
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
