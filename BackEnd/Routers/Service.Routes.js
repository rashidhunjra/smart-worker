const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/Service.Controller");

router.post("/createservice", serviceController.createService);
router.get("/getallservice", serviceController.getAllServices);
router.get("/getbyid/:id", serviceController.getServiceById);
router.put("/update/:id", serviceController.updateService);
router.delete("/delete/:id", serviceController.deleteService);

module.exports = router;
