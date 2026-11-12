const { db, nextId } = require('./db');

const users = () => db.collection('users');

async function create(email, passwordHash, role = 'user') {
  const id = await nextId('users');
  await users().insertOne({ _id: id, email, password_hash: passwordHash, role, created_at: Date.now() });
  return id;
}

const findByEmail = (email) =>
  users().findOne({ email }, { projection: { _id: 0, id: '$_id', password_hash: 1, role: 1 } });

const findById = (id) =>
  users().findOne({ _id: id }, { projection: { _id: 0, id: '$_id', email: 1, role: 1, providers: 1 } });

// Which provider answers this user's lookups on an API, e.g. setProvider(7, 'vehicle', 'kundan').
async function setProvider(id, api, provider) {
  await users().updateOne({ _id: id }, { $set: { [`providers.${api}`]: provider } });
}

async function setRole(id, role) {
  await users().updateOne({ _id: id }, { $set: { role } });
}

async function setPassword(id, passwordHash) {
  await users().updateOne({ _id: id }, { $set: { password_hash: passwordHash } });
}

async function remove(id) {
  await users().deleteOne({ _id: id });
}

const exists = async (id) => (await users().countDocuments({ _id: id }, { limit: 1 })) > 0;

const listAll = () =>
  users()
    .find({}, { projection: { _id: 0, id: '$_id', email: 1, role: 1, providers: 1, created_at: 1 } })
    .sort({ _id: -1 })
    .toArray();

module.exports = { create, findByEmail, findById, setProvider, setRole, setPassword, remove, exists, listAll };
