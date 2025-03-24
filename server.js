const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// ✅ CORS Middleware
app.use(cors({
    origin: "https://mayankchoudhary.rf.gd",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
}));

// ✅ Basic Route (Check Server is Running)
app.get("/", (req, res) => {
    res.send("🚀 WebSocket Server is Running!");
});

// ✅ Create HTTP Server
const server = http.createServer(app);

// ✅ WebSocket Server Setup
const io = new Server(server, {
    cors: {
        origin: "https://mayankchoudhary.rf.gd",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    }
});

// ✅ Store Connected Users
let users = {}; 
let friendRequests = {}; 

// ✅ WebSocket Events
io.on("connection", (socket) => {
    console.log("🟢 User Connected:", socket.id);

    // ✅ Assign Unique ID
    if (!users[socket.id]) {
        users[socket.id] = { id: socket.id, friend: null };
    }
    io.to(socket.id).emit("userId", socket.id);

    // ✅ Send Friend Request
    socket.on("sendRequest", (toUserId) => {
        if (users[toUserId] && !users[toUserId].friend) {
            friendRequests[toUserId] = friendRequests[toUserId] || [];
            if (!friendRequests[toUserId].includes(socket.id)) {
                friendRequests[toUserId].push(socket.id);
                io.to(toUserId).emit("friendRequest", socket.id);
            }
        }
    });

    // ✅ Accept Friend Request
    socket.on("acceptRequest", (fromUserId) => {
        if (friendRequests[socket.id]?.includes(fromUserId)) {
            users[socket.id].friend = fromUserId;
            users[fromUserId].friend = socket.id;
            io.to(socket.id).emit("chatStarted", fromUserId);
            io.to(fromUserId).emit("chatStarted", socket.id);
            friendRequests[socket.id] = friendRequests[socket.id].filter(id => id !== fromUserId);
        }
    });

    // ✅ Typing Indicator
    socket.on("typing", (text) => {
        let friendId = users[socket.id]?.friend;
        if (friendId) {
            io.to(friendId).emit("displayTyping", text);
        }
    });

    // ✅ Send Message
    socket.on("sendMessage", (message) => {
        let friendId = users[socket.id]?.friend;
        if (friendId) {
            io.to(friendId).emit("receiveMessage", { sender: socket.id, text: message });
        }
    });

    // ✅ Disconnect Event
    socket.on("disconnect", () => {
        console.log("🔴 User Disconnected:", socket.id);
        
        let friendId = users[socket.id]?.friend;
        if (friendId && users[friendId]) {
            users[friendId].friend = null;
            io.to(friendId).emit("chatEnded");
        }
        if (friendRequests[socket.id]) {
            delete friendRequests[socket.id];
        }
        delete users[socket.id];
    });
});

// ✅ Port Setup (Fixed)
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server Running on http://localhost:${PORT}`);
});

