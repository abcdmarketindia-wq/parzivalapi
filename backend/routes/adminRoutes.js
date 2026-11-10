const { Router } = require('express');
const { listUsers, createUser, listSales, createSale } = require('../controllers/adminController');
const { getStats } = require('../controllers/statsController');
const { requireUser, requireAdmin } = require('../middleware/auth');

const router = Router();

router.use(requireUser, requireAdmin);
router.get('/users', listUsers);
router.post('/users', createUser);
router.get('/sales', listSales);
router.post('/sales', createSale);
router.get('/stats', getStats);

module.exports = router;
