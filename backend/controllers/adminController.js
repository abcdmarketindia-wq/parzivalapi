const userModel = require('../models/userModel');
const limitModel = require('../models/limitModel');
const usageModel = require('../models/usageModel');
const saleModel = require('../models/saleModel');
const apiKeyModel = require('../models/apiKeyModel');
const { issueKey, TOO_MANY_KEYS } = require('./apiKeyController');
const { isUniqueViolation } = require('../models/db');
const { hashPassword } = require('../utils/security');
const { fail } = require('../utils/response');
const { isValidUserId, isValidPassword } = require('../utils/validation');

const ASSIGNABLE_APIS = ['vehicle', 'hsrp'];
const MAX_LIMIT = 10_000_000;
const MAX_RATE_RUPEES = 100_000;

async function listUsers(_req, res) {
  const users = await Promise.all(
    (await userModel.listAll()).map(async (user) => ({
      ...user,
      limits: await limitModel.byApi(user.id),
      used: await usageModel.chargedByApi(user.id),
      activeKeys: await apiKeyModel.countActive(user.id),
    })),
  );
  res.json({ users });
}

// New users start with no calls. Calls are only added by recording a sale.
async function createUser(req, res) {
  const userId = String(req.body?.userId ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!isValidUserId(userId)) {
    return fail(res, 400, 'User ID must be 3 or more characters: letters, numbers, or . _ @ + -');
  }
  if (!isValidPassword(password)) return fail(res, 400, 'Password must be 6 to 200 characters.');

  const hash = await hashPassword(password);
  try {
    await userModel.create(userId, hash);
  } catch (err) {
    if (isUniqueViolation(err)) return fail(res, 409, 'That user ID is already taken.');
    throw err;
  }
  res.status(201).json({ success: true });
}

// Rupees with at most 2 decimals, returned as integer paise, or null if invalid.
function parseRate(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_RATE_RUPEES) return null;
  const paise = Math.round(value * 100);
  return Math.abs(value * 100 - paise) < 1e-6 ? paise : null;
}

async function listSales(_req, res) {
  const [sales, totals] = await Promise.all([saleModel.list(), saleModel.totals()]);
  res.json({ sales, totals });
}

async function createSale(req, res) {
  const userId = Number(req.body?.userId);
  const api = req.body?.api;
  const { quantity } = req.body ?? {};
  const buyRate = parseRate(req.body?.buyRate);
  const sellRate = parseRate(req.body?.sellRate);

  if (!ASSIGNABLE_APIS.includes(api)) return fail(res, 400, 'Choose Vehicle or HSRP.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LIMIT) {
    return fail(res, 400, `Calls must be a whole number from 1 to ${MAX_LIMIT}.`);
  }
  if (buyRate === null || sellRate === null) {
    return fail(res, 400, `Rates must be from 0 to ${MAX_RATE_RUPEES} rupees, with at most 2 decimals.`);
  }
  if (!(await userModel.exists(userId))) return fail(res, 404, 'User not found.');

  const id = await saleModel.create(userId, api, quantity, buyRate, sellRate);
  res.status(201).json({ success: true, id });
}

// Returns the user id from the URL, or sends a 404 and returns null.
async function findUserId(req, res) {
  const id = Number(req.params.id);
  if (await userModel.exists(id)) return id;
  fail(res, 404, 'User not found.');
  return null;
}

async function listUserKeys(req, res) {
  const id = await findUserId(req, res);
  if (id === null) return;
  res.json({ keys: await apiKeyModel.listActive(id) });
}

async function createUserKey(req, res) {
  const id = await findUserId(req, res);
  if (id === null) return;
  const key = await issueKey(id, req.body?.name);
  if (!key) return fail(res, 400, TOO_MANY_KEYS);
  res.status(201).json({ success: true, key });
}

async function revokeUserKey(req, res) {
  const id = await findUserId(req, res);
  if (id === null) return;
  if (!(await apiKeyModel.revoke(Number(req.params.keyId), id))) return fail(res, 404, 'Key not found.');
  res.json({ success: true });
}

module.exports = {
  listUsers,
  createUser,
  listSales,
  createSale,
  listUserKeys,
  createUserKey,
  revokeUserKey,
};
