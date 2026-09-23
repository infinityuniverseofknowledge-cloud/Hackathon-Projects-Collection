#!/usr/bin/env node
/* OmniForge Node.js — real-time service (built-ins only)
   Run: node omniforge.js
*/
const http = require('http');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8002;
const START = Date.now();

function json(res, status, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
}

const server = http.createServer((req, res) => {
    const u = url.parse(req.url, true);
    if (u.pathname === '/health')
        return json(res, 200, { status: 'ok', service: 'nodejs',
                                uptime_ms: Date.now() - START });
    if (u.pathname === '/api/version')
        return json(res, 200, { service: 'omniforge-node', version: '1.0.0' });
    if (u.pathname === '/api/random') {
        const n = Math.max(1, Math.min(1000, Number(u.query.n) || 10));
        return json(res, 200, {
            values: Array.from({ length: n }, () => Math.random())
        });
    }
    if (u.pathname === '/api/sha' && req.method === 'POST') {
        let b = '';
        req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
        req.on('end', () => {
            let data = {};
            try { data = JSON.parse(b); } catch (e) {}
            const h = crypto.createHash('sha256')
                            .update(String(data.text || ''))
                            .digest('hex');
            json(res, 200, { hash: h });
        });
        return;
    }
    json(res, 404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`OmniForge Node — http://127.0.0.1:${PORT}`);
});
