const socket = io();

const joinForm = document.getElementById('join-form');
const chatScreen = document.getElementById('chat-screen');
const roomHeading = document.getElementById('room-heading');
const roomUsers = document.getElementById('room-users');
const messages = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');
const chatError = document.getElementById('chat-error');
const messageForm = document.getElementById('message-form');
const messageText = document.getElementById('message-text');
const privateForm = document.getElementById('private-form');
const privateRecipient = document.getElementById('private-recipient');
const privateText = document.getElementById('private-text');

let currentUser = null;
let typingTimeout = null;

function addMessage(label, text) {
  const item = document.createElement('li');
  item.textContent = label + ': ' + text;
  messages.appendChild(item);
}

function showRoomMessage(message) {
  addMessage(message.username, message.text);
}

joinForm.addEventListener('submit', (event) => {
  event.preventDefault();

  currentUser = {
    username: document.getElementById('display-name').value.trim(),
    room: document.getElementById('room-name').value.trim()
  };

  sessionStorage.setItem('teamChatUsername', currentUser.username);
  sessionStorage.setItem('teamChatRoom', currentUser.room);
  socket.emit('room:join', currentUser);
});

document.getElementById('leave-room').addEventListener('click', () => {
  sessionStorage.removeItem('teamChatUsername');
  sessionStorage.removeItem('teamChatRoom');
  socket.disconnect();
  window.location.reload();
});

socket.on('room:history', (history) => {
  messages.replaceChildren();
  typingIndicator.textContent = '';
  chatError.textContent = '';
  roomHeading.textContent = 'Room: ' + currentUser.room;
  joinForm.hidden = true;
  chatScreen.hidden = false;

  for (const message of history) {
    showRoomMessage(message);
  }
});

socket.on('room:message', showRoomMessage);

socket.on('room:notice', (message) => {
  addMessage('Notice', message);
});

socket.on('room:users', (users) => {
  roomUsers.replaceChildren();

  for (const user of users) {
    const item = document.createElement('li');
    item.textContent = user.username;
    roomUsers.appendChild(item);
  }
});

socket.on('users:online', (users) => {
  privateRecipient.replaceChildren();

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = 'Choose a user';
  privateRecipient.appendChild(emptyOption);

  for (const user of users) {
    if (user.socketId !== socket.id) {
      const option = document.createElement('option');
      option.value = user.socketId;
      option.textContent = user.username + ' (' + user.room + ')';
      privateRecipient.appendChild(option);
    }
  }
});

socket.on('room:typing', (details) => {
  typingIndicator.textContent = details.isTyping
    ? details.username + ' is typing…'
    : '';
});

socket.on('chat:error', (message) => {
  chatError.textContent = message;
});

messageForm.addEventListener('submit', (event) => {
  event.preventDefault();
  socket.emit('room:message', messageText.value);
  socket.emit('room:typing', false);
  messageText.value = '';
});

messageText.addEventListener('input', () => {
  socket.emit('room:typing', messageText.value.length > 0);
  window.clearTimeout(typingTimeout);
  typingTimeout = window.setTimeout(() => {
    socket.emit('room:typing', false);
  }, 1500);
});

privateForm.addEventListener('submit', (event) => {
  event.preventDefault();
  socket.emit('private:message', {
    targetSocketId: privateRecipient.value,
    text: privateText.value
  });
  privateText.value = '';
});

socket.on('private:message', (message) => {
  addMessage('Private from ' + message.fromUsername, message.text);
});

socket.on('private:sent', (message) => {
  addMessage('Private to ' + message.toUsername, message.text);
});

const savedUsername = sessionStorage.getItem('teamChatUsername');
const savedRoom = sessionStorage.getItem('teamChatRoom');

if (savedUsername && savedRoom) {
  currentUser = { username: savedUsername, room: savedRoom };
  document.getElementById('display-name').value = savedUsername;
  document.getElementById('room-name').value = savedRoom;
  socket.emit('room:join', currentUser);
}