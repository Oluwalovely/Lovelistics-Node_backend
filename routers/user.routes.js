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

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/register', registerUser);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// ── Any logged-in user ────────────────────────────────────────────────────────
router.get('/me', protect, getMe);
router.patch('/update-profile', protect, upload.single('avatar'), updateProfile);
router.post('/change-password', protect, changePassword);

// ── Driver only ───────────────────────────────────────────────────────────────
// NOTE: /drivers/profile MUST be defined before /drivers/:driverId/approve
// otherwise Express matches "profile" as the driverId param
router.get('/drivers/profile', protect, restrictTo('driver'), getDriverProfile);
router.patch('/drivers/profile', protect, restrictTo('driver'), updateDriverProfile);

// ── Admin only ────────────────────────────────────────────────────────────────
router.get('/customers', protect, restrictTo('admin'), getAllCustomers);
router.get('/drivers', protect, restrictTo('admin'), getAllDrivers);
router.patch('/drivers/:driverId/approve', protect, restrictTo('admin'), approveDriver);

module.exports = router;