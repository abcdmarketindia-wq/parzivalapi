// Usage: npm run migrate-sqlite
// One-time copy of backend/data/parzival.db into MongoDB. The SQLite file is only read.
// Refuses to run if MongoDB already has users, so it can't duplicate or overwrite data.
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  // Fall back to the process environment.
}

const { db, connectDb, closeDb } = require('../models/db');

const idRow = ({ id, ...rest }) => ({ _id: id, ...rest });

// Tables whose integer id carries over, so references between records stay valid.
const COLLECTIONS = {
  users: idRow,
  sessions: ({ token_hash, ...rest }) => ({ _id: token_hash, ...rest }),
  api_keys: idRow,
  limits: (row) => row,
  orders: idRow,
  usage_log: ({ id, charged, ...rest }) => ({ ...rest, charged: Boolean(charged) }),
};
const COUNTERS = ['users', 'api_keys', 'orders'];

async function main() {
  const file = path.resolve(process.argv[2] ?? path.join(__dirname, '..', 'data', 'parzival.db'));
  if (!fs.existsSync(file)) throw new Error(`SQLite file not found: ${file}`);
  const sqlite = new DatabaseSync(file, { readOnly: true });

  await connectDb();
  if (await db.collection('users').countDocuments({}, { limit: 1 })) {
    throw new Error('MongoDB already has users. Nothing was copied.');
  }

  for (const [name, convert] of Object.entries(COLLECTIONS)) {
    const rows = sqlite.prepare(`SELECT * FROM ${name}`).all().map((row) => convert({ ...row }));
    if (rows.length) await db.collection(name).insertMany(rows);
    console.log(`${name}: ${rows.length}`);
  }

  // New records must continue after the highest copied id.
  for (const name of COUNTERS) {
    const { seq } = sqlite.prepare(`SELECT COALESCE(MAX(id), 0) AS seq FROM ${name}`).get();
    await db.collection('counters').updateOne({ _id: name }, { $set: { seq } }, { upsert: true });
  }
  sqlite.close();
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(closeDb);
