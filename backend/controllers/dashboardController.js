const limitModel = require('../models/limitModel');
const usageModel = require('../models/usageModel');
const apiKeyModel = require('../models/apiKeyModel');

async function getMe(req, res) {
  const { id, email, role } = req.user;
  const [limits, used, keys] = await Promise.all([
    limitModel.byApi(id),
    usageModel.chargedByApi(id),
    apiKeyModel.listActive(id),
  ]);
  res.json({ email, role, limits, used, keys });
}

module.exports = { getMe };
