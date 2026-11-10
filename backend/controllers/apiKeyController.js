const apiKeyModel = require('../models/apiKeyModel');
const { sha256, randomHex } = require('../utils/security');
const { fail } = require('../utils/response');

const MAX_ACTIVE_KEYS = 10;
const TOO_MANY_KEYS = `A user can have at most ${MAX_ACTIVE_KEYS} active keys. Revoke one first.`;

// Creates a key for userId and returns it in full, or null if they're at the limit.
// Only the hash is stored, so this is the only time the full key exists.
async function issueKey(userId, rawName) {
  const name = String(rawName ?? '').trim().slice(0, 40) || 'Default';
  if ((await apiKeyModel.countActive(userId)) >= MAX_ACTIVE_KEYS) return null;
  const key = `pz_live_${randomHex(24)}`;
  await apiKeyModel.create(userId, name, sha256(key), key.slice(0, 14));
  return key;
}

async function createKey(req, res) {
  const key = await issueKey(req.user.id, req.body?.name);
  if (!key) return fail(res, 400, TOO_MANY_KEYS);
  res.status(201).json({ success: true, key });
}

async function revokeKey(req, res) {
  if (!(await apiKeyModel.revoke(Number(req.params.id), req.user.id))) return fail(res, 404, 'Key not found.');
  res.json({ success: true });
}

module.exports = { createKey, revokeKey, issueKey, TOO_MANY_KEYS };
