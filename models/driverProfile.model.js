const mongoose = require("mongoose");

const DriverProfileSchema = new mongoose.Schema(
  {
    // ─── Link to User ─────────────────────────────────────────
    // This connects the DriverProfile back to the User document.
    // When a user registers as a driver, we store their User _id here.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One profile per driver, no duplicates
    },

    // ─── Vehicle Info ─────────────────────────────────────────
    vehicleType: {
      type: String,
      enum: ["bike", "motorcycle", "car", "van", "truck"],
      default: null,
    },

    vehiclePlate: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },

    vehicleColor: {
      type: String,
      default: null,
    },

    vehicleModel: {
      type: String, // e.g "Toyota Corolla"
      default: null,
    },

    // ─── License ──────────────────────────────────────────────
    licenseNumber: {
      type: String,
      default: null,
    },

    // ─── Approval ─────────────────────────────────────────────
    // Admin must approve a driver before they can receive orders.
    // When a driver first registers, isApproved is false.
    // Admin flips it to true from the dashboard.
    isApproved: {
      type: Boolean,
      default: false,
    },

    // ─── Active Order ─────────────────────────────────────────
    // Tracks which order the driver is currently handling.
    // null means the driver is free to take a new order.
    activeOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    // ─── Stats ────────────────────────────────────────────────
    totalDeliveries: {
      type: Number,
      default: 0, // Increments each time a delivery is confirmed
    },
  },
  {
    timestamps: true,
  }
);

const DriverProfile = mongoose.model("DriverProfile", DriverProfileSchema);

module.exports = DriverProfile;