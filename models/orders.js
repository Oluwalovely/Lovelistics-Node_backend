const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
    {
        trackingNumber: {
            type: String,
            required: true,
            unique: true,
        },

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        pickupAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
        },

        deliveryAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
        },

        packageDescription: {
            type: String,
            default: null,
        },

        weight: {
            type: Number,
            required: true,
        },

        price: {
            type: Number,
            required: true,
        },

        // ─── Package Images ───────────────────────────────────
        // Stores up to 2 Cloudinary image URLs uploaded by customer
        images: {
            type: [
                {
                    url: { type: String },       // Cloudinary secure URL
                    publicId: { type: String },  // Cloudinary public_id (for deletion)
                }
            ],
            default: [],
            validate: {
                validator: (arr) => arr.length <= 2,
                message: 'You can upload a maximum of 2 images per order',
            },
        },

        status: {
            type: String,
            enum: ['pending', 'assigned', 'picked-up', 'in-transit', 'delivered', 'confirmed', 'cancelled'],
            default: 'pending',
        },

        deliveredAt: { type: Date, default: null },
        confirmedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

const OrderModel = mongoose.model('Order', OrderSchema);

module.exports = OrderModel;