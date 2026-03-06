const express = require("express");
const { registerUser, login, getAllCustomers, getAllDrivers, approveDriver, getDriverProfile, updateDriverProfile } = require("../controllers/user.controller");
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { forgotPassword, verifyOTP, resetPassword } = require("../controllers/auth.controller");
const router = express.Router();




router.post('/register', registerUser)
router.post('/login', login)
router.get('/customers', getAllCustomers)
router.get('/drivers', getAllDrivers)
router.patch('/drivers/:driverId/approve', protect, restrictTo('admin'), approveDriver);

router.get('/drivers/profile', protect, restrictTo('driver'), getDriverProfile);
router.patch('/drivers/profile', protect, restrictTo('driver'), updateDriverProfile);

router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports=router;