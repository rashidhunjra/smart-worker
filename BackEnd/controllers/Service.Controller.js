const Service = require("../models/Services.Model");

const serviceController = {
  // Create a new service
  createService: async (req, res, next) => {
    try {
      const { name, description, category } = req.body;

      const existing = await Service.findOne({ name });
      if (existing) {
        return res.status(400).json({ message: "Service already exists" });
      }

      const service = new Service({ name, description, category });
      await service.save();

      res.status(201).json({ message: "Service created", service });
    } catch (err) {
      next(err);
    }
  },

  // Get all services
  getAllServices: async (req, res, next) => {
    try {
      const services = await Service.find();
      res.status(200).json({ services });
    } catch (err) {
      next(err);
    }
  },

  // Get a single service by ID
  getServiceById: async (req, res, next) => {
    try {
      const service = await Service.findById(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.status(200).json({ service });
    } catch (err) {
      next(err);
    }
  },

  // Update a service
  updateService: async (req, res, next) => {
    try {
      const { name, description, category } = req.body;
      const service = await Service.findByIdAndUpdate(
        req.params.id,
        { name, description, category },
        { new: true, runValidators: true }
      );

      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.status(200).json({ message: "Service updated", service });
    } catch (err) {
      next(err);
    }
  },

  // Delete a service
  deleteService: async (req, res, next) => {
    try {
      const service = await Service.findByIdAndDelete(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.status(200).json({ message: "Service deleted" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = serviceController;
