const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
//  TRACKING SCHEMA
//  Every few seconds while a driver is on a delivery, their app
//  sends their GPS coordinates. Each ping creates one document here.
//  Together they form the breadcrumb trail shown on the live map.
// ═══════════════════════════════════════════════════════════════

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

    // ─── Live Location ────────────────────────────────────────
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
    },

    // ─── Optional Movement Data ───────────────────────────────
    speed: { type: Number, default: null },     // km/h
    heading: { type: Number, default: null },   // degrees 0-360

    // ─── When the device recorded this location ───────────────
    recordedAt: {
        type: Date,
        default: Date.now,
    },

}, { timestamps: true });

// ─── Indexes for fast queries ─────────────────────────────────
TrackingSchema.index({ order: 1, recordedAt: -1 });
TrackingSchema.index({ driver: 1, recordedAt: -1 });

const TrackingModel = mongoose.model('Tracking', TrackingSchema);

module.exports = TrackingModel;