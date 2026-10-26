import express from 'express';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const historyFile = join(currentDirectory, 'data', 'chatHistory.json');
let chatHistory = [];
const connectedUsers = new Map();

try {
  const savedHistory = JSON.parse(readFileSync(historyFile, 'utf8'));
  if (Array.isArray(savedHistory)) {
    chatHistory = savedHistory;
  } else {
    console.error('Chat history is invalid; starting with an empty history.');
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    mkdirSync(join(currentDirectory, 'data'), { recursive: true });
    writeFileSync(historyFile, '[]\n');
  } else {
    console.error('Could not read chat history; starting with an empty history:', error);
  }
}

app.use(express.static(join(currentDirectory, 'public')));

function sanitizeText(text, maximumLength) {
  if (typeof text !== 'string') {
    return '';
  }

  return text.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maximumLength);
}

function getRoomUsers(room) {
  const users = [];

  for (const [socketId, user] of connectedUsers) {
    if (user.room === room) {
      users.push({ socketId, username: user.username });
    }
  }

  return users;
}

function updateUserLists() {
  const rooms = new Set();
  const onlineUsers = [];

  for (const [socketId, user] of connectedUsers) {
    rooms.add(user.room);
    onlineUsers.push({
      socketId,
      username: user.username,
      room: user.room
    });
  }

  for (const room of rooms) {
    io.to(room).emit('room:users', getRoomUsers(room));
  }

  io.emit('users:online', onlineUsers);
}

function sendRoomNotice(room, message) {
  io.to(room).emit('room:notice', message);
}

function saveMessage(message) {
  chatHistory.push(message);

  try {
    writeFileSync(historyFile, JSON.stringify(chatHistory, null, 2));
    return true;
  } catch (error) {
    chatHistory.pop();
    console.error('Could not save chat history:', error);
    return false;
  }
}

io.on('connection', (socket) => {
  socket.on('room:join', (details) => {
    const username = sanitizeText(details && details.username, 30);
    const room = sanitizeText(details && details.room, 30);

    if (!username || !/^[a-zA-Z0-9 _-]+$/.test(room)) {
      socket.emit('chat:error', 'Enter a display name and a room using letters, numbers, spaces, _ or -.');
      return;
    }

    const previousUser = connectedUsers.get(socket.id);

    if (previousUser && previousUser.room === room && previousUser.username === username) {
      socket.emit('room:history', chatHistory.filter((message) => message.room === room).slice(-50));
      return;
    }

    if (previousUser) {
      socket.leave(previousUser.room);
      connectedUsers.delete(socket.id);
      sendRoomNotice(previousUser.room, previousUser.username + ' left the room.');
    }

    connectedUsers.set(socket.id, { username, room });
    socket.join(room);

    socket.emit('room:history', chatHistory.filter((message) => message.room === room).slice(-50));
    sendRoomNotice(room, username + ' joined the room.');
    updateUserLists();
  });

  socket.on('room:message', (text) => {
    const user = connectedUsers.get(socket.id);
    const messageText = sanitizeText(text, 1000);

    if (!user || !messageText) {
      return;
    }

    const message = {
      username: user.username,
      room: user.room,
      text: messageText
    };

    if (!saveMessage(message)) {
      socket.emit('chat:error', 'The message could not be saved. Please try again.');
      return;
    }

    io.to(user.room).emit('room:message', message);
  });

  socket.on('room:typing', (isTyping) => {
    const user = connectedUsers.get(socket.id);

    if (user) {
      socket.to(user.room).emit('room:typing', {
        username: user.username,
        isTyping: Boolean(isTyping)
      });
    }
  });

  socket.on('private:message', (details) => {
    const user = connectedUsers.get(socket.id);
    const targetSocketId = details && details.targetSocketId;
    const targetUser = connectedUsers.get(targetSocketId);
    const text = sanitizeText(details && details.text, 1000);

    if (!user || !targetUser || targetSocketId === socket.id || !text) {
      socket.emit('chat:error', 'Choose an online user and enter a private message.');
      return;
    }

    const privateMessage = {
      fromSocketId: socket.id,
      fromUsername: user.username,
      toUsername: targetUser.username,
      text
    };

    io.to(targetSocketId).emit('private:message', privateMessage);
    socket.emit('private:sent', privateMessage);
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);

    if (user) {
      connectedUsers.delete(socket.id);
      sendRoomNotice(user.room, user.username + ' left the room.');
      updateUserLists();
    }
  });
});

server.listen(port, () => {
  console.log('Team chat is running at http://localhost:' + port);
});