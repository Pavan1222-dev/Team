const socket = io();

const status = document.getElementById("status");
const joinForm = document.getElementById("join-form");
const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("room");
const roomStatus = document.getElementById("room-status");

const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messages = document.getElementById("messages");

const onlineUsersList = document.getElementById("online-users");

const typingStatus = document.getElementById("typing-status");

socket.on("connect", () => {
    status.textContent = "Connected to chat server!";
    console.log("Connected:", socket.id);
});

socket.on("disconnect", () => {
    status.textContent = "Disconnected from chat server.";
    console.log("Disconnected from server");
});

//join form event listener
joinForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const room = roomInput.value;

    if (username === "") {
        return;
    }

    socket.emit("join-room", {
        username: username,
        room: room
    });
});
//---------------------------------------------------------//


//Message input event listener
let typingTimer;

messageInput.addEventListener("input", () => {
    socket.emit("typing");

    clearTimeout(typingTimer);

    typingTimer = setTimeout(() => {
        socket.emit("stop-typing");
    }, 1000);
});
//------------------------------------------------------//


//message form event listener
messageForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (message === "") {
        return;
    }

    socket.emit("send-message", message);

    messageInput.value = "";
});
//----------------------------------------------------//


//Receiving new message emit from server
socket.on("new-message", (data) => {
    const item = document.createElement("li");

    item.textContent = `${data.username}: ${data.message}`;

    messages.appendChild(item);
});
//------------------------------------------------------//


//on recieving online users list
socket.on("online-users", (users) => {
    onlineUsersList.innerHTML = "";

    users.forEach((username) => {
        const item = document.createElement("li");
        item.textContent = username;
        onlineUsersList.appendChild(item);
    });
});
//-------------------------------------------------//


//Display notifications of someone leaving the room
socket.on("system-message", (message) => {
    const item = document.createElement("li");

    item.textContent = message;
    item.classList.add("system-message");

    messages.appendChild(item);
});
//------------------------------------------------//


//User-Typing event listener
socket.on("user-typing", (username) => {
    typingStatus.textContent = `${username} is typing...`;
});

//User_not_typing event listener
socket.on("user-stop-typing", (username) => {
    if (typingStatus.textContent === `${username} is typing...`) {
        typingStatus.textContent = "";
    }
});
//----------------------------------------------------------------//
//-----------------------------------------------------------------//

//Message history display
socket.on("message-history", (history) => {
    messages.innerHTML = "";

    history.forEach((data) => {
        const item = document.createElement("li");

        item.textContent = `${data.sender}: ${data.message}`;

        messages.appendChild(item);
    });
});
//-------------------------------------------------------------------//