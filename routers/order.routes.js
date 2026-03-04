const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { upload } = require('../config/cloudinary');
const {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    assignDriver,
    getOrdersByCustomer,
    getOrdersByDriver,
    cancelOrder,
    confirmDelivery,
    deleteOrder,
    trackOrder
} = require('../controllers/order.controller');



router.get('/track/:trackingNumber', trackOrder);

// ─── Customer Routes ──────────────────────────────────────────

// Customer creates a new order — up to 2 images via multipart/form-data
// upload.array('images', 2) processes the images before createOrder runs
router.post('/orders', protect, restrictTo('customer'), upload.array('images', 2), createOrder);

// Customer gets their own orders
router.get('/customers/:customerId/orders', protect, restrictTo('admin', 'customer'), getOrdersByCustomer);

// Customer confirms delivery
router.patch('/orders/:orderId/confirm', protect, restrictTo('customer'), confirmDelivery);

// Customer or admin cancels an order
router.patch('/orders/:orderId/cancel', protect, restrictTo('admin', 'customer'), cancelOrder);


// ─── Admin Routes ─────────────────────────────────────────────

// Admin gets ALL orders
router.get('/orders', protect, restrictTo('admin'), getAllOrders);

// Admin assigns a driver
router.patch('/orders/:orderId/assign-driver', protect, restrictTo('admin'), assignDriver);


// ─── Driver Routes ────────────────────────────────────────────

// Driver gets their assigned orders
router.get('/drivers/:driverId/orders', protect, restrictTo('admin', 'driver'), getOrdersByDriver);

// Driver updates order status
router.patch('/orders/:orderId/status', protect, restrictTo('driver'), updateOrderStatus);


// ─── Shared Routes ────────────────────────────────────────────

// View a single order — all roles
router.get('/orders/:orderId', protect, restrictTo('admin', 'driver', 'customer'), getOrderById);

// Delete a cancelled or confirmed order — all roles
router.delete('/orders/:orderId', protect, deleteOrder);


module.exports = router;