const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
    getMyNotifications,
    markAsRead,
    markAllAsRead
} = require('../controllers/notification.controller');



router.get('/notifications', protect, getMyNotifications);


router.patch('/notifications/:notificationId/read', protect, markAsRead);

router.patch('/notifications/read-all', protect, markAllAsRead);


module.exports = router;