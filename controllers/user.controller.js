const UserModel = require("../models/user.model")
const DriverProfile = require("../models/driverProfile.model") 
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const sendEmail = require('../utils/sendEmail');
const { sendNotification } = require('../utils/sendNotification');
const { cloudinary } = require('../config/cloudinary');


const registerUser = async (req, res) => {
    const { fullName, email, password, phone, inviteCode } = req.body

    try {
        let role = "customer";

        if (inviteCode) {
            if (inviteCode === process.env.DRIVER_INVITE_CODE) {
                role = "driver";
            } else {
                return res.status(400).send({
                    message: "Invalid invite code",
                });
            }
        }

        const saltround = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, saltround)

        const user = await UserModel.create({ fullName, email, password: hashedPassword, phone, role });

        if (role === "driver") {
            await DriverProfile.create({ user: user._id });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "5h" })

        await sendEmail(email, 'Welcome to LOVELISTICS!', 'welcome', {
            fullName,
            email,
            appUrl: role === 'driver'
                ? process.env.DRIVER_APP_URL
                : process.env.CUSTOMER_APP_URL,
        });

        res.status(201).send({
            message: "User created successfully",
            data: {
                _id:      user._id,
                fullName,
                email,
                phone,
                role:     user.role
            },
            token
        })
    } catch (error) {
        console.log(error);
        if (error.code == 11000) {
            res.status(400).send({ message: "User already registered" })
        } else {
            res.status(400).send({ message: "Error creating user" })
        }
    }
}


const login = async (req, res) => {
    const { email, password } = req.body
    try {
        const isUser = await UserModel.findOne({ email })
        if (!isUser) {
            return res.status(404).send({ message: "Invalid credentials" })
        }

        const isMatch = await bcrypt.compare(password, isUser.password)
        if (!isMatch) {
            return res.status(404).send({ message: "Invalid credentials" })
        }

        // Record last login time + IP
        const clientIp =
            (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
            req.socket?.remoteAddress ||
            null;

        isUser.lastLogin   = new Date();
        isUser.lastLoginIp = clientIp;
        await isUser.save({ validateBeforeSave: false });
        

        const token = jwt.sign(
            { id: isUser._id, role: isUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "5h" }
        )

        res.status(200).send({
            message: "User logged in successfully",
            data: {
                _id:         isUser._id,
                fullName:    isUser.fullName,
                email:       isUser.email,
                phone:       isUser.phone       || null,
                avatar:      isUser.avatar      || null,
                role:        isUser.role,
                lastLogin:   isUser.lastLogin,
                lastLoginIp: isUser.lastLoginIp,
            },
            token
        })
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Error logging in" })
    }
}


// Returns the currently logged-in user's full profile (used by AuthContext on load)
const getMe = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user._id).select(
            '_id fullName email phone avatar role lastLogin lastLoginIp createdAt'
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User retrieved successfully",
            data: {
                _id:         user._id,
                fullName:    user.fullName,
                email:       user.email,
                phone:       user.phone       || null,
                avatar:      user.avatar      || null,
                role:        user.role,
                lastLogin:   user.lastLogin   || null,
                lastLoginIp: user.lastLoginIp || null,
                createdAt:   user.createdAt,
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error retrieving user" });
    }
};


const getAllCustomers = async (req, res) => {
    try {
        const customers = await UserModel.find({ role: "customer" })
            .select('_id fullName email phone createdAt');

        res.status(200).send({
            message: "Customers retrieved successfully",
            data: customers
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Error retrieving customers", error: error.message });
    }
};


const getAllDrivers = async (req, res) => {
    try {
        const drivers = await UserModel.find({ role: "driver" })
            .select('_id fullName email phone avatar isAvailable currentLocation createdAt');

        const profiles = await DriverProfile.find({
            user: { $in: drivers.map(d => d._id) }
        }).lean();

        const profileMap = {};
        profiles.forEach(p => { profileMap[p.user.toString()] = p; });

        const merged = drivers.map(d => {
            const profile = profileMap[d._id.toString()] || {};
            return {
                ...d.toObject(),
                vehicleType:     profile.vehicleType     || null,
                vehiclePlate:    profile.vehiclePlate    || null,
                vehicleColor:    profile.vehicleColor    || null,
                vehicleModel:    profile.vehicleModel    || null,
                licenseNumber:   profile.licenseNumber   || null,
                isApproved:      profile.isApproved      ?? false,
                activeOrder:     profile.activeOrder     || null,
                totalDeliveries: profile.totalDeliveries || 0,
            };
        });

        res.status(200).send({
            message: "Drivers retrieved successfully",
            data: merged
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Error retrieving drivers", error: error.message });
    }
};


const approveDriver = async (req, res) => {
    try {
        const { driverId } = req.params;

        const profile = await DriverProfile.findOneAndUpdate(
            { user: driverId },
            { $set: { isApproved: true } },
            { new: true }
        );

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }

        await sendNotification({
            recipient: driverId,
            type:      'ACCOUNT_APPROVED',
            title:     'Account Approved',
            message:   'Your driver account has been approved. You can now receive orders.',
        });

        return res.status(200).json({
            success: true,
            message: 'Driver approved successfully',
            data:    profile
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error approving driver', error: error.message });
    }
};


const updateDriverProfile = async (req, res) => {
    try {
        const { vehicleType, vehiclePlate, vehicleModel, vehicleColor, licenseNumber } = req.body;

        const profile = await DriverProfile.findOneAndUpdate(
            { user: req.user._id },
            { $set: { vehicleType, vehiclePlate, vehicleModel, vehicleColor, licenseNumber } },
            { new: true, upsert: true }
        );

        return res.status(200).json({ success: true, message: 'Profile updated successfully', data: profile });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
    }
};


const getDriverProfile = async (req, res) => {
    try {
        const profile = await DriverProfile.findOne({ user: req.user._id });
        return res.status(200).json({ success: true, data: profile || {} });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching profile', error: error.message });
    }
};


// Updates fullName, email, phone and optionally avatar (with Cloudinary cleanup)
const updateProfile = async (req, res) => {
    try {
        const { fullName, email, phone } = req.body;
        const update = {};

        if (fullName) update.fullName = fullName.trim();
        if (email)    update.email    = email.trim().toLowerCase();
        if (phone !== undefined) update.phone = phone.trim() || null;

        if (req.file) {
            // Delete old avatar from Cloudinary if one exists
            const user = await UserModel.findById(req.user._id);
            if (user.avatarPublicId) {
                await cloudinary.uploader.destroy(user.avatarPublicId);
            }
            update.avatar        = req.file.path;
            update.avatarPublicId = req.file.filename;
        }

        const updated = await UserModel.findByIdAndUpdate(
            req.user._id,
            { $set: update },
            { new: true, runValidators: true }
        ).select('_id fullName email phone avatar role lastLogin lastLoginIp');

        return res.status(200).json({
            success: true,
            message: 'Profile updated',
            data:    updated
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


// Verifies current password then saves a new hashed one
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
        }

        const user = await UserModel.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        const salt           = await bcrypt.genSalt(10);
        user.password        = await bcrypt.hash(newPassword, salt);
        await user.save({ validateBeforeSave: false });

        return res.status(200).json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: 'Error changing password.' });
    }
};


module.exports = {
    registerUser,
    login,
    getMe,
    getAllCustomers,
    getAllDrivers,
    approveDriver,
    updateDriverProfile,
    getDriverProfile,
    updateProfile,
    changePassword,
}