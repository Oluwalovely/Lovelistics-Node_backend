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
router.post('/orders', protect, restrictTo('customer'), upload.array('images', 2), createOrder);
router.get('/customers/:customerId/orders', protect, restrictTo('admin', 'customer'), getOrdersByCustomer);
router.patch('/orders/:orderId/confirm', protect, restrictTo('customer'), confirmDelivery);
router.patch('/orders/:orderId/cancel', protect, restrictTo('admin', 'customer'), cancelOrder);


router.get('/orders', protect, restrictTo('admin'), getAllOrders);
router.patch('/orders/:orderId/assign-driver', protect, restrictTo('admin'), assignDriver);


router.get('/drivers/:driverId/orders', protect, restrictTo('admin', 'driver'), getOrdersByDriver);
router.patch('/orders/:orderId/status', protect, restrictTo('driver'), updateOrderStatus);


router.get('/orders/:orderId', protect, restrictTo('admin', 'driver', 'customer'), getOrderById);
router.delete('/orders/:orderId', protect, deleteOrder);


module.exports = router;