const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const corsOptions = {
    origin: "https://mayankchoudhary.rf.gd", // Frontend URL added
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
};
app.use(cors(corsOptions));

const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions
});

let users = {}; 
let friendRequests = {}; 

io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);

    if (!users[socket.id]) {
        users[socket.id] = { id: socket.id, friend: null };
    }
    io.to(socket.id).emit("userId", socket.id);

    socket.on("sendRequest", (toUserId) => {
        if (users[toUserId] && !users[toUserId].friend) {
            friendRequests[toUserId] = friendRequests[toUserId] || [];
            if (!friendRequests[toUserId].includes(socket.id)) {
                friendRequests[toUserId].push(socket.id);
                io.to(toUserId).emit("friendRequest", socket.id);
            }
        }
    });

    socket.on("acceptRequest", (fromUserId) => {
        if (friendRequests[socket.id]?.includes(fromUserId)) {
            users[socket.id].friend = fromUserId;
            users[fromUserId].friend = socket.id;
            io.to(socket.id).emit("chatStarted", fromUserId);
            io.to(fromUserId).emit("chatStarted", socket.id);
            friendRequests[socket.id] = friendRequests[socket.id].filter(id => id !== fromUserId);
        }
    });

    socket.on("typing", (text) => {
        let friendId = users[socket.id]?.friend;
        if (friendId) {
            io.to(friendId).emit("displayTyping", text);
        }
    });

    socket.on("sendMessage", (message) => {
        let friendId = users[socket.id]?.friend;
        if (friendId) {
            io.to(friendId).emit("receiveMessage", { sender: socket.id, text: message });
        }
    });

    socket.on("disconnect", () => {
        let friendId = users[socket.id]?.friend;
        if (friendId && users[friendId]) {
            users[friendId].friend = null;
            io.to(friendId).emit("chatEnded");
        }
        if (friendRequests[socket.id]) {
            delete friendRequests[socket.id];
        }
        console.log("User Disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server Running on Port ${PORT}`));
