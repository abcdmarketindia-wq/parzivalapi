const { defaultProviderOf, providerOf, upstreamUrl } = require('../config/catalog');
const providerUsageModel = require('../models/providerUsageModel');

const DEFAULT_TIMEOUT_MS = 20_000;

// Returns the record, or null when the provider says the number is unknown.
// Throws when the provider fails or answers with nothing usable.
async function fetchRecord(id, number, providerId) {
  const provider = providerOf(id, providerId);
  const response = await fetch(upstreamUrl(id, providerId) + encodeURIComponent(number), {
    signal: AbortSignal.timeout(provider.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });
  const data = await response.json().catch(() => null);
  if (provider.isNotFound?.(data, response.status)) return null;
  if (!response.ok) throw new Error(`upstream status ${response.status}`);
  if (data === null || typeof data !== 'object' || Object.keys(data).length === 0 || data.error) {
    throw new Error('upstream returned no usable data');
  }
  // The provider reports our remaining quota with each answer. Keep it for the admin
  // dashboard; a failure to save it must never fail the customer's lookup.
  if (data._usage) {
    const usageKey = !providerId || providerId === defaultProviderOf(id) ? id : `${id}:${providerId}`;
    await providerUsageModel.record(usageKey, data._usage).catch((err) => console.error(`[${id}] quota not saved: ${err.name}`));
  }
  // Drop upstream metadata such as _usage, which exposes our provider quota.
  return Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('_')));
}

module.exports = { fetchRecord };
