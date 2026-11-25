const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const UserModel = require("../models/UserModel");

const register = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (await UserModel.exists({ email })) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 5);
    await UserModel.create({ fullName, email, password: hash });
    res.status(200).json({ message: "Signup successful" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Something went wrong, please try again" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Login failed" });
    }

    const userId = user._id;
    const userName = user.fullName;
    const token = jwt.sign({ userId, userName }, process.env.JWT_SECRET);
    res.status(200).json({ message: "Login successful", token, userName, userId });
  } catch {
    res.status(500).json({ message: "Something went wrong, please try again" });
  }
};

module.exports = { register, login };
