#!/usr/bin/env python3
"""Testabruf: EIN Departement bei Agence Bio abfragen und die Rohstruktur des ersten
Eintrags protokollieren, damit die echten Feldnamen bekannt sind, bevor der volle
Import gebaut wird. Läuft nur einmalig über GitHub Actions (Sandbox hat keinen Zugriff
auf agencebio.org)."""
import json, os, time, requests

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if not KEY.startswith("sb_"):
    HEAD["Authorization"] = f"Bearer {KEY}"

def log(msg):
    print(msg, flush=True)
    requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                  data=json.dumps({"msg": ("[FR-BIO-TEST] " + msg)[:2000]}), timeout=20)

DEP = os.environ.get("DEP", "34")
r = requests.get("https://back.agencebio.org/api/gouv/operateurs/",
                  params={"departements": DEP}, headers={"accept": "application/json"}, timeout=30)
log(f"status={r.status_code} url={r.url}")
try:
    data = r.json()
except Exception as e:
    log(f"kein JSON: {e} body={r.text[:500]}")
    raise SystemExit(1)

nb = data.get("nbTotal")
items = data.get("items", [])
log(f"nbTotal={nb} len(items)={len(items)}")
if items:
    first = items[0]
    log("KEYS TOP-LEVEL: " + json.dumps(sorted(first.keys()), ensure_ascii=False))
    log("SAMPLE ITEM (gekürzt): " + json.dumps(first, ensure_ascii=False)[:1800])
else:
    log("keine items zurückgekommen, raw body: " + r.text[:1000])
