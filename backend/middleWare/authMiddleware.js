//this is a function to check wheather to provide access to endpoint or not this happens if user is login or logout
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

//this should be in .env
const JWT_SECRET = "ajay123";

const protect = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      res.status(401);
      throw new Error("Not authorized, Please login");
    }

    //Verify token
    const verified = jwt.verify(token, JWT_SECRET);

    //get user id from token
    const user = await User.findById(verified.id).select("-password");

    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, Please login");
  }
});

module.exports = protect;
