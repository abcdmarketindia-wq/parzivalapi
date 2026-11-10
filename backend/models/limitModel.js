const { db } = require('./db');

const limits = () => db.collection('limits');

async function byApi(userId) {
  const rows = await limits().find({ user_id: userId }).toArray();
  return Object.fromEntries(rows.map((r) => [r.api, r.remaining]));
}

async function add(userId, api, quantity) {
  await limits().updateOne({ user_id: userId, api }, { $inc: { remaining: quantity } }, { upsert: true });
}

// A single conditional update, so concurrent requests can't spend the same limit.
async function consume(userId, api) {
  const { modifiedCount } = await limits().updateOne(
    { user_id: userId, api, remaining: { $gt: 0 } },
    { $inc: { remaining: -1 } },
  );
  return modifiedCount > 0;
}

async function refund(userId, api) {
  await limits().updateOne({ user_id: userId, api }, { $inc: { remaining: 1 } });
}

const remaining = async (userId, api) => (await limits().findOne({ user_id: userId, api })).remaining;

module.exports = { byApi, add, consume, refund, remaining };
