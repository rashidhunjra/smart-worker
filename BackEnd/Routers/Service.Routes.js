const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/Service.Controller");

router.get("/getallservice", serviceController.getAllServices);

router.delete("/delete/:id", serviceController.deleteService);

module.exports = router;
