const pool = require('../../db/db');
const {
  findUserByEmail,
  createUser,
  getUserLoginData,
  verifyPassword,
  audit
} = require('../../models/auth/authModel');

const {
  insertToken,
  revokeToken,
  findTokenByHash
} = require('../../models/auth/refreshTokenModel');
const { signAccess } = require('./tokens');
const { newRawRefresh, hashRefresh } = require('./refreshLib');


exports.register = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, password, name } = req.body;

    await client.query('BEGIN');

    const exists = await findUserByEmail(client, email);
    if (exists.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'User already exists' });
    }

    const user = await createUser(client, email, password, name);

    await audit(client, user.id, 'REGISTER', req.ip, req.headers['user-agent']);

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'User registered successfully',
      user
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};


exports.login = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, password } = req.body;

    await client.query('BEGIN');

    const user = await getUserLoginData(client, email);
    if (!user) {
      await client.query('ROLLBACK');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await verifyPassword(user.password_hash, password);
    if (!valid) {
      await client.query('ROLLBACK');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = signAccess({ sub: user.id });
    const rawRefresh = newRawRefresh();
    const refreshHash = hashRefresh(rawRefresh);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await insertToken(client, user.id, refreshHash, req.ip, req.get('User-Agent'), expiresAt);

    res.cookie('refresh_token', rawRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    await audit(client, user.id, 'LOGIN', req.ip, req.headers['user-agent']);

    await client.query('COMMIT');

    return res.status(200).json({
      accessToken,
      user: { id: user.id, email }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};


exports.refresh = async (req, res) => {
  const raw = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!raw) return res.status(401).json({ error: 'No token' });

  const client = await pool.connect();

  try {
    const h = hashRefresh(raw);


    const r = await findTokenByHash(client, h);

    if (!r.rowCount) return res.status(401).json({ error: 'Invalid token' });

    const t = r.rows[0];


    if (t.revoked || new Date(t.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Token expired' });
    }

    await client.query('BEGIN');

    const newRaw = newRawRefresh();
    const newHash = hashRefresh(newRaw);
    const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);


    const ins = await insertToken(
      client,
      t.user_id,
      newHash,
      req.ip,
      req.get('User-Agent'),
      exp
    );

    await revokeToken(client, ins.rows[0].id, t.id);

    await client.query('COMMIT');

    const accessToken = signAccess({ sub: t.user_id });

    res.cookie('refresh_token', newRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    await audit(
      client,
      t.user_id,
      'REFRESH',
      req.ip,
      req.get('User-Agent')
    );

    return res.json({ accessToken });

  } catch (e) {
    await client.query('ROLLBACK').catch(() => { });
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};


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