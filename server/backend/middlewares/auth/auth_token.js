const { verifyAccessToken } = require('../../controllers/auth/tokens');

function ensureAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing auth' });
  const parts = header.split(' ');
  if (parts[0] !== 'Bearer' || !parts[1]) return res.status(401).json({ error: 'Bad auth header' });

  try {
    const payload = verifyAccessToken(parts[1]);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { ensureAuth };
