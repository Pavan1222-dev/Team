
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const HISTORY_FILE = path.join(__dirname, "messages.json");

// Serve frontend files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// Store connected users in memory
// socket.id -> { username, room }
const users = new Map();

// Store recent messages for each room
let messageHistory = {};

try {
  if (fs.existsSync(HISTORY_FILE)) {
    messageHistory = JSON.parse(
      fs.readFileSync(HISTORY_FILE, "utf8")
    );
  }
} catch (error) {
  console.error("Could not read message history:", error.message);
  messageHistory = {};
}

// Save messages to the JSON file
let saveQueue = Promise.resolve();

function saveHistory() {
  saveQueue = saveQueue
    .then(() =>
      fs.promises.writeFile(
        HISTORY_FILE,
        JSON.stringify(messageHistory, null, 2)
      )
    )
    .catch((error) => {
      console.error("Could not save messages:", error.message);
    });

  return saveQueue;
}

// Validate and clean user-provided text
function cleanText(value, maxLength = 1000) {
  if (typeof value !== "string") return "";

  return value.trim().slice(0, maxLength);
}

// Get users currently connected to a room
function getRoomUsers(room) {
  return [...users.values()]
    .filter((user) => user.room === room)
    .map((user) => user.username);
}

// Send the current online user list to a room
function updateOnlineUsers(room) {
  io.to(room).emit("online_users", getRoomUsers(room));
}

// Keep the latest 50 messages for each room
function addRoomMessage(room, message) {
  if (!messageHistory[room]) {
    messageHistory[room] = [];
  }

  messageHistory[room].push(message);
  messageHistory[room] =
    messageHistory[room].slice(-50);

  saveHistory();
}

// Handle new Socket.IO connections
io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // Join or create a chat room
  socket.on("join_room", async (data, callback) => {
    const username = cleanText(data?.username, 30);
    const room = cleanText(data?.room, 40);

    if (!username || !room) {
      if (typeof callback === "function") {
        callback({
          success: false,
          error: "Enter a display name and room name."
        });
      }
      return;
    }

    const previousUser = users.get(socket.id);

    // Support changing rooms without creating duplicate presence
    if (previousUser) {
      const oldRoom = previousUser.room;

      socket.to(oldRoom).emit("system_message", {
        text: `${previousUser.username} left the room.`,
        time: new Date().toISOString()
      });

      socket.leave(oldRoom);
      users.delete(socket.id);
      updateOnlineUsers(oldRoom);
    }

    users.set(socket.id, { username, room });
    socket.join(room);

    // Send recent history only to this joining user
    socket.emit("message_history", {
      room,
      messages: (messageHistory[room] || []).slice(-50)
    });

    // Announce the new member to other users
    socket.to(room).emit("system_message", {
      text: `${username} joined the room.`,
      time: new Date().toISOString()
    });

    updateOnlineUsers(room);

    console.log(`${username} joined ${room}`);

    if (typeof callback === "function") {
      callback({ success: true, username, room });
    }
  });

  // Send a group message
  socket.on("send_message", (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const text = cleanText(data?.text);
    if (!text) return;

    const message = {
      id: `${Date.now()}-${socket.id}`,
      username: user.username,
      room: user.room,
      text,
      time: new Date().toISOString()
    };

    addRoomMessage(user.room, message);
    io.to(user.room).emit("receive_message", message);
  });

  // Notify others when a user is typing
  socket.on("typing", (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;

    socket.to(user.room).emit("user_typing", {
      username: user.username,
      isTyping: Boolean(isTyping)
    });
  });

  // Send a private message to an online user
  socket.on("private_message", (data, callback) => {
    const sender = users.get(socket.id);
    if (!sender) return;

    const recipientName = cleanText(data?.toUsername, 30);
    const text = cleanText(data?.text);

    if (!recipientName || !text) return;

    const recipient = [...users.entries()].find(
      ([id, user]) =>
        id !== socket.id &&
        user.username.toLowerCase() ===
          recipientName.toLowerCase()
    );

    if (!recipient) {
      if (typeof callback === "function") {
        callback({
          success: false,
          error: "That user is not online."
        });
      }
      return;
    }

    const [recipientSocketId, recipientUser] = recipient;

    const message = {
      from: sender.username,
      to: recipientUser.username,
      text,
      time: new Date().toISOString()
    };

    io.to(recipientSocketId).emit(
      "receive_private_message",
      message
    );

    socket.emit("receive_private_message", message);

    if (typeof callback === "function") {
      callback({ success: true });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const user = users.get(socket.id);

    if (user) {
      socket.to(user.room).emit("system_message", {
        text: `${user.username} left the room.`,
        time: new Date().toISOString()
      });

      users.delete(socket.id);
      updateOnlineUsers(user.room);

      console.log(`${user.username} disconnected`);
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Team Chat running at http://localhost:${PORT}`);
});
