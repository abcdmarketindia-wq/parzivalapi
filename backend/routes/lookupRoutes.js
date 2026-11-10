const { Router } = require('express');
const { lookup } = require('../controllers/lookupController');

const router = Router();

router.get('/:api', lookup);

module.exports = router;
