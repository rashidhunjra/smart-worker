const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const requestController = require("../controllers/Request.Controller");

// 1. Create a request
router.post("/request", auth, requestController.createRequest);
// 2. Get all requests (admin or worker-specific)
router.get("/all", auth, requestController.getAllRequests);
// 3. Get requests by customer
router.get("/customer", auth, requestController.getCustomerRequests);
// 4. Get requests by worker
router.get("/worker", auth, requestController.getWorkerRequests);
// 5. Update request status (by worker or admin)
router.patch("/status/:id", auth, requestController.updateRequestStatus);
// 6. Cancel request (by customer)
router.patch("/cancel/:id", auth, requestController.cancelRequest);

module.exports = router;
