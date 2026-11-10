const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const randomHex = (bytes) => crypto.randomBytes(bytes).toString('hex');

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const derived = await scrypt(password, Buffer.from(salt, 'hex'), 64);
  return crypto.timingSafeEqual(derived, Buffer.from(hash, 'hex'));
}

// Compared against for unknown emails so response time doesn't reveal which accounts exist.
const dummyHash = `${'00'.repeat(16)}:${crypto.scryptSync('x', Buffer.alloc(16), 64).toString('hex')}`;

module.exports = { sha256, randomHex, hashPassword, verifyPassword, dummyHash };
