const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const {
    updateLocation,
    getLatestLocation,
    getLocationHistory
} = require('../controllers/tracking.controller');


// ─── Driver sends their location ──────────────────────────────
// Called every 5-10 seconds by the driver's app while on delivery
router.post('/orders/:orderId/tracking', protect, restrictTo('driver'), updateLocation);

// ─── Get latest driver location for an order ──────────────────
// Customer and admin poll this every 5 seconds to update the map
router.get('/orders/:orderId/tracking/latest', protect, restrictTo('customer', 'admin'), getLatestLocation);

// ─── Get full location history for an order ───────────────────
// Admin only — useful for reviewing a completed delivery path
router.get('/orders/:orderId/tracking/history', protect, restrictTo('admin'), getLocationHistory);


module.exports = router;