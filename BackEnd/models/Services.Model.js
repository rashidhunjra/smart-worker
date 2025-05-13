const mongoose = require("mongoose");
const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // e.g., "Electrician", "Plumber"
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      required: true, // Short explanation of the service
    },

    category: {
      type: String, // e.g., "Home Services", "Electronics", etc.
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
