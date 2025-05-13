const express = require("express");
const router = express.Router();
const customerController = require("../controllers/Customer.Controller");
const auth = require("../middleware/auth");

router.post("/signUpCustomer", customerController.register);
router.post("/loginCustomer", customerController.login);
router.post("/logoutCustomer", auth, customerController.logout);
module.exports = router;
