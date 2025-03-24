const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let users = {}; 
let friendRequests = {}; 

io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);

    socket.on("start", () => {
        users[socket.id] = { id: socket.id, friend: null };
        io.to(socket.id).emit("userId", socket.id);
    });

    socket.on("sendRequest", (toUserId) => {
        if (users[toUserId]) {
            friendRequests[toUserId] = socket.id;
            io.to(toUserId).emit("friendRequest", socket.id);
        }
    });

    socket.on("acceptRequest", (fromUserId) => {
        if (friendRequests[socket.id] === fromUserId) {
            users[socket.id].friend = fromUserId;
            users[fromUserId].friend = socket.id;
            io.to(socket.id).emit("chatStarted", fromUserId);
            io.to(fromUserId).emit("chatStarted", socket.id);
        }
    });

    socket.on("typing", (text) => {
        let friendId = users[socket.id]?.friend;
        if (friendId) {
            io.to(friendId).emit("displayTyping", text);
        }
    });

    socket.on("stopTyping", () => {
        let friendId = users[socket.id]?.friend;
        if (friendId) {
            io.to(friendId).emit("clearTyping");
        }
    });

    socket.on("sendMessage", (message) => {
        let friendId = users[socket.id]?.friend;
        if (friendId) {
            io.to(friendId).emit("receiveMessage", message);
        }
    });

    socket.on("disconnect", () => {
        let friendId = users[socket.id]?.friend;
        if (friendId && users[friendId]) {
            users[friendId].friend = null;
            io.to(friendId).emit("chatEnded");
        }
        delete users[socket.id];
        console.log("User Disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server Running on Port ${PORT}`));