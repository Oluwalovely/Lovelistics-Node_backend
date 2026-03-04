const UserModel = require("../models/user.model")
const DriverProfile = require("../models/driverProfile.model") // 👈 add this import
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const sendEmail = require('../utils/sendEmail');

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

        // ✅ role is now passed in
        const user = await UserModel.create({ fullName, email, password: hashedPassword, phone, role });

        // ✅ create DriverProfile if driver
        if (role === "driver") {
            await DriverProfile.create({ user: user._id });
        }

        // ✅ role added to token payload so middleware can read it
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
            return res.status(404).send({      // ✅ added return so code stops here
                message: "Invalid credentials"
            })
        }

        const isMatch = await bcrypt.compare(password, isUser.password)
        if (!isMatch) {
            return res.status(404).send({      // ✅ added return so code stops here
                message: "Invalid credentials"
            })
        }

        // ✅ role added to token payload
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
        const customers = await UserModel.find({ role: "customer" }).select('_id fullName email phone');

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
        const drivers = await UserModel.find({ role: "driver" }).select('_id fullName email phone isAvailable currentLocation');

        res.status(200).send({
            message: "Drivers retrieved successfully",
            data: drivers
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            message: "Error retrieving drivers",
            error: error.message
        });
    }
};

module.exports = {
    registerUser,
    login,
    getAllCustomers,
    getAllDrivers
}