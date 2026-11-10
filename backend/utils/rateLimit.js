const hits = new Map();

function isRateLimited(key, max, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
}, 60_000).unref();

module.exports = { isRateLimited };
