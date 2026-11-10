const apiKeyModel = require('../models/apiKeyModel');
const limitModel = require('../models/limitModel');
const usageModel = require('../models/usageModel');
const upstreamService = require('../services/upstreamService');
const { CATALOG, isLive } = require('../config/catalog');
const { sha256 } = require('../utils/security');
const { isRateLimited } = require('../utils/rateLimit');
const { fail } = require('../utils/response');

async function lookup(req, res) {
  const id = req.params.api;
  if (!Object.hasOwn(CATALOG, id)) return fail(res, 404, 'Unknown API.');
  const api = CATALOG[id];

  const rawKey = req.get('x-api-key');
  const key = rawKey ? await apiKeyModel.findActiveByHash(sha256(rawKey)) : null;
  if (!key) return fail(res, 401, 'Missing or invalid API key. Send it in the X-API-Key header.');
  if (isRateLimited(`v1:${key.id}`, 60)) return fail(res, 429, 'Rate limit exceeded: 60 requests per minute.');
  if (!isLive(id)) return fail(res, 503, `${api.name} is temporarily unavailable. You were not charged.`);

  const number = String(req.query.number ?? '').toUpperCase().replace(/[\s-]/g, '');
  if (!api.pattern.test(number)) return fail(res, 400, `Invalid ${api.inputLabel.toLowerCase()}.`);

  // Reserve first, then refund if nothing is delivered.
  if (!(await limitModel.consume(key.user_id, id))) {
    await usageModel.log(key, id, 402, false);
    return fail(res, 402, `No ${api.name} limits left. Contact the admin to get more calls.`);
  }
  await apiKeyModel.touch(key.id);

  let data;
  try {
    data = await upstreamService.fetchRecord(id, number);
  } catch (err) {
    await limitModel.refund(key.user_id, id);
    await usageModel.log(key, id, 502, false);
    console.error(`[${id}] upstream failure: ${err.name}`); // Never log err detail: URLs carry the provider key.
    return fail(res, 502, 'The data source is unavailable. You were not charged.');
  }

  if (api.isNotFound?.(data)) {
    await limitModel.refund(key.user_id, id);
    await usageModel.log(key, id, 404, false);
    return fail(res, 404, 'No record found for this number. You were not charged.');
  }

  await usageModel.log(key, id, 200, true);
  res.json({
    success: true,
    api: id,
    charged: api.pricePaise / 100,
    remaining: await limitModel.remaining(key.user_id, id),
    data,
  });
}

module.exports = { lookup };
