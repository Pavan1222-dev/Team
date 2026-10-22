import app from './app.js';

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Weather and currency API listening on http://localhost:${port}`));
