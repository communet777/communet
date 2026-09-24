#!/usr/bin/env python3
"""Testabruf 2: Pagination-Parameter herausfinden + einen echten Hofladen-Fall finden
(Aktivität "Production" + Direktverkauf an Privatpersonen), damit der Filter fuer den
echten Import stimmt."""
import json, os, requests

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if not KEY.startswith("sb_"):
    HEAD["Authorization"] = f"Bearer {KEY}"

def log(msg):
    print(msg, flush=True)
    requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                  data=json.dumps({"msg": ("[FR-BIO-TEST2] " + msg)[:2000]}), timeout=20)

DEP = os.environ.get("DEP", "34")
BASE = "https://back.agencebio.org/api/gouv/operateurs/"

# 1) Pagination-Parameter testen: welcher davon liefert andere Ergebnisse als Seite 1?
r1 = requests.get(BASE, params={"departements": DEP}, timeout=30).json()
first_ids_p1 = [it.get("id") for it in r1.get("items", [])]
for params in [{"page": 2}, {"pageNumber": 2}, {"offset": 20}, {"skip": 20}, {"nb": 100}, {"limit": 100}, {"perPage": 100}]:
    p = {"departements": DEP, **params}
    try:
        rr = requests.get(BASE, params=p, timeout=30)
        d = rr.json()
        ids = [it.get("id") for it in d.get("items", [])]
        changed = ids != first_ids_p1
        log(f"params={params} status={rr.status_code} len={len(ids)} changed_vs_page1={changed} first_id={ids[0] if ids else None}")
    except Exception as e:
        log(f"params={params} FEHLER {e}")

# 2) Über mehrere Seiten (page=1..8, falls "page" wirkt) nach einem Betrieb mit
#    Aktivität "Production" UND Direktverkauf an Privatpersonen suchen
found = None
for page in range(1, 9):
    d = requests.get(BASE, params={"departements": DEP, "page": page}, timeout=30).json()
    items = d.get("items", [])
    if not items:
        break
    for it in items:
        act_names = [a.get("nom") for a in it.get("activites", [])]
        va = it.get("venteAnnuaire") or {}
        if any("Production" in (n or "") for n in act_names) and va.get("venteParticuliers"):
            found = it
            break
    if found:
        break

if found:
    log("HOFLADEN-BEISPIEL KEYS: " + json.dumps(sorted(found.keys()), ensure_ascii=False))
    log("HOFLADEN-BEISPIEL: " + json.dumps(found, ensure_ascii=False)[:1900])
else:
    log("Kein Production+venteParticuliers-Beispiel in den ersten Seiten gefunden")
