const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    type: {
        type: String,
        required: true,
        enum: [
            'ORDER_PLACED',        // → Admin:    new order came in
            'DRIVER_ASSIGNED',     // → Customer: a driver was assigned
            'ORDER_PICKED_UP',     // → Customer: driver picked up the package
            'ORDER_IN_TRANSIT',    // → Customer: driver is on the way
            'ORDER_DELIVERED',     // → Customer: order has been delivered
            'ORDER_CONFIRMED',     // → Admin + Driver: customer confirmed
            'ORDER_CANCELLED',     // → All parties: order was cancelled
        ]
    },
    
    title: {
        type: String,
        required: true,
    },

    message: {
        type: String,
        required: true,
    },

    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
    },

    
    isRead: {
        type: Boolean,
        default: false,
    },

    readAt: {
        type: Date,
        default: null,
    },

}, { timestamps: true });


NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });

const NotificationModel = mongoose.model('Notification', NotificationSchema);

module.exports = NotificationModel;