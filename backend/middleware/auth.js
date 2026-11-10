const sessionModel = require('../models/sessionModel');
const { sha256 } = require('../utils/security');
const { fail } = require('../utils/response');

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

async function requireUser(req, res, next) {
  const token = readCookie(req, 'sid');
  const user = token ? await sessionModel.findUser(sha256(token)) : null;
  if (!user) return fail(res, 401, 'Please log in.');
  req.user = user;
  next();
}

// Use after requireUser.
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return fail(res, 403, 'Admin access required.');
  next();
}

module.exports = { requireUser, requireAdmin };
