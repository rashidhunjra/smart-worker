const express = require("express");
const app = express();
const customerRouter = require("./Routers/Customer.Routes");
const workerRouter = require("./Routers/Worker.Routes");
const serviceRouter = require("./Routers/Service.Routes");
const requestRouter = require("./Routers/Request.Routes");
const dbConnect = require("./database/index");
const { PORT } = require("./config/index");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middleware/errorHandler");
app.use(express.json());
app.use(cookieParser()); // Parse cookies
app.use(customerRouter);
app.use(workerRouter);
app.use(serviceRouter);
app.use(requestRouter);
dbConnect();
app.use(errorHandler);
app.listen(PORT, () => console.log(`The backend is running on: ${PORT}`));
