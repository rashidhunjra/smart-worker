const Request = require("../models/Request.Model");
const User = require("../models/User.Model");
const moment = require("moment");
const cron = require("node-cron");
const { GMAIL_USER, GMAIL_APP_PASS } = require("../config/index");
const nodemailer = require("nodemailer");

// ⏰ Cron job: clean up past availability slots every hour
cron.schedule("*/15 * * * *", async () => {
  try {
    await User.updateMany(
      {},
      { $pull: { availability: { date: { $lt: new Date() } } } }
    );
    console.log("Expired availability slots cleaned up.");
  } catch (err) {
    console.error("Cron job failed:", err);
  }
});

const requestController = {
  // 1. Create a request
  createRequest: async (req, res, next) => {
    try {
      const {
        workerId,
        serviceId,
        description,
        requestedDate,
        requestedTime,
        requestedEndTime,
      } = req.body;
      const customerId = req.user._id;
      // Prevent self-request
      if (workerId === customerId.toString()) {
        return res.status(400).json({
          message: "You cannot request a service from yourself.",
        });
      }

      // Load worker availability
      // Load worker availability
      const worker = await User.findById(workerId).select(
        "availableSlots name email"
      );
      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }

      // Parse & validate dates/times
      const reqDate = moment(requestedDate, "YYYY-MM-DD");
      const reqStart = moment(requestedTime, "HH:mm");
      const reqEnd = moment(requestedEndTime, "HH:mm");

      if (!reqDate.isValid() || !reqStart.isValid() || !reqEnd.isValid()) {
        return res
          .status(400)
          .json({ message: "Invalid date or time format." });
      }
      if (!reqStart.isBefore(reqEnd)) {
        return res
          .status(400)
          .json({ message: "Start time must be before end time." });
      }

      // Find covering availability slot
      const slot = worker.availableSlots.find((slot) => {
        const slotDate = moment(slot.date);
        const start = moment(slot.startTime, "HH:mm");
        const end = moment(slot.endTime, "HH:mm");
        const sameDay = slotDate.isSame(reqDate, "day");
        const withinTime =
          start.isSameOrBefore(reqStart) && end.isSameOrAfter(reqEnd);
        return sameDay && withinTime;
      });

      if (!slot) {
        return res.status(400).json({
          message: "Worker is not available at the requested date/time.",
        });
      }

      // Conflict check: no overlapping existing bookings
      const conflict = await Request.findOne({
        workerId,
        requestedDate: reqDate.toDate(),
        status: { $in: ["pending", "accepted"] },
        $or: [
          {
            requestedTime: { $lt: requestedEndTime },
            requestedEndTime: { $gt: requestedTime },
          },
        ],
      });

      if (conflict) {
        return res.status(409).json({
          message: "This time is already booked for this worker.",
        });
      }

      // Save the new request
      const newRequest = new Request({
        customerId,
        workerId,
        serviceId,
        description,
        requestedDate: reqDate.toDate(),
        requestedTime,
        requestedEndTime,
      });
      const savedRequest = await newRequest.save();

      // Notify worker via email
      const customer = await User.findById(customerId).select("name");
      const customerName = customer?.name || "A customer";

      if (worker.email) {
        try {
          const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
          });
          await transporter.sendMail({
            from: GMAIL_USER,
            to: worker.email,
            subject: "New Service Request Received",
            html: `
              <h3>New Request from ${customerName}</h3>
              <p><strong>Service Date:</strong> ${reqDate.format("YYYY-MM-DD")}</p>
              <p><strong>Time:</strong> ${requestedTime} - ${requestedEndTime}</p>
              <p><strong>Description:</strong> ${description || "No additional details provided."}</p>
            `,
          });
        } catch (emailError) {
          console.error("Email sending failed:", emailError.message);
        }
      }

      // Respond to client
      return res.status(201).json({
        message: "Request created successfully",
        request: savedRequest,
      });
    } catch (err) {
      return next(err);
    }
  },
  // 2. Get all requests
  getAllRequests: async (req, res, next) => {
    try {
      const requests = await Request.find()
        .populate("customerId", "name email")
        .populate("workerId", "name email")
        .populate("serviceId", "name");
      return res.status(200).json({ requests });
    } catch (err) {
      return next(err);
    }
  },

  // 3. Get requests by customer
  getCustomerRequests: async (req, res, next) => {
    try {
      const customerId = req.user._id;
      const requests = await Request.find({ customerId })
        .populate("workerId", "name email")
        .populate("serviceId", "name");
      return res.status(200).json({ requests });
    } catch (err) {
      return next(err);
    }
  },

  // 4. Get requests by worker
  getWorkerRequests: async (req, res, next) => {
    try {
      const workerId = req.user._id;
      const requests = await Request.find({ workerId })
        .populate("customerId", "name email")
        .populate("serviceId", "name");
      return res.status(200).json({ requests });
    } catch (err) {
      return next(err);
    }
  },

  // 5. Update request status
  updateRequestStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await Request.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ message: "Request not found" });
      }
      return res.status(200).json({
        message: "Request status updated",
        request: updated,
      });
    } catch (err) {
      return next(err);
    }
  },

  // 6. Cancel request
  cancelRequest: async (req, res, next) => {
    try {
      const { id } = req.params;
      const customerId = req.user._id;
      const request = await Request.findOne({ _id: id, customerId });
      if (!request) {
        return res
          .status(404)
          .json({ message: "Request not found or unauthorized" });
      }
      request.status = "cancelled";
      await request.save();
      return res.status(200).json({
        message: "Request cancelled successfully",
        request,
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = requestController;
