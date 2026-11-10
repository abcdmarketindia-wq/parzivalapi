// Single source of truth for products and prices. Prices are integer paise.
const VEHICLE_NUMBER = /^([A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/;
const DL_NUMBER = /^[A-Z]{2}[0-9]{2}[0-9A-Z]{9,14}$/;

const CATALOG = {
  vehicle: {
    name: 'Vehicle Info',
    description: 'Registration details for an Indian vehicle number.',
    pricePaise: 250,
    envUrl: 'VEHICLE_INFO_API1_URL',
    inputLabel: 'Vehicle number',
    example: 'MH12AB1234',
    pattern: VEHICLE_NUMBER,
    // The upstream answers HTTP 200 with this marker when a plate is unknown.
    isNotFound: (data) => /not\s*found/i.test(String(data?.REGN_NO ?? '')),
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

const upstreamUrl = (id) => process.env[CATALOG[id].envUrl] || '';
const isLive = (id) => Boolean(upstreamUrl(id));

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

module.exports = { CATALOG, upstreamUrl, isLive, publicCatalog };
