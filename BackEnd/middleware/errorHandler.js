const { ValidationError } = require("joi"); //Imports ValidationError from the Joi package.Joi is a library used for data validation (e.g., checking if user input is valid)

const errorHandler = (error, req, res, next) => {
  //default error
  let status = 500;
  let data = {
    message: "internal server error",
  };
  if (error instanceof ValidationError) {
    status = 401;
    data.message = error.message;
    return res.status(status).json(data);
  }
  if (error.status) {
    status = error.status;
  }
  if (error.message) {
    data.message = error.message;
  }
  return res.status(status).json(data);
};

module.exports = errorHandler;
