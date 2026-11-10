// Lets the site call /api from another origin. /v1 is meant for servers, so it stays out of this.
function cors(req, res, next) {
  const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const { origin } = req.headers;
  res.vary('Origin');
  if (origin && allowedOrigins.includes(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

module.exports = cors;
