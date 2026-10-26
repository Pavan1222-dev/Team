const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const storage = require('./storage');
const sanitize = require('./sanitize');

const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.use(express.static(path.join(__dirname, '..', 'public')));


let onlineUsers = {};


function getUsersInRoom(roomName) {
  let people = [];
  for (let socketId in onlineUsers) {
    if (onlineUsers[socketId].room === roomName) {
      people.push(onlineUsers[socketId]);
    }
  }
  return people;
}

io.on('connection', function (socket) {


  socket.on('room:join', async function (data) {
    let safeName = sanitize.makeSafeText(data.name);
    let safeRoom = sanitize.makeSafeText(data.room) || 'general';

    if (!safeName) return;


    onlineUsers[socket.id] = {
      id: socket.id,
      name: safeName,
      room: safeRoom
    };

    socket.join(safeRoom);


    let history = await storage.getRecentMessages(safeRoom);
    socket.emit('room:history', history);


    io.to(safeRoom).emit('system:notice', `${safeName} joined the room.`);


    io.to(safeRoom).emit('presence:update', getUsersInRoom(safeRoom));
  });


  socket.on('message:send', async function (text) {
    let user = onlineUsers[socket.id];
    if (!user) return;

    let safeText = sanitize.makeSafeText(text);
    if (!safeText) return;

    let messageObj = {
      senderId: socket.id,
      senderName: user.name,
      text: safeText,
      time: new Date().toLocaleTimeString()
    };


    await storage.addMessage(user.room, messageObj);
    io.to(user.room).emit('message:new', messageObj);
  });


  socket.on('typing:set', function (isTyping) {
    let user = onlineUsers[socket.id];
    if (!user) return;

    socket.to(user.room).emit('typing:update', {
      name: user.name,
      isTyping: isTyping
    });
  });


  socket.on('private:send', function (data) {
    let sender = onlineUsers[socket.id];
    if (!sender) return;

    let safeText = sanitize.makeSafeText(data.text);
    let targetSocketId = data.targetId;

    let privateMsg = {
      senderName: sender.name,
      text: safeText,
      time: new Date().toLocaleTimeString()
    };


    io.to(targetSocketId).emit('private:new', privateMsg);
    io.to(socket.id).emit('private:new', privateMsg);
  });


  socket.on('disconnect', function () {
    let user = onlineUsers[socket.id];
    if (user) {
      io.to(user.room).emit('system:notice', `${user.name} left the room.`);
      delete onlineUsers[socket.id];
      io.to(user.room).emit('presence:update', getUsersInRoom(user.room));
    }
  });

});

const PORT = 3001;
server.listen(PORT, function () {
  console.log(`Team Chat running on http://localhost:${PORT}`);
});