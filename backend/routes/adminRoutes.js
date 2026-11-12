const { Router } = require('express');
const {
  getProviderUsage,
  refreshProviderUsage,
  listUsers,
  createUser,
  listSales,
  createSale,
  setUserProvider,
  listUserKeys,
  createUserKey,
  revokeUserKey,
} = require('../controllers/adminController');
const { getStats } = require('../controllers/statsController');
const { requireUser, requireAdmin } = require('../middleware/auth');

const router = Router();

router.use(requireUser, requireAdmin);
router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id/provider', setUserProvider);
router.get('/users/:id/keys', listUserKeys);
router.post('/users/:id/keys', createUserKey);
router.delete('/users/:id/keys/:keyId', revokeUserKey);
router.get('/sales', listSales);
router.post('/sales', createSale);
router.get('/stats', getStats);
router.get('/provider-usage', getProviderUsage);
router.post('/provider-usage/:api/refresh', refreshProviderUsage);

module.exports = router;
