import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import mysql from 'mysql2/promise';

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '3306',
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  API_TOKEN,
  PORT = '8787',
  ALLOWED_ORIGINS = '',
} = process.env;

if (!API_TOKEN) throw new Error('API_TOKEN is required');
if (!DB_USER || !DB_NAME) throw new Error('DB_USER and DB_NAME are required');

const origins = ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);

const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  connectionLimit: 5,
  namedPlaceholders: true,
});

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && origins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
}

function authed(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(token);
  const b = Buffer.from(API_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 5_000_000) reject(new Error('payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') return send(res, 204);
  if (req.url === '/health') return send(res, 200, { ok: true });

  if (!authed(req)) return send(res, 401, { error: 'unauthorized' });

  try {
    if (req.url === '/answers' && req.method === 'GET') {
      const [rows] = await pool.query(
        'SELECT id, question_id, picked_index, correct, ts FROM answers',
      );
      return send(res, 200, rows);
    }

    if (req.url === '/answers' && req.method === 'POST') {
      const body = await readJson(req);
      if (!Array.isArray(body)) return send(res, 400, { error: 'expected an array' });
      if (body.length) {
        const values = body.map((r) => [
          r.id,
          r.question_id,
          r.picked_index ?? null,
          r.correct ? 1 : 0,
          r.ts,
        ]);
        await pool.query(
          `INSERT INTO answers (id, question_id, picked_index, correct, ts) VALUES ?
           ON DUPLICATE KEY UPDATE picked_index = VALUES(picked_index), correct = VALUES(correct)`,
          [values],
        );
      }
      return send(res, 200, { inserted: body.length });
    }

    if (req.url === '/answers' && req.method === 'DELETE') {
      await pool.query('DELETE FROM answers');
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'not found' });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'server error' });
  }
});

server.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`lpic-sync listening on 127.0.0.1:${PORT}`);
});
