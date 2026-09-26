import json, os, requests, csv, io
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEAD = {"apikey": KEY, "Content-Type": "application/json"}
if not KEY.startswith("sb_"): HEAD["Authorization"] = f"Bearer {KEY}"
def log(msg):
    print(msg, flush=True)
    requests.post(f"{SUPABASE_URL}/rest/v1/water_import_log", headers=HEAD,
                  data=json.dumps({"msg": ("[FR-BIO-TEST8] " + msg)[:2000]}), timeout=20)

url = "https://www.data.gouv.fr/api/1/datasets/r/657789db-d349-4554-aef6-eabde4bd1c57"
r = requests.get(url, timeout=60, headers={"User-Agent": "Communet-FR-BIO/1.0 (communet@outlook.de)"})
log(f"Download status={r.status_code} bytes={len(r.content)}")
raw = r.content
for enc in ("utf-8-sig", "latin-1"):
    try:
        text = raw.decode(enc)
        break
    except Exception:
        continue
sniffer = csv.Sniffer()
sample = text[:2000]
try:
    dialect = sniffer.sniff(sample, delimiters=";,")
    delim = dialect.delimiter
except Exception:
    delim = ";" if sample.count(";") > sample.count(",") else ","
reader = csv.reader(io.StringIO(text), delimiter=delim)
header = next(reader)
log(f"Trennzeichen erkannt: {repr(delim)}")
log(f"Spalten ({len(header)}): {header}")
rows = list(reader)
log(f"Anzahl Datenzeilen: {len(rows)}")
if rows:
    sample_row = dict(zip(header, rows[0]))
    log(f"Beispielzeile: {json.dumps(sample_row, ensure_ascii=False)[:1500]}")
if len(rows) > 1:
    sample_row2 = dict(zip(header, rows[len(rows)//2]))
    log(f"Beispielzeile 2: {json.dumps(sample_row2, ensure_ascii=False)[:1500]}")
