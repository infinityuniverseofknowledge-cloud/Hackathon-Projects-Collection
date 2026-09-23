#!/usr/bin/env python3
"""OmniForge Python backend — Flask + SQLite, standalone."""
import os, json, time, uuid, sqlite3, threading
from statistics import mean, median, pstdev
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "omniforge.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs(
 id TEXT PRIMARY KEY, name TEXT, kind TEXT, payload TEXT,
 status TEXT DEFAULT 'PENDING', result TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS metrics(
 id TEXT PRIMARY KEY, key TEXT, value REAL, timestamp TEXT);
"""

def db():
    c = sqlite3.connect(DB, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    c = db(); c.executescript(SCHEMA); c.commit(); c.close()

def insert(table, data):
    data.setdefault("id", str(uuid.uuid4()))
    data.setdefault("timestamp", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
    cols = ",".join(data.keys()); qs = ",".join("?" for _ in data)
    c = db()
    c.execute(f"INSERT INTO {table}({cols}) VALUES({qs})", tuple(data.values()))
    c.commit(); c.close()
    return data["id"]

def rows(sql, params=()):
    c = db(); r = [dict(x) for x in c.execute(sql, params).fetchall()]; c.close(); return r

def describe(vals):
    if not vals: return {"count": 0}
    return {
        "count": len(vals), "min": min(vals), "max": max(vals),
        "mean": round(mean(vals), 4), "median": round(median(vals), 4),
        "stddev": round(pstdev(vals), 4) if len(vals) > 1 else 0.0
    }

def histogram(vals, bins=10):
    if not vals: return []
    lo, hi = min(vals), max(vals)
    if hi == lo: return [{"bin": lo, "count": len(vals)}]
    w = (hi - lo) / bins
    b = [0] * bins
    for v in vals:
        i = min(bins - 1, int((v - lo) / w)); b[i] += 1
    return [{"bin": round(lo + (i + 0.5) * w, 4), "count": c} for i, c in enumerate(b)]

def hash_sha256(text):
    import hashlib
    return hashlib.sha256(text.encode()).hexdigest()

HTML = """<!DOCTYPE html><html><head><meta charset="utf-8">
<title>OmniForge</title>
<style>body{font-family:system-ui;background:#0b1220;color:#e6edf3;padding:20px}
button{background:#7c5cff;color:#fff;border:0;padding:10px 16px;border-radius:8px;margin:4px;cursor:pointer}
input,textarea{width:100%;padding:10px;border-radius:8px;border:1px solid #1e2a44;background:#121a2b;color:#fff;margin:6px 0}
pre{background:#000;color:#0f0;padding:14px;border-radius:8px;overflow:auto}
.card{background:#121a2b;border:1px solid #1e2a44;border-radius:12px;padding:16px;margin:10px 0}
</style></head><body>
<h1>⚙️ OmniForge (Python backend)</h1>
<div class="card"><h3>Describe</h3>
<textarea id="vals">12,7,23,45,18,9,32,27,15,41</textarea>
<button onclick="describe()">Describe</button><button onclick="hist()">Histogram</button>
<pre id="o1"></pre></div>
<div class="card"><h3>SHA-256</h3>
<input id="txt" value="Hello OmniForge">
<button onclick="sha()">Hash</button><pre id="o2"></pre></div>
<div class="card"><h3>Jobs</h3>
<input id="jname" value="demo-job">
<button onclick="addJob()">Create Job</button>
<button onclick="listJobs()">List Jobs</button>
<pre id="o3"></pre></div>
<script>
async function j(u,o){const r=await fetch(u,o);return await r.json()}
async function describe(){const v=document.getElementById('vals').value.split(',').map(x=>+x.trim()).filter(x=>!isNaN(x));
 const r=await j('/api/describe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({values:v})});
 document.getElementById('o1').textContent=JSON.stringify(r,null,2);}
async function hist(){const v=document.getElementById('vals').value.split(',').map(x=>+x.trim()).filter(x=>!isNaN(x));
 const r=await j('/api/histogram',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({values:v,bins:10})});
 document.getElementById('o1').textContent=JSON.stringify(r,null,2);}
async function sha(){const r=await j('/api/sha',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:document.getElementById('txt').value})});
 document.getElementById('o2').textContent=r.hash||JSON.stringify(r);}
async function addJob(){const r=await j('/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('jname').value,kind:'demo'})});
 document.getElementById('o3').textContent='Created: '+JSON.stringify(r);}
async function listJobs(){const r=await j('/api/jobs');document.getElementById('o3').textContent=JSON.stringify(r,null,2);}
</script></body></html>"""

class H(BaseHTTPRequestHandler):
    def _json(self, obj, status=200):
        b = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _html(self, s):
        b = s.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path in ("/", "/index.html"):
            return self._html(HTML)
        if u.path == "/health":
            return self._json({"status": "ok", "service": "python"})
        if u.path == "/api/jobs":
            return self._json(rows("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100"))
        self._json({"error": "not found"}, 404)

    def do_POST(self):
        u = urlparse(self.path)
        n = int(self.headers.get("Content-Length", 0))
        try:
            data = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            data = {}
        if u.path == "/api/describe":
            try:
                v = [float(x) for x in data.get("values", [])]
            except Exception:
                return self._json({"error": "non-numeric"}, 400)
            return self._json(describe(v))
        if u.path == "/api/histogram":
            try:
                v = [float(x) for x in data.get("values", [])]
            except Exception:
                return self._json({"error": "non-numeric"}, 400)
            return self._json(histogram(v, int(data.get("bins", 10))))
        if u.path == "/api/sha":
            return self._json({"hash": hash_sha256(str(data.get("text", "")))})
        if u.path == "/api/jobs":
            jid = insert("jobs", {"name": data.get("name", "unnamed"),
                                  "kind": data.get("kind", "generic"),
                                  "payload": json.dumps(data.get("payload", {}))})
            return self._json({"id": jid})
        self._json({"error": "not found"}, 404)

    def log_message(self, *a): pass

if __name__ == "__main__":
    init_db()
    print("OmniForge Python — http://127.0.0.1:8000")
    HTTPServer(("127.0.0.1", 8000), H).serve_forever()
