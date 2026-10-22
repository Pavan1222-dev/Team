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

//on receiving new message emit from server
socket.on("new-message", (data) => {
    const item = document.createElement("li");

    item.textContent = `${data.username}: ${data.message}`;

    messages.appendChild(item);
});

//on recieving online users list
socket.on("online-users", (users) => {
    onlineUsersList.innerHTML = "";

    users.forEach((username) => {
        const item = document.createElement("li");
        item.textContent = username;
        onlineUsersList.appendChild(item);
    });
});