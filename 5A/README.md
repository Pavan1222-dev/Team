# TeamChat — Real-Time Team Chat Application

## 1. Project Overview

TeamChat is a browser-based team messaging application developed using Node.js, Express, and Socket.IO. It allows team members to communicate in real time through chat rooms and private one-to-one messages.

This project was developed as an intermediate Node.js practice project.

## 2. Features

- Join or create a chat room using a display name.
- Send and receive group messages in real time.
- View online members in each room.
- Display typing indicators.
- Show user join and leave notifications.
- Load the last 50 messages from a room's history.
- Send private messages to online users.
- Persist group message history in a JSON file.
- Display user messages safely as text to prevent HTML/script injection.
- Restore the previous room after refreshing a browser tab.

## 3. Technologies Used

- Node.js
- Express.js
- Socket.IO
- HTML5
- CSS3
- JavaScript
- JSON file storage
- npm

## 4. Project Structure

```text
team-chat-app/
├── public/
│   ├── index.html
│   ├── style.css
│   └── client.js
├── messages.json
├── package.json
├── package-lock.json
├── server.js
└── README.md
```

## 5. Installation

### Prerequisites

Install Node.js and npm, and use Visual Studio Code or another code editor.

### Install dependencies

Open a terminal in the project directory and run:

```bash
npm install
```

If the dependencies have not yet been installed, run:

```bash
npm install express socket.io
```

### Start the application

```bash
node server.js
```

Open the application in your browser:

http://localhost:3000

## 6. How to Use

1. Open the application in a browser.
2. Enter a display name and room name.
3. Click **Join Chat**.
4. Send messages using the message box.
5. Click an online member to open a private conversation.
6. Open additional browser tabs to simulate multiple team members.
7. Refresh a tab to test session restoration and message history.

To test multiple users, use different display names in separate tabs.

## 7. Testing

Test the following acceptance criteria:

- [ ] At least three browser tabs can connect simultaneously.
- [ ] Users can communicate in two separate rooms.
- [ ] Group messages arrive without refreshing.
- [ ] Online users update when members join or disconnect.
- [ ] Typing indicators appear and disappear correctly.
- [ ] Join and leave notifications are displayed.
- [ ] The latest 50 room messages load when joining.
- [ ] Refreshing restores the user's room and message history.
- [ ] Private messages are delivered to the intended online user.
- [ ] Script-injection test messages are displayed as plain text.

Record each test as passed only after verifying it.

## 8. Screenshots

Add screenshots of the actual running application to a folder named `screenshots/`.

Recommended screenshots:

1. **Login Page** — display name and room selection.
2. **Group Chat** — messages exchanged between two users.
3. **Online Members** — users displayed in a room.
4. **Typing Indicator** — the typing notification visible to another user.
5. **Multiple Rooms** — separate users communicating in different rooms.
6. **Private Messaging** — a one-to-one conversation.
7. **Message History** — previous messages restored after refreshing.
8. **Security Test** — a script-injection test string displayed as plain text.

Example screenshot folder:

```text
screenshots/
├── login.png
├── group-chat.png
├── online-members.png
├── typing-indicator.png
├── multiple-rooms.png
├── private-chat.png
├── message-history.png
└── script-safety.png
```

Create the folder and save your own screenshots with these filenames. Update this README if your filenames differ.

## 9. Security Considerations

- Chat message text is displayed using `textContent` instead of `innerHTML`.
- User-provided text is trimmed and length-limited on the server.
- Authentication and account verification are not implemented.
- Display names are not authenticated and can be impersonated.
- Private messages are not persisted in this version.
- Additional validation, rate limiting, and production security controls are needed before public deployment.

## 10. Known Limitations

- User presence is stored in server memory and resets when the server restarts.
- Message history uses a local JSON file rather than a database.
- Private messages are delivered live but are not saved.
- The current application is intended for learning and local testing, not production deployment.

## 11. Future Enhancements

- User registration and login.
- Persistent private message history.
- SQLite or PostgreSQL database integration.
- File and image sharing.
- Message search and deletion.
- User profiles and role-based permissions.
- Deployment to a hosting platform.

## 12. Conclusion

TeamChat demonstrates real-time communication using Node.js, Express, and Socket.IO. It combines room-based messaging, online presence, typing indicators, private messages, and JSON-based message persistence in a simple browser application.
