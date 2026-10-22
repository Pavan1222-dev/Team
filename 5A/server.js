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
//---------------------------//


// Handle Socket.IO connections
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
//----------------------------------//

//join room listener
    socket.on("join-room", async (data) => {
    const username = data.username.trim();
    const room = data.room;

    if (!username || !["general", "development"].includes(room)) {
        return;
    }

    socket.join(room);

    //fetching the sockets of a room
    const socketsInRoom = await io.in(room).fetchSockets();
    const onlineUsers = socketsInRoom.map((client) => {
        return client.data.username;
    });
    io.to(room).emit("online-users", onlineUsers);
    //-//

    socket.data.username = username;
    socket.data.room = room;

    console.log(`${username} joined room: ${room}`);
    });
//-----------------------------------------------------------//


//on receiving of send-message
    socket.on("send-message", (message) => {
    if (typeof message !== "string") {
        return;
    }

    const username = socket.data.username;
    const room = socket.data.room;
    const cleanMessage = message.trim();

    if (!username || !room || !cleanMessage) {
        return;
    }

        io.to(room).emit("new-message", {
            username: username,
            message: cleanMessage
        });
    });

    //on disconnet
    socket.on("disconnect", async () => {
        const room = socket.data.room;

        if (!room) {
            return;
        }
        const socketsInRoom = await io.in(room).fetchSockets();

        const onlineUsers = socketsInRoom.map((client) => {
            return client.data.username;
        });
        io.to(room).emit("online-users", onlineUsers);
    });
    //-----------------------------------------------//
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
