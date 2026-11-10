const path = require('node:path');

// Must run before anything else is required: the models read env vars on load.
try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  console.warn('No backend/.env found; using process environment only.');
}

const app = require('./app');
const { connectDb } = require('./models/db');

const PORT = Number(process.env.PORT) || 5000;

connectDb()
  .then(() => app.listen(PORT, () => console.log(`Parzival API running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error(`Could not connect to MongoDB (${err.name}). Check that it is running and MONGODB_URI is correct.`);
    process.exit(1);
  });
