const Joi = require("joi");
const bcrypt = require("bcrypt");
const JWTService = require("../utils/JWTservices");
const Worker = require("../models/User.Model");
const formatWorker = require("../utils/formatWorker");
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const idPattern = /^[0-9a-fA-F]{24}$/;
const workerController = {
  // Register
  register: async (req, res, next) => {
    const WorkerRegisterSchema = Joi.object({
      name: Joi.string().max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattern).required(),
      confirmPassword: Joi.string()
        .valid(Joi.ref("password"))
        .required()
        .messages({
          "any.only": "Confirm password must match password",
        }),
    });

    const { error } = WorkerRegisterSchema.validate(req.body);
    if (error) return next(error);

    const { name, email, password } = req.body;

    try {
      const emailInUse = await Worker.exists({ email });
      if (emailInUse) {
        return next({
          status: 409,
          message: "Email already registered, use another email",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newWorker = new Worker({
        name,
        email,
        password: hashedPassword,
      });
      const savedWorker = await newWorker.save();

      const { accessToken, refreshToken } =
        JWTService.generateTokens(savedWorker);

      res.cookie("accessToken", accessToken, {
        maxAge: 1000 * 60 * 60,
        httpOnly: true,
      });

      res.cookie("refreshToken", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
      });

      return res.status(201).json({
        success: true,
        worker: formatWorker(savedWorker),
        accessToken,
        auth: true,
      });
    } catch (err) {
      return next(err);
    }
  },

  // Login
  login: async (req, res, next) => {
    const WorkerLoginSchema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattern).required(),
    });

    const { error } = WorkerLoginSchema.validate(req.body);
    if (error) return next(error);

    const { email, password } = req.body;

    try {
      const worker = await Worker.findOne({ email });
      if (!worker) {
        return next({ status: 401, message: "Invalid email" });
      }

      const isMatch = await bcrypt.compare(password, worker.password);
      if (!isMatch) {
        return next({ status: 401, message: "Invalid password" });
      }

      const { accessToken, refreshToken } = JWTService.generateTokens(worker);

      res.cookie("accessToken", accessToken, {
        maxAge: 1000 * 60 * 60,
        httpOnly: true,
      });

      res.cookie("refreshToken", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
      });

      return res.status(200).json({
        success: true,
        worker: formatWorker(worker),
        accessToken,
        auth: true,
      });
    } catch (err) {
      return next(err);
    }
  },

  // Logout
  logout: (req, res, next) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(200).json({ worker: null, auth: false });
  },

  // Setup Profile
  setupProfile: async (req, res, next) => {
    const userId = req.user._id;
    let { services, aboutMe, skillsAndExperience, location } = req.body;

    // Parse JSON fields from form-data
    try {
      services = JSON.parse(services);
      location = JSON.parse(location);
    } catch (parseErr) {
      return res.status(400).json({
        message: "Invalid JSON format in 'services' or 'location'",
      });
    }

    // Joi schema
    const setupProfileSchema = Joi.object({
      services: Joi.array()
        .items(
          Joi.object({
            serviceId: Joi.string().required(),
            visitingPrice: Joi.number().min(0).required(),
            experience: Joi.number().min(0).required(),
          })
        )
        .required(),

      location: Joi.array().items(Joi.string().regex(idPattern)).required(),

      aboutMe: Joi.string().allow(""),
      skillsAndExperience: Joi.string().allow(""),
    });

    // Validate request body
    const { error } = setupProfileSchema.validate({
      services,
      location,
      aboutMe,
      skillsAndExperience,
    });

    if (error) return next(error);

    // Validate file uploads
    if (!req.files["profileImage"] || !req.files["certificates"]) {
      return res.status(400).json({
        message: "profileImage and certificates files are required",
      });
    }

    try {
      const worker = await Worker.findById(userId)
        .populate({ path: "services.serviceId", select: "name" })
        .populate({ path: "location", select: "city" });

      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }

      // File uploads
      if (req.files["profileImage"]) {
        worker.profileImage = req.files["profileImage"][0].path;
      }

      if (req.files["guaranty"]) {
        worker.guaranty = req.files["guaranty"][0].path;
      }

      if (req.files["certificates"]) {
        worker.certificates = req.files["certificates"].map(
          (file) => file.path
        );
      }

      // Text data
      worker.services = services;
      worker.location = location;
      if (aboutMe) worker.aboutMe = aboutMe;
      if (skillsAndExperience) worker.skillsAndExperience = skillsAndExperience;

      await worker.save();

      // Re-fetch and populate
      const updatedWorker = await Worker.findById(worker._id)
        .populate({ path: "services.serviceId", select: "name" })
        .populate({ path: "location", select: "city" });

      // Format response
      const formattedServices = updatedWorker.services.map((s) => ({
        name: s.serviceId?.name || "Unknown",
        visitingPrice: s.visitingPrice,
        experience: s.experience,
      }));

      const formattedLocations = updatedWorker.location.map((loc) => loc.city); // fix here

      const workerObj = updatedWorker.toObject();
      workerObj.services = formattedServices;
      workerObj.location = formattedLocations;

      return res.status(200).json({
        message: "Worker profile setup successfully",
        worker: workerObj,
      });
    } catch (err) {
      return next(err);
    }
  },
  updateAvailability: async (req, res, next) => {
    const AvailabilitySchema = Joi.array()
      .items(
        Joi.object({
          date: Joi.date().iso().required(),
          startTime: Joi.string().pattern(timePattern).required(),
          endTime: Joi.string().pattern(timePattern).required(),
        })
      )
      .required();
    const { error, value } = AvailabilitySchema.validate(req.body.availability);
    if (error) return next(error);

    // ensure start < end for every slot
    for (let slot of value) {
      if (slot.startTime >= slot.endTime) {
        return res.status(400).json({
          message: `On ${slot.date}, startTime must be before endTime.`,
        });
      }
    }

    try {
      // pull in the worker
      const worker = await Worker.findById(req.user._id);
      if (!worker) return res.status(404).json({ message: "Worker not found" });

      // Overwrite entire availability (or you could merge/dedupe)
      worker.availability = value.map((s) => ({
        date: new Date(s.date),
        startTime: s.startTime,
        endTime: s.endTime,
      }));

      await worker.save();
      return res.status(200).json({ availability: worker.availability });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = workerController;
