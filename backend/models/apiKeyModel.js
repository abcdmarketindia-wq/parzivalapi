const { db, nextId } = require('./db');

const keys = () => db.collection('api_keys');

const countActive = (userId) => keys().countDocuments({ user_id: userId, revoked_at: null });

async function create(userId, name, keyHash, prefix) {
  await keys().insertOne({
    _id: await nextId('api_keys'),
    user_id: userId,
    name,
    key_hash: keyHash,
    prefix,
    created_at: Date.now(),
    last_used_at: null,
    revoked_at: null,
  });
}

const listActive = (userId) =>
  keys()
    .find(
      { user_id: userId, revoked_at: null },
      { projection: { _id: 0, id: '$_id', name: 1, prefix: 1, created_at: 1, last_used_at: 1 } },
    )
    .sort({ _id: -1 })
    .toArray();

async function revoke(id, userId) {
  const { modifiedCount } = await keys().updateOne(
    { _id: id, user_id: userId, revoked_at: null },
    { $set: { revoked_at: Date.now() } },
  );
  return modifiedCount > 0;
}

const findActiveByHash = (keyHash) =>
  keys().findOne({ key_hash: keyHash, revoked_at: null }, { projection: { _id: 0, id: '$_id', user_id: 1 } });

async function touch(id) {
  await keys().updateOne({ _id: id }, { $set: { last_used_at: Date.now() } });
}

module.exports = { countActive, create, listActive, revoke, findActiveByHash, touch };
