#!/usr/bin/env python3
"""
Bio-Hofläden-Import Frankreich für Communet.

Quelle: Agence Bio (staatliche Bio-Zertifizierungsstelle), API back.agencebio.org.
Kriterium (analog zu den deutschen Bio-Hofläden — nur zertifiziert, Direktverkauf):
  - Aktivität "Production" (ist selbst Erzeuger, kein reiner Händler)
  - Direktverkauf an Privatpersonen: Kategorie "Vente aux consommateurs"
    ODER venteAnnuaire.venteParticuliers == true
  - Mindestens eine Produktion mit Status "AB" (voll zertifiziert bio, keine
    reine Umstellungsware C1/C2/C3)

Umgebungsvariablen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DRY_RUN=1 (Test),
TEST_DEP=<Departement> (nur dieses eine Departement laufen lassen)
"""
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

BASE = "https://back.agencebio.org/api/gouv/operateurs/"
# Alle Departements: 01-95 (20 -> 2A/2B Korsika), plus Übersee
DEPARTEMENTS = [f"{n:02d}" for n in range(1, 96) if n != 20] + ["2A", "2B", "971", "972", "973", "974", "976"]


def log(msg: str) -> None:
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    if DRY or not SUPABASE_URL:
        return
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                      data=json.dumps({"msg": ("[FR-BIO] " + line)[:2000]}), timeout=20)
    except Exception:
        pass


def is_farm_shop(op: dict) -> bool:
    act_names = {str(a.get("nom")) for a in (op.get("activites") or [])}
    if "Production" not in act_names:
        return False
    cat_names = {str(c.get("nom")) for c in (op.get("categories") or [])}
    va = op.get("venteAnnuaire") or {}
    direct = ("Vente aux consommateurs" in cat_names) or bool(va.get("venteParticuliers"))
    if not direct:
        return False
    for prod in (op.get("productions") or []):
        for etat in (prod.get("etatProductions") or []):
            if str(etat.get("etatProduction")) == "AB":
                return True
    return False


def best_address(op: dict):
    addrs = op.get("adressesOperateurs") or []
    if not addrs:
        return None
    # "Lieux de vente" bevorzugen, sonst Sitz, sonst die erste
    for pref in ("Lieux de vente", "Siège social"):
        for a in addrs:
            if pref in (a.get("typeAdresseOperateurs") or []) and a.get("active", True):
                return a
    return addrs[0]


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


def process_departement(dep: str) -> dict:
    r = requests.get(BASE, params={"departements": dep, "nb": 10000},
                      headers={"accept": "application/json"}, timeout=60)
    r.raise_for_status()
    data = r.json()
    items = data.get("items", [])
    nb_total = data.get("nbTotal", len(items))
    if len(items) < nb_total:
        log(f"[{dep}] WARNUNG: nur {len(items)} von {nb_total} geladen (Seitengröße reicht nicht)")

    rows = []
    for op in items:
        if not is_farm_shop(op):
            continue
        addr = best_address(op)
        if not addr or addr.get("lat") is None or addr.get("long") is None:
            continue
        cert = (op.get("certificats") or [{}])[0]
        rows.append({
            "numero_bio": str(op.get("numeroBio")),
            "siret": op.get("siret"),
            "name": op.get("denominationcourante") or op.get("raisonSociale"),
            "categories": [str(c.get("nom")) for c in op.get("categories", []) if c.get("nom") is not None],
            "productions_etat": sorted({str(e.get("etatProduction"))
                                         for p in op.get("productions", [])
                                         for e in p.get("etatProductions", [])
                                         if e.get("etatProduction") is not None}),
            "organisme_certificateur": cert.get("organisme"),
            "adresse": addr.get("lieu"),
            "code_postal": addr.get("codePostal"),
            "ville": addr.get("ville"),
            "departement": dep,
            "lat": addr.get("lat"),
            "lon": addr.get("long"),
            "site_web": (op.get("siteWebs") or [None])[0],
            "raw": op,
            "imported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })
    upsert(rows)
    log(f"[{dep}] {nb_total} Betriebe insgesamt, {len(rows)} als Hofladen mit Koordinaten gespeichert")
    return {"dep": dep, "total": nb_total, "saved": len(rows)}


def main():
    import traceback
    if not DRY and (not SUPABASE_URL or not KEY):
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen", file=sys.stderr)
        sys.exit(1)
    deps = DEPARTEMENTS
    if os.environ.get("TEST_DEP"):
        deps = [os.environ["TEST_DEP"]]
    log(f"Start FR Bio-Hofläden-Import: {len(deps)} Departements")
    total_saved = 0
    failed = []
    for dep in deps:
        for attempt in range(3):
            try:
                total_saved += process_departement(dep)["saved"]
                break
            except Exception as e:
                tb = traceback.format_exc()
                if attempt == 2:
                    failed.append(dep)
                    log(f"[{dep}] FEHLER endgültig: {e}\n{tb[-1500:]}")
                else:
                    time.sleep(3)
        time.sleep(0.3)  # nicht überlasten
    log(f"Ende: {total_saved} Hofläden gespeichert" + (f", fehlgeschlagen: {', '.join(failed)}" if failed else ""))
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
