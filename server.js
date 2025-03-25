const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
}));

app.get("/", (req, res) => {
    res.send("🚀 WebSocket Server is Running!");
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    },
    allowEIO3: true
});

let users = {}; 
let socketToUser = {}; // ✅ Mapping socket.id to userId
let friendRequests = {}; 

// ✅ Function to generate unique ID from 1 to 100
const generateUserId = () => {
    let id;
    do {
        id = Math.floor(Math.random() * 100) + 1; // Random number between 1 and 100
    } while (Object.values(users).includes(id)); // Ensure uniqueness
    return id.toString();
};

io.on("connection", (socket) => {
    const userId = generateUserId();
    console.log(`🟢 User Connected: ${userId} (Socket ID: ${socket.id})`);

    users[userId] = socket.id; // ✅ Store mapping of userId → socket.id
    socketToUser[socket.id] = userId; // ✅ Store mapping of socket.id → userId

    io.to(socket.id).emit("userId", userId); // ✅ Send custom ID to user

    socket.on("sendRequest", (toUserId) => {
        if (users[toUserId]) {
            let toSocketId = users[toUserId]; // ✅ Get socket.id of recipient
            io.to(toSocketId).emit("friendRequest", userId);
        }
    });

    socket.on("acceptRequest", (fromUserId) => {
        if (users[fromUserId]) {
            let fromSocketId = users[fromUserId];
            io.to(fromSocketId).emit("chatStarted", userId);
            io.to(socket.id).emit("chatStarted", fromUserId);
        }
    });

    socket.on("typing", (text) => {
        let friendId = Object.keys(users).find(id => users[id] === socket.id);
        if (friendId) {
            io.to(users[friendId]).emit("displayTyping", text);
        }
    });

    socket.on("sendMessage", (message) => {
        let friendId = Object.keys(users).find(id => users[id] === socket.id);
        if (friendId) {
            io.to(users[friendId]).emit("receiveMessage", { sender: userId, text: message });
        }
    });

    socket.on("disconnect", () => {
        console.log("🔴 User Disconnected:", userId);

        let friendId = Object.keys(users).find(id => users[id] === socket.id);
        if (friendId) {
            io.to(users[friendId]).emit("chatEnded");
        }

        delete users[userId];
        delete socketToUser[socket.id];
    });
});

server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server Running on Port ${PORT}`));
