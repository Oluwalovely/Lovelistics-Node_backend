const express = require("express");
const { registerUser, login, getAllCustomers, getAllDrivers } = require("../controllers/user.controller");
const { forgotPassword, verifyOTP, resetPassword } = require("../controllers/auth.controller");
const router = express.Router();




router.post('/register', registerUser)
router.post('/login', login)
router.get('/customers', getAllCustomers)
router.get('/drivers', getAllDrivers)

router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports=router;