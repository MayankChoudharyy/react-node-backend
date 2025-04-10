require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 443;

const MONGODB_URI = "mongodb+srv://baggarmrjat:292528295461@cluster0.o273b.mongodb.net/miki-chat";
// const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
console.log("🚀 ENV CHECK:", {
    MONGODB_URI,
    JWT_SECRET,
    EMAIL_USER,
    EMAIL_PASS,
  });
  
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  otp: String,
  userId: Number,
});
const User = mongoose.model("User", userSchema);

// 🔐 Register
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "User already exists" });

  const newUser = new User({ name, email, password });
  await newUser.save();
  res.json({ message: "Registered successfully" });
});

// 🔐 Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.password !== password) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET);
  res.json({ token, userId: user._id });
});

// 📩 Send OTP
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "Email not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  await user.save();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: "Miki Chat - OTP",
    text: `Your OTP is ${otp}`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) return res.status(500).json({ message: "Failed to send OTP" });
    res.json({ message: "OTP sent" });
  });
});
// 🧾 Token verify
// ... above part of server.js remains the same

// Modified Register with userId 1–1000
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });
  
    // 🔢 Assign unique ID between 1–1000
    let userId;
    const usedIds = await User.find({}, "userId").then(users => users.map(u => u.userId));
    for (let i = 1; i <= 1000; i++) {
      if (!usedIds.includes(i)) {
        userId = i;
        break;
      }
    }
  
    if (!userId) return res.status(500).json({ message: "All user IDs are taken" });
  
    const newUser = new User({ name, email, password, userId });
    await newUser.save();
    res.json({ message: "Registered successfully" });
  });
  
  // Modified Login (no change)
  app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password !== password)
      return res.status(401).json({ message: "Invalid credentials" });
  
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token, userId: user.userId }); // ✅ Add userId here
  });
  
  // Modified Verify Token
  app.post("/verify-token", async (req, res) => {
    const { token } = req.body;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) throw new Error("User not found");
      res.json({ success: true, userId: user.userId });
    } catch {
      res.status(401).json({ message: "Invalid token" });
    }
  });
  
  // 🧠 SOCKET HANDLING with JWT
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });
  
  let users = {}; // userId => socket.id
  let friends = {}; // userId => friendId
  
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.query.token;
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      socket.userId = user.userId.toString();
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });
  
  io.on("connection", (socket) => {
    const userId = socket.userId;
    users[userId] = socket.id;
    socket.emit("userId", userId);
  
    socket.on("sendRequest", (toUserId) => {
      if (users[toUserId]) {
        io.to(users[toUserId]).emit("friendRequest", userId);
      }
    });
  
    socket.on("acceptRequest", (fromUserId) => {
      if (users[fromUserId] && users[userId]) {
        friends[userId] = fromUserId;
        friends[fromUserId] = userId;
        io.to(users[fromUserId]).emit("chatStarted", userId);
        io.to(users[userId]).emit("chatStarted", fromUserId);
      }
    });
  
    socket.on("typing", (text) => {
      const friendId = friends[userId];
      if (friendId && users[friendId]) {
        io.to(users[friendId]).emit("displayTyping", text);
      }
    });
  
    socket.on("sendMessage", (message) => {
      const friendId = friends[userId];
      if (friendId && users[friendId]) {
        io.to(users[friendId]).emit("receiveMessage", { sender: userId, text: message });
      }
    });
  
    socket.on("disconnect", () => {
      const friendId = friends[userId];
      if (friendId && users[friendId]) {
        io.to(users[friendId]).emit("chatEnded");
      }
      delete users[userId];
      delete friends[userId];
    });
  });
  
  server.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server Running on Port ${PORT}`));
  
