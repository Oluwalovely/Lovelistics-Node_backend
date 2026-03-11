const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./database/connectDB');

dotenv.config();

// 1. CORS
app.use(cors({
    origin: [
        process.env.CUSTOMER_APP_URL,
        process.env.DRIVER_APP_URL,
        process.env.ADMIN_APP_URL,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 2. Handle preflight requests explicitly
app.options('*', cors());

// 3. Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 4. Routers
const UserRouter = require('./routers/user.routes');
const OrderRouter = require('./routers/order.routes');
const trackingRoutes = require('./routers/tracking.routes');
const notificationRoutes = require('./routers/notification.routes');

app.use('/api/v1', UserRouter);
app.use('/api/v1', OrderRouter);
app.use('/api/v1', trackingRoutes);
app.use('/api/v1', notificationRoutes);

// 5. Health check
app.get('/', (req, res) => {
    res.json({ success: true, message: 'Lovelistics API is running' });
});

// 6. Debug route — remove after confirming env vars are correct
app.get('/debug-cors', (req, res) => {
    res.json({
        customer: process.env.CUSTOMER_APP_URL,
        driver: process.env.DRIVER_APP_URL,
        admin: process.env.ADMIN_APP_URL,
    });
});

// 7. Error middleware last
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5MB.' });
    }
    if (err.message === 'Only JPG, PNG and WEBP images are allowed') {
        return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
});

// 8. Local dev only
if (process.env.NODE_ENV !== 'production') {
    connectDB().then(() => {
        app.listen(process.env.PORT || 7001, () => {
            console.log(`Server running on port ${process.env.PORT || 7001}`);
        });
    });
}

module.exports = app;