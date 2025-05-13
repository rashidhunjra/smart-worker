// middleware/upload.js
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "worker-assets"; // Default folder

    if (file.fieldname === "profileImage") folder = "worker-profiles";
    else if (file.fieldname === "guaranty") folder = "worker-guaranty";
    else if (file.fieldname === "certificates") folder = "worker-certificates";

    return {
      folder: folder,
      resource_type: "auto", // Accept image, pdf, etc.
      public_id: uuidv4(),
    };
  },
});

const upload = multer({ storage });

module.exports = upload;
