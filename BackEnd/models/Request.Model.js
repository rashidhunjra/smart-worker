const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    // Appointment date (calendar day)
    requestedDate: {
      type: Date,
      required: true,
    },

    // Appointment start time ("HH:mm")
    requestedTime: {
      type: String,
      required: true,
    },

    // Appointment end time ("HH:mm")
    requestedEndTime: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Fast lookups for availability/conflict checks
requestSchema.index({
  workerId: 1,
  requestedDate: 1,
  requestedTime: 1,
  requestedEndTime: 1,
});

module.exports = mongoose.model("Request", requestSchema);
