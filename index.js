const express = require('express');
const app = express();
const ejs = require('ejs');
const mongoose = require('mongoose')
const cors = require('cors');
app.set('view engine', 'ejs');
const dotenv = require('dotenv');
const connectDB = require('./database/connectDB');

dotenv.config();

app.use(cors({
    origin: [
        process.env.CUSTOMER_APP_URL,
        process.env.DRIVER_APP_URL,
        process.env.ADMIN_APP_URL,
    ],
    credentials: true,
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const UserRouter = require('./routers/user.routes');
const OrderRouter = require('./routers/order.routes');
const trackingRoutes = require('./routers/tracking.routes');
const notificationRoutes = require('./routers/notification.routes');




app.use('/api/v1', UserRouter);
app.use('/api/v1', OrderRouter);
app.use('/api/v1', trackingRoutes);
app.use('/api/v1', notificationRoutes);


app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 5MB.'
        });
    }
    if (err.message === 'Only JPG, PNG and WEBP images are allowed') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next(err);
});


// app.listen(process.env.PORT, (err) => {
//     if (err) {
//         console.log('Error in server startup', err);
//     } else {
//         console.log(`Server started successfully`);
//     }
// })

if (process.env.NODE_ENV !== 'production') {
    connectDB().then(() => {
        app.listen(process.env.PORT || 7001, () => {
            console.log(`Server running on port ${process.env.PORT || 7001}`);
        });
    });
}

mongoose.connect(process.env.DATABASE_URI)
    .then(() => {
        console.log('Database connected succesfully');
    })
    .catch((err) => {
        console.log('Error connecting to Database', err);

    })


app.get('/debug-cors', (req, res) => {
    res.json({
        customer: process.env.CUSTOMER_APP_URL,
        driver: process.env.DRIVER_APP_URL,
        admin: process.env.ADMIN_APP_URL,
    });
});


    module.exports = app;