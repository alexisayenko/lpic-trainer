import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
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
  // Hash both to fixed-width digests so the compare can't leak token length via timing.
  const a = createHash('sha256').update(token).digest();
  const b = createHash('sha256').update(API_TOKEN).digest();
  return timingSafeEqual(a, b);
}

// Lengths match the schema columns (id CHAR(36), question_id VARCHAR(64)) so
// nothing is silently truncated; picked_index stays within MySQL INT range.
function validRow(r) {
  return (
    r &&
    typeof r.id === 'string' && r.id.length >= 1 && r.id.length <= 36 &&
    typeof r.question_id === 'string' && r.question_id.length >= 1 && r.question_id.length <= 64 &&
    typeof r.correct === 'boolean' &&
    (r.picked_index == null ||
      (Number.isInteger(r.picked_index) && r.picked_index >= 0 && r.picked_index <= 2147483647)) &&
    // ts is a client clock; reject 0/negative and anything beyond a day of skew
    // so a runaway timestamp can't permanently win the upsert's ts guard.
    Number.isInteger(r.ts) && r.ts > 0 && r.ts <= Date.now() + 86_400_000
  );
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(body === undefined ? '' : JSON.stringify(body));
}

const MAX_BODY = 2_000_000; // bytes; a 5000-row answer batch is well under this

function readJson(req) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > MAX_BODY) {
      reject(new Error('payload too large'));
      return;
    }
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const data = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

async function getAnswers(res) {
  const [rows] = await pool.query(
    'SELECT id, question_id, picked_index, correct, ts FROM answers',
  );
  return send(res, 200, rows);
}

async function postAnswers(req, res) {
  const body = await readJson(req);
  if (!Array.isArray(body)) return send(res, 400, { error: 'expected an array' });
  if (body.length > 5000) return send(res, 413, { error: 'too many records' });
  if (!body.every(validRow)) return send(res, 400, { error: 'invalid record' });
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
       ON DUPLICATE KEY UPDATE
         picked_index = IF(VALUES(ts) > ts, VALUES(picked_index), picked_index),
         correct = IF(VALUES(ts) > ts, VALUES(correct), correct),
         ts = IF(VALUES(ts) > ts, VALUES(ts), ts)`,
      [values],
    );
  }
  return send(res, 200, { inserted: body.length });
}

async function deleteAnswers(res) {
  await pool.query('DELETE FROM answers');
  return send(res, 200, { ok: true });
}

const server = http.createServer(async (req, res) => {
  applyCors(req, res);

  const path = (req.url || '').split('?')[0];

  if (req.method === 'OPTIONS') return send(res, 204);
  if (path === '/health') return send(res, 200, { ok: true });

  if (!authed(req)) return send(res, 401, { error: 'unauthorized' });

  try {
    if (path === '/answers' && req.method === 'GET') return await getAnswers(res);
    if (path === '/answers' && req.method === 'POST') return await postAnswers(req, res);
    if (path === '/answers' && req.method === 'DELETE') return await deleteAnswers(res);
    return send(res, 404, { error: 'not found' });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'server error' });
  }
});

// mysql2 can emit pool errors (e.g. the server going away) outside any request
// scope; log them instead of letting an unhandled rejection kill the process.
pool.on('error', (err) => console.error('mysql pool error:', err));
process.on('unhandledRejection', (err) => console.error('unhandledRejection:', err));

server.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`lpic-sync listening on 127.0.0.1:${PORT}`);
});
