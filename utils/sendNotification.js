const NotificationModel = require('../models/notification.model');


const sendNotification = async ({ recipient, type, title, message, orderId }) => {
    try {
        await NotificationModel.create({
            recipient,
            type,
            title,
            message,
            order: orderId || null,
        });
    } catch (error) {
        console.error('Notification error:', error.message);
    }
};

module.exports = { sendNotification };