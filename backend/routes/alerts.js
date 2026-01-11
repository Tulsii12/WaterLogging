const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// GET /api/alerts - Get all active alerts
router.get('/', alertController.getActiveAlerts);

// GET /api/alerts/ward/:wardId - Get alerts for specific ward
router.get('/ward/:wardId', alertController.getAlertsByWard);

// POST /api/alerts - Create new alert
router.post('/', alertController.createAlert);

// PUT /api/alerts/:id/dismiss - Dismiss alert
router.put('/:id/dismiss', alertController.dismissAlert);

module.exports = router;
