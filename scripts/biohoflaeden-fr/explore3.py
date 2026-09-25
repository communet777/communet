import json, os, requests
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if not KEY.startswith("sb_"): HEAD["Authorization"] = f"Bearer {KEY}"
def log(msg):
    print(msg, flush=True)
    requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                  data=json.dumps({"msg": ("[FR-BIO-TEST3] " + msg)[:2000]}), timeout=20)

BASE = "https://back.agencebio.org/api/gouv/operateurs/"
DEP = "13"  # großes Departement (Bouches-du-Rhône), garantiert > 100 Betriebe

base = requests.get(BASE, params={"departements": DEP, "nb": 100}, timeout=30).json()
ids1 = [it.get("id") for it in base.get("items", [])]
log(f"Basis nb=100: nbTotal={base.get('nbTotal')} len={len(ids1)} ids[0:3]={ids1[:3]} ids[-3:]={ids1[-3:]}")

candidates = [
    {"page": 2}, {"p": 2}, {"pageIndex": 1}, {"pagenum": 2}, {"numPage": 2},
    {"start": 100}, {"from": 100}, {"cursor": 100}, {"pageSize": 100, "page": 2},
    {"lastId": ids1[-1] if ids1 else 0},
    {"activites": "Production"}, {"categorie": "vente_directe"}, {"categories": "Vente aux consommateurs"},
    {"categorie": "1"}, {"activite": "1"},
]
for extra in candidates:
    p = {"departements": DEP, "nb": 100, **extra}
    try:
        r = requests.get(BASE, params=p, timeout=30)
        d = r.json()
        ids = [it.get("id") for it in d.get("items", [])]
        changed = ids != ids1
        log(f"{extra} -> status={r.status_code} nbTotal={d.get('nbTotal')} len={len(ids)} changed={changed} first={ids[0] if ids else None}")
    except Exception as e:
        log(f"{extra} -> FEHLER {e}")
