const { Router } = require('express');
const { createKey, revokeKey } = require('../controllers/apiKeyController');
const { requireUser } = require('../middleware/auth');

const router = Router();

router.post('/', requireUser, createKey);
router.delete('/:id', requireUser, revokeKey);

module.exports = router;
