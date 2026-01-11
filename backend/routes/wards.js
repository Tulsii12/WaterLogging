const express = require('express');
const router = express.Router();
const wardController = require('../controllers/wardController');

// GET /api/wards - Get all wards
router.get('/', wardController.getAllWards);

// GET /api/wards/high-risk - Get high-risk wards
router.get('/high-risk', wardController.getHighRiskWards);

// GET /api/wards/:id - Get specific ward
router.get('/:id', wardController.getWardById);

// PUT /api/wards/:id - Update ward (admin)
router.put('/:id', wardController.updateWardStatus);

module.exports = router;
