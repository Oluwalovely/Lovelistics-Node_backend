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
                _id: user._id,
                fullName,
                email,
                phone,
                role: user.role
            },
            token
        })
    } catch (error) {
        console.log(error);

        if (error.code == 11000) {
            res.status(400).send({
                message: "User already registered",
            })
        } else {
            res.status(400).send({
                message: "Error creating user",
            })
        }
    }
}

const login = async (req, res) => {
    const { email, password } = req.body
    try {
        const isUser = await UserModel.findOne({ email })
        if (!isUser) {
            return res.status(404).send({      
                message: "Invalid credentials"
            })
        }

        const isMatch = await bcrypt.compare(password, isUser.password)
        if (!isMatch) {
            return res.status(404).send({      
                message: "Invalid credentials"
            })
        }

        
        const token = jwt.sign({ id: isUser._id, role: isUser.role }, process.env.JWT_SECRET, { expiresIn: "5h" })

        res.status(200).send({
            message: "User logged in successfully",
            data: {
                _id: isUser._id,
                fullName: isUser.fullName,
                email: isUser.email,
                role: isUser.role,
            },
            token
        })
    } catch (error) {
        console.log(error);
        res.status(500).send({
            message: "Error logging in",
        })
    }
}

const getAllCustomers = async (req, res) => {
    try {
        const customers = await UserModel.find({ role: "customer" }).select('_id fullName email phone createdAt');

        res.status(200).send({
            message: "Customers retrieved successfully",
            data: customers
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            message: "Error retrieving customers",
            error: error.message
        });
    }
};

const getAllDrivers = async (req, res) => {
    try {
        const drivers = await UserModel.find({ role: "driver" })
            .select('_id fullName email phone isAvailable currentLocation');

        // Fetch all driver profiles and map by user ID
        const profiles = await DriverProfile.find({
            user: { $in: drivers.map(d => d._id) }
        }).lean();

        const profileMap = {};
        profiles.forEach(p => { profileMap[p.user.toString()] = p; });

        // Merge profile data into each driver
        const merged = drivers.map(d => {
            const profile = profileMap[d._id.toString()] || {};
            return {
                ...d.toObject(),
                vehicleType:      profile.vehicleType      || null,
                vehiclePlate:     profile.vehiclePlate     || null,
                vehicleColor:     profile.vehicleColor     || null,
                vehicleModel:     profile.vehicleModel     || null,
                licenseNumber:    profile.licenseNumber    || null,
                isApproved:       profile.isApproved       ?? false,
                activeOrder:      profile.activeOrder      || null,
                totalDeliveries:  profile.totalDeliveries  || 0,
            };
        });

        res.status(200).send({
            message: "Drivers retrieved successfully",
            data: merged
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            message: "Error retrieving drivers",
            error: error.message
        });
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
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        await sendNotification({
            recipient: driverId,
            type: 'ACCOUNT_APPROVED',
            title: 'Account Approved',
            message: 'Your driver account has been approved. You can now receive orders.',
        });

        return res.status(200).json({
            success: true,
            message: 'Driver approved successfully',
            data: profile
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error approving driver',
            error: error.message
        });
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

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: profile
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
};

const getDriverProfile = async (req, res) => {
    try {
        const profile = await DriverProfile.findOne({ user: req.user._id });
        return res.status(200).json({
            success: true,
            data: profile || {}
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
};


const updateProfile = async (req, res) => {
    try {
        const { fullName, phone } = req.body;
        const update = { fullName, phone };

        if (req.file) {
            // Delete old avatar from Cloudinary if exists
            const user = await UserModel.findById(req.user._id);
            if (user.avatarPublicId) {
                await cloudinary.uploader.destroy(user.avatarPublicId);
            }
            update.avatar = req.file.path;
            update.avatarPublicId = req.file.filename;
        }

        const updated = await UserModel.findByIdAndUpdate(
            req.user._id,
            { $set: update },
            { returnDocument: 'after' }
        );

        return res.status(200).json({ success: true, message: 'Profile updated', data: updated });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    registerUser,
    login,
    getAllCustomers,
    getAllDrivers,
    approveDriver,
    updateDriverProfile, 
    getDriverProfile,
    updateProfile
}