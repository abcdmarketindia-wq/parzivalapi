const { Router } = require('express');
const { getCatalog } = require('../controllers/catalogController');
const { getMe } = require('../controllers/dashboardController');
const { requireUser } = require('../middleware/auth');

const router = Router();

router.get('/catalog', getCatalog);
router.get('/me', requireUser, getMe);
router.use('/auth', require('./authRoutes'));
router.use('/keys', require('./apiKeyRoutes'));
router.use('/admin', require('./adminRoutes'));

module.exports = router;
