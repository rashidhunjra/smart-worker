const Location = require("../models/Location.Model");

const locationController = {
  // Create a new location
  createLocation: async (req, res, next) => {
    try {
      const { city, streetAddress } = req.body;

      if (!city) {
        return res.status(400).json({ message: "City is required" });
      }

      const location = new Location({ city, streetAddress });
      await location.save();

      res.status(201).json({ message: "Location created", location });
    } catch (err) {
      next(err);
    }
  },

  // Get all locations
  getAllLocations: async (req, res, next) => {
    try {
      const locations = await Location.find().sort({ createdAt: -1 });
      res.status(200).json({ locations });
    } catch (err) {
      next(err);
    }
  },

  // Get a single location by ID
  getLocationById: async (req, res, next) => {
    try {
      const location = await Location.findById(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.status(200).json({ location });
    } catch (err) {
      next(err);
    }
  },

  // Update a location
  updateLocation: async (req, res, next) => {
    try {
      const { city, streetAddress } = req.body;
      const location = await Location.findByIdAndUpdate(
        req.params.id,
        { city, streetAddress },
        { new: true, runValidators: true }
      );

      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      res.status(200).json({ message: "Location updated", location });
    } catch (err) {
      next(err);
    }
  },

  // Delete a location
  deleteLocation: async (req, res, next) => {
    try {
      const location = await Location.findByIdAndDelete(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      res.status(200).json({ message: "Location deleted" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = locationController;
