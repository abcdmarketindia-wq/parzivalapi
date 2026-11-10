const { Router } = require('express');
const { login, logout } = require('../controllers/authController');
const { requireUser } = require('../middleware/auth');

const router = Router();

router.post('/login', login);
router.post('/logout', requireUser, logout);

module.exports = router;
