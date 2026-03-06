const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const {
    updateLocation,
    getLatestLocation,
    getLocationHistory
} = require('../controllers/tracking.controller');



router.post('/orders/:orderId/tracking', protect, restrictTo('driver'), updateLocation);


router.get('/orders/:orderId/tracking/latest', protect, restrictTo('customer', 'admin'), getLatestLocation);


router.get('/orders/:orderId/tracking/history', protect, restrictTo('admin'), getLocationHistory);


module.exports = router;