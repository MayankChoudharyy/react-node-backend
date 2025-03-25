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
let friendRequests = {}; 

// ✅ Function to generate unique ID from 1 to 100
const generateUserId = () => {
    let id;
    do {
        id = Math.floor(Math.random() * 100) + 1; // Random number between 1 and 100
    } while (users[id]); // Ensure uniqueness
    return id.toString();
};

io.on("connection", (socket) => {
    const userId = generateUserId();
    console.log(`🟢 User Connected: ${userId}`);

    users[userId] = { id: userId, friend: null };
    io.to(socket.id).emit("userId", userId); // ✅ Send custom ID instead of socket.id

    socket.on("sendRequest", (toUserId) => {
        if (users[toUserId] && !users[toUserId].friend) {
            friendRequests[toUserId] = friendRequests[toUserId] || [];
            if (!friendRequests[toUserId].includes(userId)) {
                friendRequests[toUserId].push(userId);
                io.to(toUserId).emit("friendRequest", userId);
            }
        }
    });

    socket.on("acceptRequest", (fromUserId) => {
        if (friendRequests[userId]?.includes(fromUserId)) {
            users[userId].friend = fromUserId;
            users[fromUserId].friend = userId;
            io.to(userId).emit("chatStarted", fromUserId);
            io.to(fromUserId).emit("chatStarted", userId);
            friendRequests[userId] = friendRequests[userId].filter(id => id !== fromUserId);
        }
    });

    socket.on("typing", (text) => {
        let friendId = users[userId]?.friend;
        if (friendId) {
            io.to(friendId).emit("displayTyping", text);
        }
    });

    socket.on("sendMessage", (message) => {
        let friendId = users[userId]?.friend;
        if (friendId) {
            io.to(friendId).emit("receiveMessage", { sender: userId, text: message });
        }
    });

    socket.on("disconnect", () => {
        console.log("🔴 User Disconnected:", userId);

        let friendId = users[userId]?.friend;
        if (friendId && users[friendId]) {
            users[friendId].friend = null;
            io.to(friendId).emit("chatEnded");
        }
        if (friendRequests[userId]) {
            delete friendRequests[userId];
        }
        delete users[userId];
    });
});

server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server Running on Port ${PORT}`));
