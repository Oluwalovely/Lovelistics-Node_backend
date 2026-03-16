const mongoose = require('mongoose');
const OrderModel = require('../models/orders');
const UserModel = require('../models/user.model');
const DriverProfile = require('../models/driverProfile.model');
const { calculatePrice } = require('../utils/calculatePrice');
const { generateTrackingNumber } = require('../utils/generateTracking');
const { sendNotification } = require('../utils/sendNotification');
const sendEmail = require('../utils/sendEmail');



const createOrder = async (req, res) => {
    try {
        const { pickupAddress, deliveryAddress, packageDescription, weight } = req.body;
        const customerId = req.user._id;

        if (!pickupAddress || !deliveryAddress || !weight) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: pickupAddress, deliveryAddress, weight'
            });
        }


        const parsedPickup = typeof pickupAddress === 'string'
            ? JSON.parse(pickupAddress)
            : pickupAddress;

        const parsedDelivery = typeof deliveryAddress === 'string'
            ? JSON.parse(deliveryAddress)
            : deliveryAddress;


        const images = req.files
            ? req.files.map(file => ({
                url: file.path,
                publicId: file.filename,
            }))
            : [];

        const trackingNumber = generateTrackingNumber();
        const price = calculatePrice(weight);

        const newOrder = new OrderModel({
            trackingNumber,
            customer: customerId,
            pickupAddress: parsedPickup,
            deliveryAddress: parsedDelivery,
            packageDescription,
            weight,
            price,
            images,
            status: 'pending'
        });

        await newOrder.save();

        const customer = await UserModel.findById(customerId).select('fullName email');
        await sendEmail(customer.email, 'Order Placed Successfully', 'order-placed', {
            fullName: customer.fullName,
            trackingNumber,
            pickupAddress: `${parsedPickup.street}, ${parsedPickup.city}`,
            deliveryAddress: `${parsedDelivery.street}, ${parsedDelivery.city}`,
            weight,
            price: price.toLocaleString(),
            orderUrl: `${process.env.CUSTOMER_APP_URL}/orders/${newOrder._id}`,
        });


        await sendNotification({
            recipient: customerId,
            type: 'ORDER_PLACED',
            title: 'Order Placed Successfully',
            message: `Your order (${trackingNumber}) has been placed and is waiting for a driver to be assigned.`,
            orderId: newOrder._id
        });


        const admins = await UserModel.find({ role: 'admin' }).select('_id');
        for (const admin of admins) {
            await sendNotification({
                recipient: admin._id,
                type: 'ORDER_PLACED',
                title: 'New Order Placed',
                message: `A new order (${trackingNumber}) has been placed and is waiting for a driver.`,
                orderId: newOrder._id
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: newOrder
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
        });
    }
};



const getAllOrders = async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const orders = await OrderModel
            .find(filter)
            .populate('customer', 'fullName email phone')
            .populate('driver', 'fullName email phone currentLocation')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Orders retrieved successfully',
            count: orders.length,
            data: orders
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error retrieving orders',
            error: error.message
        });
    }
};

const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await OrderModel
            .findById(orderId)
            .populate('customer', 'fullName email phone')
            .populate('driver', 'fullName email phone currentLocation');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (req.user.role === 'customer') {
            if (order.customer._id.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This is not your order.'
                });
            }
        }

        if (req.user.role === 'driver') {
            if (!order.driver || order.driver._id.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This order is not assigned to you.'
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Order retrieved successfully',
            data: order
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error retrieving order',
            error: error.message
        });
    }
};



const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const validStatuses = ['picked-up', 'in-transit', 'delivered'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Driver can only set: ${validStatuses.join(', ')}`
            });
        }

        const order = await OrderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.driver.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. This order is not assigned to you.'
            });
        }

        if (status === 'picked-up' && order.status !== 'assigned') {
            return res.status(400).json({
                success: false,
                message: `Cannot mark as picked-up. Order must be assigned first. Currently: ${order.status}`
            });
        }

        if (status === 'in-transit' && order.status !== 'picked-up') {
            return res.status(400).json({
                success: false,
                message: `Cannot mark as in-transit. Order must be picked-up first. Currently: ${order.status}`
            });
        }

        if (status === 'delivered' && order.status !== 'in-transit') {
            return res.status(400).json({
                success: false,
                message: `Cannot mark as delivered. Order must be in-transit first. Currently: ${order.status}`
            });
        }

        if (status === 'delivered') {
            order.deliveredAt = new Date();
            await UserModel.findByIdAndUpdate(order.driver, { isAvailable: true });
            await DriverProfile.findOneAndUpdate(
                { user: order.driver },
                { $inc: { totalDeliveries: 1 } }
            );
        }

        order.status = status;
        await order.save();

        const customer = await UserModel.findById(order.customer).select('fullName email');
        const driver = await UserModel.findById(order.driver).select('fullName');

        if (status === 'picked-up') {
            await sendEmail(customer.email, 'Your Package Has Been Picked Up', 'order-picked-up', {
                fullName: customer.fullName,
                trackingNumber: order.trackingNumber,
                driverName: driver.fullName,
                orderUrl: `${process.env.CUSTOMER_APP_URL}/orders/${order._id}`,
            });
        }

        if (status === 'delivered') {
            await sendEmail(customer.email, 'Your Package Has Been Delivered!', 'order-delivered', {
                fullName: customer.fullName,
                trackingNumber: order.trackingNumber,
                driverName: driver.fullName,
                deliveryAddress: `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`,
                price: order.price.toLocaleString(),
                orderUrl: `${process.env.CUSTOMER_APP_URL}/orders/${order._id}`,
            });
        }


        const notificationMap = {
            'picked-up': {
                type: 'ORDER_PICKED_UP',
                title: 'Order Picked Up',
                message: `Your order (${order.trackingNumber}) has been picked up and is on its way.`
            },
            'in-transit': {
                type: 'ORDER_IN_TRANSIT',
                title: 'Order In Transit',
                message: `Your order (${order.trackingNumber}) is in transit. Track your driver live.`
            },
            'delivered': {
                type: 'ORDER_DELIVERED',
                title: 'Order Delivered!',
                message: `Your order (${order.trackingNumber}) has been delivered. Please confirm receipt in the app.`
            }
        };

        const notif = notificationMap[status];
        await sendNotification({
            recipient: order.customer,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            orderId: order._id
        });

        return res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            data: order
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error updating order status',
            error: error.message
        });
    }
};



const assignDriver = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { driverId } = req.body;

        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: 'Driver ID is required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID format'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(driverId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid driver ID format'
            });
        }

        const driver = await UserModel.findById(driverId);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        if (driver.role !== 'driver') {
            return res.status(400).json({
                success: false,
                message: 'User is not a driver'
            });
        }

        if (!driver.isAvailable) {
            return res.status(400).json({
                success: false,
                message: 'Driver is not available'
            });
        }

        const driverProfile = await DriverProfile.findOne({ user: driverId });
        if (!driverProfile?.isApproved) {
            return res.status(400).json({
                success: false,
                message: 'Driver has not been approved yet'
            });
        }

        const order = await OrderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot assign driver to an order that is already ${order.status}`
            });
        }

        order.driver = driverId;
        order.status = 'assigned';
        driver.isAvailable = false;

        await Promise.all([order.save(), driver.save()]);

        const customer = await UserModel.findById(order.customer).select('fullName email');
        await sendEmail(customer.email, 'Driver Assigned to Your Order', 'driver-assigned', {
            fullName: customer.fullName,
            trackingNumber: order.trackingNumber,
            driverName: driver.fullName,
            driverPhone: driver.phone,
            pickupAddress: `${order.pickupAddress.street}, ${order.pickupAddress.city}`,
            deliveryAddress: `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`,
            orderUrl: `${process.env.CUSTOMER_APP_URL}/orders/${order._id}`,
        });


        await sendNotification({
            recipient: order.customer,
            type: 'DRIVER_ASSIGNED',
            title: 'Driver Assigned',
            message: `A driver has been assigned to your order (${order.trackingNumber}). They will pick it up shortly.`,
            orderId: order._id
        });


        await sendNotification({
            recipient: driverId,
            type: 'DRIVER_ASSIGNED',
            title: 'New Order Assigned',
            message: `You have been assigned a new order (${order.trackingNumber}). Please pick it up as soon as possible.`,
            orderId: order._id
        });

        const updatedOrder = await OrderModel.findById(orderId)
            .populate('driver', 'fullName email phone currentLocation')
            .populate('customer', 'fullName email');

        return res.status(200).json({
            success: true,
            message: 'Driver assigned successfully',
            data: updatedOrder
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error assigning driver',
            error: error.message
        });
    }
};


const getOrdersByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;

        if (req.user.role === 'customer') {
            if (customerId !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only view your own orders.'
                });
            }
        }

        const orders = await OrderModel
            .find({ customer: customerId })
            .populate('driver', 'fullName email phone currentLocation')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Orders retrieved successfully',
            count: orders.length,
            data: orders
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error retrieving orders',
            error: error.message
        });
    }
};



const getOrdersByDriver = async (req, res) => {
    try {
        const { driverId } = req.params;

        if (req.user.role === 'driver') {
            if (driverId !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only view your own orders.'
                });
            }
        }

        const orders = await OrderModel
            .find({ driver: driverId })
            .populate('customer', 'fullName email phone')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Orders retrieved successfully',
            count: orders.length,
            data: orders
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error retrieving orders',
            error: error.message
        });
    }
};



const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await OrderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (req.user.role === 'customer') {
            if (order.customer.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This is not your order.'
                });
            }
        }

        if (order.status === 'delivered' || order.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a delivered or already cancelled order'
            });
        }

        if (order.driver) {
            await UserModel.findByIdAndUpdate(order.driver, { isAvailable: true });


            await sendNotification({
                recipient: order.driver,
                type: 'ORDER_CANCELLED',
                title: 'Order Cancelled',
                message: `Order (${order.trackingNumber}) has been cancelled.`,
                orderId: order._id
            });
        }


        await sendNotification({
            recipient: order.customer,
            type: 'ORDER_CANCELLED',
            title: 'Order Cancelled',
            message: `Your order (${order.trackingNumber}) has been cancelled.`,
            orderId: order._id
        });

        order.status = 'cancelled';
        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            data: order
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error cancelling order',
            error: error.message
        });
    }
};


const confirmDelivery = async (req, res) => {
    try {
        const { orderId } = req.params;

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

        if (order.status !== 'delivered') {
            return res.status(400).json({
                success: false,
                message: `Cannot confirm delivery. Order is currently ${order.status}. It must be delivered first.`
            });
        }

        order.status = 'confirmed';
        order.confirmedAt = new Date();
        await order.save();


        await sendNotification({
            recipient: order.driver,
            type: 'ORDER_CONFIRMED',
            title: 'Delivery Confirmed',
            message: `The customer has confirmed delivery of order (${order.trackingNumber}). Great job!`,
            orderId: order._id
        });


        const admins = await UserModel.find({ role: 'admin' }).select('_id');
        for (const admin of admins) {
            await sendNotification({
                recipient: admin._id,
                type: 'ORDER_CONFIRMED',
                title: 'Delivery Confirmed',
                message: `Order (${order.trackingNumber}) has been confirmed by the customer.`,
                orderId: order._id
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Delivery confirmed successfully. Order is now closed.',
            data: order
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error confirming delivery',
            error: error.message
        });
    }
};


const deleteOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await OrderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (req.user.role === 'customer') {
            if (order.customer.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This is not your order.'
                });
            }
        }

        if (req.user.role === 'driver') {
            if (!order.driver || order.driver.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This order is not assigned to you.'
                });
            }
        }

        if (!['cancelled', 'confirmed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Only cancelled or confirmed orders can be deleted. Current status: ${order.status}`
            });
        }

        await OrderModel.findByIdAndDelete(orderId);

        return res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error deleting order',
            error: error.message
        });
    }
};


const trackOrder = async (req, res) => {
    try {
        const { trackingNumber } = req.params;

        const order = await OrderModel.findOne({ trackingNumber })
            .populate('driver', 'fullName phone')
            .populate('customer', 'fullName');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'No order found with that tracking number'
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                trackingNumber: order.trackingNumber,
                status: order.status,
                pickupAddress: order.pickupAddress,
                deliveryAddress: order.deliveryAddress,
                weight: order.weight,
                price: order.price,
                driver: order.driver ? { fullName: order.driver.fullName } : null,
                createdAt: order.createdAt,
                deliveredAt: order.deliveredAt,
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error tracking order',
            error: error.message
        });
    }
};



const getRevenueStats = async (req, res) => {
    try {
        const now = new Date();

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());  startOfWeek.setHours(0,0,0,0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        
        const revenueStatuses = ['delivered', 'confirmed'];

        const [
            totalRevenue,
            todayRevenue,
            weekRevenue,
            monthRevenue,
            revenueByDriver,
            dailyRevenue,
        ] = await Promise.all([

            
            OrderModel.aggregate([
                { $match: { status: { $in: revenueStatuses } } },
                { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } }
            ]),


            OrderModel.aggregate([
                { $match: { status: { $in: revenueStatuses }, createdAt: { $gte: startOfToday } } },
                { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } }
            ]),

            
            OrderModel.aggregate([
                { $match: { status: { $in: revenueStatuses }, createdAt: { $gte: startOfWeek } } },
                { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } }
            ]),

            
            OrderModel.aggregate([
                { $match: { status: { $in: revenueStatuses }, createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } }
            ]),

            
            OrderModel.aggregate([
                { $match: { status: { $in: revenueStatuses }, driver: { $ne: null } } },
                { $group: { _id: '$driver', total: { $sum: '$price' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } },
                { $limit: 10 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'driver' } },
                { $unwind: '$driver' },
                { $project: { _id: 1, total: 1, count: 1, 'driver.fullName': 1, 'driver.email': 1, 'driver.avatar': 1 } }
            ]),

            
            OrderModel.aggregate([
                { $match: { status: { $in: revenueStatuses }, createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } } },
                { $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    total: { $sum: '$price' },
                    count: { $sum: 1 }
                }},
                { $sort: { _id: 1 } }
            ]),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                allTime:  { total: totalRevenue[0]?.total || 0, count: totalRevenue[0]?.count || 0 },
                today:    { total: todayRevenue[0]?.total  || 0, count: todayRevenue[0]?.count  || 0 },
                week:     { total: weekRevenue[0]?.total   || 0, count: weekRevenue[0]?.count   || 0 },
                month:    { total: monthRevenue[0]?.total  || 0, count: monthRevenue[0]?.count  || 0 },
                byDriver: revenueByDriver,
                daily:    dailyRevenue,
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching revenue stats', error: error.message });
    }
};

module.exports = {
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
    trackOrder,
    getRevenueStats
};