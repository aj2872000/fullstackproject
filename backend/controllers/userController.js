const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
//this should be in .env
const JWT_SECRET = "ajay123";

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "1d" });
};

//register User
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  //validation
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be up to 6 characters");
  }

  //check if user email already exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("Email has alreaddy been registered");
  }

  //create new user if not present
  const user = await User.create({
    name,
    email,
    password,
  });

  //Generate Token
  const token = generateToken(user._id);

  //Send HTTP-only cookie to my client
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), //equal to 1 day
    sameSite: "none",
    secure: true,
  });

  if (user) {
    const { _id, name, email, photo, phone, bio } = user;
    res.status(201).json({
      _id,
      name,
      email,
      photo,
      phone,
      bio,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

//Login user
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  //validate request
  if (!email || !password) {
    res.status(400);
    throw new Error("please add email and password");
  }

  //check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error("User not found , please signup");
  }

  //if user exists, check if password is correct
  const passwordIsCorrect = await bcrypt.compare(password, user.password);

  //Generate Token
  const token = generateToken(user._id);

  //Send HTTP-only cookie to my client
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), //equal to 1 day
    sameSite: "none",
    secure: true,
  });

  if (user && passwordIsCorrect) {
    const { _id, name, email, photo, phone, bio } = user;
    res.status(200).json({
      _id,
      name,
      email,
      photo,
      phone,
      bio,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid email or password");
  }
});

//logout user
const logout = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "none",
    secure: true,
  });
  return res.status(200).json({ message: "Successfully Logged Out" });
});

//getuser data
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    const { _id, name, email, photo, phone, bio } = user;
    res.status(200).json({
      _id,
      name,
      email,
      photo,
      phone,
      bio,
    });
  } else {
    res.status(400);
    throw new Error("User not found");
  }
});

//get login status
const loginStatus = asyncHandler(async (req, res) => {
  //get token from cookies
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }
  //verify the token
  const verified = jwt.verify(token, JWT_SECRET);
  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});

//update user data on edit
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    const { name, email, photo, phone, bio } = user;
    user.email = email;
    user.name = req.body.name || name;
    user.phone = req.body.phone || phone;
    user.bio = req.body.bio || bio;
    user.photo = req.body.photo || photo;

    const updateduser = await user.save();
    res.status(200).json({
      _id: updateduser._id,
      name: updateduser.name,
      email: updateduser.email,
      photo: updateduser.photo,
      phone: updateduser.phone,
      bio: updateduser.bio,
    });
  } else {
    res.status(404);
    throw new Error("user not found");
  }
});

//change password
const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(400);
    throw new Error("User not found, please signup");
  }

  const { oldPassword, password } = req.body;
  //validate
  if (!oldPassword || !password) {
    res.status(400);
    throw new Error("please add old and new password");
  }

  //check if password matches password is DB
  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

  //save new password
  if (user && passwordIsCorrect) {
    user.password = password;
    await user.save();
    res.status(200).send("password change successful");
  } else {
    res.status(400);
    throw new Error("old password is incorrect");
  }
});

//forgot password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("User doen not exist");
  }

  //delete token if it exists in the DB
  let token = await Token.findOne({ userId: user._id });
  if (token) {
    await token.deleteOne();
  }

  //create reset token
  let resetToken = crypto.randomBytes(32).toString("hex") + user._id;
  console.log(resetToken);
  
  //Hash token before saving to DB
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  //save token to DB
  await new Token({
    userId: user._id,
    token: hashedToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * (60 * 1000), //thirty minutes
  }).save();

  //construct rest url
  const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;

  //reset message
  const message = `<h2>Hello ${user.name}</h2>
  <p>Please use the url below to reset your password</p>
  <p>This reset link is valid for only 30 min</p>
  
  <a href=${resetUrl}>${resetUrl}</a>
   <p>Regards...</p>
   <p>Pinvent Team></p>
   `;
  const subject = "password reset request";
  const send_to = user.email;
  const send_from = process.env.EMAIL_USER;
  try {
    await sendEmail(subject, message, send_to, send_from);
    res.status(200).json({ success: true, message: "reset email sent" });
  } catch (error) {
    res.status(500);
    throw new Error("email not sent,please try again");
  }
});

//reset password
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { resetToken } = req.params;

  //hash token then compare to token in DB
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  //find token in DB
  const userToken = await Token.findOne({
    token: hashedToken,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired Token");
  }

  //find user if not expired
  const user = await User.findOne({ _id: userToken.userId });
  user.password = password;
  await user.save();
  res.status(200).json({
    message: "Password reset successful, please login",
  });
});

module.exports = {
  registerUser,
  loginUser,
  logout,
  getUser,
  loginStatus,
  updateUser,
  changePassword,
  forgotPassword,
  resetPassword,
};
