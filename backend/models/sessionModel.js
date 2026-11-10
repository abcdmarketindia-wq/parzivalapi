const { db } = require('./db');
const userModel = require('./userModel');

const sessions = () => db.collection('sessions');

async function create(tokenHash, userId, expiresAt) {
  await sessions().insertOne({ _id: tokenHash, user_id: userId, expires_at: expiresAt });
}

async function findUser(tokenHash) {
  const session = await sessions().findOne({ _id: tokenHash, expires_at: { $gt: Date.now() } });
  if (!session) return null;
  const user = await userModel.findById(session.user_id);
  return user ? { ...user, token_hash: tokenHash } : null;
}

async function remove(tokenHash) {
  await sessions().deleteOne({ _id: tokenHash });
}

async function removeForUser(userId) {
  await sessions().deleteMany({ user_id: userId });
}

module.exports = { create, findUser, remove, removeForUser };
