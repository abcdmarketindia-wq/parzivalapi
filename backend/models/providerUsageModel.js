const { db } = require('./db');

// The latest quota our upstream providers reported, one document per API.
const usage = () => db.collection('provider_usage');

// usage is the provider's _usage object, e.g. { total_limit: 10000, used: 6886, remaining: 3114 }.
async function record(api, reported) {
  const fields = ['total_limit', 'used', 'remaining'];
  if (!reported || !fields.every((f) => Number.isFinite(reported[f]))) return;
  await usage().updateOne(
    { _id: api },
    {
      $set: {
        total_limit: reported.total_limit,
        used: reported.used,
        remaining: reported.remaining,
        checked_at: Date.now(),
      },
    },
    { upsert: true },
  );
}

const list = () =>
  usage()
    .find({}, { projection: { _id: 0, api: '$_id', total_limit: 1, used: 1, remaining: 1, checked_at: 1 } })
    .toArray();

module.exports = { record, list };
