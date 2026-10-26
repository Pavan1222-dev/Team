const fs = require('fs/promises');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'messages.json');


async function getHistory() {
  try {
    let rawText = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(rawText);
  } catch (error) {

    return {};
  }
}

async function saveHistory(data) {
  let text = JSON.stringify(data, null, 2);
  await fs.writeFile(DATA_FILE, text, 'utf-8');
}

async function getRecentMessages(room) {
  let history = await getHistory();
  let roomMessages = history[room] || [];


  if (roomMessages.length > 50) {
    return roomMessages.slice(roomMessages.length - 50);
  }
  return roomMessages;
}

async function addMessage(room, message) {
  let history = await getHistory();

  if (history[room] === undefined) {
    history[room] = [];
  }

  history[room].push(message);
  await saveHistory(history);
}

module.exports = { getRecentMessages, addMessage };