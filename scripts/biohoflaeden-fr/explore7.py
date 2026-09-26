import json, os, requests
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if not KEY.startswith("sb_"): HEAD["Authorization"] = f"Bearer {KEY}"
def log(msg):
    print(msg, flush=True)
    requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                  data=json.dumps({"msg": ("[FR-BIO-TEST7] " + msg)[:2000]}), timeout=20)

BASE = "https://back.agencebio.org/api/gouv/operateurs/"
DEP = "64"
base = {"departements": DEP, "activite": "Production", "nb": 100}

tests = [
    {"venteParticuliers": "true"},
    {"venteParticuliers": "1"},
    {"venteDirecte": "true"},
    {"vente": "particuliers"},
    {"categorie": "1"},
    {"categorie": "Vente%20aux%20consommateurs"},
]
for extra in tests:
    p = {**base, **extra}
    try:
        r = requests.get(BASE, params=p, timeout=30)
        d = r.json()
        log(f"{extra} -> status={r.status_code} nbTotal={d.get('nbTotal')} len={len(d.get('items',[]))}")
    except Exception as e:
        log(f"{extra} -> FEHLER {e}")

# Referenz: nur activite=Production, keine weitere Einschränkung
r = requests.get(BASE, params=base, timeout=30)
d = r.json()
log(f"NUR activite=Production -> nbTotal={d.get('nbTotal')}")
