const { publicCatalog } = require('../config/catalog');

function getCatalog(_req, res) {
  res.json({ apis: publicCatalog() });
}

module.exports = { getCatalog };
