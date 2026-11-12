// Single source of truth for products and prices. Prices are integer paise.
const VEHICLE_NUMBER = /^([A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/;
const DL_NUMBER = /^[A-Z]{2}[0-9]{2}[0-9A-Z]{9,14}$/;

const CATALOG = {
  vehicle: {
    name: 'Vehicle Info',
    description: 'Registration details for an Indian vehicle number.',
    pricePaise: 250,
    inputLabel: 'Vehicle number',
    example: 'MH12AB1234',
    pattern: VEHICLE_NUMBER,
    // The admin picks which provider answers each user's vehicle lookups. Each one
    // returns its own field names, which are passed to the customer as they are.
    defaultProvider: 'api1',
    providers: {
      api1: {
        name: 'Vehicle API 1',
        envUrl: 'VEHICLE_INFO_API1_URL',
        // Answers HTTP 200 with this marker when a plate is unknown.
        isNotFound: (data) => /not\s*found/i.test(String(data?.REGN_NO ?? '')),
      },
      kundan: {
        name: 'Kundan (Telegram)',
        envUrl: 'VEHICLE_KUNDAN_API_URL',
        // Tries several sources in turn: ~10s for a hit, ~26s before it reports a miss.
        timeoutMs: 45_000,
        // Answers HTTP 404 with { "status": "Failed" } when a plate is unknown.
        isNotFound: (data, status) => status === 404 || data?.status === 'Failed',
      },
    },
  },
  dl: {
    name: 'DL Verification',
    description: 'Verify a driving licence number.',
    pricePaise: 100,
    envUrl: 'DL_API_URL',
    inputLabel: 'Driving licence number',
    example: 'MH1220110012345',
    pattern: DL_NUMBER,
  },
  challan: {
    name: 'Challan',
    description: 'Traffic challans issued against a vehicle.',
    pricePaise: 100,
    envUrl: 'CHALLAN_API_URL',
    inputLabel: 'Vehicle number',
    example: 'MH12AB1234',
    pattern: VEHICLE_NUMBER,
  },
  fastag: {
    name: 'FASTag',
    description: 'FASTag status for a vehicle.',
    pricePaise: 100, // Placeholder: no price was specified for FASTag.
    envUrl: 'FASTAG_API_URL',
    inputLabel: 'Vehicle number',
    example: 'MH12AB1234',
    pattern: VEHICLE_NUMBER,
  },
  hsrp: {
    name: 'HSRP',
    description: 'High Security Registration Plate details.',
    pricePaise: 2000,
    envUrl: 'HSRP_API_URL',
    inputLabel: 'Vehicle number',
    example: 'MH12AB1234',
    pattern: VEHICLE_NUMBER,
  },
};

// Every API has at least one provider. Single-provider APIs use their own envUrl.
const providersOf = (id) => {
  const api = CATALOG[id];
  return api.providers ?? { default: { name: api.name, envUrl: api.envUrl, isNotFound: api.isNotFound } };
};
const defaultProviderOf = (id) => CATALOG[id].defaultProvider ?? 'default';
const isValidProvider = (id, providerId) => Object.hasOwn(providersOf(id), providerId);

// The provider config, falling back to the API's default when providerId is unknown or unset.
const providerOf = (id, providerId) => {
  const providers = providersOf(id);
  return providers[Object.hasOwn(providers, providerId) ? providerId : defaultProviderOf(id)];
};

const upstreamUrl = (id, providerId) => process.env[providerOf(id, providerId).envUrl] || '';

// With a provider: whether that provider is set up. Without: whether any provider is.
const isLive = (id, providerId) =>
  providerId === undefined
    ? Object.values(providersOf(id)).some((p) => Boolean(process.env[p.envUrl]))
    : Boolean(upstreamUrl(id, providerId));

// Admin-only view of the APIs that have a choice of provider, e.g. { vehicle: [{ id, name, live }] }.
const providerOptions = () =>
  Object.fromEntries(
    Object.keys(CATALOG)
      .filter((id) => CATALOG[id].providers)
      .map((id) => [
        id,
        Object.entries(CATALOG[id].providers).map(([pid, p]) => ({ id: pid, name: p.name, live: isLive(id, pid) })),
      ]),
  );

const publicCatalog = () =>
  Object.entries(CATALOG).map(([id, api]) => ({
    id,
    name: api.name,
    description: api.description,
    price: api.pricePaise / 100,
    inputLabel: api.inputLabel,
    example: api.example,
    live: isLive(id),
  }));

module.exports = {
  CATALOG,
  defaultProviderOf,
  isValidProvider,
  providerOf,
  upstreamUrl,
  isLive,
  providerOptions,
  publicCatalog,
};
