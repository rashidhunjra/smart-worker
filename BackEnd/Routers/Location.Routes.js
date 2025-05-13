const express = require("express");
const router = express.Router();
const locationController = require("../controllers/Location.Controller");

router.post("/addLocation", locationController.createLocation);
router.get("/getAllLocation", locationController.getAllLocations);
router.get("/getLocation/:id", locationController.getLocationById);
router.put("/updateLocation/:id", locationController.updateLocation);
router.delete("/deleteLocation/:id", locationController.deleteLocation);

module.exports = router;
