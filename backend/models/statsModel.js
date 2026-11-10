const { db } = require('./db');

const TIME_ZONE = 'Asia/Kolkata';
const FOREVER = Number.MAX_SAFE_INTEGER;

const key = (userId, api) => `${userId}:${api}`;
const toMap = (rows) => Object.fromEntries(rows.map((r) => [key(r._id.user, r._id.api), r.n]));

// Calls each user used (charged lookups only) per API, between from and to (ms).
async function usedByUser(from, to = FOREVER) {
  const rows = await db
    .collection('usage_log')
    .aggregate([
      { $match: { charged: true, created_at: { $gte: from, $lt: to } } },
      { $group: { _id: { user: '$user_id', api: '$api' }, n: { $sum: 1 } } },
    ])
    .toArray();
  return toMap(rows);
}

// Calls each user was sold per API, between from and to (ms).
async function addedByUser(from, to = FOREVER) {
  const rows = await db
    .collection('sales')
    .aggregate([
      { $match: { created_at: { $gte: from, $lt: to } } },
      { $group: { _id: { user: '$user_id', api: '$api' }, n: { $sum: '$quantity' } } },
    ])
    .toArray();
  return toMap(rows);
}

async function currentBalances() {
  const rows = await db.collection('limits').find().toArray();
  return Object.fromEntries(rows.map((r) => [key(r.user_id, r.api), r.remaining]));
}

const dayOf = { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$created_at' }, timezone: TIME_ZONE } };

// { 'YYYY-MM-DD': { api: count } } for every day since from (ms), in India time.
async function dailyTotals(collection, match, amount, from) {
  const rows = await db
    .collection(collection)
    .aggregate([
      { $match: { ...match, created_at: { $gte: from } } },
      { $group: { _id: { day: dayOf, api: '$api' }, n: { $sum: amount } } },
    ])
    .toArray();
  const days = {};
  for (const r of rows) (days[r._id.day] ??= {})[r._id.api] = r.n;
  return days;
}

const dailyUsed = (from) => dailyTotals('usage_log', { charged: true }, 1, from);
const dailyAdded = (from) => dailyTotals('sales', {}, '$quantity', from);

module.exports = { TIME_ZONE, key, usedByUser, addedByUser, currentBalances, dailyUsed, dailyAdded };
