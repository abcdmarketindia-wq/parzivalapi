const userModel = require('../models/userModel');
const sessionModel = require('../models/sessionModel');
const { sha256, randomHex, verifyPassword, dummyHash } = require('../utils/security');
const { isRateLimited } = require('../utils/rateLimit');
const { fail } = require('../utils/response');

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

async function startSession(res, userId) {
  const token = randomHex(32);
  await sessionModel.create(sha256(token), userId, Date.now() + SESSION_MS);
  res.cookie('sid', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MS,
    path: '/',
  });
}

function parseCredentials(body) {
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  return { email, password };
}

async function login(req, res) {
  if (isRateLimited(`auth:${req.ip}`, 15)) return fail(res, 429, 'Too many attempts. Try again in a minute.');
  const { email, password } = parseCredentials(req.body);
  const user = await userModel.findByEmail(email);
  const valid = await verifyPassword(password.slice(0, 200), user?.password_hash ?? dummyHash);
  if (!user || !valid) return fail(res, 401, 'Incorrect user ID or password.');
  await startSession(res, user.id);
  res.json({ success: true });
}

async function logout(req, res) {
  await sessionModel.remove(req.user.token_hash);
  res.clearCookie('sid', { path: '/' });
  res.json({ success: true });
}

module.exports = { login, logout };
