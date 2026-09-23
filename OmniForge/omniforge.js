#!/usr/bin/env node
/* OmniForge Node.js service — built-ins only.
   Run: node omniforge.js
*/
const http = require('http'), url = require('url'), crypto = require('crypto');
const PORT = 8002, START = Date.now();

function J(res, s, o) {
  const b = JSON.stringify(o);
  res.writeHead(s, {'Content-Type':'application/json',
    'Access-Control-Allow-Origin':'*','Content-Length':Buffer.byteLength(b)});
  res.end(b);
}

http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  if (u.pathname === '/health')
    return J(res, 200, { status:'ok', service:'nodejs', uptime_ms: Date.now()-START });
  if (u.pathname === '/api/version')
    return J(res, 200, { service:'omniforge-node', version:'1.0.0' });
  if (u.pathname === '/api/random') {
    const n = Math.max(1, Math.min(1000, Number(u.query.n) || 10));
    return J(res, 200, { values: Array.from({length:n}, () => Math.random()) });
  }
  if (u.pathname === '/api/sha' && req.method === 'POST') {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => {
      let d = {}; try { d = JSON.parse(b); } catch(e){}
      const h = crypto.createHash('sha256').update(String(d.text||'')).digest('hex');
      J(res, 200, { hash: h });
    });
    return;
  }
  J(res, 404, { error: 'not found' });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`OmniForge Node → http://127.0.0.1:${PORT}`);
});
