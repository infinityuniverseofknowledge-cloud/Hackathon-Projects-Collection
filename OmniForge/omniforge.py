#!/usr/bin/env python3
"""OmniForge Python backend — stdlib only, no pip needed."""
import json, time, uuid, sqlite3, hashlib, os
from statistics import mean, median, pstdev
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "omniforge.db")
SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs(
 id TEXT PRIMARY KEY, name TEXT, kind TEXT,
 status TEXT DEFAULT 'PENDING', created_at TEXT);
CREATE TABLE IF NOT EXISTS metrics(
 id TEXT PRIMARY KEY, key TEXT, value REAL, ts TEXT);
"""

def db():
    c = sqlite3.connect(DB, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    c = db(); c.executescript(SCHEMA); c.commit(); c.close()

def insert(table, data):
    data.setdefault("id", str(uuid.uuid4()))
    data.setdefault("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
    cols = ",".join(data.keys()); qs = ",".join("?" for _ in data)
    c = db(); c.execute(f"INSERT INTO {table}({cols}) VALUES({qs})", tuple(data.values()))
    c.commit(); c.close(); return data["id"]

def rows(sql, params=()):
    c = db(); r = [dict(x) for x in c.execute(sql, params).fetchall()]; c.close(); return r

def describe(v):
    if not v: return {"count": 0}
    return {"count": len(v), "min": min(v), "max": max(v),
            "mean": round(mean(v),4), "median": round(median(v),4),
            "stddev": round(pstdev(v),4) if len(v)>1 else 0.0}

def histogram(v, bins=10):
    if not v: return []
    lo, hi = min(v), max(v)
    if hi == lo: return [{"bin": lo, "count": len(v)}]
    w = (hi-lo)/bins; b=[0]*bins
    for x in v: b[min(bins-1,int((x-lo)/w))] += 1
    return [{"bin": round(lo+(i+0.5)*w,4), "count": c} for i,c in enumerate(b)]

PAGE = """<!DOCTYPE html><html><head><meta charset="utf-8"><title>OmniForge Python</title>
<style>body{font:15px system-ui;background:#0b1220;color:#e6edf3;padding:24px;max-width:900px;margin:auto}
h1{color:#7c5cff}button{background:#7c5cff;color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer;margin:4px}
input,textarea{width:100%;padding:10px;border:1px solid #1e2a44;border-radius:8px;background:#121a2b;color:#fff;margin:6px 0}
pre{background:#000;color:#0f0;padding:14px;border-radius:8px;overflow:auto}
.card{background:#121a2b;border:1px solid #1e2a44;border-radius:12px;padding:18px;margin:12px 0}</style>
</head><body>
<h1>⚙️ OmniForge (Python 3 backend)</h1>
<div class="card"><h3>Describe</h3>
<textarea id="v">12,7,23,45,18,9,32,27,15,41</textarea>
<button onclick="D()">Describe</button><button onclick="H()">Histogram</button>
<pre id="o"></pre></div>
<div class="card"><h3>SHA-256</h3>
<input id="t" value="Hello OmniForge">
<button onclick="S()">Hash</button><pre id="o2"></pre></div>
<script>
async function J(u,o){return (await fetch(u,o)).json()}
async function D(){const v=document.getElementById('v').value.split(',').map(x=>+x).filter(x=>!isNaN(x));
 document.getElementById('o').textContent=JSON.stringify(await J('/api/describe',{method:'POST',body:JSON.stringify({values:v})}),null,2);}
async function H(){const v=document.getElementById('v').value.split(',').map(x=>+x).filter(x=>!isNaN(x));
 document.getElementById('o').textContent=JSON.stringify(await J('/api/histogram',{method:'POST',body:JSON.stringify({values:v})}),null,2);}
async function S(){const r=await J('/api/sha',{method:'POST',body:JSON.stringify({text:document.getElementById('t').value})});
 document.getElementById('o2').textContent=r.hash;}
</script></body></html>"""

class H(BaseHTTPRequestHandler):
    def _j(self, o, s=200):
        b = json.dumps(o).encode()
        self.send_response(s); self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(b)))
        self.send_header("Access-Control-Allow-Origin","*"); self.end_headers(); self.wfile.write(b)
    def _h(self, s):
        b = s.encode()
        self.send_response(200); self.send_header("Content-Type","text/html; charset=utf-8")
        self.send_header("Content-Length",str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        p = urlparse(self.path).path
        if p in ("/","/index.html"): return self._h(PAGE)
        if p == "/health": return self._j({"status":"ok","service":"python"})
        if p == "/api/jobs": return self._j(rows("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100"))
        self._j({"error":"not found"},404)
    def do_POST(self):
        p = urlparse(self.path).path
        n = int(self.headers.get("Content-Length",0))
        try: d = json.loads(self.rfile.read(n) or b"{}")
        except: d = {}
        if p == "/api/describe":
            try: v = [float(x) for x in d.get("values",[])]
            except: return self._j({"error":"non-numeric"},400)
            return self._j(describe(v))
        if p == "/api/histogram":
            try: v = [float(x) for x in d.get("values",[])]
            except: return self._j({"error":"non-numeric"},400)
            return self._j(histogram(v, int(d.get("bins",10))))
        if p == "/api/sha":
            return self._j({"hash": hashlib.sha256(str(d.get("text","")).encode()).hexdigest()})
        if p == "/api/jobs":
            jid = insert("jobs", {"name":d.get("name","unnamed"), "kind":d.get("kind","generic")})
            return self._j({"id":jid})
        self._j({"error":"not found"},404)
    def log_message(self,*a): pass

if __name__ == "__main__":
    init_db()
    print("OmniForge Python → http://127.0.0.1:8000")
    HTTPServer(("127.0.0.1",8000), H).serve_forever()
