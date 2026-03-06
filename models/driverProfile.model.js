const mongoose = require("mongoose");

const DriverProfileSchema = new mongoose.Schema(
  {
    
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, 
    },

    
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
      type: String, 
      default: null,
    },


    licenseNumber: {
      type: String,
      default: null,
    },


    isApproved: {
      type: Boolean,
      default: false,
    },


    activeOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },


    totalDeliveries: {
      type: Number,
      default: 0, 
    },
  },
  {
    timestamps: true,
  }
);

const DriverProfile = mongoose.model("DriverProfile", DriverProfileSchema);

module.exports = DriverProfile;