import { app } from './app.js';

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Library API listening at http://localhost:${port}/api/v1`));
