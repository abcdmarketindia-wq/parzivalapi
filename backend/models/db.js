const { MongoClient } = require('mongodb');

// The database name is the part of the URI after the host, e.g. .../api
const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/api', {
  serverSelectionTimeoutMS: 5000,
});
const db = client.db(process.env.MONGODB_DB || undefined);

async function connectDb() {
  await client.connect();
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('api_keys').createIndex({ key_hash: 1 }, { unique: true }),
    db.collection('api_keys').createIndex({ user_id: 1 }),
    db.collection('limits').createIndex({ user_id: 1, api: 1 }, { unique: true }),
    db.collection('usage_log').createIndex({ user_id: 1, charged: 1 }),
    db.collection('usage_log').createIndex({ charged: 1, created_at: 1 }),
    db.collection('sales').createIndex({ created_at: 1 }),
  ]);
}

const closeDb = () => client.close();

// Numeric ids keep URLs and API responses the same as before the move to MongoDB.
async function nextId(name) {
  const counter = await db
    .collection('counters')
    .findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return counter.seq;
}

const isUniqueViolation = (err) => err.code === 11000;

module.exports = { db, connectDb, closeDb, nextId, isUniqueViolation };
