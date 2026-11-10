const { upstreamUrl } = require('../config/catalog');

const UPSTREAM_TIMEOUT_MS = 20_000;

async function fetchRecord(id, number) {
  const response = await fetch(upstreamUrl(id) + encodeURIComponent(number), {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`upstream status ${response.status}`);
  const data = await response.json();
  if (data === null || typeof data !== 'object' || Object.keys(data).length === 0 || data.error) {
    throw new Error('upstream returned no usable data');
  }
  // Drop upstream metadata such as _usage, which exposes our provider quota.
  return Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('_')));
}

module.exports = { fetchRecord };
