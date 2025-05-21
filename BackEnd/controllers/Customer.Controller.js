const Joi = require("joi");
const bcrypt = require("bcrypt");
const JWTService = require("../utils/JWTservices"); // Import updated JWTService
const Customer = require("../models/User.Model");
const formatCustomer = require("../utils/formatCustomer");
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}/;

const customerController = {
  // Register
  register: async (req, res, next) => {
    const CustomerRegisterSchema = Joi.object({
      name: Joi.string().max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattern).required(),
      confirmPassword: Joi.ref("password"),
    });

    const { error } = CustomerRegisterSchema.validate(req.body);
    if (error) return next(error);

    const { name, email, password } = req.body;

    try {
      const emailInUse = await Customer.exists({ email });
      if (emailInUse) {
        return next({
          status: 409,
          message: "Email already registered, use another email",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newCustomer = new Customer({
        name,
        email,
        password: hashedPassword,
      });
      const savedCustomer = await newCustomer.save();

      const { accessToken, refreshToken } =
        JWTService.generateTokens(savedCustomer);

      res.cookie("accessToken", accessToken, {
        maxAge: 1000 * 60 * 60, // 1 hour
        httpOnly: true,
      });

      res.cookie("refreshToken", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
      });

      return res.status(201).json({
        success: true,
        customer: formatCustomer(savedCustomer),
        accessToken, // Send the access token in the response as well
        auth: true,
      });
    } catch (err) {
      return next(err);
    }
  },

  // Login
  login: async (req, res, next) => {
    const CustomerLoginSchema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattern).required(),
    });

    const { error } = CustomerLoginSchema.validate(req.body);
    if (error) return next(error);

    const { email, password } = req.body;

    try {
      const customer = await Customer.findOne({ email });
      if (!customer) {
        return next({ status: 401, message: "Invalid email" });
      }

      const isMatch = await bcrypt.compare(password, customer.password);
      if (!isMatch) {
        return next({ status: 401, message: "Invalid password" });
      }

      const { accessToken, refreshToken } = JWTService.generateTokens(customer);

      res.cookie("accessToken", accessToken, {
        maxAge: 1000 * 60 * 60, // 1 hour
        httpOnly: true,
      });

      res.cookie("refreshToken", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
      });

      return res.status(200).json({
        success: true,
        customer: formatCustomer(customer),
        accessToken, // Send the access token in the response
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
    return res.status(200).json({ customer: null, auth: false });
  },
};

module.exports = customerController;
