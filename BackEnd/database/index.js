const mongoose = require("mongoose");

const { MONGODB_CONNECTION_STRING } = require("../config/index");
// const connectionString = "mongodb+srv://mrashidr254:123rashid@cluster0.a2bla.mongodb.net/coin-bounce";

const dbConnect = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_CONNECTION_STRING);
    console.log(`Database connected to host: ${conn.connection.host}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
};

module.exports = dbConnect;
