const limitModel = require('../models/limitModel');
const usageModel = require('../models/usageModel');
const apiKeyModel = require('../models/apiKeyModel');
const { defaultProviderOf, isValidProvider, providerOptions } = require('../config/catalog');

// The provider serving this user on each API with a choice, e.g. { vehicle: 'kundan' }.
const resolvedProviders = (user) =>
  Object.fromEntries(
    Object.keys(providerOptions()).map((api) => {
      const chosen = user.providers?.[api];
      return [api, isValidProvider(api, chosen) ? chosen : defaultProviderOf(api)];
    }),
  );

async function getMe(req, res) {
  const { id, email, role } = req.user;
  const [limits, used, keys] = await Promise.all([
    limitModel.byApi(id),
    usageModel.chargedByApi(id),
    apiKeyModel.listActive(id),
  ]);
  // providers only picks the response example in the docs; it holds ids, not provider names.
  res.json({ email, role, limits, used, keys, providers: resolvedProviders(req.user) });
}

module.exports = { getMe, resolvedProviders };
