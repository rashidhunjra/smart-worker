const Service = require("../models/Services.Model");

const serviceController = {
  // Get all services
  getAllServices: async (req, res, next) => {
    try {
      const services = await Service.find();
      res.status(200).json({ services });
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
