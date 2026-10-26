# Team Chat

A basic browser chat application using Node.js, Express and Socket.IO.

## Run the application

1. Open a terminal in the `team-chat` folder.
2. Run `npm install`.
3. Optionally set `PORT` in the environment (defaults to `3000`).
4. Run `npm start`.
5. Open `http://localhost:3000` (or the configured port) in multiple browser tabs.
5. Join with a display name and a room name. Use the same room name to chat together or a different name to create another room.

## Features

- Room messages appear live, and the room shows its online users.
- Join and leave notices and a typing indicator.
- The latest 50 room messages are saved in `data/chatHistory.json` and shown when joining.
- Send a private message to another online user using the private message form.
- Messages are displayed as text rather than HTML.

## Design decisions

- Socket.IO handles room membership and live events; the browser renders user
  messages as text to avoid interpreting them as HTML.
- Room history is local runtime data in `data/chatHistory.json`; it is created on
  first start and should not be committed.
- User names, rooms, and message lengths are validated at the event boundary.