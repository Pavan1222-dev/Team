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
//----------------------------------------------------------//


// Handle Socket.IO connections
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
//----------------------------------------------------------//


//--------------Join Room Listener----------------------//
socket.on("join-room", async (data) => {
    const username = data.username.trim();
    const room = data.room;
    
    //50 messages displayed
    const getMessages = db.prepare(`
    SELECT sender, message, created_at
    FROM messages
    WHERE room = ? AND type = 'room'
    ORDER BY id DESC
    LIMIT 50
    `);
    const history = getMessages.all(room).reverse();
    socket.emit("message-history", history);
    // 

    if (!username || !["general", "development"].includes(room)) {
        return;
    }

    socket.join(room);
    socket.to(room).emit("system-message", `${username} joined the room`);

    //fetching the sockets of a room
    const socketsInRoom = await io.in(room).fetchSockets();
    const onlineUsers = socketsInRoom.map((client) => {
        return client.data.username;
    });
    io.to(room).emit("online-users", onlineUsers);
    //

    socket.data.username = username;
    socket.data.room = room;

    console.log(`${username} joined room: ${room}`);
});
//-----------------------------------------------------------//


//Message input event listener at server side
socket.on("typing", () => {
    const username = socket.data.username;
    const room = socket.data.room;

    if (!username || !room) {
        return;
    }
    socket.to(room).emit("user-typing", username);
});

//Stop typing event listener
socket.on("stop-typing", () => {
    const username = socket.data.username;
    const room = socket.data.room;

    if (!username || !room) {
        return;
    }

    socket.to(room).emit("user-stop-typing", username);
});
//------------------------------------------------------------------//
//------------------------------------------------------------------//


//Send-message receiver
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

    // Save message in SQLite
    const insertMessage = db.prepare(`
        INSERT INTO messages (room, sender, message, type)
        VALUES (?, ?, ?, ?)
    `);
     insertMessage.run(room, username, cleanMessage, "room");

    //Broadcast message to everyone
        io.to(room).emit("new-message", {
            username: username,
            message: cleanMessage
        });
    });
//-----------------------------------------------//

//-----------------------------Private message receiving----------------------------//
socket.on("private-message", (data) => {
    if (
        !data ||
        typeof data.recipient !== "string" ||
        typeof data.message !== "string"
    ) {
        return;
    }

    const sender = socket.data.username;
    const room = socket.data.room;
    const recipient = data.recipient.trim();
    const message = data.message.trim();

    if (!sender || !room || !recipient || !message) {
        return;
    }

    // Find the recipient's socket in the same room
    const recipientSocket = [...io.sockets.sockets.values()].find(
        (client) =>
            client.data.username === recipient &&
            client.data.room === room
    );

    if (!recipientSocket) {
        socket.emit("private-message-error", "Recipient is not online in this room.");
        return;
    }
    // Save private message in SQLite
    const insertMessage = db.prepare(`
        INSERT INTO messages (room, sender, recipient, message, type)
        VALUES (?, ?, ?, ?, ?)
    `);
    insertMessage.run(room, sender, recipient, message, "private");
    //-//

    // Send the private message to the recipient
    recipientSocket.emit("private-message", {
        sender: sender,
        message: message
    });

    // Also send a copy to the sender
    socket.emit("private-message", {
        sender: `You → ${recipient}`,
        message: message
    });
});

//---------------------Private messages history loading ----------------------//
socket.on("load-private-history", (recipient) => {
    const username = socket.data.username;
    const room = socket.data.room;

    if (
        !username ||
        !room ||
        typeof recipient !== "string" ||
        !recipient.trim() ||
        recipient === username
    ) {
        return;
    }

    const getPrivateMessages = db.prepare(`
        SELECT sender, recipient, message, created_at
        FROM messages
        WHERE room = ?
          AND type = 'private'
          AND (
              (sender = ? AND recipient = ?)
              OR
              (sender = ? AND recipient = ?)
          )
        ORDER BY id ASC
    `);

    const history = getPrivateMessages.all(
        room,
        username,
        recipient,
        recipient,
        username
    );

    socket.emit("private-message-history", history);
});
//---------------------------------------------------------------------//

//--------------------------------------------------------------------------//

//Disconneting the Socket
    socket.on("disconnect", async () => {
        const room = socket.data.room;
        const username = socket.data.username;
        if (!room) {
            return;
        }
        socket.to(room).emit("system-message", `${username} left the room`);
        
        const socketsInRoom = await io.in(room).fetchSockets();

        const onlineUsers = socketsInRoom.map((client) => {
            return client.data.username;
        });
        io.to(room).emit("online-users", onlineUsers);
    });
//----------------------------------------------------------//
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
