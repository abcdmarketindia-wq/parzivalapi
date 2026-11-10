const apiKeyModel = require('../models/apiKeyModel');
const { sha256, randomHex } = require('../utils/security');
const { fail } = require('../utils/response');

const MAX_ACTIVE_KEYS = 10;

async function createKey(req, res) {
  const name = String(req.body?.name ?? '').trim().slice(0, 40) || 'Default';
  if ((await apiKeyModel.countActive(req.user.id)) >= MAX_ACTIVE_KEYS) {
    return fail(res, 400, `You can have at most ${MAX_ACTIVE_KEYS} active keys.`);
  }
  const key = `pz_live_${randomHex(24)}`;
  await apiKeyModel.create(req.user.id, name, sha256(key), key.slice(0, 14));
  res.status(201).json({ success: true, key }); // Only time the full key is ever returned.
}

async function revokeKey(req, res) {
  if (!(await apiKeyModel.revoke(Number(req.params.id), req.user.id))) return fail(res, 404, 'Key not found.');
  res.json({ success: true });
}

module.exports = { createKey, revokeKey };
