const Joi = require("joi");
const bcrypt = require("bcrypt");
const JWTService = require("../utils/JWTservices");
const Worker = require("../models/User.Model");
const formatWorker = require("../utils/formatWorker");
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const idPattern = /^[0-9a-fA-F]{24}$/;
const moment = require("moment");
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
    let { services, aboutMe, skillsAndExperience, serviceableLocations } =
      req.body;

    // Parse JSON fields from form-data
    try {
      services = JSON.parse(services);
      serviceableLocations = JSON.parse(serviceableLocations); // expected to be array of city names
    } catch (parseErr) {
      return res.status(400).json({
        message: "Invalid JSON format in 'services' or 'serviceableLocations'",
      });
    }

    // Joi validation schema (based on names, not ObjectIds)
    const setupProfileSchema = Joi.object({
      services: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().required(),
            visitingPrice: Joi.number().min(0).required(),
            experience: Joi.number().min(0).required(),
          })
        )
        .required(),

      serviceableLocations: Joi.array().items(Joi.string().min(1)).required(),

      aboutMe: Joi.string().allow(""),
      skillsAndExperience: Joi.string().allow(""),
    });

    const { error } = setupProfileSchema.validate({
      services,
      serviceableLocations,
      aboutMe,
      skillsAndExperience,
    });
    if (error) return next(error);

    // Check required files
    if (!req.files["profileImage"] || !req.files["certificates"]) {
      return res.status(400).json({
        message: "profileImage and certificates files are required",
      });
    }

    try {
      const worker = await Worker.findById(userId)
        .populate({ path: "services.serviceId", select: "name" })
        .populate({ path: "serviceableLocations", select: "city" });

      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }

      // 🏙️ Convert city names to Location ObjectIds
      const cityNames = serviceableLocations.map((city) =>
        city.toLowerCase().trim()
      );

      const locationDocs = await Promise.all(
        cityNames.map(async (city) => {
          let loc = await Location.findOne({ city });
          if (!loc) {
            loc = await Location.create({ city });
          }
          return loc;
        })
      );
      const locationIds = locationDocs.map((loc) => loc._id);

      // 🛠️ Convert service names to Service ObjectIds
      const formattedServices = await Promise.all(
        services.map(async (item) => {
          const name = item.name?.toLowerCase().trim();
          if (!name) {
            throw new Error("Service name is required for each service entry.");
          }

          let service = await Service.findOne({ name });
          if (!service) {
            service = await Service.create({ name });
          }

          return {
            serviceId: service._id,
            visitingPrice: item.visitingPrice,
            experience: item.experience,
          };
        })
      );

      // 📅 Set default available slots if not already set
      if (!worker.availableSlots || worker.availableSlots.length === 0) {
        const availableSlots = [];
        const startOfMonth = moment().startOf("month");
        const totalDays = moment().daysInMonth();

        for (let i = 0; i < totalDays; i++) {
          const date = startOfMonth.clone().add(i, "days").toDate();
          availableSlots.push({
            date,
            startTime: "09:00",
            endTime: "21:00",
          });
        }

        worker.availableSlots = availableSlots;
      }

      // 📂 File uploads
      worker.profileImage = req.files["profileImage"][0].path;
      if (req.files["guaranty"]) {
        worker.guaranty = req.files["guaranty"][0].path;
      }
      worker.certificates = req.files["certificates"].map((file) => file.path);

      // 📝 Text data
      worker.services = formattedServices;
      worker.serviceableLocations = locationIds;
      if (aboutMe) worker.aboutMe = aboutMe;
      if (skillsAndExperience) worker.skillsAndExperience = skillsAndExperience;

      await worker.save();

      // 🔄 Re-fetch with populated fields
      const updatedWorker = await Worker.findById(worker._id)
        .populate({ path: "services.serviceId", select: "name" })
        .populate({ path: "serviceableLocations", select: "city" });

      // 🎨 Format response
      const formattedResponseServices = updatedWorker.services.map((s) => ({
        name: s.serviceId?.name || "Unknown",
        visitingPrice: s.visitingPrice,
        experience: s.experience,
      }));

      const formattedLocations = updatedWorker.serviceableLocations.map(
        (loc) => loc.city
      );

      const workerObj = updatedWorker.toObject();
      workerObj.services = formattedResponseServices;
      workerObj.serviceableLocations = formattedLocations;

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

    const { error, value } = AvailabilitySchema.validate(
      req.body.availableSlots
    );
    if (error) return next(error);

    // Ensure start < end for every slot
    for (const slot of value) {
      if (slot.startTime >= slot.endTime) {
        return res.status(400).json({
          message: `On ${slot.date}, startTime must be before endTime.`,
        });
      }
    }

    try {
      const worker = await Worker.findById(req.user._id);
      if (!worker) return res.status(404).json({ message: "Worker not found" });

      const updatedDates = value.map((slot) =>
        new Date(slot.date).toISOString().slice(0, 10)
      );

      // Filter out old slots that are being updated
      const remainingSlots = worker.availableSlots.filter((slot) => {
        const slotDate = new Date(slot.date).toISOString().slice(0, 10);
        return !updatedDates.includes(slotDate);
      });

      // Merge with new slots
      const updatedSlots = value.map((s) => ({
        date: new Date(s.date),
        startTime: s.startTime,
        endTime: s.endTime,
      }));

      worker.availableSlots = [...remainingSlots, ...updatedSlots];

      await worker.save();
      return res.status(200).json({ availableSlots: worker.availableSlots });
    } catch (err) {
      return next(err);
    }
  },
  // controllers/workerController.js

  getWorkers: async (req, res, next) => {
    const { service, city } = req.query;

    try {
      // Build base query
      const query = {};

      // 1️⃣ Optional service filter
      if (service) {
        const svc = await Service.findOne({
          name: service.toLowerCase().trim(),
        });
        if (!svc) {
          return res
            .status(404)
            .json({ message: `No workers found for service '${service}'` });
        }
        query["services.serviceId"] = svc._id;
      }

      // 2️⃣ Optional city filter
      if (city) {
        const loc = await Location.findOne({ city: city.toLowerCase().trim() });
        if (!loc) {
          return res
            .status(404)
            .json({ message: `No workers found in city '${city}'` });
        }
        query.serviceableLocations = loc._id;
      }

      // 3️⃣ Fetch & populate
      const workers = await Worker.find(query)
        .populate({ path: "services.serviceId", select: "name" })
        .populate({ path: "serviceableLocations", select: "city" });

      return res.status(200).json({
        message: `Workers${service ? ` offering ${service}` : ""}${
          city ? ` in ${city}` : ""
        }`,
        workers,
      });
    } catch (err) {
      return next(err);
    }
  },

  updateProfile: async (req, res, next) => {
    const userId = req.user._id;
    let {
      addServices = [],
      removeServiceIds = [],
      addLocations = [],
      removeLocationIds = [],
      aboutMe,
      skillsAndExperience,
    } = req.body;

    // Parse JSON fields
    try {
      if (typeof addServices === "string")
        addServices = JSON.parse(addServices);
      if (typeof removeServiceIds === "string")
        removeServiceIds = JSON.parse(removeServiceIds);
      if (typeof addLocations === "string")
        addLocations = JSON.parse(addLocations);
      if (typeof removeLocationIds === "string")
        removeLocationIds = JSON.parse(removeLocationIds);
    } catch (err) {
      return res.status(400).json({
        message: "Invalid JSON format in one of the arrays",
      });
    }

    try {
      const worker = await Worker.findById(userId);
      if (!worker) return res.status(404).json({ message: "Worker not found" });

      // 📂 Handle file uploads
      if (req.files?.["profileImage"]) {
        worker.profileImage = req.files["profileImage"][0].path;
      }
      if (req.files?.["guaranty"]) {
        worker.guaranty = req.files["guaranty"][0].path;
      }
      if (req.files?.["certificates"]) {
        const newCerts = req.files["certificates"].map((file) => file.path);
        worker.certificates.push(...newCerts);
      }

      // 📝 Update text fields
      if (aboutMe !== undefined) worker.aboutMe = aboutMe;
      if (skillsAndExperience !== undefined)
        worker.skillsAndExperience = skillsAndExperience;

      // ➕ Add new locations
      if (addLocations.length > 0) {
        const newLocDocs = await Promise.all(
          addLocations.map(async (city) => {
            city = city.toLowerCase().trim();
            let loc = await Location.findOne({ city });
            if (!loc) loc = await Location.create({ city });
            return loc._id;
          })
        );
        // Avoid duplicates
        worker.serviceableLocations = [
          ...new Set([
            ...worker.serviceableLocations.map((id) => id.toString()),
            ...newLocDocs.map((id) => id.toString()),
          ]),
        ];
      }

      // ➖ Remove locations
      if (removeLocationIds.length > 0) {
        worker.serviceableLocations = worker.serviceableLocations.filter(
          (id) => !removeLocationIds.includes(id.toString())
        );
      }

      // ➕ Add new services
      if (addServices.length > 0) {
        const newFormattedServices = await Promise.all(
          addServices.map(async (item) => {
            const name = item.name?.toLowerCase().trim();
            if (!name) throw new Error("Service name is required");

            let service = await Service.findOne({ name });
            if (!service) service = await Service.create({ name });

            return {
              serviceId: service._id,
              visitingPrice: item.visitingPrice,
              experience: item.experience,
            };
          })
        );

        // Avoid adding duplicate serviceIds
        const existingIds = worker.services.map((s) => s.serviceId.toString());
        newFormattedServices.forEach((newService) => {
          if (!existingIds.includes(newService.serviceId.toString())) {
            worker.services.push(newService);
          }
        });
      }

      // ➖ Remove services
      if (removeServiceIds.length > 0) {
        worker.services = worker.services.filter(
          (s) => !removeServiceIds.includes(s.serviceId.toString())
        );
      }

      await worker.save();

      // 🔄 Populate & format response
      const updatedWorker = await Worker.findById(worker._id)
        .populate({ path: "services.serviceId", select: "name" })
        .populate({ path: "serviceableLocations", select: "city" });

      const formattedServices = updatedWorker.services.map((s) => ({
        name: s.serviceId?.name || "Unknown",
        visitingPrice: s.visitingPrice,
        experience: s.experience,
      }));

      const formattedLocations = updatedWorker.serviceableLocations.map(
        (loc) => loc.city
      );

      const workerObj = updatedWorker.toObject();
      workerObj.services = formattedServices;
      workerObj.serviceableLocations = formattedLocations;

      return res.status(200).json({
        message: "Worker profile updated successfully",
        worker: workerObj,
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = workerController;
