const dotenv = require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const userRoute = require("./routes/userRoute");
const errorHandler = require("./middleWare/errorMiddleware");

const app = express();

//Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Routes middlewares
app.use("/api/users", userRoute);

//Routes
app.get("/", (req, res) => {
  res.send("Home page");
});

//error middleware
app.use(errorHandler);

//Connect to DB and start server
const PORT = 5000;
const uri = "mongodb://0.0.0.0:27017/pinvent";
mongoose.set("strictQuery", true);
mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Connected succesfully and server Running on Port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
