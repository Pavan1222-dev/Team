
const socket = io();

// HTML elements
const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");
const joinForm = document.getElementById("joinForm");
const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("room");
const loginError = document.getElementById("loginError");
const currentUsername = document.getElementById("currentUsername");
const currentRoom = document.getElementById("currentRoom");
const onlineUsers = document.getElementById("onlineUsers");
const onlineCount = document.getElementById("onlineCount");
const messages = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const typingIndicator = document.getElementById("typingIndicator");
const conversationTitle = document.getElementById("conversationTitle");
const conversationSubtitle = document.getElementById("conversationSubtitle");
const groupBtn = document.getElementById("groupBtn");
const leaveBtn = document.getElementById("leaveBtn");

// Application state
let myUsername = "";
let myRoom = "";
let activePrivateUser = null;
let typingTimer = null;
let typingSent = false;

const typingUsers = new Set();

function getSavedSession() {
  try {
    return JSON.parse(sessionStorage.getItem("teamChatSession"));
  } catch {
    return null;
  }
}

// Safely create a text-only element
function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function formatTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function showChat() {
  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  currentUsername.textContent = myUsername;
  currentRoom.textContent = myRoom;
}

function showLogin() {
  chatScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginError.textContent = "";
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function clearMessages() {
  messages.replaceChildren();
}

function renderSystemMessage(text) {
  const element = createTextElement(
    "div",
    "system-message",
    text
  );

  messages.appendChild(element);
  scrollToBottom();
}

function renderMessage(message) {
  const item = document.createElement("article");
  const mine = message.username === myUsername;

  item.className = mine ? "message mine" : "message";

  const meta = document.createElement("div");
  meta.className = "message-meta";

  const author = createTextElement(
    "span",
    "message-author",
    message.username
  );

  const time = createTextElement(
    "span",
    "message-time",
    formatTime(message.time)
  );

  meta.append(author, time);

  const bubble = createTextElement(
    "div",
    "message-bubble",
    message.text
  );

  item.append(meta, bubble);
  messages.appendChild(item);

  scrollToBottom();
}

function renderPrivateMessage(message) {
  const item = document.createElement("article");
  const mine = message.from === myUsername;

  item.className = mine ? "message mine" : "message";

  const meta = document.createElement("div");
  meta.className = "message-meta";

  meta.append(
    createTextElement(
      "span",
      "message-author",
      mine ? `You → ${message.to}` : message.from
    ),
    createTextElement(
      "span",
      "message-time",
      formatTime(message.time)
    )
  );

  const bubble = createTextElement(
    "div",
    "message-bubble",
    message.text
  );

  item.append(meta, bubble);
  messages.appendChild(item);

  scrollToBottom();
}

function openPrivateChat(username) {
  if (username === myUsername) return;

  activePrivateUser = username;
  typingUsers.clear();
  updateTypingIndicator();

  conversationTitle.textContent = `Direct message: ${username}`;
  conversationSubtitle.textContent = "Private conversation";
  groupBtn.classList.remove("hidden");

  clearMessages();

  renderSystemMessage(
    `Private chat with ${username}. Messages are not saved in history.`
  );

  [...onlineUsers.querySelectorAll(".member-btn")].forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.username === username
    );
  });

  messageInput.placeholder = `Message ${username} privately...`;
  messageInput.focus();
}

function openGroupChat() {
  activePrivateUser = null;
  typingUsers.clear();
  updateTypingIndicator();

  conversationTitle.textContent = `# ${myRoom}`;
  conversationSubtitle.textContent = "Messages in this room";
  groupBtn.classList.add("hidden");

  messageInput.placeholder = "Write a message...";
  clearMessages();

  socket.emit("join_room", {
    username: myUsername,
    room: myRoom
  }, (result) => {
    if (!result?.success) {
      renderSystemMessage(
        result?.error || "Could not rejoin the room."
      );
    }
  });
}

function joinRoom(username, room, onFailure) {
  myUsername = username;
  myRoom = room;

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("join_room", {
    username: myUsername,
    room: myRoom
  }, (result) => {
    if (!result?.success) {
      onFailure?.(result?.error || "Could not join the room.");
      return;
    }

    activePrivateUser = null;
    sessionStorage.setItem(
  "teamChatSession",
  JSON.stringify({
    username: myUsername,
    room: myRoom
  })
);

    showChat();
    conversationTitle.textContent = `# ${myRoom}`;
    conversationSubtitle.textContent = "Messages in this room";
    messageInput.placeholder = "Write a message...";
  });
}

// Join or create a room
joinForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const room = roomInput.value.trim();

  if (!username || !room) {
    loginError.textContent = "Enter your name and a room name.";
    return;
  }

  joinRoom(username, room, (error) => {
    loginError.textContent = error;
  });
});

// Load history from the server
socket.on("message_history", (data) => {
  if (data.room !== myRoom || activePrivateUser) return;

  clearMessages();

  if (!data.messages.length) {
    renderSystemMessage("Welcome! Start the conversation.");
    return;
  }

  data.messages.forEach(renderMessage);
});

// Receive group messages
socket.on("receive_message", (message) => {
  if (message.room === myRoom && !activePrivateUser) {
    renderMessage(message);
  }
});

// Display join/leave notifications
socket.on("system_message", (message) => {
  if (!activePrivateUser) {
    renderSystemMessage(message.text);
  }
});

// Update online members
socket.on("online_users", (names) => {
  onlineCount.textContent = names.length;
  onlineUsers.replaceChildren();

  names.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "member-btn";
    button.dataset.username = name;

    const avatar = createTextElement(
      "span",
      "member-avatar",
      name.charAt(0).toUpperCase()
    );

    const label = createTextElement("span", "", name);
    const status = createTextElement(
      "span",
      "member-status",
      "●"
    );

    button.append(avatar, label, status);

    if (name === myUsername) {
      label.textContent = `${name} (You)`;
      button.disabled = true;
    } else {
      button.addEventListener("click", () => {
        openPrivateChat(name);
      });
    }

    if (name === activePrivateUser) {
      button.classList.add("active");
    }

    onlineUsers.appendChild(button);
  });
});

// Send group or private messages
messageForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = messageInput.value.trim();

  if (!text || !myUsername || !myRoom) return;

  if (activePrivateUser) {
    socket.emit("private_message", {
      toUsername: activePrivateUser,
      text
    }, (result) => {
      if (!result?.success) {
        renderSystemMessage(
          result?.error || "Private message could not be sent."
        );
      }
    });
  } else {
    socket.emit("send_message", { text });
  }

  messageInput.value = "";
  stopTyping();
  messageInput.focus();
});

// Receive private messages
socket.on("receive_private_message", (message) => {
  const otherUser =
    message.from === myUsername ? message.to : message.from;

  // Open the sender's private conversation when a new
  // private message arrives.
  if (otherUser !== activePrivateUser) {
    activePrivateUser = otherUser;
    typingUsers.clear();
    updateTypingIndicator();

    conversationTitle.textContent = `Direct message: ${otherUser}`;
    conversationSubtitle.textContent = "Private conversation";
    groupBtn.classList.remove("hidden");
    messageInput.placeholder = `Message ${otherUser} privately...`;

    clearMessages();
    renderSystemMessage(
      `Private chat with ${otherUser}. Messages are not saved in history.`
    );

    [...onlineUsers.querySelectorAll(".member-btn")].forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.username === otherUser
      );
    });
  }

  renderPrivateMessage(message);
});

// Typing indicators
function updateTypingIndicator() {
  if (activePrivateUser) {
    typingIndicator.textContent = "";
    return;
  }

  const names = [...typingUsers];

  typingIndicator.textContent = names.length
    ? `${names.join(", ")} ${names.length === 1 ? "is" : "are"} typing...`
    : "";
}

function stopTyping() {
  clearTimeout(typingTimer);

  if (typingSent) {
    socket.emit("typing", false);
    typingSent = false;
  }
}

messageInput.addEventListener("input", () => {
  if (activePrivateUser) return;

  if (!typingSent) {
    socket.emit("typing", true);
    typingSent = true;
  }

  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 1200);
});

socket.on("user_typing", (data) => {
  if (data.username === myUsername) return;

  if (data.isTyping) {
    typingUsers.add(data.username);
  } else {
    typingUsers.delete(data.username);
  }

  updateTypingIndicator();
});

// Send on Enter; use Shift+Enter for a new line
messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    messageForm.requestSubmit();
  }
});

// Return to the group room
groupBtn.addEventListener("click", openGroupChat);

// Leave the chat
leaveBtn.addEventListener("click", () => {
  stopTyping();

  sessionStorage.removeItem("teamChatSession");

  myUsername = "";
  myRoom = "";
  activePrivateUser = null;
  typingUsers.clear();

  socket.disconnect();
  showLogin();
  clearMessages();

  usernameInput.focus();
});

// Rejoin the saved room after a connection or page refresh
socket.on("connect", () => {
  const saved = getSavedSession();

  if (saved?.username && saved?.room) {
    usernameInput.value = saved.username;
    roomInput.value = saved.room;

    joinRoom(saved.username, saved.room, (error) => {
      sessionStorage.removeItem("teamChatSession");
      showLogin();
      loginError.textContent = error;
    });
  }
});

socket.on("disconnect", () => {
  stopTyping();
  typingUsers.clear();
  updateTypingIndicator();
});

// Restore saved login details in the form
const savedSession = getSavedSession();

if (savedSession) {
  usernameInput.value = savedSession.username || "";
  roomInput.value = savedSession.room || "";
}
