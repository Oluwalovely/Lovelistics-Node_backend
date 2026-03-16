const UserModel = require('../models/user.model');
const OTPModel = require('../models/otp.model');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');
const otpgen = require('otp-generator');



const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email is not registered, cannot send OTP.'
            });
        }

        
        await OTPModel.deleteMany({ email });

        const otp = otpgen.generate(6, {
            upperCaseAlphabets: false,
            specialChars: false,
            lowerCaseAlphabets: false,
            digits: true
        });
        const hashedOtp = await bcrypt.hash(otp, 10);

        await OTPModel.create({ email, otp: hashedOtp });

        await sendEmail(email, 'Reset Your LOVELISTICS Password', 'forgot-password', {
            fullName: user.fullName,
            otp,
        });

        return res.status(200).json({
            success: true,
            message: 'An OTP has been sent to your email.'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error sending OTP', error: error.message });
    }
};


const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const record = await OTPModel.findOne({ email });
        if (!record) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' });
        }

        const isMatch = await bcrypt.compare(otp, record.otp);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }

        return res.status(200).json({ success: true, message: 'OTP verified successfully.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error verifying OTP', error: error.message });
    }
};


const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const record = await OTPModel.findOne({ email });
        if (!record) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' });
        }

        const isMatch = await bcrypt.compare(otp, record.otp);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const user = await UserModel.findOneAndUpdate(
            { email },
            { password: hashedPassword },
            { new: true }
        );

        
        await OTPModel.deleteMany({ email });

        await sendEmail(email, 'Password Reset Successful', 'password-reset-success', {
            fullName: user.fullName,
            appUrl: user.role === 'driver'
                ? process.env.DRIVER_APP_URL
                : user.role === 'admin'
                    ? process.env.ADMIN_APP_URL
                    : process.env.CUSTOMER_APP_URL,
        });

        return res.status(200).json({ success: true, message: 'Password reset successfully.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error resetting password', error: error.message });
    }
};

module.exports = { forgotPassword, verifyOTP, resetPassword };