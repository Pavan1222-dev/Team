const { initDB } = require('./db');
const { createApp } = require('./app');

const PORT = 3000;

async function start() {
  const db = await initDB();
  const app = createApp(db);
  
  app.listen(PORT, () => {
    console.log(`URL Shortener running on http://localhost:${PORT}`);
  });
}

start();