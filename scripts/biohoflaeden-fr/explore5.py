import json, os, requests
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if not KEY.startswith("sb_"): HEAD["Authorization"] = f"Bearer {KEY}"
def log(msg):
    print(msg, flush=True)
    requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                  data=json.dumps({"msg": ("[FR-BIO-TEST5] " + msg)[:2000]}), timeout=20)

BASE = "https://back.agencebio.org/api/gouv/operateurs/"

# Baseline: nbTotal für Departement 64 zum Vergleich
base_total = requests.get(BASE, params={"departements":"64","nb":5}, timeout=30).json().get("nbTotal")
log(f"Baseline departements=64 -> nbTotal={base_total}")

# 1) Array-Notation für Gemeinde-Filter (viele franz. APIs erwarten name[]=wert)
candidates = [
    ("communes[]", "64019"), ("codeCommune[]", "64019"), ("codesCommunes[]", "64019"),
    ("codePostal", "64120"), ("codePostal[]", "64120"), ("cp", "64120"),
    ("codeInsee", "64019"), ("codeInseeCommune", "64019"), ("inseeCode", "64019"),
    ("ville", "Amorots-Succos"),
]
for param, val in candidates:
    try:
        r = requests.get(BASE, params={param: val, "nb": 5}, timeout=30)
        d = r.json()
        log(f"{param}={val} -> status={r.status_code} nbTotal={d.get('nbTotal')} len={len(d.get('items',[]))}")
    except Exception as e:
        log(f"{param} -> FEHLER {e}")

# 2) Array-Notation kombiniert MIT departements, um zu prüfen ob's dann filtert
# statt komplett ignoriert zu werden
for param, val in [("communes[]","64019"), ("codeCommune","64019"), ("codePostal","64120")]:
    try:
        r = requests.get(BASE, params={"departements":"64", param: val, "nb": 5}, timeout=30)
        d = r.json()
        log(f"departements=64 + {param}={val} -> nbTotal={d.get('nbTotal')} len={len(d.get('items',[]))}")
    except Exception as e:
        log(f"dep+{param} -> FEHLER {e}")

# 3) Aktivitäts-Filter mit Array-Notation testen (id 1 = Production laut früherer Probe)
for param in ["activites[]", "activite[]", "categorie[]", "categories[]"]:
    try:
        r = requests.get(BASE, params={"departements":"64", param: "1", "nb": 5}, timeout=30)
        d = r.json()
        log(f"departements=64 + {param}=1 -> nbTotal={d.get('nbTotal')} len={len(d.get('items',[]))}")
    except Exception as e:
        log(f"{param} -> FEHLER {e}")
