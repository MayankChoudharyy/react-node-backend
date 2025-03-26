const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 443;

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
    transports: ["websocket", "polling"], // ✅ WebSocket + Polling Support
    allowEIO3: true
});

let users = {}; 
let socketToUser = {}; 
let friendRequests = {}; 
let friends = {}; // ✅ Friend mapping (userId -> friendId)

// ✅ Function to generate unique ID from 1 to 100
const generateUserId = () => {
    let id;
    do {
        id = Math.floor(Math.random() * 100) + 1;
    } while (Object.values(users).includes(id));
    return id.toString();
};

io.on("connection", (socket) => {
    const userId = generateUserId();
    console.log(`🟢 User Connected: ${userId} (Socket ID: ${socket.id})`);

    users[userId] = socket.id; 
    socketToUser[socket.id] = userId; 

    io.to(socket.id).emit("userId", userId);

    // ✅ Friend request send karega
    socket.on("sendRequest", (toUserId) => {
        if (users[toUserId]) {
            let toSocketId = users[toUserId];
            io.to(toSocketId).emit("friendRequest", userId);
        }
    });

    // ✅ Friend request accept karega
    socket.on("acceptRequest", (fromUserId) => {
        if (users[fromUserId] && users[userId]) {
            friends[userId] = fromUserId;
            friends[fromUserId] = userId;
            io.to(users[fromUserId]).emit("chatStarted", userId);
            io.to(users[userId]).emit("chatStarted", fromUserId);
        }
    });

    // ✅ Typing indicator sirf friend ke pass bheje
    socket.on("typing", (text) => {
        let friendId = friends[userId];
        if (friendId && users[friendId]) {
            io.to(users[friendId]).emit("displayTyping", text);
        }
    });

    // ✅ Message sirf connected friend ko bheje
    socket.on("sendMessage", (message) => {
        let friendId = friends[userId];
        if (friendId && users[friendId]) {
            io.to(users[friendId]).emit("receiveMessage", { sender: userId, text: message });
        }
    });

    // ✅ User disconnect kare to friend ko notify kare
    socket.on("disconnect", () => {
        console.log("🔴 User Disconnected:", userId);

        let friendId = friends[userId];
        if (friendId && users[friendId]) {
            io.to(users[friendId]).emit("chatEnded");
        }

        delete users[userId];
        delete socketToUser[socket.id];
        delete friends[userId];
    });
});

// ✅ WebSocket Connection Error Handling
io.engine.on("connection_error", (err) => {
    console.error("❌ WebSocket Connection Error:", err.message);
    console.error("🔍 Details:", err);
});

// ✅ Start Server (Ensure IPv4 & IPv6 Compatibility)
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server Running on Port ${PORT}`));
