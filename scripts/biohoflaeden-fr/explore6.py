import json, os, requests, urllib.parse
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if not KEY.startswith("sb_"): HEAD["Authorization"] = f"Bearer {KEY}"
def log(msg):
    print(msg, flush=True)
    requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                  data=json.dumps({"msg": ("[FR-BIO-TEST6] " + msg)[:2000]}), timeout=20)

BASE = "https://back.agencebio.org/api/gouv/operateurs/"
DEP = "64"

tests = [
    {"activite[]": "Production"},
    {"activite[]": "1"},
    {"categorie[]": "Vente aux consommateurs"},
    {"categorie[]": "1"},
    {"activite": "Production"},
    {"categorie": "Vente aux consommateurs"},
    {"activites[]": "Production"},
    {"categories[]": "Vente aux consommateurs"},
]
for extra in tests:
    p = {"departements": DEP, "nb": 100, **extra}
    try:
        r = requests.get(BASE, params=p, timeout=30)
        d = r.json()
        items = d.get("items", [])
        ids = [it.get("id") for it in items]
        log(f"{extra} -> status={r.status_code} nbTotal={d.get('nbTotal')} len={len(items)} first3={ids[:3]}")
    except Exception as e:
        log(f"{extra} -> FEHLER {e}")
