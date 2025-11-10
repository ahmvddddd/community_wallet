// controllers/auth/auth.js (1/5)
const pool = require('../../db/db');
const argon2 = require('argon2');
const { signAccess } = require('./tokens');
const { newRawRefresh, hashRefresh } = require('./refreshLib');

const audit = async (client, userId, event, req) => {
  await client.query(
    'INSERT INTO user_activity_log(user_id,event,ip_address,device_info) VALUES($1,$2,$3,$4)',
    [userId, event, req.ip, req.get('User-Agent')]);
};

// REGISTER
exports.register = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const exists = await client.query('SELECT 1 FROM "user" WHERE LOWER(email)=LOWER($1)', [email]);

    if (exists.rowCount) {
      return res.status(409).json({ error: 'Account already exists – please log in' });
    }
    if (!/^(?=.*\d).{8,}$/.test(password)) {
      return res.status(400).json({ error: 'Weak password' });
    }

    const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const ins = await client.query(
      'INSERT INTO "user"(email,password_hash,name) VALUES($1,$2,$3) RETURNING id,email,name',
      [email, hash, name]);

    await audit(client, ins.rows[0].id, 'REGISTER', req);

    return res.status(201).json({ user: ins.rows[0] });

  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

// LOGIN
exports.login = async (req, res) => {

  const client = await pool.connect();

  try {

    const { email, password } = req.body;

    const r = await client.query('SELECT id,password_hash FROM "user" WHERE LOWER(email)=LOWER($1)', [email]);

    if (!r.rowCount) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const u = r.rows[0];
    const ok = await argon2.verify(u.password_hash, password);

    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = signAccess({ sub: u.id });
    const raw = newRawRefresh();
    const hash = hashRefresh(raw);
    const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await client.query('INSERT INTO refresh_tokens(user_id,token_hash,device_info,ip_address,expires_at) VALUES($1,$2,$3,$4,$5)',
      [u.id, hash, req.get('User-Agent') || null, req.ip || null, exp]);

    res.cookie('refresh_token', raw, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/v1/auth/refresh', maxAge: 30 * 24 * 60 * 60 * 1000 });
    await audit(client, u.id, 'LOGIN', req);

    return res.json({ accessToken, user: { id: u.id, email } });

  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

// REFRESH
exports.refresh = async (req, res) => {
  const raw = req.cookies?.refresh_token || req.body?.refreshToken;

  if (!raw) {
    return res.status(401).json({ error: 'No token' });
  }

  const client = await pool.connect();

  try {
    const h = hashRefresh(raw);
    const r = await client.query('SELECT id,user_id,revoked,expires_at FROM refresh_tokens WHERE token_hash=$1', [h]);

    if (!r.rowCount) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const t = r.rows[0];

    if (t.revoked || new Date(t.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Token expired' });
    }

    await client.query('BEGIN');
    const newRaw = newRawRefresh();
    const newHash = hashRefresh(newRaw);
    const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const ins = await client.query('INSERT INTO refresh_tokens(user_id,token_hash,device_info,ip_address,expires_at) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [t.user_id, newHash, req.get('User-Agent') || null, req.ip || null, exp]);

    await client.query('UPDATE refresh_tokens SET revoked=true,replaced_by=$1 WHERE id=$2', [ins.rows[0].id, t.id]);
    await client.query('COMMIT');
    const accessToken = signAccess({ sub: t.user_id });
    res.cookie('refresh_token', newRaw, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/v1/auth/refresh', maxAge: 30 * 24 * 60 * 60 * 1000 });
    await audit(client, t.user_id, 'REFRESH', req);

    return res.json({ accessToken });

  } catch (e) {
    await client.query('ROLLBACK').catch(() => { });
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

// LOGOUT + LOGOUT ALL
exports.logout = async (req, res) => {

  const raw = req.cookies?.refresh_token || req.body?.refreshToken;

  if (!raw) {
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' }); return res.json({ ok: true });
  }

  const client = await pool.connect();
  try {

    await client.query('UPDATE refresh_tokens SET revoked=true WHERE token_hash=$1', [require('./refreshLib').hashRefresh(raw)]);
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });

    return res.json({ ok: true });

  } catch (e) {

    return res.status(500).json({ error: 'Server error' });

  } finally {
    client.release();
  }
};

exports.logoutAll = async (req, res) => {

  const client = await pool.connect();
  try {

    await client.query('UPDATE refresh_tokens SET revoked=true WHERE user_id=$1 AND revoked=false', [req.user.id]);

    return res.json({ ok: true });

  } catch (e) {

    return res.status(500).json({ error: 'Server error' });

  } finally {
    client.release();
  }
};