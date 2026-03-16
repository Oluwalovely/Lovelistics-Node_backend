const express = require("express");
const router = express.Router();

const {
    registerUser,
    login,
    getMe,
    getAllCustomers,
    getAllDrivers,
    approveDriver,
    getDriverProfile,
    updateDriverProfile,
    updateProfile,
    changePassword,
} = require("../controllers/user.controller");

const { protect, restrictTo } = require('../middleware/auth.middleware');
const { forgotPassword, verifyOTP, resetPassword } = require("../controllers/auth.controller");
const { upload } = require('../config/cloudinary');

router.post('/register', registerUser);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

router.get('/me', protect, getMe);
router.patch('/update-profile', protect, upload.single('avatar'), updateProfile);
router.post('/change-password', protect, changePassword);

router.get('/drivers/profile', protect, restrictTo('driver'), getDriverProfile);
router.patch('/drivers/profile', protect, restrictTo('driver'), updateDriverProfile);

router.get('/customers', protect, restrictTo('admin'), getAllCustomers);
router.get('/drivers', protect, restrictTo('admin'), getAllDrivers);
router.patch('/drivers/:driverId/approve', protect, restrictTo('admin'), approveDriver);

module.exports = router;