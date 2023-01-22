const dotenv = require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

const PORT = 5000;

const uri = "mongodb://0.0.0.0:27017";
//Connect to DB and start server
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
