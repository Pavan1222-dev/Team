const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const db = require("./database/db");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Serve frontend files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// Handle Socket.IO connections
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    //join room listener
     socket.on("join-room", (data) => {
        const username = data.username;
        const room = data.room;

        socket.join(room);

        console.log(`${username} joined room: ${room}`);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
