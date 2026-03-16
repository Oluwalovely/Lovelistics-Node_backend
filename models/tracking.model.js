const mongoose = require('mongoose');


const TrackingSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
    },

    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
    },

    speed: { type: Number, default: null },     
    heading: { type: Number, default: null },   

    recordedAt: {
        type: Date,
        default: Date.now,
    },

}, { timestamps: true });

// Indexes for fast queries
TrackingSchema.index({ order: 1, recordedAt: -1 });
TrackingSchema.index({ driver: 1, recordedAt: -1 });

const TrackingModel = mongoose.model('Tracking', TrackingSchema);

module.exports = TrackingModel;