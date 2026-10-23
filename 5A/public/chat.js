const socket = io();
const privateMessages = document.getElementById("private-messages");
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

const privateRecipient = document.getElementById("private-recipient");
const privateMessageForm = document.getElementById("private-message-form");
const privateMessageInput = document.getElementById("private-message-input");

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


//-------------------Online users list-------------------------------------//
socket.on("online-users", (users) => {
    onlineUsersList.innerHTML = "";

    const privateRecipient = document.getElementById("private-recipient");
    privateRecipient.innerHTML = '<option value="">Select a user</option>';

    users.forEach((username) => {
        // Update the online users list
        const item = document.createElement("li");
        item.textContent = username;
        onlineUsersList.appendChild(item);

        // Add the user to the private-message dropdown
        const option = document.createElement("option");
        option.value = username;
        option.textContent = username;
        privateRecipient.appendChild(option);
    });
});
//----------------------------------------------------------------------//


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

//Private message 
privateMessageForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const recipient = privateRecipient.value;
    const message = privateMessageInput.value.trim();

    if (recipient === "" || message === "") {
        return;
    }

    socket.emit("private-message", {
        recipient: recipient,
        message: message
    });

    privateMessageInput.value = "";
});
//--------------------------------------------------------------//

//Displaying private message
socket.on("private-message", (data) => {
    const item = document.createElement("li");

    item.textContent = `[Private] ${data.sender}: ${data.message}`;

    messages.appendChild(item);
});

socket.on("private-message-error", (message) => {
    alert(message);
});
//-----------------------------------------------------------------------//

//Private message form listener//
privateRecipient.addEventListener("change", () => {
    const recipient = privateRecipient.value;

    if (recipient === "") {
        return;
    }

    socket.emit("load-private-history", recipient);
});
//-----------//

//---------------Private message history---------------------------------//
socket.on("private-message-history", (history) => {
    privateMessages.innerHTML = "";

    history.forEach((data) => {
        const item = document.createElement("li");

        const sender = data.sender === usernameInput.value.trim()
            ? `You → ${data.recipient}`
            : data.sender;

        item.textContent = `[Private] ${sender}: ${data.message}`;

        privateMessages.appendChild(item);
    });
});
//------------------------------------------------//