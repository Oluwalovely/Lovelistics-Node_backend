const NotificationModel = require('../models/notification.model');


const getMyNotifications = async (req, res) => {
    try {
        const filter = { recipient: req.user._id };

        
        if (req.query.unread === 'true') {
            filter.isRead = false;
        }

        const notifications = await NotificationModel
            .find(filter)
            .sort({ createdAt: -1 })
            .populate('order', 'trackingNumber status');

        
        const unreadCount = await NotificationModel.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        return res.status(200).json({
            success: true,
            message: 'Notifications retrieved successfully',
            unreadCount,
            count: notifications.length,
            data: notifications
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error retrieving notifications',
            error: error.message
        });
    }
};


const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await NotificationModel.findById(notificationId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        
        if (notification.recipient.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied.'
            });
        }

        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        return res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: notification
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error marking notification as read',
            error: error.message
        });
    }
};


const markAllAsRead = async (req, res) => {
    try {
        await NotificationModel.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        return res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error marking notifications as read',
            error: error.message
        });
    }
};


module.exports = {
    getMyNotifications,
    markAsRead,
    markAllAsRead
};