const { db } = require('./db');

const usage = () => db.collection('usage_log');

// Deliberately does not store the looked-up number: it identifies a person.
async function log(key, api, status, charged) {
  await usage().insertOne({
    user_id: key.user_id,
    api_key_id: key.id,
    api,
    status,
    charged: Boolean(charged),
    created_at: Date.now(),
  });
}

async function chargedByApi(userId) {
  const rows = await usage()
    .aggregate([{ $match: { user_id: userId, charged: true } }, { $group: { _id: '$api', calls: { $sum: 1 } } }])
    .toArray();
  return Object.fromEntries(rows.map((r) => [r._id, r.calls]));
}

module.exports = { log, chargedByApi };
