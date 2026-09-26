import json, os, requests
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if not KEY.startswith("sb_"): HEAD["Authorization"] = f"Bearer {KEY}"
def log(msg):
    print(msg, flush=True)
    requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                  data=json.dumps({"msg": ("[FR-BIO-TEST4] " + msg)[:2000]}), timeout=20)

BASE = "https://back.agencebio.org/api/gouv/operateurs/"
# Testgemeinde: Amorots-Succos, codeCommune 64019 (aus einem echten Datensatz bekannt)
for param in ["communes", "commune", "codeCommune", "codeCommunes", "codesCommunes"]:
    try:
        r = requests.get(BASE, params={param: "64019", "nb": 5}, timeout=30)
        d = r.json()
        log(f"{param}=64019 -> status={r.status_code} nbTotal={d.get('nbTotal')} len={len(d.get('items',[]))}")
    except Exception as e:
        log(f"{param} -> FEHLER {e}")

# Vergleich: nbTotal für das ganze Departement 64 zur Einordnung
r = requests.get(BASE, params={"departements": "64", "nb": 5}, timeout=30)
d = r.json()
log(f"departements=64 (ganzes Departement) -> nbTotal={d.get('nbTotal')}")
