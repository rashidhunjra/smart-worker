const express = require("express");
const router = express.Router();
const workerController = require("../controllers/Worker.Controller");
const auth = require("../middleware/auth"); // JWT-based auth
const upload = require("../middleware/uploadImages");

// Worker registration
router.post("/signUpWorker", workerController.register);

// Worker login
router.post("/loginWorker", workerController.login);

// Worker logout
router.post("/logoutWorker", workerController.logout);

// Add/update worker details (profile setup)
router.post(
  "/setUpProfile",
  auth,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "guaranty", maxCount: 1 },
    { name: "certificates", maxCount: 5 },
  ]),
  workerController.setupProfile
);

router.put(
  "/availability",
  auth, // ensure req.user is set
  workerController.updateAvailability
);
module.exports = router;
