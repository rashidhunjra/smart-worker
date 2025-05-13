const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
    },
    visitingPrice: {
      type: Number,
    },
    experience: {
      type: String,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profileImage: {
      type: String,
      // required: true,
    },

    services: [serviceSchema],

    certificates: {
      type: [String],
      default: [],
    },

    guaranty: {
      type: String,
      default: "",
    },

    rating: {
      type: Number,
      default: 0,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },
    availability: [
      {
        date: {
          type: Date,
          // required: true,
        },
        startTime: {
          type: String,
          // required: true,
        },
        endTime: {
          type: String,
          // required: true,
        },
      },
    ],
    aboutMe: {
      type: String,
    },
    skillsAndExperience: {
      type: String,
    },
    location: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location",
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.index({
  "availability.date": 1,
  "availability.startTime": 1,
  "availability.endTime": 1,
});

module.exports = mongoose.model("User", userSchema);
