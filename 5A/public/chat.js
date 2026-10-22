const socket = io();

const status = document.getElementById("status");
const joinForm = document.getElementById("join-form");
const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("room");
const roomStatus = document.getElementById("room-status");

socket.on("connect", () => {
    status.textContent = "Connected to chat server!";
    console.log("Connected:", socket.id);
});

socket.on("disconnect", () => {
    status.textContent = "Disconnected from chat server.";
    console.log("Disconnected from server");
});

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