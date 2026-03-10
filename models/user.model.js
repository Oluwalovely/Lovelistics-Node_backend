const mongoose = require('mongoose')


const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "driver", "customer"], default: "customer" },
    phone: { type: String },
    avatar: { type: String, default: '' },
    avatarPublicId: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true }, //for drivers only
    currentLocation: { lat: Number, lng: Number },
    lastLogin: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
}, { timestamps: true, strict: "throw" })


const UserModel = mongoose.model('User', UserSchema)


module.exports = UserModel