const TrackingModel = require('../models/tracking.model');
const OrderModel = require('../models/orders');
const UserModel = require('../models/user.model');


// ═══════════════════════════════════════════════════════════════
//  UPDATE LOCATION
//  Driver only (enforced in routes).
//  Called every 5-10 seconds by the driver's app while on delivery.
//  Each call saves a new location snapshot AND updates the driver's
//  currentLocation on their User document so it's always fresh.
// ═══════════════════════════════════════════════════════════════
const updateLocation = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { lat, lng, speed, heading } = req.body;
        const driverId = req.user._id;

        // ─── Validate coordinates ──────────────────────────────
        if (lat === undefined || lng === undefined) {
            return res.status(400).json({
                success: false,
                message: 'lat and lng are required'
            });
        }

        // ─── Make sure order exists and is assigned to this driver
        const order = await OrderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.driver.toString() !== driverId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. This order is not assigned to you.'
            });
        }

        // ─── Only track active orders ──────────────────────────
        const activeStatuses = ['picked-up', 'in-transit'];
        if (!activeStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Tracking only active for picked-up or in-transit orders. Current status: ${order.status}`
            });
        }

        // ─── Save location snapshot to Tracking ───────────────
        const tracking = await TrackingModel.create({
            order: orderId,
            driver: driverId,
            location: { lat, lng },
            speed: speed || null,
            heading: heading || null,
            recordedAt: new Date(),
        });

        // ─── Also update driver's currentLocation on User ─────
        // This means we can always get the latest position in one
        // query without scanning the whole Tracking collection
        await UserModel.findByIdAndUpdate(driverId, {
            currentLocation: { lat, lng }
        });

        return res.status(200).json({
            success: true,
            message: 'Location updated',
            data: tracking
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error updating location',
            error: error.message
        });
    }
};


// ═══════════════════════════════════════════════════════════════
//  GET LATEST LOCATION
//  Customer and admin (enforced in routes).
//  Returns only the most recent location ping for an order.
//  This is what the frontend polls every 5 seconds to move the
//  driver marker on the map.
// ═══════════════════════════════════════════════════════════════
const getLatestLocation = async (req, res) => {
    try {
        const { orderId } = req.params;

        // ─── Ownership check for customer ──────────────────────
        if (req.user.role === 'customer') {
            const order = await OrderModel.findById(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            if (order.customer.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This is not your order.'
                });
            }
        }

        // ─── Get the most recent ping ──────────────────────────
        const latest = await TrackingModel
            .findOne({ order: orderId })
            .sort({ recordedAt: -1 })
            .select('location speed heading recordedAt');

        if (!latest) {
            return res.status(404).json({
                success: false,
                message: 'No tracking data found for this order yet'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Latest location retrieved',
            data: latest
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error retrieving location',
            error: error.message
        });
    }
};


// ═══════════════════════════════════════════════════════════════
//  GET LOCATION HISTORY
//  Admin only (enforced in routes).
//  Returns the full breadcrumb trail for an order.
//  Useful for reviewing a completed delivery path.
// ═══════════════════════════════════════════════════════════════
const getLocationHistory = async (req, res) => {
    try {
        const { orderId } = req.params;

        const history = await TrackingModel
            .find({ order: orderId })
            .sort({ recordedAt: 1 }) // oldest first — draws the path in order
            .select('location speed heading recordedAt');

        return res.status(200).json({
            success: true,
            message: 'Location history retrieved',
            count: history.length,
            data: history
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error retrieving location history',
            error: error.message
        });
    }
};


module.exports = {
    updateLocation,
    getLatestLocation,
    getLocationHistory
};